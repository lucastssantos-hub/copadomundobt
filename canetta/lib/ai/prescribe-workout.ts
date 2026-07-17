import OpenAI from "openai";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export type AiWorkoutExercise = {
  name: string;
  sets: number;
  reps: string;
  why: string;
  gif_url?: string | null;
  image_url?: string | null;
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
    supabase.from("canetta_exercises").select("name, body_part, equipment, target_muscle, gif_url, image_url").order("name").limit(400)
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

=== DIRETRIZES BASEADAS EM EVIDÊNCIA (obrigatórias) ===

RISCO CENTRAL (literatura GLP-1):
1. Estudos com semaglutida e tirzepatida mostram que 25-40% do peso perdido pode ser massa magra (análises de composição corporal dos ensaios STEP/SURMOUNT; estudo SEMALEAN). Treino resistido + proteína adequada reduz essa perda a quase zero (meta-análise 2022 de treino resistido durante emagrecimento; séries de casos em que pacientes que preservaram massa magra treinavam força 3-5x/semana).

FREQUÊNCIA (ACSM 2026):
2. Todos os grandes grupos musculares >= 2x/semana. Sem histórico de treino: 2-3 sessões full-body/semana em dias NÃO consecutivos (>=48h de recuperação por grupo muscular). Com histórico consistente: até 4 dias (divisão superior/inferior).

VOLUME (ACSM 2026):
3. Mínimo 2 séries por exercício; padrão 2-3 séries. Iniciante: 4-8 séries semanais por grupo muscular, progredindo gradualmente. Consistência vale mais que complexidade.

INTENSIDADE E REPETIÇÕES:
4. Iniciante: 8-12 repetições com esforço percebido RPE 6-7 (sobrando 2-3 repetições "no tanque"). NUNCA prescrever até a falha. Execução em velocidade lenta/moderada (ACSM para destreinados). Progredir carga somente quando completar todas as séries no topo da faixa de reps com RPE <= 7.

PROGRESSÃO:
5. Aumentar carga OU volume no máximo 5-10% por semana — nunca os dois na mesma semana (regra dos 10%). Se o usuário sentiu "difícil" na semana anterior: manter ou reduzir; "fácil": progredir dentro do limite.

DESCANSO:
6. 60-90s entre séries; até 120s em exercícios multiarticulares (agachamento, remada, supino).

AERÓBIO (OMS):
7. Meta de 150 min/semana de atividade moderada acumulada (caminhada conta), distribuída na semana. Complementa a força, não substitui — exceto em semana de sintomas fortes.

SINTOMAS GI (consenso multidisciplinar de manejo de eventos GI em GLP-1):
8. Náusea >= 6/10 ou vômitos nos últimos 7 dias: sem alta intensidade, sem exercícios deitados/invertidos; priorizar caminhada leve (que auxilia digestão e constipação), mobilidade e força leve em pé/sentado. Nunca treinar imediatamente após refeição.
9. Energia <= 3/10 nos check-ins: cortar volume pela metade (menos séries), MANTER a frequência semanal.

PROTEÍNA (consenso GLP-1):
10. 1,2-1,6 g/kg/dia durante perda ativa de peso, distribuída entre as refeições. Use o peso atual do usuário para calcular a faixa em gramas quando disponível.

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
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const context = await gatherUserContext(userId);
  const prompt = buildPrompt(context);

  const openai = new OpenAI({ apiKey });
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 4000,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "weekly_workout_plan",
        strict: true,
        schema: PLAN_SCHEMA as unknown as Record<string, unknown>
      }
    },
    messages: [{ role: "user", content: prompt }]
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No content in model response.");
  }

  const plan = JSON.parse(content) as AiWorkoutPlan;

  // Anexa GIF/imagem do catálogo a cada exercício do plano (match por nome, case-insensitive).
  const mediaByName = new Map(
    context.exercises.map((exercise) => [
      exercise.name.trim().toLowerCase(),
      { gif_url: exercise.gif_url ?? null, image_url: exercise.image_url ?? null }
    ])
  );
  for (const day of plan.workouts ?? []) {
    for (const exercise of day.exercises ?? []) {
      const media = mediaByName.get(exercise.name.trim().toLowerCase());
      exercise.gif_url = media?.gif_url ?? null;
      exercise.image_url = media?.image_url ?? null;
    }
  }

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
      ai_model: "gpt-4o-mini"
    },
    { onConflict: "user_id,week_start" }
  );

  if (error) {
    throw new Error(`Failed to save plan: ${error.message}`);
  }

  return { plan, weekStart };
}
