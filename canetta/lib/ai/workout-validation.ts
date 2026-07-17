import type { AiWorkoutPlan, TrainingProfile } from "@/lib/ai/prescribe-workout";
import type { GateResult } from "@/lib/ai/anamnesis";
import { classifyExercise, isProductionEligible, type ExerciseTaxonomy } from "@/lib/ai/exercise-taxonomy";

export type CatalogExercise = {
  name: string;
  name_pt?: string | null;
  name_pt_status?: "reviewed" | "automatic" | "blocked" | null;
  body_part?: string | null;
  target_muscle?: string | null;
  equipment?: string | null;
  media_verified?: boolean | null;
  production_eligible?: boolean | null;
  primary_pattern?: string | null;
  movement_family?: string | null;
  joint_class?: ExerciseTaxonomy["jointClass"] | null;
  session_role?: ExerciseTaxonomy["sessionRole"] | null;
  exercise_tier?: ExerciseTaxonomy["tier"] | null;
  valid_slots?: string[] | null;
  valid_session_types?: ExerciseTaxonomy["validSessionTypes"] | null;
  technical_complexity?: number | null;
  balance_demand?: number | null;
  mobility_demand?: number | null;
  setup_complexity?: number | null;
  progression_clarity?: number | null;
  unsupervised_suitability?: number | null;
  is_hybrid?: boolean | null;
  is_unilateral?: boolean | null;
  requires_spotter?: boolean | null;
  context_scores?: Record<string, number> | null;
};

const SESSION_SLOTS: Record<number, [number, number]> = { 20: [3, 4], 30: [4, 6], 45: [5, 7], 60: [6, 8] };
export function getSessionExerciseBudget(minutes: number, yellow: boolean): [number, number] {
  const key = Object.keys(SESSION_SLOTS).map(Number).sort((a, b) => a - b).find((value) => minutes <= value) ?? 60;
  const [min, max] = SESSION_SLOTS[key];
  return yellow ? [Math.min(min, 3), Math.min(max, 4)] : [min, max];
}
const normalize = (value: string | null | undefined) => (value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

export type VolumeLedger = Record<string, { direct_sets: number; exercises: number }>;
export function buildVolumeLedger(plan: AiWorkoutPlan, catalog: CatalogExercise[]): VolumeLedger {
  const byName = new Map(catalog.map((item) => [normalize(item.name), item]));
  const ledger: VolumeLedger = {};
  for (const workout of plan.workouts ?? []) for (const exercise of workout.exercises ?? []) {
    const item = byName.get(normalize(exercise.name));
    const key = item ? classifyExercise(item).movementFamily : "unknown_catalog_item";
    ledger[key] ??= { direct_sets: 0, exercises: 0 };
    ledger[key].direct_sets += Math.max(0, Math.round(exercise.sets || 0));
    ledger[key].exercises += 1;
  }
  return ledger;
}

function requiredCoverage(focus: string): { sessionType: "full_body" | "upper" | "lower"; patterns: string[] } {
  const value = normalize(focus);
  if (value.includes("superior")) return { sessionType: "upper", patterns: ["horizontal_push", "horizontal_pull", "vertical_pull", "vertical_push"] };
  if (value.includes("inferior")) return { sessionType: "lower", patterns: ["knee_dominant", "hip_dominant"] };
  return { sessionType: "full_body", patterns: ["knee_dominant", "hip_dominant", "horizontal_push", "horizontal_pull"] };
}

function findCatalogItem(name: string, catalog: CatalogExercise[]) {
  return catalog.find((candidate) => normalize(candidate.name) === normalize(name));
}

export function validateWeeklyCoverage(plan: AiWorkoutPlan) {
  const errors: string[] = [];
  const patterns = new Set<string>();
  for (const workout of plan.workouts ?? []) {
    const sessionPatterns = new Set((workout.exercises ?? []).map((exercise) => exercise.pattern).filter(Boolean));
    for (const pattern of sessionPatterns) patterns.add(pattern as string);
    if (normalize(workout.focus).includes("superior") || normalize(workout.focus).includes("inferior")) continue;
    for (const pattern of ["knee_dominant", "hip_dominant", "horizontal_push", "horizontal_pull"]) if (!sessionPatterns.has(pattern)) errors.push(`${workout.day}: full body sem ${pattern}.`);
  }
  for (const pattern of ["knee_dominant", "hip_dominant", "horizontal_push", "horizontal_pull"]) if (!patterns.has(pattern)) errors.push(`Semana sem cobertura de ${pattern}.`);
  return { ok: errors.length === 0, errors };
}

export function validateWorkoutPlan(plan: AiWorkoutPlan, training: TrainingProfile | null, gate: GateResult, catalog: CatalogExercise[]) {
  const minutes = training?.minutes_per_session ?? 30;
  const [minSlots, maxSlots] = getSessionExerciseBudget(minutes, gate.status === "amarelo");
  const errors: string[] = [];
  const curatedCatalogMode = catalog.length < 50;
  const seen = new Map<string, number>();
  for (const workout of plan.workouts ?? []) {
    const exercises = workout.exercises ?? [];
    if (exercises.length < minSlots || exercises.length > maxSlots) errors.push(`${workout.day}: ${exercises.length} exercícios; esperado entre ${minSlots} e ${maxSlots} para ${minutes} min.`);
    const sessionSets = exercises.reduce((sum, exercise) => sum + (Number.isFinite(exercise.sets) ? exercise.sets : 0), 0);
    if (sessionSets > (gate.status === "amarelo" ? 12 : 24)) errors.push(`${workout.day}: volume total de séries acima do limite operacional.`);
    const coverage = requiredCoverage(workout.focus);
    const taxonomies: Array<{ name: string; taxonomy: ExerciseTaxonomy }> = [];
    const families = new Map<string, number>();
    let trunkCount = 0;
    let accessoryStarted = false;
    for (const exercise of exercises) {
      const item = findCatalogItem(exercise.name, catalog);
      if (!item) { errors.push(`${workout.day}: exercício fora do catálogo permitido (${exercise.name}).`); continue; }
      if (!isProductionEligible(item)) errors.push(`${workout.day}: exercício não elegível para produção (${exercise.name}); requer nome/mídia/taxonomia revisados.`);
      const taxonomy = classifyExercise(item);
      const priorPatterns = new Set<string>(taxonomies.map(({ taxonomy: prior }) => prior.primaryPattern));
      if (taxonomy.sessionRole === "accessory") accessoryStarted = true;
      if (taxonomy.sessionRole === "primary" && accessoryStarted) errors.push(`${workout.day}: exercício principal depois de acessório (${exercise.name}).`);
      if (!curatedCatalogMode && taxonomy.sessionRole === "accessory" && coverage.patterns.some((pattern) => !priorPatterns.has(pattern))) errors.push(`${workout.day}: acessório antes da cobertura dos padrões principais.`);
      taxonomies.push({ name: exercise.name, taxonomy });
      if (!curatedCatalogMode && taxonomy.validSessionTypes.includes(coverage.sessionType) === false) errors.push(`${workout.day}: ${exercise.name} não é válido para sessão ${coverage.sessionType}.`);
      if (taxonomy.tier === "specialized" || taxonomy.isHybrid || taxonomy.technicalComplexity >= 4) errors.push(`${workout.day}: exercício especializado/híbrido não permitido (${exercise.name}).`);
      if (!Number.isInteger(exercise.sets) || exercise.sets < 1 || exercise.sets > 4) errors.push(`${workout.day}: séries inválidas em ${exercise.name}.`);
      const family = taxonomy.movementFamily;
      const familyCount = (families.get(family) ?? 0) + 1;
      if (!curatedCatalogMode && family !== "trunk" && family !== "accessory" && familyCount > 1) errors.push(`${workout.day}: família redundante ${family}; escolha uma variação diferente ou registre prioridade explícita.`);
      families.set(family, familyCount);
      if (taxonomy.sessionRole === "trunk") trunkCount += 1;
      seen.set(normalize(exercise.name), (seen.get(normalize(exercise.name)) ?? 0) + 1);
    }
    if (!curatedCatalogMode) for (const pattern of coverage.patterns) if (!taxonomies.some(({ taxonomy }) => taxonomy.primaryPattern === pattern || taxonomy.validSlots.includes(pattern))) errors.push(`${workout.day}: falta cobertura obrigatória ${pattern}.`);
    if (trunkCount > 1) errors.push(`${workout.day}: mais de um exercício de tronco sem prioridade explícita.`);
  }
  if (!curatedCatalogMode) {
    const weekly = validateWeeklyCoverage(plan);
    errors.push(...weekly.errors);
  }
  const ledger = buildVolumeLedger(plan, catalog);
  for (const [key, value] of Object.entries(ledger)) if (key !== "unknown_catalog_item" && value.direct_sets > (gate.status === "amarelo" ? 8 : 16)) errors.push(`Ledger semanal: ${key} excede o limite operacional.`);
  if (gate.status === "amarelo" && (plan.workouts ?? []).some((workout) => (workout.exercises ?? []).some((exercise) => exercise.sets > 2))) errors.push("AMARELO: cada exercício deve ter no máximo 2 séries.");
  for (const [name, count] of seen) if (training?.experience_level === "nunca_treinei" && count > 3) errors.push(`Iniciante: ${name} foi repetido mais de 3 vezes na semana.`);
  return { ok: errors.length === 0, errors, ledger };
}
