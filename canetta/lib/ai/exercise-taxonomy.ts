export type ExerciseTaxonomy = {
  jointClass: "multi_joint" | "single_joint" | "isometric" | "locomotion" | "hybrid";
  sessionRole: "primary" | "secondary" | "accessory" | "trunk" | "conditioning" | "mobility";
  primaryPattern: string;
  secondaryPatterns: string[];
  movementFamily: string;
  tier: "base" | "variation" | "specialized";
  complexity: number;
  progressionClarity: number;
  unsupervisedSuitability: number;
  isHybrid: boolean;
  isUnilateral: boolean;
  qualityScore: number;
};

const n = (value: string | null | undefined) => (value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function classifyExercise(input: { name: string; target_muscle?: string | null; body_part?: string | null; equipment?: string | null }): ExerciseTaxonomy {
  const text = n(`${input.name} ${input.target_muscle} ${input.body_part} ${input.equipment}`);
  const isHybrid = /clean and press|thruster|squat.*row|row.*squat|bridge.*climber|lunge.*rotation|press.*rotation|cross body|cross-body|burpee|complex/.test(text);
  const isUnilateral = /single arm|one arm|unilateral|single leg|one leg|archer|bulgarian|split squat|step up/.test(text);
  const specialized = /clean and press|snatch|muscle up|handstand|planche|human flag|pistol squat|dragon flag|archer|turkish get up|kipping|towel|kneeling squat|rotation/.test(text);
  const trunk = /abdominal|crunch|sit-up|sit up|plank|dead bug|bird dog|pallof|oblique|heel touch|mountain climber/.test(text);
  const accessory = /biceps|triceps|curl|calf|panturrilha|raise|fly|extension|extensora|flexora/.test(text);
  let primaryPattern = "complementar";
  let movementFamily = "outro";
  if (/leg press|squat|agachamento|lunge|step up|leg extension|quadriceps/.test(text) && !/kneeling squat/.test(text)) { primaryPattern = "knee_dominant"; movementFamily = "dominante_joelho"; }
  if (/deadlift|romanian|rdl|hip thrust|glute bridge|good morning|hamstring|glute/.test(text)) { primaryPattern = "hip_dominant"; movementFamily = "dominante_quadril"; }
  if (/chest press|bench press|push up|pushup|press.*chest|pectorals|peitoral/.test(text)) { primaryPattern = "horizontal_push"; movementFamily = "empurrar_horizontal"; }
  if (/overhead press|military press|shoulder press|desenvolvimento/.test(text)) { primaryPattern = "vertical_push"; movementFamily = "empurrar_vertical"; }
  if (/row|remada/.test(text)) { primaryPattern = "horizontal_pull"; movementFamily = "puxar_horizontal"; }
  if (/pull-up|pull up|chin-up|chin up|pulldown|lat pull|puxada/.test(text)) { primaryPattern = "vertical_pull"; movementFamily = "puxar_vertical"; }
  if (trunk) { primaryPattern = "trunk"; movementFamily = "tronco"; }
  if (accessory && primaryPattern === "complementar") { primaryPattern = "accessory"; movementFamily = /calf|panturrilha/.test(text) ? "panturrilha" : /biceps|curl/.test(text) ? "biceps" : /triceps/.test(text) ? "triceps" : "acessorio"; }
  if (isHybrid) { primaryPattern = "hybrid"; movementFamily = "hibrido"; }

  const secondaryPatterns = [
    /glute|hip thrust|deadlift/.test(text) ? "hip_extension" : "",
    /triceps|chest press|push up/.test(text) ? "elbow_extension" : "",
    /biceps|row|pull/.test(text) ? "elbow_flexion" : ""
  ].filter(Boolean);
  const jointClass = isHybrid ? "hybrid" : trunk && /plank|pallof|dead bug|bird dog/.test(text) ? "isometric" : accessory ? "single_joint" : "multi_joint";
  const tier = specialized ? "specialized" : /machine|cable|seated|supported|assisted|leg press|chest press|pulldown|hip thrust/.test(text) ? "base" : "variation";
  const complexity = specialized ? 4 : isHybrid || isUnilateral ? 3 : /barbell|overhead|jump|hanging/.test(text) ? 2 : 1;
  const progressionClarity = /machine|cable|barbell|dumbbell|leg press|chest press|row|pulldown|hip thrust/.test(text) && !isHybrid ? 4 : 2;
  const unsupervisedSuitability = specialized || /towel|unstable|jump|clean|snatch/.test(text) ? 1 : complexity >= 3 ? 2 : 4;
  const sessionRole = trunk ? "trunk" : accessory ? "accessory" : tier === "base" ? "primary" : "secondary";
  const qualityScore = Math.max(0, 100 + (tier === "base" ? 24 : tier === "variation" ? 8 : -34) + progressionClarity * 7 + unsupervisedSuitability * 5 - complexity * 12 - (isHybrid ? 28 : 0) - (isUnilateral ? 8 : 0));
  return { jointClass, sessionRole, primaryPattern, secondaryPatterns, movementFamily, tier, complexity, progressionClarity, unsupervisedSuitability, isHybrid, isUnilateral, qualityScore };
}

export function rankCatalog<T extends { name: string; target_muscle?: string | null; body_part?: string | null; equipment?: string | null }>(items: T[], experience: "nunca_treinei" | "retomando" | "treino_regular" | undefined, location?: string | null) {
  const ranked = items.map((item) => ({ item, taxonomy: classifyExercise(item) })).filter(({ taxonomy }) => {
    if (experience === "nunca_treinei") return taxonomy.tier !== "specialized" && taxonomy.complexity <= 2 && !taxonomy.isHybrid;
    if (experience === "retomando") return taxonomy.tier !== "specialized" && taxonomy.complexity <= 3 && !taxonomy.isHybrid;
    return taxonomy.complexity <= 3 || taxonomy.tier === "base";
  }).map(({ item, taxonomy }) => ({ item, taxonomy, score: taxonomy.qualityScore + (location === "academia" && taxonomy.tier === "base" ? 10 : 0) + (location?.startsWith("casa") && taxonomy.tier === "base" ? 5 : 0) })).sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name));
  return ranked;
}
