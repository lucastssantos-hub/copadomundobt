// Espelho determinístico do contrato de lib/ai/exercise-taxonomy.ts para os
// scripts de seed/enriquecimento. Regras de produto, não evidência clínica.
const normalize = (value) => String(value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const test = (text, re) => re.test(text);
const hybridRe = /clean and press|clean and jerk|snatch|muscle ?up|handstand|planche|human flag|pistol squat|dragon flag|archer|kipping|turkish get.?up|depth jump|towel|squat.*row|row.*squat|bridge.*climber|press.*rotation|lunge.*rotation|burpee/;

export function classifyOperational(exercise, { namePtStatus = "automatic", productionEligible = false, mediaVerified = false } = {}) {
  const text = normalize(`${exercise.name} ${exercise.target ?? exercise.target_muscle ?? ""} ${exercise.body_part ?? exercise.category ?? ""} ${exercise.equipment ?? ""}`);
  const isHybrid = test(text, hybridRe) && /clean|snatch|press|squat|row|bridge|lunge|burpee/.test(text);
  const isUnilateral = /single arm|one arm|unilateral|single leg|one leg|archer|bulgarian|split squat|step[- ]?up|alternat/.test(text);
  const trunk = /abdominal|crunch|sit[- ]?up|plank|dead bug|bird dog|pallof|oblique|heel touch|mountain climber|twist|anti.?rotation/.test(text);
  const single = /biceps|triceps|curl|calf|panturrilha|lateral raise|front raise|rear delt|posterior delt|fly|crucifix|extension|extensora|flexora|adduction|abduction/.test(text) && !/leg press|chest press|shoulder press/.test(text);
  let primaryPattern = "complementary";
  let movementFamily = "complementary";
  if (trunk) [primaryPattern, movementFamily] = ["trunk", "trunk"];
  else if (/leg press|hack squat|box squat|goblet squat|squat|lunge|step[- ]?up|leg extension|quadriceps/.test(text) && !/kneeling squat/.test(text)) [primaryPattern, movementFamily] = [isUnilateral ? "unilateral" : "knee_dominant", isUnilateral ? "unilateral_lower" : "knee_dominant"];
  else if (/deadlift|romanian|rdl|hip thrust|glute bridge|good morning|pull.?through|hamstring|glute/.test(text)) [primaryPattern, movementFamily] = ["hip_dominant", "hip_hinge"];
  else if (/chest press|bench press|push up|pushup|press.*chest|pector|peitoral/.test(text)) [primaryPattern, movementFamily] = ["horizontal_push", "horizontal_push"];
  else if (/overhead press|military press|shoulder press|desenvolvimento/.test(text)) [primaryPattern, movementFamily] = ["vertical_push", "vertical_push"];
  else if (/row|remada/.test(text)) [primaryPattern, movementFamily] = [isUnilateral ? "unilateral" : "horizontal_pull", isUnilateral ? "unilateral_upper" : "horizontal_pull"];
  else if (/pull[- ]?up|chin[- ]?up|pulldown|lat pull|puxada|dorsal/.test(text)) [primaryPattern, movementFamily] = ["vertical_pull", "vertical_pull"];
  else if (single) [primaryPattern, movementFamily] = ["accessory", /calf|panturrilha/.test(text) ? "calf" : /biceps|curl/.test(text) ? "biceps" : /triceps/.test(text) ? "triceps" : "isolation"];
  else if (/walk|run|cycle|bike|jump|march/.test(text)) [primaryPattern, movementFamily] = ["conditioning", "locomotion"];
  const specialized = hybridRe.test(text);
  const tier = specialized ? "specialized" : /machine|cable|seated|supported|assisted|leg press|chest press|pulldown|hip thrust|row/.test(text) ? "base" : "variation";
  const complexity = specialized ? 4 : isHybrid || isUnilateral ? 3 : /barbell|overhead|jump|hanging/.test(text) ? 2 : 1;
  const role = trunk ? "trunk" : single ? "accessory" : tier === "base" ? "primary" : "secondary";
  const validSessionTypes = primaryPattern === "conditioning" ? ["conditioning", "full_body"] : primaryPattern === "trunk" || primaryPattern === "accessory" ? ["full_body", "upper", "lower"] : ["full_body", primaryPattern.includes("push") || primaryPattern.includes("pull") ? "upper" : "lower"];
  const validSlots = [primaryPattern];
  const progressionClarity = /machine|cable|barbell|dumbbell|leg press|chest press|row|pulldown|hip thrust|flexora|extensora/.test(text) && !isHybrid ? 4 : 2;
  return {
    primary_pattern: primaryPattern, secondary_patterns: [], movement_family: movementFamily,
    joint_class: isHybrid ? "hybrid" : trunk && /plank|pallof|dead bug|bird dog/.test(text) ? "isometric" : single ? "single_joint" : "multi_joint",
    session_role: role, exercise_tier: tier, valid_slots: validSlots, valid_session_types: validSessionTypes,
    technical_complexity: complexity, balance_demand: isUnilateral ? 3 : 1, mobility_demand: /overhead|deep|pistol|snatch/.test(text) ? 3 : 1,
    setup_complexity: /barbell|cable|towel|complex/.test(text) ? 2 : 1, progression_clarity: progressionClarity,
    unsupervised_suitability: specialized || /towel|unstable|jump|clean|snatch/.test(text) ? 1 : complexity >= 3 ? 2 : 4,
    is_hybrid: isHybrid, is_unilateral: isUnilateral, requires_spotter: /barbell|bench press|squat rack|heavy/.test(text) && !/machine|assisted/.test(text),
    media_verified: mediaVerified, production_eligible: Boolean(productionEligible && namePtStatus === "reviewed" && mediaVerified && tier !== "specialized" && !isHybrid),
    name_pt_status: namePtStatus, context_scores: {}
  };
}
