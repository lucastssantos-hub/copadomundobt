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

  redirect("/dashboard");
}

export async function signUpAction(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = cleanEmail(formData.get("email"));
  const password = cleanPassword(formData.get("password"));

  if (!email || !password) {
    return { message: "Informe e-mail e senha." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { message: "Não foi possível criar a conta. Tente outro e-mail ou senha." };
  }

  return { message: "Conta criada. Se o Supabase pedir confirmação, valide o e-mail antes de entrar." };
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/auth");
}
