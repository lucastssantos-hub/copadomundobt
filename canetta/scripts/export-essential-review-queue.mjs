import { readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
const manifest = JSON.parse(await readFile(new URL("../config/essential-exercises.json", import.meta.url), "utf8"));

const output = process.argv[2] || "./tmp/essential-review-queue.json";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase URL or service role key.");
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await supabase.from("canetta_exercises").select("external_id,name,name_pt,body_part,target_muscle,equipment,image_url,gif_url,primary_pattern,secondary_patterns,movement_family,joint_class,session_role,exercise_tier,valid_slots,valid_session_types,technical_complexity,balance_demand,mobility_demand,setup_complexity,progression_clarity,unsupervised_suitability,is_hybrid,is_unilateral,requires_spotter,media_verified,name_pt_status,taxonomy_status").limit(2000);
if (error) throw error;
const normalize = (value) => String(value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const queue = [];
for (const entry of manifest.entries) {
  const matches = (data ?? []).filter((exercise) => entry.match.some((term) => normalize(exercise.name).includes(normalize(term))));
  for (const exercise of matches.slice(0, 3)) queue.push({
    external_id: exercise.external_id,
    requested_slot: entry.slot,
    name_original: exercise.name,
    name_pt: exercise.name_pt,
    media: { image_url: exercise.image_url, gif_url: exercise.gif_url, media_verified: exercise.media_verified },
    suggested_taxonomy: exercise,
    review: { name_pt: null, media_verified: null, taxonomy_status: "automatic", reviewed_by: null, notes: null }
  });
}
await writeFile(output, `${JSON.stringify(queue, null, 2)}\n`);
console.log(`Exported ${queue.length} review records to ${output}. Fill review fields before running approve-exercise-batch.mjs.`);
