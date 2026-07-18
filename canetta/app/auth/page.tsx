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
      <section className="page auth-page">
        <div className="auth-intro">
          <span className="eyebrow">Sua conta</span>
          <h1 className="title">Seus registros, com você.</h1>
          <p className="sub">Entre para sincronizar sua jornada com segurança. Sem conta, os registros continuam neste dispositivo.</p>
        </div>
        <AuthForm />
      </section>
    </>
  );
}
