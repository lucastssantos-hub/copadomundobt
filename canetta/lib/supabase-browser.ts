import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Cliente Supabase para componentes client ("/onboarding/flow", "/journey").
// A sessão é guardada em cookie pelo @supabase/ssr, então componentes server
// (ex.: /auth) enxergam a mesma sessão.
//
// Degradação graciosa: sem env configurado, retorna null e o app segue
// funcionando client-only, exatamente como antes desta fase.

let client: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  if (!client) client = createBrowserClient(url, anonKey);
  return client;
}

// Garante uma sessão para o RLS funcionar. Identidade "anônimo primeiro":
// só criamos o usuário anônimo quando há algo real para salvar, evitando
// usuários órfãos de quem apenas abre o onboarding e sai.
// Requer "Anonymous sign-ins" habilitado no projeto Supabase.
export async function ensureSession(): Promise<SupabaseClient | null> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return null;

  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.warn("[canetta] login anônimo falhou:", error.message);
      return null;
    }
  }

  return supabase;
}
