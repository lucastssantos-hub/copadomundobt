import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export type AiWorkoutExercise = {
  name: string;
  sets: number;
  reps: string;
  why: string;
};

export type AiWorkoutDay = {
  day: string;
  focus: string;
  exercises: AiWorkoutExercise[];
};

export type AiWorkoutPlan = {
  weekFocus: string;
  riskLevel: "low" | "medium" | "high";
  rationale: string;
  workouts: AiWorkoutDay[];
  nutritionAdvice: string;
  warning: string | null;
};

const PLAN_SCHEMA = {
  type: "object",
  properties: {
    weekFocus: { type: "string" },
    riskLevel: { type: "string", enum: ["low", "medium", "high"] },
    rationale: { type: "string" },
    workouts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day: { type: "string" },
          focus: { type: "string" },
          exercises: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                sets: { type: "integer" },
                reps: { type: "string" },
                why: { type: "string" }
              },
              required: ["name", "sets", "reps", "why"],
              additionalProperties: false
            }
          }
        },
        required: ["day", "focus", "exercises"],
        additionalProperties: false
      }
    },
    nutritionAdvice: { type: "string" },
    warning: { type: ["string", "null"] }
  },
  required: ["weekFocus", "riskLevel", "rationale", "workouts", "nutritionAdvice", "warning"],
  additionalProperties: false
} as const;

function currentWeekStart() {
  const now = new Date();
  const saoPaulo = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const day = saoPaulo.getDay();
  const diff = day === 0 ? 6 : day - 1;
  saoPaulo.setDate(saoPaulo.getDate() - diff);
  return saoPaulo.toISOString().slice(0, 10);
}

async function gatherUserContext(userId: string) {
  const supabase = createSupabaseAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const [profile, weights, sideEffects, checkins, applications, missedDoses, workoutLogs, exercises] = await Promise.all([
    supabase.from("canetta_profiles").select("name, medication, current_dose, frequency, height_cm, goal_weight, biggest_difficulty, created_at").eq("user_id", userId).maybeSingle(),
    supabase.from("canetta_weight_entries").select("weight, recorded_at").eq("user_id", userId).order("recorded_at", { ascending: false }).limit(8),
    supabase.from("canetta_side_effects").select("types, intensity, duration, recorded_at").eq("user_id", userId).gte("recorded_at", sevenDaysAgo).order("recorded_at", { ascending: false }).limit(10),
    supabase.from("canetta_daily_checkins").select("date, hunger_level, energy_level").eq("user_id", userId).order("date", { ascending: false }).limit(7),
    supabase.from("canetta_dose_applications").select("applied_at").eq("user_id", userId).gte("applied_at", fourteenDaysAgo),
    supabase.from("canetta_missed_doses").select("reason, scheduled_for").eq("user_id", userId).gte("scheduled_for", fourteenDaysAgo),
    supabase.from("canetta_workout_logs").select("exercise_name, body_part, sets_completed, reps_completed, difficulty_felt, completed_at").eq("user_id", userId).order("completed_at", { ascending: false }).limit(15),
    supabase.from("canetta_exercises").select("name, body_part, equipment, target_muscle").order("name").limit(120)
  ]);

  return {
    profile: profile.data,
    weights: weights.data ?? [],
    sideEffects: sideEffects.data ?? [],
    checkins: checkins.data ?? [],
    applications: applications.data ?? [],
    missedDoses: missedDoses.data ?? [],
    workoutLogs: workoutLogs.data ?? [],
    exercises: exercises.data ?? []
  };
}

function buildPrompt(context: Awaited<ReturnType<typeof gatherUserContext>>) {
  const { profile, weights, sideEffects, checkins, applications, missedDoses, workoutLogs, exercises } = context;

  const weightLines = weights.map((w) => `${new Date(w.recorded_at).toISOString().slice(0, 10)}: ${w.weight} kg`).join("\n") || "Sem registros de peso.";
  const symptomLines = sideEffects.map((s) => `${new Date(s.recorded_at).toISOString().slice(0, 10)}: ${(s.types ?? []).join(", ")} (intensidade ${s.intensity ?? "?"}/10, duração ${s.duration ?? "?"})`).join("\n") || "Sem sintomas registrados nos últimos 7 dias.";
  const checkinLines = checkins.map((c) => `${c.date}: fome ${c.hunger_level ?? "?"}/10, energia ${c.energy_level ?? "?"}/10`).join("\n") || "Sem check-ins diários recentes.";
  const workoutLines = workoutLogs.map((w) => `${new Date(w.completed_at).toISOString().slice(0, 10)}: ${w.exercise_name}${w.sets_completed ? ` ${w.sets_completed}x${w.reps_completed ?? "?"}` : ""}${w.difficulty_felt ? ` (sentiu: ${w.difficulty_felt})` : ""}`).join("\n") || "Nenhum treino registrado ainda.";
  const missedLines = missedDoses.map((m) => `${new Date(m.scheduled_for).toISOString().slice(0, 10)}: ${m.reason ?? "motivo não informado"}`).join("\n") || "Nenhuma dose perdida registrada.";
  const catalogNames = exercises.map((e) => `${e.name}${e.body_part ? ` [${e.body_part}]` : ""}${e.equipment ? ` (${e.equipment})` : ""}`).join("; ");

  const treatmentWeeks = profile?.created_at
    ? Math.max(1, Math.ceil((Date.now() - new Date(profile.created_at).getTime()) / (7 * 24 * 60 * 60 * 1000)))
    : null;

  return `Você é um educador físico especialista em pacientes em tratamento com agonistas GLP-1 (Ozempic, Mounjaro, Saxenda, Wegovy, tirzepatida).
Sua função é montar um plano de treino SEMANAL seguro e realista, baseado nos dados registrados pelo próprio usuário no app Canetta.

=== PERFIL ===
Nome: ${profile?.name ?? "não informado"}
Medicamento: ${profile?.medication ?? "não informado"} · Dose: ${profile?.current_dose ?? "não informada"} · Frequência: ${profile?.frequency ?? "não informada"}
Altura: ${profile?.height_cm ? `${profile.height_cm} cm` : "não informada"} · Meta de peso: ${profile?.goal_weight ? `${profile.goal_weight} kg` : "não informada"}
Maior dificuldade relatada: ${profile?.biggest_difficulty ?? "não informada"}
Semanas desde o cadastro no app: ${treatmentWeeks ?? "desconhecido"}

=== PESO (mais recente primeiro) ===
${weightLines}

=== SINTOMAS (últimos 7 dias) ===
${symptomLines}

=== CHECK-INS DIÁRIOS (fome/energia) ===
${checkinLines}

=== ADERÊNCIA (últimos 14 dias) ===
Aplicações registradas: ${applications.length}
Doses perdidas:
${missedLines}

=== HISTÓRICO DE TREINO (mais recente primeiro) ===
${workoutLines}

=== CATÁLOGO DE EXERCÍCIOS DISPONÍVEIS (use preferencialmente estes nomes) ===
${catalogNames || "Catálogo vazio — use exercícios de peso corporal clássicos."}

=== DIRETRIZES CIENTÍFICAS ===
1. Perda de peso rápida (>1 kg/semana) em GLP-1 = risco alto de perda de massa magra (até 40% do peso perdido pode ser músculo). Prioridade: treino de força/resistência 3x/semana.
2. Náusea/vômito intensos (>=6/10) recentes = evitar treino de alta intensidade e exercícios deitados/invertidos; preferir caminhada, mobilidade e força leve.
3. Energia baixa (<=3/10) nos check-ins = reduzir volume, manter frequência.
4. Sem histórico de treino = começar com intensidade baixa, 2-3 dias, exercícios simples de peso corporal.
5. Se o usuário sentiu "difícil" nos últimos treinos, reduza; se sentiu "fácil", progrida levemente.
6. Progressão gradual: nunca aumente volume e intensidade ao mesmo tempo.

=== TAREFA ===
Monte o plano desta semana com 2 a 4 dias de treino (dias da semana em português: Segunda, Quarta, Sexta etc.), 3 a 5 exercícios por dia.
- "why" de cada exercício: 1 frase curta em português conectada aos dados do usuário.
- "rationale": explique em 2-3 frases por que este foco, citando os dados (peso, sintomas, energia, histórico).
- "nutritionAdvice": 1-2 frases práticas sobre proteína/hidratação para o caso específico.
- "warning": null, OU uma frase de alerta se houver sintoma/sinal que peça cautela (ex.: vômitos frequentes -> "se vomitar durante o treino, pare").
- NUNCA prometa resultados médicos. NUNCA ajuste dose de medicamento. O plano é organização de movimento, não prescrição médica.
Responda somente com o JSON pedido.`;
}

export async function prescribeWeeklyWorkout(userId: string): Promise<{ plan: AiWorkoutPlan; weekStart: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const context = await gatherUserContext(userId);
  const prompt = buildPrompt(context);

  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: {
      format: { type: "json_schema", schema: PLAN_SCHEMA }
    },
    messages: [{ role: "user", content: prompt }]
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Model declined to generate a plan.");
  }

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text block in model response.");
  }

  const plan = JSON.parse(textBlock.text) as AiWorkoutPlan;
  const weekStart = currentWeekStart();

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("canetta_ai_workout_plans").upsert(
    {
      user_id: userId,
      week_start: weekStart,
      focus: plan.weekFocus,
      rationale: plan.rationale,
      risk_level: plan.riskLevel,
      nutrition_advice: plan.nutritionAdvice,
      warning: plan.warning,
      workouts: plan.workouts,
      context_snapshot: {
        weights: context.weights.slice(0, 4),
        side_effects: context.sideEffects.slice(0, 5),
        checkins: context.checkins.slice(0, 5),
        workout_count: context.workoutLogs.length
      },
      ai_model: "claude-opus-4-8"
    },
    { onConflict: "user_id,week_start" }
  );

  if (error) {
    throw new Error(`Failed to save plan: ${error.message}`);
  }

  return { plan, weekStart };
}
