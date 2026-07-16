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
        <span className="eyebrow">Sua conta</span>
        <h1 className="title">Entre para sincronizar seus registros com segurança.</h1>
        <p className="sub">Sem conta, seus registros continuam somente neste dispositivo.</p>
        <AuthForm />
      </section>
    </>
  );
}
