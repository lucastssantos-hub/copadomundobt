"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase";

export type AuthState = {
  message?: string;
};

function cleanEmail(value: FormDataEntryValue | null) {
  return String(value || "").trim().toLowerCase();
}

function cleanPassword(value: FormDataEntryValue | null) {
  return String(value || "");
}

export async function signInAction(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = cleanEmail(formData.get("email"));
  const password = cleanPassword(formData.get("password"));

  if (!email || !password) {
    return { message: "Informe e-mail e senha." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { message: "Não foi possível entrar. Verifique seus dados." };
  }

  redirect("/journey");
}

export async function signUpAction(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = cleanEmail(formData.get("email"));
  const password = cleanPassword(formData.get("password"));

  if (!email || !password) {
    return { message: "Informe e-mail e senha." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { message: "Não foi possível criar a conta. Tente outro e-mail ou senha." };
  }

  if (data.session) redirect("/journey");
  return { message: "Conta criada. Confirme o e-mail e depois entre para sincronizar seus dados." };
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/auth");
}
