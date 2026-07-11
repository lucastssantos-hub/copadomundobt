import Link from "next/link";
import { AuthForm } from "./auth-form";

export default function AuthPage() {
  return (
    <>
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-mark" />
          Canetta
        </Link>
      </header>
      <section className="page">
        <span className="eyebrow">Conta</span>
        <h1 className="title">Entre para manter seus registros entre sessões.</h1>
        <p className="sub">A Fase 0 valida autenticação e persistência por usuário com Supabase.</p>
        <AuthForm />
      </section>
    </>
  );
}
