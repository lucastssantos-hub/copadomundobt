import { ensureSession, getSupabaseBrowser } from "./supabase-browser";

// Persistência do resultado do onboarding e leitura do perfil na jornada.
// Trava regulatória: guardamos apenas o que o usuário informou (dose, medicamento,
// frequência, altura, peso, dificuldade). Não gravamos meta de peso nem projeção.

export interface OnboardingProfileInput {
  nome: string;
  estagio: string | null; // "Já uso GLP-1" | "Quero começar"
  medicamento: string | null;
  dose: string | null;
  freq: string | null;
  alturaCm: number;
  dificuldade: string | null;
  pesoKg: number;
}

export interface LoadedProfile {
  name: string | null;
  medication: string | null;
  current_dose: string | null;
  frequency: string | null;
}

function mapStage(estagio: string | null): "usa" | "quer_comecar" {
  return estagio === "Quero começar" ? "quer_comecar" : "usa";
}

// Salva perfil + peso atual (best-effort). Sem env/sessão, é no-op e retorna false,
// deixando o app seguir client-only.
export async function saveOnboardingProfile(input: OnboardingProfileInput): Promise<boolean> {
  const supabase = await ensureSession();
  if (!supabase) return false;

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error: profileError } = await supabase.from("canetta_profiles").upsert(
    {
      user_id: user.id,
      name: input.nome || null,
      stage: mapStage(input.estagio),
      medication: input.medicamento,
      current_dose: input.dose,
      frequency: input.freq,
      height_cm: input.alturaCm || null,
      biggest_difficulty: input.dificuldade
    },
    { onConflict: "user_id" }
  );

  if (profileError) {
    console.warn("[canetta] salvar perfil falhou:", profileError.message);
    return false;
  }

  // O peso atual é um registro do diário (fato observado), não uma meta.
  if (input.pesoKg) {
    const { error: weightError } = await supabase
      .from("canetta_weight_entries")
      .insert({ user_id: user.id, weight: input.pesoKg });
    if (weightError) {
      console.warn("[canetta] salvar peso falhou:", weightError.message);
    }
  }

  return true;
}

// Lê o perfil do usuário atual para hidratar a jornada. Sem env/sessão ou sem
// perfil salvo, retorna null e a jornada mantém seus valores de exemplo.
export async function loadProfile(): Promise<LoadedProfile | null> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return null;

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("canetta_profiles")
    .select("name, medication, current_dose, frequency")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.warn("[canetta] carregar perfil falhou:", error.message);
    return null;
  }

  return (data as LoadedProfile | null) ?? null;
}
