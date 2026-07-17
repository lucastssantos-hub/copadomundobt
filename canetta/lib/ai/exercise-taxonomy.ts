export type Pattern =
  | "knee_dominant" | "hip_dominant" | "horizontal_push" | "vertical_push"
  | "horizontal_pull" | "vertical_pull" | "unilateral" | "trunk" | "accessory"
  | "mobility" | "conditioning" | "complementary";

export type ExerciseTaxonomy = {
  primaryPattern: Pattern;
  secondaryPatterns: string[];
  movementFamily: string;
  jointClass: "multi_joint" | "single_joint" | "isometric" | "locomotion" | "hybrid";
  sessionRole: "primary" | "secondary" | "accessory" | "trunk" | "conditioning" | "mobility";
  tier: "base" | "variation" | "specialized";
  validSlots: string[];
  validSessionTypes: Array<"full_body" | "upper" | "lower" | "conditioning">;
  technicalComplexity: number;
  balanceDemand: number;
  mobilityDemand: number;
  setupComplexity: number;
  progressionClarity: number;
  unsupervisedSuitability: number;
  isHybrid: boolean;
  isUnilateral: boolean;
  requiresSpotter: boolean;
  mediaVerified: boolean;
  productionEligible: boolean;
  contextScores: Record<string, number>;
  qualityScore: number;
};

type ExerciseInput = {
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

const n = (value: unknown) => String(value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const has = (text: string, pattern: RegExp) => pattern.test(text);

const BASE_BLOCKED = /clean and press|clean and jerk|snatch|muscle ?up|handstand|planche|human flag|pistol squat|dragon flag|archer|kipping|turkish get.?up|depth jump|towel|squat.*row|row.*squat|bridge.*climber|press.*rotation|lunge.*rotation|burpee/;
const TRUNK = /abdominal|crunch|sit[- ]?up|plank|dead bug|bird dog|pallof|oblique|heel touch|mountain climber|twist|anti.?rotation/;
const SINGLE = /biceps|triceps|curl|calf|panturrilha|lateral raise|front raise|rear delt|posterior delt|fly|crucifix|extension|extensora|flexora|adduction|abduction/;
const UNILATERAL = /single arm|one arm|unilateral|single leg|one leg|archer|bulgarian|split squat|step[- ]?up|alternat/;

export function classifyExercise(input: ExerciseInput): ExerciseTaxonomy {
  // Persisted metadata is authoritative. The fallback exists for migration
  // and audit tooling only; it is deliberately conservative and never opts an
  // automatically classified exercise into production.
  if (input.primary_pattern && input.movement_family && input.joint_class && input.session_role && input.exercise_tier) {
    const fallback = classifyByName(input);
    return {
      ...fallback,
      primaryPattern: input.primary_pattern as Pattern,
      movementFamily: input.movement_family,
      jointClass: input.joint_class,
      sessionRole: input.session_role,
      tier: input.exercise_tier,
      validSlots: input.valid_slots ?? fallback.validSlots,
      validSessionTypes: input.valid_session_types ?? fallback.validSessionTypes,
      technicalComplexity: input.technical_complexity ?? fallback.technicalComplexity,
      balanceDemand: input.balance_demand ?? fallback.balanceDemand,
      mobilityDemand: input.mobility_demand ?? fallback.mobilityDemand,
      setupComplexity: input.setup_complexity ?? fallback.setupComplexity,
      progressionClarity: input.progression_clarity ?? fallback.progressionClarity,
      unsupervisedSuitability: input.unsupervised_suitability ?? fallback.unsupervisedSuitability,
      isHybrid: input.is_hybrid ?? fallback.isHybrid,
      isUnilateral: input.is_unilateral ?? fallback.isUnilateral,
      requiresSpotter: input.requires_spotter ?? fallback.requiresSpotter,
      mediaVerified: input.media_verified ?? false,
      productionEligible: input.production_eligible ?? false,
      contextScores: input.context_scores ?? fallback.contextScores
    };
  }
  return classifyByName(input);
}

function classifyByName(input: ExerciseInput): ExerciseTaxonomy {
  const text = n(`${input.name} ${input.target_muscle} ${input.body_part} ${input.equipment}`);
  const isHybrid = has(text, BASE_BLOCKED) && /clean|snatch|press|squat|row|bridge|lunge|burpee/.test(text);
  const isUnilateral = has(text, UNILATERAL);
  const isTrunk = has(text, TRUNK);
  const isSingle = has(text, SINGLE) && !/leg press|chest press|shoulder press/.test(text);
  const specialized = has(text, BASE_BLOCKED);
  let primaryPattern: Pattern = "complementary";
  let movementFamily = "complementary";

  // Specific exceptions precede broad tokens: kneeling squat is not a knee
  // dominant exercise merely because its name contains "squat".
  if (isTrunk) [primaryPattern, movementFamily] = ["trunk", "trunk"];
  else if (has(text, /leg press|hack squat|box squat|goblet squat|squat|lunge|step[- ]?up|leg extension|quadriceps/) && !has(text, /kneeling squat/)) [primaryPattern, movementFamily] = [isUnilateral ? "unilateral" : "knee_dominant", isUnilateral ? "unilateral_lower" : "knee_dominant"];
  else if (has(text, /deadlift|romanian|rdl|hip thrust|glute bridge|good morning|pull.?through|hamstring|glute/)) [primaryPattern, movementFamily] = ["hip_dominant", "hip_hinge"];
  else if (has(text, /chest press|bench press|push up|pushup|press.*chest|pector|peitoral/)) [primaryPattern, movementFamily] = ["horizontal_push", "horizontal_push"];
  else if (has(text, /overhead press|military press|shoulder press|desenvolvimento/)) [primaryPattern, movementFamily] = ["vertical_push", "vertical_push"];
  else if (has(text, /row|remada/)) [primaryPattern, movementFamily] = [isUnilateral ? "unilateral" : "horizontal_pull", isUnilateral ? "unilateral_upper" : "horizontal_pull"];
  else if (has(text, /pull[- ]?up|chin[- ]?up|pulldown|lat pull|puxada|dorsal/)) [primaryPattern, movementFamily] = ["vertical_pull", "vertical_pull"];
  else if (isSingle) [primaryPattern, movementFamily] = ["accessory", has(text, /calf|panturrilha/) ? "calf" : has(text, /biceps|curl/) ? "biceps" : has(text, /triceps/) ? "triceps" : "isolation"];
  else if (has(text, /walk|run|cycle|bike|jump|march/)) [primaryPattern, movementFamily] = ["conditioning", "locomotion"];

  const jointClass: ExerciseTaxonomy["jointClass"] = isHybrid ? "hybrid" : isTrunk && has(text, /plank|pallof|dead bug|bird dog/) ? "isometric" : isSingle ? "single_joint" : "multi_joint";
  const tier: ExerciseTaxonomy["tier"] = specialized ? "specialized" : has(text, /machine|cable|seated|supported|assisted|leg press|chest press|pulldown|hip thrust|row/) ? "base" : "variation";
  const sessionRole: ExerciseTaxonomy["sessionRole"] = isTrunk ? "trunk" : isSingle ? "accessory" : tier === "base" ? "primary" : "secondary";
  const complexity = specialized ? 4 : isHybrid || isUnilateral ? 3 : has(text, /barbell|overhead|jump|hanging/) ? 2 : 1;
  const progressionClarity = has(text, /machine|cable|barbell|dumbbell|leg press|chest press|row|pulldown|hip thrust|flexora|extensora/) && !isHybrid ? 4 : 2;
  const validSessionTypes: ExerciseTaxonomy["validSessionTypes"] = primaryPattern === "conditioning" ? ["conditioning", "full_body"] : primaryPattern === "trunk" || primaryPattern === "accessory" ? ["full_body", "upper", "lower"] : ["full_body", primaryPattern.includes("push") || primaryPattern.includes("pull") ? "upper" : "lower"];
  const validSlots = [primaryPattern, ...(primaryPattern === "unilateral" ? ["unilateral"] : [])];
  const qualityScore = Math.max(0, 100 + (tier === "base" ? 20 : tier === "variation" ? 5 : -40) + progressionClarity * 8 - complexity * 14 - (isHybrid ? 30 : 0) - (isUnilateral ? 6 : 0));
  const productionEligible = input.production_eligible ?? false;
  return {
    primaryPattern, secondaryPatterns: [], movementFamily, jointClass, sessionRole, tier, validSlots, validSessionTypes,
    technicalComplexity: complexity, balanceDemand: isUnilateral ? 3 : 1, mobilityDemand: has(text, /overhead|deep|pistol|snatch/) ? 3 : 1,
    setupComplexity: has(text, /barbell|cable|towel|complex/) ? 2 : 1, progressionClarity,
    unsupervisedSuitability: specialized || has(text, /towel|unstable|jump|clean|snatch/) ? 1 : complexity >= 3 ? 2 : 4,
    isHybrid, isUnilateral, requiresSpotter: has(text, /barbell|bench press|squat rack|heavy/) && !has(text, /machine|assisted/),
    mediaVerified: input.media_verified ?? false, productionEligible,
    contextScores: {}, qualityScore
  };
}

export function isProductionEligible(input: ExerciseInput): boolean {
  const taxonomy = classifyExercise(input);
  return Boolean(input.production_eligible) && input.name_pt_status === "reviewed" && Boolean(input.media_verified) && taxonomy.tier !== "specialized" && !taxonomy.isHybrid;
}

export function rankCatalog<T extends ExerciseInput>(items: T[], experience: "nunca_treinei" | "retomando" | "treino_regular" | undefined, location?: string | null, options?: { anchorNames?: string[] }) {
  const anchors = new Set((options?.anchorNames ?? []).map(n));
  const ranked = items
    .map((item) => ({ item, taxonomy: classifyExercise(item) }))
    .filter(({ item, taxonomy }) => isProductionEligible(item) && taxonomy.validSessionTypes.length > 0 && (experience === "nunca_treinei" ? taxonomy.tier === "base" && taxonomy.technicalComplexity <= 2 && !taxonomy.isHybrid : experience === "retomando" ? taxonomy.tier !== "specialized" && taxonomy.technicalComplexity <= 3 && !taxonomy.isHybrid : taxonomy.technicalComplexity <= 3 || taxonomy.tier === "base"))
    .map(({ item, taxonomy }) => ({ item, taxonomy, score: taxonomy.qualityScore + (location === "academia" && taxonomy.tier === "base" ? 10 : 0) + (item.name_pt_status === "reviewed" ? 15 : 0) + (anchors.has(n(item.name)) ? 100 : 0) }))
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name));
  return Array.from(new Map(ranked.map((entry) => [n(entry.item.name), entry])).values());
}
