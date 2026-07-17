import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const manifest = JSON.parse(await readFile(new URL("../config/essential-exercises.json", import.meta.url), "utf8"));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase URL or service role key.");
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const select = "id,name,production_eligible,name_pt_status,taxonomy_status,media_verified,primary_pattern,exercise_tier,is_hybrid";
const pages = await Promise.all([0, 1000].map((from) => supabase.from("canetta_exercises").select(select).range(from, from + 999)));
for (const page of pages) if (page.error) throw page.error;
const exercises = pages.flatMap((page) => page.data ?? []);
const normalize = (value) => String(value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const rows = [];
const unmatched = [];
for (const entry of manifest.entries) {
  const matches = exercises.filter((exercise) => {
    const name = normalize(exercise.name);
    return entry.match.some((term) => name.includes(normalize(term)));
  });
  if (!matches.length) unmatched.push(`${entry.slot}: ${entry.match.join(" / ")}`);
  for (const exercise of matches.slice(0, 3)) rows.push({ exercise_id: exercise.id, slot: entry.slot, priority: entry.priority, rationale: manifest.policy, reviewed_at: null, enabled: true });
}
if (unmatched.length) console.warn(`No production-eligible match for ${unmatched.length} manifest entries:\n${unmatched.join("\n")}`);
if (!rows.length) throw new Error("No manifest matches found in canetta_exercises. Verify the upstream seed before curating.");
const { error: upsertError } = await supabase.from("canetta_essential_exercises").upsert(rows, { onConflict: "exercise_id,slot" });
if (upsertError) throw upsertError;
console.log(`Seeded ${rows.length} pending essential exercise mappings from ${manifest.entries.length} curated slots. Review/authorization is still required.`);
