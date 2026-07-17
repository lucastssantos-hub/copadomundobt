import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase URL or service role key.");
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await supabase.from("canetta_exercises").select("external_id,name,name_pt,name_pt_status,taxonomy_status,media_verified,production_eligible,primary_pattern,movement_family,valid_slots,exercise_tier,is_hybrid,technical_complexity").limit(2000);
if (error) throw error;
const groups = new Map();
for (const row of data ?? []) {
  const reasons = [];
  if (row.name_pt_status !== "reviewed") reasons.push("name_not_reviewed");
  if (!row.media_verified) reasons.push("media_not_verified");
  if (row.taxonomy_status !== "reviewed") reasons.push("taxonomy_not_reviewed");
  if (!row.primary_pattern || !row.movement_family || !(row.valid_slots ?? []).length) reasons.push("taxonomy_incomplete");
  if (!(row.valid_slots ?? []).length) reasons.push("no_valid_slot");
  if (row.is_hybrid) reasons.push("hybrid");
  if (row.exercise_tier === "specialized") reasons.push("specialized");
  if (!row.production_eligible) reasons.push("production_opt_in_missing");
  if (row.technical_complexity >= 4) reasons.push("complexity_too_high");
  for (const reason of reasons) groups.set(reason, (groups.get(reason) ?? 0) + 1);
}
const familyCounts = new Map();
for (const row of data ?? []) if (row.movement_family) familyCounts.set(row.movement_family, (familyCounts.get(row.movement_family) ?? 0) + 1);
for (const row of data ?? []) if (row.movement_family && (familyCounts.get(row.movement_family) ?? 0) > 8) groups.set("duplicate_family", (groups.get("duplicate_family") ?? 0) + 1);
console.table(Array.from(groups, ([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count));
console.log(`Total: ${(data ?? []).length}; production eligible: ${(data ?? []).filter((row) => row.production_eligible).length}`);
