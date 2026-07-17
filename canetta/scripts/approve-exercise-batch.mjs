import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const input = process.argv[2];
if (!input) throw new Error("Usage: node scripts/approve-exercise-batch.mjs path/to/review.json");
const batch = JSON.parse(await readFile(input, "utf8"));
if (!Array.isArray(batch) || !batch.length) throw new Error("Review file must contain a non-empty array.");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase URL or service role key.");
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const now = new Date().toISOString();
for (const item of batch) {
  const review = item.review ?? item;
  const suggested = item.suggested_taxonomy ?? item;
  const externalId = item.external_id;
  const value = { ...suggested, ...review, external_id: externalId };
  for (const field of ["external_id", "name_pt", "reviewed_by", "media_verified", "taxonomy_status"]) if (value[field] === undefined || value[field] === null) throw new Error(`${externalId ?? "unknown"}: missing ${field}`);
  if (value.taxonomy_status !== "reviewed") throw new Error(`${externalId}: approval requires taxonomy_status=reviewed`);
  if (value.media_verified !== true) throw new Error(`${externalId}: media_verified must be true`);
  const patch = {
    name_pt: value.name_pt,
    name_pt_status: "reviewed",
    taxonomy_status: "reviewed",
    media_verified: true,
    primary_pattern: value.primary_pattern,
    secondary_patterns: value.secondary_patterns ?? [],
    movement_family: value.movement_family,
    joint_class: value.joint_class,
    session_role: value.session_role,
    exercise_tier: value.exercise_tier,
    valid_slots: value.valid_slots ?? [],
    valid_session_types: value.valid_session_types ?? [],
    technical_complexity: value.technical_complexity,
    balance_demand: value.balance_demand,
    mobility_demand: value.mobility_demand,
    setup_complexity: value.setup_complexity,
    progression_clarity: value.progression_clarity,
    unsupervised_suitability: value.unsupervised_suitability,
    is_hybrid: value.is_hybrid ?? false,
    is_unilateral: value.is_unilateral ?? false,
    requires_spotter: value.requires_spotter ?? false,
    production_eligible: false,
    taxonomy_version: value.taxonomy_version ?? "2026-07-17.v1",
    updated_at: now
  };
  if (!patch.primary_pattern || !patch.movement_family || !patch.session_role || !patch.exercise_tier || !patch.valid_slots.length) throw new Error(`${externalId}: incomplete reviewed taxonomy`);
  const { error } = await supabase.from("canetta_exercises").update(patch).eq("external_id", externalId);
  if (error) throw error;
  console.log(`Reviewed ${externalId}; production remains disabled until essential-catalog authorization.`);
}
