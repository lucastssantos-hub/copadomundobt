import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import { requireUser } from "@/lib/auth";

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase.from("canetta_profiles").select("*").eq("user_id", user.id).maybeSingle();
  const { data: journeyState } = await supabase.from("canetta_journey_state").select("*").eq("user_id", user.id).maybeSingle();

  if (!profile) {
    redirect("/onboarding");
  }

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          Canetta
        </div>
        <form action={signOutAction}>
          <button className="btn btn-ghost" type="submit" style={{ minHeight: 38, padding: "9px 12px" }}>
            Sair
          </button>
        </form>
      </header>
      <section className="page">
        <span className="eyebrow">Home</span>
        <h1 className="title">Olá{profile.name ? `, ${profile.name}` : ""}. Seus registros estão salvos.</h1>
        <p className="sub">Esta fundação valida login, RLS e persistência. A camada de registros vem na Fase 1.</p>

        <div className="metric-grid">
          <div className="metric">
            <b>{profile.medication || "—"}</b>
            <span>Medicamento registrado</span>
          </div>
          <div className="metric">
            <b>{profile.goal_weight ? `${profile.goal_weight} kg` : "—"}</b>
            <span>Meta informada por você</span>
          </div>
        </div>

        <div className="card soft">
          <span className="eyebrow">Estado da jornada</span>
          <div className="list">
            <div className="list-item">
              <strong>Dose</strong>
              <span>{journeyState?.dose_axis ? doseAxisLabel(journeyState.dose_axis) : "Não registrado"}</span>
            </div>
            <div className="list-item">
              <strong>Meta</strong>
              <span>{journeyState?.goal_axis ? goalAxisLabel(journeyState.goal_axis) : "Não registrado"}</span>
            </div>
          </div>
        </div>

        <div className="boundary">
          Isto organiza seus registros. Mudanças de dose, alimentação ou treino devem ser combinadas com seus
          profissionais.
        </div>

        <div className="form">
          <Link className="btn btn-primary" href="/onboarding">
            Editar perfil inicial
          </Link>
        </div>
      </section>
    </>
  );
}

function doseAxisLabel(value: string) {
  const labels: Record<string, string> = {
    aumentando: "Registrou dose em aumento",
    fixa: "Registrou dose fixa"
  };

  return labels[value] || value;
}

function goalAxisLabel(value: string) {
  const labels: Record<string, string> = {
    perdendo: "Registrou fase de perda",
    mantendo: "Registrou fase de manutenção",
    reduzindo_parou: "Registrou redução ou pausa"
  };

  return labels[value] || value;
}
