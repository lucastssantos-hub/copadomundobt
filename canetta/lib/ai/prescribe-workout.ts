import OpenAI from "openai";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { anamnesisPromptSummary, evaluateGate, type AnamnesisData, type GateResult } from "@/lib/ai/anamnesis";
import { validateWorkoutPlan } from "@/lib/ai/workout-validation";

export class GateBlockedError extends Error {
  gate: GateResult;
  constructor(gate: GateResult) {
    super(`Plan generation blocked by safety gate: ${gate.status}`);
    this.gate = gate;
  }
}

export type AiWorkoutExercise = {
  name: string;
  name_pt?: string | null;
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

type WorkoutTemplate = {
  key: string;
  label: string;
  sessions: Array<{ day: string; focus: string; patterns: string[] }>;
  variability: "low" | "moderate";
};

function selectWorkoutTemplate(training: TrainingProfile | null): WorkoutTemplate {
  const days = training?.days_per_week ?? 3;
  const beginner = training?.experience_level === "nunca_treinei";
  if (days === 2) return {
    key: "FULL_BODY_AB",
    label: "Full body A/B",
    variability: beginner ? "low" : "moderate",
    sessions: [
      { day: "Treino A", focus: "Corpo inteiro · joelho e empurrar", patterns: ["dominante de joelho", "empurrar horizontal", "puxar horizontal", "dominante de quadril", "complementar", "tronco"] },
      { day: "Treino B", focus: "Corpo inteiro · quadril e puxar", patterns: ["dominante de quadril", "puxar vertical", "empurrar vertical ou inclinado", "unilateral de membros inferiores", "complementar", "tronco"] }
    ]
  };
  if (days === 3) return {
    key: beginner ? "FULL_BODY_AB_ROTATING" : "FULL_BODY_ABC",
    label: beginner ? "Full body A/B alternado" : "Full body A/B/C",
    variability: beginner ? "low" : "moderate",
    sessions: beginner ? [
      { day: "Treino A", focus: "Corpo inteiro · joelho e empurrar", patterns: ["dominante de joelho", "empurrar horizontal", "puxar horizontal", "dominante de quadril leve", "complementar", "tronco"] },
      { day: "Treino B", focus: "Corpo inteiro · quadril e puxar", patterns: ["dominante de quadril", "puxar vertical", "empurrar vertical ou inclinado", "unilateral de membros inferiores", "complementar", "tronco"] },
      { day: "Treino A", focus: "Corpo inteiro · repetição técnica", patterns: ["dominante de joelho", "empurrar horizontal", "puxar horizontal", "dominante de quadril leve", "complementar", "tronco"] }
    ] : [
      { day: "Treino A", focus: "Corpo inteiro · joelho e empurrar", patterns: ["dominante de joelho", "empurrar horizontal", "puxar horizontal", "dominante de quadril leve", "complementar", "tronco"] },
      { day: "Treino B", focus: "Corpo inteiro · quadril e puxar", patterns: ["dominante de quadril", "puxar vertical", "empurrar vertical ou inclinado", "unilateral de membros inferiores", "complementar", "tronco"] },
      { day: "Treino C", focus: "Corpo inteiro · equilíbrio", patterns: ["dominante de joelho alternativo", "puxar horizontal alternativo", "empurrar horizontal alternativo", "extensão de quadril", "unilateral ou carregada", "tronco"] }
    ]
  };
  if (days === 4) return {
    key: "UPPER_LOWER_AB",
    label: "Superior/inferior A/B",
    variability: beginner ? "low" : "moderate",
    sessions: [
      { day: "Superior A", focus: "Superior · empurrar e puxar", patterns: ["empurrar horizontal", "puxar horizontal", "puxar vertical", "empurrar vertical", "deltoide", "braços"] },
      { day: "Inferior A", focus: "Inferior · joelho e quadril", patterns: ["dominante de joelho", "dominante de quadril", "unilateral", "flexão de joelho", "panturrilha", "tronco"] },
      { day: "Superior B", focus: "Superior · variações", patterns: ["puxar horizontal alternativo", "empurrar inclinado", "puxar vertical", "empurrar vertical alternativo", "deltoide posterior", "braços"] },
      { day: "Inferior B", focus: "Inferior · variações", patterns: ["dominante de quadril", "dominante de joelho alternativo", "unilateral", "extensão de quadril", "panturrilha", "tronco"] }
    ]
  };
  return {
    key: "HYBRID_5D",
    label: "Híbrido superior/inferior + full body",
    variability: "moderate",
    sessions: [
      { day: "Superior A", focus: "Superior · base", patterns: ["empurrar horizontal", "puxar horizontal", "puxar vertical", "empurrar vertical", "deltoide", "braços"] },
      { day: "Inferior A", focus: "Inferior · base", patterns: ["dominante de joelho", "dominante de quadril", "unilateral", "flexão de joelho", "panturrilha", "tronco"] },
      { day: "Full body leve", focus: "Corpo inteiro · baixa demanda", patterns: ["dominante de joelho leve", "empurrar leve", "puxar leve", "extensão de quadril leve", "mobilidade", "tronco"] },
      { day: "Superior B", focus: "Superior · volume moderado", patterns: ["puxar horizontal alternativo", "empurrar inclinado", "puxar vertical", "empurrar vertical alternativo", "deltoide posterior", "braços"] },
      { day: "Inferior B", focus: "Inferior · volume moderado", patterns: ["dominante de quadril", "dominante de joelho alternativo", "unilateral", "extensão de quadril", "panturrilha", "tronco"] }
    ]
  };
}

function buildPlanSchema(allowedExerciseNames: string[], template: WorkoutTemplate) {
  return {
    type: "object",
    properties: {
      weekFocus: { type: "string" },
      riskLevel: { type: "string", enum: ["low", "medium", "high"] },
      rationale: { type: "string" },
      workouts: {
        type: "array",
        minItems: template.sessions.length,
        maxItems: template.sessions.length,
        items: {
          type: "object",
          properties: {
            day: { type: "string", enum: Array.from(new Set(template.sessions.map((session) => session.day))) },
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

  const [profile, trainingProfile, anamnesisRow, weights, sideEffects, checkins, applications, missedDoses, workoutLogs, reassessment] = await Promise.all([
    supabase.from("canetta_profiles").select("name, medication, current_dose, frequency, height_cm, goal_weight, biggest_difficulty, created_at").eq("user_id", userId).maybeSingle(),
    supabase.from("canetta_training_profiles").select("experience_level, training_location, days_per_week, minutes_per_session, limitations").eq("user_id", userId).maybeSingle(),
    supabase.from("canetta_anamnesis").select("data, consent").eq("user_id", userId).maybeSingle(),
    supabase.from("canetta_weight_entries").select("weight, recorded_at").eq("user_id", userId).order("recorded_at", { ascending: false }).limit(8),
    supabase.from("canetta_side_effects").select("types, intensity, duration, recorded_at").eq("user_id", userId).gte("recorded_at", sevenDaysAgo).order("recorded_at", { ascending: false }).limit(10),
    supabase.from("canetta_daily_checkins").select("date, hunger_level, energy_level").eq("user_id", userId).order("date", { ascending: false }).limit(7),
    supabase.from("canetta_dose_applications").select("applied_at").eq("user_id", userId).gte("applied_at", fourteenDaysAgo),
    supabase.from("canetta_missed_doses").select("reason, scheduled_for").eq("user_id", userId).gte("scheduled_for", fourteenDaysAgo),
    supabase.from("canetta_workout_logs").select("exercise_name, body_part, sets_completed, reps_completed, difficulty_felt, completed_at").eq("user_id", userId).order("completed_at", { ascending: false }).limit(15),
    supabase.from("canetta_training_reassessments").select("anchor_strength, function_level, pain_level, adherence, medication_change, note, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1)
  ]);

  const training = (trainingProfile.data as TrainingProfile | null) ?? null;

  let exerciseQuery = supabase
    .from("canetta_exercises")
    .select("name, name_pt, difficulty_level, body_part, equipment, target_muscle, gif_url, image_url")
    .order("name")
    .limit(280);

  const allowedDifficulty = training?.experience_level === "nunca_treinei"
    ? ["iniciante"]
    : training?.experience_level === "retomando"
      ? ["iniciante", "intermediario"]
      : ["iniciante", "intermediario", "avancado"];
  exerciseQuery = exerciseQuery.in("difficulty_level", allowedDifficulty);

  if (training?.training_location === "casa_sem_equipamento") {
    exerciseQuery = exerciseQuery.in("equipment", HOME_NO_EQUIPMENT);
  } else if (training?.training_location === "casa_com_equipamento") {
    exerciseQuery = exerciseQuery.in("equipment", HOME_WITH_EQUIPMENT);
  }

  const exercises = await exerciseQuery;

  const anamnesis = (anamnesisRow.data?.data as AnamnesisData | undefined) ?? null;
  const consent = anamnesisRow.data?.consent === true;

  return {
    profile: profile.data,
    training,
    anamnesis,
    consent,
    weights: weights.data ?? [],
    sideEffects: sideEffects.data ?? [],
    checkins: checkins.data ?? [],
    applications: applications.data ?? [],
    missedDoses: missedDoses.data ?? [],
    workoutLogs: workoutLogs.data ?? [],
    reassessment: reassessment.data?.[0] ?? null,
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

function buildPrompt(context: Awaited<ReturnType<typeof gatherUserContext>>, gate: GateResult) {
  const { profile, training, anamnesis, weights, sideEffects, checkins, applications, missedDoses, workoutLogs, exercises, reassessment } = context;
  const template = selectWorkoutTemplate(training);

  const weightLines = weights.map((w) => `${new Date(w.recorded_at).toISOString().slice(0, 10)}: ${w.weight} kg`).join("\n") || "Sem registros de peso.";
  const symptomLines = sideEffects.map((s) => `${new Date(s.recorded_at).toISOString().slice(0, 10)}: ${(s.types ?? []).join(", ")} (intensidade ${s.intensity ?? "?"}/10, duração ${s.duration ?? "?"})`).join("\n") || "Sem sintomas registrados nos últimos 7 dias.";
  const checkinLines = checkins.map((c) => `${c.date}: fome ${c.hunger_level ?? "?"}/10, energia ${c.energy_level ?? "?"}/10`).join("\n") || "Sem check-ins diários recentes.";
  const workoutLines = workoutLogs.map((w) => `${new Date(w.completed_at).toISOString().slice(0, 10)}: ${w.exercise_name}${w.sets_completed ? ` ${w.sets_completed}x${w.reps_completed ?? "?"}` : ""}${w.difficulty_felt ? ` (sentiu: ${w.difficulty_felt})` : ""}`).join("\n") || "Nenhum treino registrado ainda.";
  const reassessmentLine = reassessment
    ? `Última reavaliação (${new Date(reassessment.created_at).toISOString().slice(0, 10)}): força ${reassessment.anchor_strength}; função ${reassessment.function_level}; dor ${reassessment.pain_level}; aderência ${reassessment.adherence}; mudança de medicação ${reassessment.medication_change ? "sim" : "não"}. ${reassessment.note ?? ""}`
    : "Sem reavaliação periódica registrada.";
  const missedLines = missedDoses.map((m) => `${new Date(m.scheduled_for).toISOString().slice(0, 10)}: ${m.reason ?? "motivo não informado"}`).join("\n") || "Nenhuma dose perdida registrada.";
  const catalogLines = exercises.map((e) => `- ${e.name} | nome em português: ${e.name_pt ?? "?"} | nível: ${e.difficulty_level ?? "?"} | região: ${e.body_part ?? "?"} | alvo: ${e.target_muscle ?? "?"} | equipamento: ${e.equipment ?? "?"}`).join("\n");

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

=== TEMPLATE SEMANAL FECHADO — NÃO ALTERAR ===
Template: ${template.key} · ${template.label}
Variabilidade de exercícios: ${template.variability} (iniciante mantém a maior parte dos movimentos por várias semanas)
Você deve devolver exatamente estas sessões, nesta ordem:
${template.sessions.map((session, index) => `${index + 1}. ${session.day} — ${session.focus}\n   Padrões obrigatórios: ${session.patterns.join("; ")}`).join("\n")}
Não crie uma divisão por músculo, não troque o template e não concentre todos os exercícios de pernas, peito ou costas em um único dia.

=== TRIAGEM DE SEGURANÇA (gate determinístico já aplicado pelo sistema — respeite integralmente) ===
${anamnesis ? anamnesisPromptSummary(anamnesis, gate) : "Triagem não disponível — gere apenas sessões de baixa demanda."}

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

=== REAVALIAÇÃO PERIÓDICA ===
${reassessmentLine}

=== CATÁLOGO DE EXERCÍCIOS PERMITIDOS ===
Você SÓ pode prescrever exercícios desta lista, usando o nome EXATAMENTE como escrito.
Leia a região/alvo/equipamento de cada um — escolha pelo que o exercício realmente trabalha, não pelo nome.
${catalogLines}

=== DIRETRIZES DE PROGRAMAÇÃO (padrões operacionais ajustáveis, informados pela literatura geral de treinamento resistido) ===
=== REGRAS DETERMINÍSTICAS DE DOSE (o servidor rejeita qualquer violação) ===
Para cada sessão, respeite o tempo disponível: 20 min = 3–4 exercícios; 30 min = 4–5; 45 min = 5–7; 60 min = 6–8.
Use 1–4 séries por exercício. Evite repetir a mesma família de movimento na mesma sessão (por exemplo, dois presses de peito ou duas remadas), salvo se não houver alternativa segura no catálogo.
O ledger semanal limita cada família a 16 séries diretas (8 em AMARELO). Em AMARELO use no máximo 3–4 exercícios por sessão, no máximo 2 séries por exercício, sem progressão e sem HIIT.
Distribua joelho, quadril, puxar, empurrar e tronco pela semana; não concentre todo o trabalho de uma região em um único dia.
IMPORTANTE SOBRE EVIDÊNCIA: a evidência direta específica para exercício durante uso de GLP-1 ainda é limitada (ensaios dedicados estão em andamento). As regras abaixo são padrões iniciais de programação derivados de literatura geral (ACSM 2026, OMS) e consensos de especialistas — não protocolos clínicos comprovados para GLP-1. Nunca apresente o plano como "cientificamente comprovado".

CONTEXTO (literatura GLP-1 — comunicar sem exagerar):
1. Análises de composição corporal observam que uma fração VARIÁVEL do peso perdido com GLP-1 corresponde a massa magra. Massa magra não é sinônimo de músculo (inclui água, glicogênio, órgãos), e a magnitude varia por medicamento, método e população. Há plausibilidade e evidência indireta favorável de que treino resistido + ingestão proteica adequada ajudem a preservar massa magra — mas ainda faltam ensaios concluídos quantificando isso especificamente durante semaglutida/tirzepatida. Nunca afirme percentuais fixos de perda muscular nem prometa preservação.

NÍVEL DO ALUNO (padrões iniciais ajustáveis, não regras rígidas):
2. "Nunca treinou": preferir full-body, exercícios simples e estáveis, ~2 séries por exercício, faixa de ensino 8-12 reps (outras faixas são válidas), esforço confortável (percepção leve-moderada, ex.: RPE ~5-6) nas primeiras semanas como escolha conservadora inicial — não como teto permanente. Prioridade: consolidar técnica.
3. "Retomando": full-body, 2-3 séries, esforço moderado. Retomar com volume reduzido em relação ao que fazia antes; não assumir a carga antiga.
4. "Treina regularmente": pode usar divisão superior/inferior, ~3 séries, esforço moderado-alto, exercícios mais complexos do catálogo.

TREINO ATÉ A FALHA:
5. Não é necessário para progredir e não é o padrão para iniciantes; evite quando houver técnica instável, sintomas relevantes, má recuperação ou exercício de maior risco. Para usuário experiente, estável e em exercício seguro, aproximar-se da falha ocasionalmente é aceitável — nunca obrigatório.

FREQUÊNCIA E DURAÇÃO (anamnese):
6. Monte o número de dias informado na anamnese (default 3; faixa razoável 2-4), preferindo dias não consecutivos para o mesmo grupo muscular como padrão de recuperação — ajustável por agenda, recuperação e sintomas.
7. Exercícios por sessão conforme o tempo: ~30 min -> 4-5; ~45 min -> 5-6; ~60 min -> 6-8.

VOLUME (padrão operacional, não dose comprovada para GLP-1):
8. Faixa inicial sugerida: 4-8 séries semanais por grupo muscular, 2-3 séries por exercício. Uma série já produz adaptação em iniciantes; mais séries podem ajudar em alguns contextos. Consistência importa mais que complexidade (ACSM 2026).

PROGRESSÃO (por gatilho, NUNCA automática por semana):
9. Só progrida quando TODOS os critérios se cumprirem: completou todas as séries prescritas + técnica aceitável + esforço-alvo não excedido + sem sintomas limitantes. Opções de progressão: aumentar repetições dentro da faixa, OU aumentar a carga no menor incremento disponível, OU adicionar 1 série. PROIBIDO: progressão percentual automática semanal. "Difícil" na semana anterior -> manter ou reduzir.

DESCANSO (orientação funcional, não regra fixa):
10. Padrão 90-180s; encerre o descanso quando a respiração estiver controlada e a técnica pronta. Pode ser menor em exercícios de isolamento com carga leve; maior em compostos pesados.

EQUIPAMENTO:
11. Prescreva apenas exercícios compatíveis com o equipamento da anamnese (o catálogo já está filtrado — respeite-o).

LIMITAÇÕES FÍSICAS:
12. Se a anamnese relata dor/lesão em alguma região, NÃO prescreva exercícios que carreguem essa região; escolha alternativas e mencione isso no rationale. Oriente amplitude sem dor.

AERÓBIO:
13. A meta de ~150-300 min/semana de atividade moderada (OMS) é um alvo de LONGO PRAZO de saúde pública, não dose de entrada. A dose inicial parte da capacidade atual do usuário e progride gradualmente conforme tolerância. Caminhada conta.

SINTOMAS GI (sinais funcionais — sem cortes numéricos):
14. SUSPENDA o treino da sessão e recomende avaliação médica se os registros sugerirem: vômitos persistentes, incapacidade de manter líquidos, dor abdominal intensa ou persistente, sinais de desidratação, tontura importante/quase desmaio.
15. MODIFIQUE (sessão de menor demanda, sem percentual fixo) se os sintomas limitarem as atividades normais, piorarem com movimento ou a alimentação estiver muito reduzida. Sintomas persistentes ou progressivos -> orientar procurar o médico.

ENERGIA/DISPOSIÇÃO (sinal de prontidão, não fórmula):
16. Energia baixa nos check-ins é um sinal de prontidão reduzida — pode justificar uma sessão mais leve nesta semana, escolhida qualitativamente. NUNCA aplique cortes percentuais fixos por nota de energia; o dado subjetivo isolado não determina volume exato.

NUTRIÇÃO (educacional, sem prescrição):
17. NÃO prescreva dieta nem calcule gramas de proteína para o usuário. Pode informar, em tom educacional, que consensos de especialistas discutem faixas de proteína durante o tratamento e que a definição do alvo individual (incluindo qual peso usar no cálculo e restrições clínicas como doença renal) cabe a nutricionista/médico. Hidratação: incentivo geral é aceitável.

=== TAREFA ===
Monte o plano desta semana (dias da semana em português: Segunda, Quarta, Sexta etc.).
OBRIGATÓRIO: entregue exatamente ${template.sessions.length} sessões, com os nomes e a ordem do template acima. A IA escolhe apenas exercícios compatíveis dentro dos padrões; ela não inventa a arquitetura semanal.
- "why" de cada exercício: 1 frase curta em português coerente com o que o exercício REALMENTE trabalha e com os dados do usuário.
- "rationale": 2-3 frases citando anamnese e dados (nível, peso, sintomas, energia, histórico). Trate as escolhas como padrões ajustáveis de organização de movimento — nunca como protocolo clínico comprovado.
- "nutritionAdvice": 1-2 frases EDUCACIONAIS (sem prescrever gramas/dieta; pode citar que o alvo proteico individual deve ser definido com nutricionista/médico; incentivo à hidratação é ok).
- "warning": null, OU uma frase de alerta. OBRIGATÓRIO alertar e recomendar avaliação médica se houver sinais funcionais de alarme (regra 14).
- NUNCA prometa resultados médicos. NUNCA ajuste dose de medicamento. O plano é orientação educacional de movimento, não prescrição médica ou de treinamento individualizado supervisionado.
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

  // Gate de segurança determinístico: a IA só roda em status verde ou amarelo.
  const gate = evaluateGate(context.anamnesis, context.consent);
  if (gate.status === "vermelho" || gate.status === "liberacao" || gate.status === "insuficiente") {
    throw new GateBlockedError(gate);
  }

  const prompt = buildPrompt(context, gate);
  const allowedNames = context.exercises.map((exercise) => exercise.name);
  const template = selectWorkoutTemplate(context.training);

  const openai = new OpenAI({ apiKey });
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 4000,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "weekly_workout_plan",
        strict: true,
        schema: buildPlanSchema(allowedNames, template) as unknown as Record<string, unknown>
      }
    },
    messages: [{ role: "user", content: prompt }]
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No content in model response.");
  }

  const plan = JSON.parse(content) as AiWorkoutPlan;
  const expectedDays = template.sessions.map((session) => session.day);
  const actualDays = Array.isArray(plan.workouts) ? plan.workouts.map((workout) => workout.day) : [];
  if (actualDays.length !== expectedDays.length || actualDays.some((day, index) => day !== expectedDays[index])) {
    throw new Error(`O plano não respeitou o template ${template.key}. Gere novamente.`);
  }

  const validation = validateWorkoutPlan(plan, context.training, gate, context.exercises);
  if (!validation.ok) {
    throw new Error(`O plano falhou na validação de dose e redundância: ${validation.errors.join(" | ")}`);
  }

  // Anexa GIF/imagem do catálogo a cada exercício (match exato + fallback normalizado).
  const mediaByName = new Map<string, { gif_url: string | null; image_url: string | null; name_pt: string | null }>();
  for (const exercise of context.exercises) {
    const media = { gif_url: exercise.gif_url ?? null, image_url: exercise.image_url ?? null, name_pt: exercise.name_pt ?? null };
    mediaByName.set(exercise.name.trim().toLowerCase(), media);
    mediaByName.set(normalizeName(exercise.name), media);
  }
  for (const day of plan.workouts ?? []) {
    for (const exercise of day.exercises ?? []) {
      const media = mediaByName.get(exercise.name.trim().toLowerCase()) ?? mediaByName.get(normalizeName(exercise.name));
      exercise.gif_url = media?.gif_url ?? null;
      exercise.image_url = media?.image_url ?? null;
      exercise.name_pt = media?.name_pt ?? null;
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
        gate,
        training: context.training,
        weights: context.weights.slice(0, 4),
        side_effects: context.sideEffects.slice(0, 5),
        checkins: context.checkins.slice(0, 5),
        workout_count: context.workoutLogs.length,
        reassessment: context.reassessment ?? null,
        volume_ledger: validation.ledger,
        template: { key: template.key, label: template.label, sessions: template.sessions }
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
