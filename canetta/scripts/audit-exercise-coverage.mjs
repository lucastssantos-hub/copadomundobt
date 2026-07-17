import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const manifest = JSON.parse(await readFile(new URL("../config/essential-exercises.json", import.meta.url), "utf8"));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase URL or service role key.");
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await supabase.from("canetta_essential_exercises").select("slot,priority,enabled,allowed_experience,allowed_locations,canetta_exercises!inner(name,equipment,production_eligible,name_pt_status,taxonomy_status,media_verified,exercise_tier,is_hybrid,valid_session_types)").eq("enabled", true);
if (error) throw error;

const contexts = [
  ["academia", "nunca_treinei", ["body weight", "machine", "cable", "barbell", "dumbbell", "kettlebell"]],
  ["academia", "retomando", ["body weight", "machine", "cable", "barbell", "dumbbell", "kettlebell"]],
  ["casa_sem_equipamento", "nunca_treinei", ["body weight"]],
  ["casa_com_equipamento", "nunca_treinei", ["body weight", "band", "dumbbell", "kettlebell", "stability ball"]]
];
const rows = (data ?? []).filter((row) => row.canetta_exercises?.production_eligible && row.canetta_exercises?.name_pt_status === "reviewed" && row.canetta_exercises?.taxonomy_status === "reviewed" && row.canetta_exercises?.media_verified && !row.canetta_exercises?.is_hybrid && row.canetta_exercises?.exercise_tier !== "specialized");
const equipmentCompatible = (equipment, allowed) => {
  const value = String(equipment ?? "").toLowerCase();
  return allowed.some((token) => value.includes(token));
};
const report = [];
for (const entry of manifest.entries) {
  const counts = {};
  for (const [location, level] of contexts) {
    const matches = rows.filter((row) => row.slot === entry.slot && (row.allowed_locations ?? []).includes(location) && (row.allowed_experience ?? []).includes(level) && (row.canetta_exercises.valid_session_types ?? []).length > 0 && equipmentCompatible(row.canetta_exercises.equipment, allowed));
    counts[`${location}/${level}`] = { eligible: matches.length, exercises: [...new Set(matches.map((row) => row.canetta_exercises.name))] };
  }
  report.push({ slot: entry.slot, match: entry.match.join(" / "), counts });
}
console.table(report);
const insufficient = report.filter((row) => Object.values(row.counts).some((result) => result.eligible < (row.slot.includes("primary") ? 3 : 2)));
if (insufficient.length) {
  console.warn(`WARNING: ${insufficient.length} slots não atingem a meta operacional de candidatos.`);
  for (const row of insufficient) console.warn(`${row.slot}: ${JSON.stringify(row.counts)}`);
  if (process.argv.includes("--strict")) process.exitCode = 2;
}
