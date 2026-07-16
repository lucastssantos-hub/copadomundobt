import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { prescribeWeeklyWorkout } from "@/lib/ai/prescribe-workout";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ ok: false, error: "openai_key_missing" }, { status: 500 });
  }

  const supabase = createSupabaseAdminClient();

  const { data: profiles, error } = await supabase
    .from("canetta_profiles")
    .select("user_id")
    .eq("stage", "usa");

  if (error) {
    return NextResponse.json({ ok: false, error: "query_failed" }, { status: 500 });
  }

  let generated = 0;
  let failed = 0;

  for (const profile of profiles ?? []) {
    try {
      await prescribeWeeklyWorkout(profile.user_id);
      generated += 1;
    } catch (err) {
      console.error(`AI workout generation failed for ${profile.user_id}:`, err);
      failed += 1;
    }
  }

  return NextResponse.json({ ok: true, generated, failed, total: (profiles ?? []).length });
}
