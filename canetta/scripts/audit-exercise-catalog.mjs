import { readFile, writeFile } from "node:fs/promises";
import { classifyOperational } from "./exercise-taxonomy.mjs";

const input = process.argv[2] || process.env.CANETTA_EXERCISES_JSON || "./data/exercises.json";
const output = process.argv[3] || null;
const data = JSON.parse(await readFile(input, "utf8"));
const rows = data.map((exercise) => {
  const taxonomy = classifyOperational(exercise);
  const name = String(exercise.name ?? "");
  const text = name.toLowerCase();
  const flags = [];
  if (/kneeling squat/.test(text)) flags.push("kneeling_squat_requires_manual_review");
  if (taxonomy.isHybrid) flags.push("hybrid_blocked_from_primary_slots");
  if (taxonomy.exercise_tier === "specialized") flags.push("specialized_not_default");
  if (taxonomy.primary_pattern === "complementary") flags.push("no_confident_primary_pattern");
  if (taxonomy.name_pt_status !== "reviewed") flags.push("automatic_pt_name_not_production_ready");
  return { external_id: String(exercise.id), name, primary_pattern: taxonomy.primary_pattern, movement_family: taxonomy.movement_family, tier: taxonomy.exercise_tier, joint_class: taxonomy.joint_class, flags };
});
const report = {
  source: input,
  total: rows.length,
  production_candidates: rows.filter((row) => row.flags.length === 0).length,
  fragile: rows.filter((row) => row.flags.some((flag) => flag !== "automatic_pt_name_not_production_ready")),
  reclassified_or_blocked_examples: rows.filter((row) => /kneeling squat|clean and press|archer|towel|pullover|chin-up|pull-up|good morning/i.test(row.name)).slice(0, 100)
};
const serialized = JSON.stringify(report, null, 2);
if (output) await writeFile(output, `${serialized}\n`);
console.log(serialized);
