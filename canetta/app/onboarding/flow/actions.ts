"use server";

import { createSupabaseServerClient } from "@/lib/supabase";

export type OnboardingPayload = {
  nome?: string;
  estagio?: string | null;
  medicamento?: string | null;
  dose?: string | null;
  freq?: string | null;
  alturaCm?: number | null;
  pesoKg?: number | null;
  objetivo?: string | null;
  fase?: string | null;
  doseTrend?: string | null;
  dificuldade?: string | null;
  mascotNome?: string;
};

function stage(value: string | null | undefined) {
  return value === "Quero começar" ? "quer_comecar" : "usa";
}

function doseAxis(value: string | null | undefined) {
  return value?.toLowerCase() === "aumentando" ? "aumentando" : "fixa";
}

function goalAxis(value: string | null | undefined) {
  const normalized = `${value ?? ""}`.toLowerCase();
  if (normalized.includes("manter") || normalized.includes("manutenção")) return "mantendo";
  if (normalized.includes("reduzir") || normalized.includes("pausa")) return "reduzindo_parou";
  return "perdendo";
}

export async function completeOnboardingAction(payload: OnboardingPayload) {
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return { next: "/journey", synced: false as const };
  }
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { next: "/auth", synced: false as const };

  const { error: profileError } = await supabase.from("canetta_profiles").upsert({
    user_id: user.id,
    name: payload.nome?.trim() || null,
    stage: stage(payload.estagio),
    medication: payload.medicamento || null,
    current_dose: payload.dose || null,
    frequency: payload.freq || null,
    height_cm: Number.isFinite(payload.alturaCm) ? payload.alturaCm : null,
    biggest_difficulty: payload.dificuldade || null
  }, { onConflict: "user_id" });

  if (profileError) return { next: "/journey", synced: false as const };

  if (Number.isFinite(payload.pesoKg) && Number(payload.pesoKg) >= 20 && Number(payload.pesoKg) <= 400) {
    const { count } = await supabase
      .from("canetta_weight_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if (!count) {
      await supabase.from("canetta_weight_entries").insert({ user_id: user.id, weight: payload.pesoKg });
    }
  }

  const { error: journeyError } = await supabase.from("canetta_journey_state").upsert({
    user_id: user.id,
    dose_axis: doseAxis(payload.doseTrend),
    goal_axis: goalAxis(payload.objetivo || payload.fase)
  }, { onConflict: "user_id" });

  return { next: "/journey", synced: !journeyError };
}
