"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export type ProfileState = {
  message?: string;
};

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function nullableText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value || null;
}

function nullableNumber(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? Number(value) : null;
}

export async function saveProfileAction(_prevState: ProfileState, formData: FormData): Promise<ProfileState> {
  const { supabase, user } = await requireUser();

  const stage = text(formData, "stage");
  if (stage !== "usa" && stage !== "quer_comecar") {
    return { message: "Escolha em que fase você está." };
  }

  const profile = {
    user_id: user.id,
    name: nullableText(formData, "name"),
    stage,
    medication: nullableText(formData, "medication"),
    current_dose: nullableText(formData, "current_dose"),
    frequency: nullableText(formData, "frequency"),
    height_cm: nullableNumber(formData, "height_cm"),
    goal_weight: nullableNumber(formData, "goal_weight"),
    biggest_difficulty: nullableText(formData, "biggest_difficulty")
  };

  const { error: profileError } = await supabase.from("canetta_profiles").upsert(profile, { onConflict: "user_id" });
  if (profileError) {
    return { message: "Não foi possível salvar seu perfil." };
  }

  const { error: stateError } = await supabase.from("canetta_journey_state").upsert(
    {
      user_id: user.id,
      dose_axis: "fixa",
      goal_axis: "perdendo"
    },
    { onConflict: "user_id" }
  );

  if (stateError) {
    return { message: "Perfil salvo, mas não foi possível iniciar o estado da jornada." };
  }

  redirect("/dashboard");
}
