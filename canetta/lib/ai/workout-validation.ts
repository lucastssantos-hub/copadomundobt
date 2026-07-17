import type { AiWorkoutPlan, TrainingProfile } from "@/lib/ai/prescribe-workout";
import type { GateResult } from "@/lib/ai/anamnesis";

type CatalogExercise = {
  name: string;
  body_part?: string | null;
  target_muscle?: string | null;
};

const SESSION_SLOTS: Record<number, [number, number]> = {
  20: [3, 4],
  30: [4, 5],
  45: [5, 7],
  60: [6, 8]
};

function slotBudget(minutes: number, yellow: boolean): [number, number] {
  const key = Object.keys(SESSION_SLOTS).map(Number).sort((a, b) => a - b).find((value) => minutes <= value) ?? 60;
  const [min, max] = SESSION_SLOTS[key];
  // Os templates atuais têm seis slots de movimento. Em sessões de 30 min,
  // seis exercícios ainda cabem quando são usados 1–2 sets e não há HIIT.
  const adjustedMax = key === 30 ? Math.max(max, 6) : max;
  return yellow ? [Math.min(min, 3), Math.min(adjustedMax, 4)] : [min, adjustedMax];
}

function normalize(value: string | null | undefined) {
  return (value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function family(exercise: CatalogExercise): string {
  const text = normalize(`${exercise.name} ${exercise.target_muscle} ${exercise.body_part}`);
  if (/bench press|chest press|push up|pushup|supino|peitoral|chest fly|crucifix/.test(text)) return "pressao_peito";
  if (/row|remada|upper back|trapezius|rhomboid/.test(text)) return "remada";
  if (/pull up|chin up|pulldown|latissimus|dorsal/.test(text)) return "puxada_vertical";
  if (/squat|leg press|lunge|step up|quadriceps|quad/.test(text)) return "dominante_joelho";
  if (/deadlift|romanian|hip thrust|glute|hamstring|good morning/.test(text)) return "dominante_quadril";
  if (/curl|biceps/.test(text)) return "flexao_cotovelo";
  if (/triceps|pushdown|extension.*elbow/.test(text)) return "extensao_cotovelo";
  if (/plank|crunch|sit up|abdominal|oblique|core/.test(text)) return "tronco";
  return "outro";
}

export type VolumeLedger = Record<string, { direct_sets: number; exercises: number }>;

export function buildVolumeLedger(plan: AiWorkoutPlan, catalog: CatalogExercise[]): VolumeLedger {
  const byName = new Map(catalog.map((item) => [normalize(item.name), item]));
  const ledger: VolumeLedger = {};
  for (const workout of plan.workouts ?? []) {
    for (const exercise of workout.exercises ?? []) {
      const item = byName.get(normalize(exercise.name));
      const key = item ? family(item) : "outro";
      ledger[key] ??= { direct_sets: 0, exercises: 0 };
      ledger[key].direct_sets += Math.max(0, Math.round(exercise.sets || 0));
      ledger[key].exercises += 1;
    }
  }
  return ledger;
}

export function validateWorkoutPlan(plan: AiWorkoutPlan, training: TrainingProfile | null, gate: GateResult, catalog: CatalogExercise[]) {
  const minutes = training?.minutes_per_session ?? 30;
  const [minSlots, maxSlots] = slotBudget(minutes, gate.status === "amarelo");
  const errors: string[] = [];
  const seen = new Map<string, number>();

  for (const workout of plan.workouts ?? []) {
    const count = workout.exercises?.length ?? 0;
    if (count < minSlots || count > maxSlots) errors.push(`${workout.day}: ${count} exercícios; esperado entre ${minSlots} e ${maxSlots} para ${minutes} min.`);
    const sessionSets = (workout.exercises ?? []).reduce((sum, exercise) => sum + (Number.isFinite(exercise.sets) ? exercise.sets : 0), 0);
    if (sessionSets > (gate.status === "amarelo" ? 12 : 24)) errors.push(`${workout.day}: volume total de séries acima do limite operacional.`);
    const families = new Map<string, number>();
    for (const exercise of workout.exercises ?? []) {
      if (!Number.isInteger(exercise.sets) || exercise.sets < 1 || exercise.sets > 4) errors.push(`${workout.day}: séries inválidas em ${exercise.name}.`);
      const item = catalog.find((candidate) => normalize(candidate.name) === normalize(exercise.name));
      const currentFamily = item ? family(item) : "outro";
      const familyCount = (families.get(currentFamily) ?? 0) + 1;
      if (currentFamily !== "outro" && familyCount > 2) errors.push(`${workout.day}: redundância excessiva na família ${currentFamily}.`);
      families.set(currentFamily, familyCount);
      const key = normalize(exercise.name);
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
  }

  const ledger = buildVolumeLedger(plan, catalog);
  for (const [key, value] of Object.entries(ledger)) {
    if (value.direct_sets > (gate.status === "amarelo" ? 8 : 16)) errors.push(`Ledger semanal: ${key} excede o limite de ${gate.status === "amarelo" ? 8 : 16} séries diretas.`);
  }
  if (gate.status === "amarelo" && (plan.workouts ?? []).some((workout) => (workout.exercises ?? []).some((exercise) => exercise.sets > 2))) {
    errors.push("AMARELO: cada exercício deve ter no máximo 2 séries e a sessão deve permanecer de baixa demanda.");
  }
  for (const [name, count] of seen) {
    if (training?.experience_level === "nunca_treinei" && count > 3) errors.push(`Iniciante: ${name} foi repetido mais de 3 vezes na semana.`);
  }

  return { ok: errors.length === 0, errors, ledger };
}
