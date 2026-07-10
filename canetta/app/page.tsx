import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          Canetta
        </div>
      </header>
      <section className="page">
        <span className="eyebrow">Fase 0</span>
        <h1 className="title">Seu diário de registros para consultas GLP-1.</h1>
        <p className="sub">
          O Canetta organiza o que você registrou: dose, peso, sintomas, lembretes e perguntas para levar aos seus
          profissionais.
        </p>
        <div className="boundary">
          Isto organiza seus registros. Mudanças de dose, alimentação ou treino devem ser combinadas com seus
          profissionais.
        </div>
        <div className="card soft">
          <h2 className="title-sm">Espelho, não conselho.</h2>
          <p className="sub">
            O app reflete fatos registrados por você. Ele não diagnostica, não prescreve e não gera metas ou projeções.
          </p>
        </div>
        <div className="form">
          <Link className="btn btn-primary" href={user ? "/dashboard" : "/auth"}>
            {user ? "Abrir minha jornada" : "Entrar ou criar conta"}
          </Link>
        </div>
      </section>
    </>
  );
}
