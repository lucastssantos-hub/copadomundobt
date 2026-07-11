import { ProfileForm } from "./profile-form";
import { requireUser } from "@/lib/auth";

export default async function OnboardingPage() {
  await requireUser();

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          Canetta
        </div>
      </header>
      <section className="page">
        <span className="eyebrow">Perfil inicial</span>
        <h1 className="title">Registre só o essencial para começar.</h1>
        <p className="sub">
          A meta e os dados abaixo são informados por você. O Canetta não calcula peso ideal nem projeção.
        </p>
        <ProfileForm />
      </section>
    </>
  );
}
