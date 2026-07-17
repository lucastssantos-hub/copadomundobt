import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase URL or service role key.");
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await supabase.from("canetta_essential_exercises").select("exercise_id,canetta_exercises!inner(id,name_pt_status,taxonomy_status,media_verified,valid_slots,movement_family,primary_pattern,session_role,exercise_tier,is_hybrid)").eq("enabled", true);
if (error) throw error;
const eligible = (data ?? []).filter((row) => {
  const exercise = row.canetta_exercises;
  return exercise.name_pt_status === "reviewed" && exercise.taxonomy_status === "reviewed" && exercise.media_verified && (exercise.valid_slots ?? []).length > 0 && exercise.movement_family && exercise.primary_pattern && exercise.session_role && exercise.exercise_tier && !exercise.is_hybrid && exercise.exercise_tier !== "specialized";
});
const ids = [...new Set(eligible.map((row) => row.exercise_id))];
if (!ids.length) throw new Error("No reviewed exercises are eligible for authorization.");
const { error: authorizeError } = await supabase.from("canetta_exercises").update({ production_eligible: true, updated_at: new Date().toISOString() }).in("id", ids);
if (authorizeError) throw authorizeError;
console.log(`Authorized ${ids.length} exercises from the essential catalog. All others remain production_eligible=false.`);
