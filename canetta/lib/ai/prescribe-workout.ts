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

export type TrainingProfile = {
  experience_level: "nunca_treinei" | "retomando" | "treino_regular";
  training_location: "casa_sem_equipamento" | "casa_com_equipamento" | "academia";
  days_per_week: number;
  minutes_per_session: number;
  limitations: string | null;
};

const HOME_NO_EQUIPMENT = ["body weight"];
const HOME_WITH_EQUIPMENT = ["body weight", "band", "dumbbell", "kettlebell", "stability ball"];

function buildPlanSchema(allowedExerciseNames: string[]) {
  return {
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
                  name: { type: "string", enum: allowedExerciseNames },
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
  };
}

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

  const [profile, trainingProfile, weights, sideEffects, checkins, applications, missedDoses, workoutLogs] = await Promise.all([
    supabase.from("canetta_profiles").select("name, medication, current_dose, frequency, height_cm, goal_weight, biggest_difficulty, created_at").eq("user_id", userId).maybeSingle(),
    supabase.from("canetta_training_profiles").select("experience_level, training_location, days_per_week, minutes_per_session, limitations").eq("user_id", userId).maybeSingle(),
    supabase.from("canetta_weight_entries").select("weight, recorded_at").eq("user_id", userId).order("recorded_at", { ascending: false }).limit(8),
    supabase.from("canetta_side_effects").select("types, intensity, duration, recorded_at").eq("user_id", userId).gte("recorded_at", sevenDaysAgo).order("recorded_at", { ascending: false }).limit(10),
    supabase.from("canetta_daily_checkins").select("date, hunger_level, energy_level").eq("user_id", userId).order("date", { ascending: false }).limit(7),
    supabase.from("canetta_dose_applications").select("applied_at").eq("user_id", userId).gte("applied_at", fourteenDaysAgo),
    supabase.from("canetta_missed_doses").select("reason, scheduled_for").eq("user_id", userId).gte("scheduled_for", fourteenDaysAgo),
    supabase.from("canetta_workout_logs").select("exercise_name, body_part, sets_completed, reps_completed, difficulty_felt, completed_at").eq("user_id", userId).order("completed_at", { ascending: false }).limit(15)
  ]);

  const training = (trainingProfile.data as TrainingProfile | null) ?? null;

  let exerciseQuery = supabase
    .from("canetta_exercises")
    .select("name, body_part, equipment, target_muscle, gif_url, image_url")
    .order("name")
    .limit(280);

  if (training?.training_location === "casa_sem_equipamento") {
    exerciseQuery = exerciseQuery.in("equipment", HOME_NO_EQUIPMENT);
  } else if (training?.training_location === "casa_com_equipamento") {
    exerciseQuery = exerciseQuery.in("equipment", HOME_WITH_EQUIPMENT);
  }

  const exercises = await exerciseQuery;

  return {
    profile: profile.data,
    training,
    weights: weights.data ?? [],
    sideEffects: sideEffects.data ?? [],
    checkins: checkins.data ?? [],
    applications: applications.data ?? [],
    missedDoses: missedDoses.data ?? [],
    workoutLogs: workoutLogs.data ?? [],
    exercises: exercises.data ?? []
  };
}

const LEVEL_LABEL: Record<TrainingProfile["experience_level"], string> = {
  nunca_treinei: "Nunca treinou com regularidade",
  retomando: "Já treinou, mas está parado(a) — retomando agora",
  treino_regular: "Treina regularmente há 6+ meses"
};

const LOCATION_LABEL: Record<TrainingProfile["training_location"], string> = {
  casa_sem_equipamento: "Em casa, SEM equipamento (apenas peso corporal)",
  casa_com_equipamento: "Em casa, com elásticos/halteres/kettlebell",
  academia: "Academia completa"
};

function buildPrompt(context: Awaited<ReturnType<typeof gatherUserContext>>) {
  const { profile, training, weights, sideEffects, checkins, applications, missedDoses, workoutLogs, exercises } = context;

  const weightLines = weights.map((w) => `${new Date(w.recorded_at).toISOString().slice(0, 10)}: ${w.weight} kg`).join("\n") || "Sem registros de peso.";
  const symptomLines = sideEffects.map((s) => `${new Date(s.recorded_at).toISOString().slice(0, 10)}: ${(s.types ?? []).join(", ")} (intensidade ${s.intensity ?? "?"}/10, duração ${s.duration ?? "?"})`).join("\n") || "Sem sintomas registrados nos últimos 7 dias.";
  const checkinLines = checkins.map((c) => `${c.date}: fome ${c.hunger_level ?? "?"}/10, energia ${c.energy_level ?? "?"}/10`).join("\n") || "Sem check-ins diários recentes.";
  const workoutLines = workoutLogs.map((w) => `${new Date(w.completed_at).toISOString().slice(0, 10)}: ${w.exercise_name}${w.sets_completed ? ` ${w.sets_completed}x${w.reps_completed ?? "?"}` : ""}${w.difficulty_felt ? ` (sentiu: ${w.difficulty_felt})` : ""}`).join("\n") || "Nenhum treino registrado ainda.";
  const missedLines = missedDoses.map((m) => `${new Date(m.scheduled_for).toISOString().slice(0, 10)}: ${m.reason ?? "motivo não informado"}`).join("\n") || "Nenhuma dose perdida registrada.";
  const catalogLines = exercises.map((e) => `- ${e.name} | região: ${e.body_part ?? "?"} | alvo: ${e.target_muscle ?? "?"} | equipamento: ${e.equipment ?? "?"}`).join("\n");

  const treatmentWeeks = profile?.created_at
    ? Math.max(1, Math.ceil((Date.now() - new Date(profile.created_at).getTime()) / (7 * 24 * 60 * 60 * 1000)))
    : null;

  const anamnese = training
    ? `Nível de experiência: ${LEVEL_LABEL[training.experience_level]}
Local e equipamento: ${LOCATION_LABEL[training.training_location]}
Dias disponíveis por semana: ${training.days_per_week}
Tempo por sessão: ~${training.minutes_per_session} minutos
Limitações/dores relatadas: ${training.limitations?.trim() || "nenhuma relatada"}`
    : "Anamnese não preenchida — assuma iniciante absoluto, treino em casa sem equipamento, 3 dias/semana, 30 min/sessão, e seja conservador.";

  return `Você é um educador físico especialista em pacientes em tratamento com agonistas GLP-1 (Ozempic, Mounjaro, Saxenda, Wegovy, tirzepatida).
Sua função é montar um plano de treino SEMANAL seguro e realista, baseado na anamnese e nos dados registrados pelo próprio usuário no app Canetta.

=== ANAMNESE DE TREINO ===
${anamnese}

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

=== CATÁLOGO DE EXERCÍCIOS PERMITIDOS ===
Você SÓ pode prescrever exercícios desta lista, usando o nome EXATAMENTE como escrito.
Leia a região/alvo/equipamento de cada um — escolha pelo que o exercício realmente trabalha, não pelo nome.
${catalogLines}

=== DIRETRIZES BASEADAS EM EVIDÊNCIA (obrigatórias) ===

RISCO CENTRAL (literatura GLP-1):
1. Estudos com semaglutida e tirzepatida mostram que 25-40% do peso perdido pode ser massa magra (análises de composição corporal dos ensaios STEP/SURMOUNT; estudo SEMALEAN). Treino resistido + proteína adequada reduz essa perda a quase zero (meta-análise 2022; séries de casos em que quem preservou massa magra treinava força 3-5x/semana).

NÍVEL DO ALUNO (anamnese):
2. "Nunca treinou": full-body, exercícios simples e estáveis, 2 séries por exercício, 8-12 reps, RPE 5-6 (fáceis de propósito) nas 2 primeiras semanas. Progressão só depois de consolidar técnica.
3. "Retomando": full-body, 2-3 séries, RPE 6-7. Voltar com ~60% do volume que fazia antes; não assumir a carga antiga.
4. "Treina regularmente": pode usar divisão superior/inferior, 3 séries, RPE 7-8, exercícios mais complexos do catálogo.

FREQUÊNCIA E DURAÇÃO (ACSM 2026 + anamnese):
5. Monte EXATAMENTE o número de dias informado na anamnese (default 3), em dias não consecutivos (>=48h por grupo muscular). Grandes grupos >= 2x/semana.
6. Quantidade de exercícios por sessão conforme o tempo disponível: ~30 min -> 4-5 exercícios; ~45 min -> 5-6; ~60 min -> 6-8.

VOLUME (ACSM 2026):
7. Mínimo 2 séries por exercício; padrão 2-3. Iniciante: 4-8 séries semanais por grupo muscular. Consistência vale mais que complexidade.

INTENSIDADE E PROGRESSÃO:
8. Nunca prescrever até a falha. Execução lenta/moderada para destreinados. Progredir carga OU volume no máximo 5-10% por semana, nunca os dois. "Difícil" na semana anterior -> manter/reduzir; "fácil" -> progredir dentro do limite.
9. Descanso: 60-90s entre séries; até 120s em multiarticulares.

EQUIPAMENTO:
10. Prescreva apenas exercícios compatíveis com o equipamento da anamnese (o catálogo já está filtrado — respeite-o).

LIMITAÇÕES FÍSICAS:
11. Se a anamnese relata dor/lesão em alguma região, NÃO prescreva exercícios que carreguem essa região; escolha alternativas e mencione isso no rationale. Oriente amplitude sem dor.

AERÓBIO (OMS):
12. Meta de 150 min/semana de atividade moderada acumulada (caminhada conta), complementar à força.

SINTOMAS GI (consenso multidisciplinar GLP-1):
13. Náusea >= 6/10 ou vômitos nos últimos 7 dias: sem alta intensidade, sem exercícios deitados/invertidos; priorizar caminhada leve, mobilidade e força leve em pé/sentado. Nunca treinar logo após refeição.
14. Energia <= 3/10 nos check-ins: cortar volume pela metade, MANTER a frequência.

PROTEÍNA (consenso GLP-1):
15. 1,2-1,6 g/kg/dia distribuída nas refeições; calcule a faixa em gramas com o peso atual quando disponível.

=== TAREFA ===
Monte o plano desta semana (dias da semana em português: Segunda, Quarta, Sexta etc.).
- "why" de cada exercício: 1 frase curta em português coerente com o que o exercício REALMENTE trabalha e com os dados do usuário.
- "rationale": 2-3 frases citando anamnese e dados (nível, peso, sintomas, energia, histórico).
- "nutritionAdvice": 1-2 frases práticas de proteína/hidratação para o caso.
- "warning": null, OU uma frase de alerta se houver sintoma/limitação que peça cautela.
- NUNCA prometa resultados médicos. NUNCA ajuste dose de medicamento. O plano é organização de movimento, não prescrição médica.
Responda somente com o JSON pedido.`;
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+/g, " ").trim();
}

export async function prescribeWeeklyWorkout(userId: string): Promise<{ plan: AiWorkoutPlan; weekStart: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const context = await gatherUserContext(userId);
  if (!context.exercises.length) {
    throw new Error("Exercise catalog is empty.");
  }

  const prompt = buildPrompt(context);
  const allowedNames = context.exercises.map((exercise) => exercise.name);

  const openai = new OpenAI({ apiKey });
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 4000,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "weekly_workout_plan",
        strict: true,
        schema: buildPlanSchema(allowedNames) as unknown as Record<string, unknown>
      }
    },
    messages: [{ role: "user", content: prompt }]
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No content in model response.");
  }

  const plan = JSON.parse(content) as AiWorkoutPlan;

  // Anexa GIF/imagem do catálogo a cada exercício (match exato + fallback normalizado).
  const mediaByName = new Map<string, { gif_url: string | null; image_url: string | null }>();
  for (const exercise of context.exercises) {
    const media = { gif_url: exercise.gif_url ?? null, image_url: exercise.image_url ?? null };
    mediaByName.set(exercise.name.trim().toLowerCase(), media);
    mediaByName.set(normalizeName(exercise.name), media);
  }
  for (const day of plan.workouts ?? []) {
    for (const exercise of day.exercises ?? []) {
      const media = mediaByName.get(exercise.name.trim().toLowerCase()) ?? mediaByName.get(normalizeName(exercise.name));
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
        training: context.training,
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
