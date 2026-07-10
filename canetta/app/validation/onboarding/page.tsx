"use client";

import { useMemo, useState } from "react";

type ScreenKind =
  | "splash"
  | "value"
  | "boundary"
  | "input"
  | "choice"
  | "ruler"
  | "routine"
  | "consult"
  | "loading"
  | "reveal"
  | "commitment"
  | "paywall"
  | "success";

type ValidationScreen = {
  id: number;
  section: string;
  title: string;
  body: string;
  primary: string;
  secondary?: string;
  mascot: "wave" | "think" | "celebrate" | "check";
  kind: ScreenKind;
  collect?: boolean;
  options?: string[];
  notes?: string[];
  sample?: string;
};

const collectTotal = 12;

const screens: ValidationScreen[] = [
  {
    id: 1,
    section: "Abertura",
    title: "Canetta",
    body: "Seu tratamento GLP-1, do começo ao fim.",
    primary: "Começar",
    secondary: "Já tenho conta",
    mascot: "wave",
    kind: "splash"
  },
  {
    id: 2,
    section: "Valor · doses",
    title: "Menos dúvida sobre o que você registrou.",
    body: "Registro de doses, contagem regressiva e lembretes definidos por você.",
    primary: "Continuar",
    mascot: "check",
    kind: "value",
    options: ["Dose registrada", "Próximo lembrete", "Histórico"]
  },
  {
    id: 3,
    section: "Valor · jornada",
    title: "Você não precisa guardar tudo de cabeça.",
    body: "Acompanhamento, lembretes e um diário para organizar cada etapa da sua jornada.",
    primary: "Continuar",
    mascot: "wave",
    kind: "value",
    options: ["Sintomas", "Fotos", "Perguntas", "Resumo"]
  },
  {
    id: 4,
    section: "Limite & privacidade",
    title: "Espelho dos seus registros, sob seu controle.",
    body:
      "O Canetta não diagnostica, não prescreve e não recomenda dose, alimento, treino ou mudança de tratamento.",
    primary: "Aceitar e continuar",
    secondary: "Ver privacidade",
    mascot: "check",
    kind: "boundary",
    notes: [
      "Seus dados de saúde são privados.",
      "Você decide o que registrar.",
      "Você pode exportar ou apagar seus dados quando quiser."
    ]
  },
  {
    id: 5,
    section: "Nome",
    title: "Como podemos te chamar?",
    body: "Esse nome aparece nos resumos e lembretes do app.",
    primary: "Continuar",
    secondary: "Pular",
    mascot: "wave",
    kind: "input",
    collect: true,
    sample: "Digite seu nome"
  },
  {
    id: 6,
    section: "Estágio",
    title: "Onde você está na sua jornada GLP-1?",
    body: "Isso ajuda a organizar a ordem dos registros iniciais.",
    primary: "Continuar",
    mascot: "think",
    kind: "choice",
    collect: true,
    options: ["Já uso GLP-1", "Quero começar"]
  },
  {
    id: 7,
    section: "Medicamento",
    title: "Qual medicamento você quer registrar?",
    body: "Escolha o nome como foi informado a você.",
    primary: "Continuar",
    mascot: "check",
    kind: "choice",
    collect: true,
    options: ["Zepbound", "Mounjaro", "Ozempic", "Wegovy", "Trulicity", "Saxenda", "Victoza", "Rybelsus", "Outro"]
  },
  {
    id: 8,
    section: "Valor · dose",
    title: "Cada registro vira uma dúvida a menos.",
    body: "O histórico mostra o que você informou, quando informou e como quer lembrar.",
    primary: "Registrar próxima etapa",
    mascot: "check",
    kind: "value",
    options: ["Aplicação", "Local", "Observação"]
  },
  {
    id: 9,
    section: "Dose atual",
    title: "Qual dose está registrada agora?",
    body: "O Canetta não valida nem sugere dose. Ele só organiza o valor informado por você.",
    primary: "Continuar",
    mascot: "think",
    kind: "choice",
    collect: true,
    options: ["2,5 mg", "5 mg", "7,5 mg", "10 mg", "12,5 mg", "15 mg", "Ainda não sei"]
  },
  {
    id: 10,
    section: "Frequência",
    title: "Com que frequência você quer registrar?",
    body: "Use a frequência informada por você ou pelo seu profissional.",
    primary: "Continuar",
    mascot: "check",
    kind: "choice",
    collect: true,
    options: ["Diária", "Semanal", "Quinzenal", "Mensal", "Ainda não sei"]
  },
  {
    id: 11,
    section: "Peso atual",
    title: "Quer registrar seu peso atual?",
    body: "Opcional e sem julgamento. O app mostra apenas entradas informadas por você.",
    primary: "Continuar",
    secondary: "Pular",
    mascot: "think",
    kind: "ruler",
    collect: true,
    sample: "82,4 kg"
  },
  {
    id: 12,
    section: "Altura",
    title: "Quer registrar sua altura?",
    body: "Opcional. Esse dado ajuda a compor seu perfil, sem cálculo de meta ou peso ideal.",
    primary: "Continuar",
    secondary: "Pular",
    mascot: "check",
    kind: "ruler",
    collect: true,
    sample: "174 cm"
  },
  {
    id: 13,
    section: "Objetivo pessoal",
    title: "Qual objetivo você quer acompanhar?",
    body: "Escolha um rótulo declarado por você. O Canetta não calcula previsão nem meta ideal.",
    primary: "Continuar",
    secondary: "Pular",
    mascot: "think",
    kind: "choice",
    collect: true,
    options: ["Perder peso", "Manter", "Reduzir ou pausar", "Organizar consulta"]
  },
  {
    id: 14,
    section: "Fase",
    title: "Marque sua fase e estado atual.",
    body: "A fase organiza o diário. Ela não define conduta nem muda tratamento.",
    primary: "Continuar",
    mascot: "check",
    kind: "choice",
    collect: true,
    options: ["Primeiro mês", "Até 3 meses", "3 a 6 meses", "Manutenção", "Redução ou pausa", "Dose aumentando", "Dose fixa", "Dose reduzindo"]
  },
  {
    id: 15,
    section: "Maior dificuldade",
    title: "O que mais costuma aparecer na rotina?",
    body: "Essa resposta ajuda a destacar padrões observados nos seus registros.",
    primary: "Continuar",
    mascot: "think",
    kind: "choice",
    collect: true,
    options: ["Fome à noite", "Náusea", "Constipação", "Fim de semana", "Esquecimento"]
  },
  {
    id: 16,
    section: "Diário",
    title: "Escolha o que quer acompanhar primeiro.",
    body: "Você pode ativar mais registros depois.",
    primary: "Montar meu diário",
    mascot: "check",
    kind: "choice",
    collect: true,
    options: ["Aplicações", "Peso", "Sintomas", "Rotina & hábitos", "Perguntas"]
  },
  {
    id: 17,
    section: "Nascimento",
    title: "Quer registrar sua data de nascimento?",
    body: "Opcional. Usado para organizar seus registros, não para calcular metas.",
    primary: "Continuar",
    secondary: "Pular",
    mascot: "wave",
    kind: "input",
    collect: true,
    sample: "DD/MM/AAAA"
  },
  {
    id: 18,
    section: "Sintomas → consulta",
    title: "Chegue à consulta com fatos organizados.",
    body: "Registre intensidade, duração e contexto. O Canetta não interpreta gravidade nem indica conduta.",
    primary: "Ver exemplo",
    mascot: "think",
    kind: "consult",
    sample: "Náusea · intensidade 4/10 · após almoço",
    notes: ["Conteúdo educativo com fonte.", "Procure seu médico em caso de dúvida."]
  },
  {
    id: 19,
    section: "Resumo pré-consulta",
    title: "Seu resumo pronto antes de cada consulta.",
    body: "Exemplo: seus dados aparecem aqui quando você registrar sua jornada.",
    primary: "Continuar",
    mascot: "check",
    kind: "consult",
    options: ["Peso inicial/atual", "Dose registrada", "Aplicações", "Sintomas", "Perguntas"]
  },
  {
    id: 20,
    section: "Rotina & hábitos",
    title: "Acompanhe sinais da rotina, sem metas prescritas.",
    body: "Registre refeições, água, movimento, sono e fome percebida. Sem calorias, macros ou plano de treino.",
    primary: "Continuar",
    mascot: "wave",
    kind: "routine",
    options: ["Foto ou nota", "Água", "Movimento", "Sono", "Fome percebida"]
  },
  {
    id: 21,
    section: "Mascote",
    title: "Esse é o Canetta.",
    body: "Ele vai te acompanhar em cada etapa e lembrar seus próximos registros.",
    primary: "Dar nome",
    secondary: "Manter Canetta",
    mascot: "wave",
    kind: "input",
    sample: "Nome do mascote"
  },
  {
    id: 22,
    section: "Padrões observados",
    title: "O Canetta destaca padrões para você levar à consulta.",
    body: "Ele mostra o que apareceu nos seus registros. Não diagnostica e não recomenda mudança de tratamento.",
    primary: "Organizar meu diário",
    mascot: "think",
    kind: "consult",
    sample: "Maior desafio registrado: fome à noite"
  },
  {
    id: 23,
    section: "Loading",
    title: "Organizando seu diário",
    body: "Preparando seus registros. Finalizando a estrutura inicial.",
    primary: "Aguardar",
    mascot: "check",
    kind: "loading",
    notes: ["Sem cálculo de metas.", "Sem projeção de peso.", "Sem promessa de resultado."]
  },
  {
    id: 24,
    section: "Reveal",
    title: "Seu diário está pronto.",
    body: "Você vai acompanhar os registros escolhidos e revisar sua fase atual quando quiser.",
    primary: "Ver meu plano",
    mascot: "celebrate",
    kind: "reveal",
    options: ["Aplicações", "Sintomas", "Perguntas", "Fase atual"],
    notes: ["Conteúdo com fontes."]
  },
  {
    id: 25,
    section: "Compromisso",
    title: "Você está comprometido em registrar sua jornada?",
    body: "O compromisso aqui é com organização e clareza para suas próximas consultas.",
    primary: "Sim, estou comprometido",
    secondary: "Quero revisar",
    mascot: "check",
    kind: "commitment"
  },
  {
    id: 26,
    section: "Plano pago",
    title: "Seu diário está pronto. Vamos começar juntos.",
    body: "Acompanhamento organizado em cada etapa, com resumo pronto para a consulta.",
    primary: "Começar meus 3 dias grátis",
    secondary: "Restaurar compra",
    mascot: "wave",
    kind: "paywall",
    options: ["Lembretes de dose", "Resumo para consulta", "Gráficos e fotos", "Padrões observados sem diagnóstico"]
  },
  {
    id: 27,
    section: "Pós-compra",
    title: "Amanhã o Canetta faz seu primeiro check-in.",
    body: "Sua primeira conquista desbloqueia amanhã.",
    primary: "Ativar notificações",
    secondary: "Começar minha jornada",
    mascot: "celebrate",
    kind: "success"
  }
];

function collectStep(screen: ValidationScreen) {
  if (!screen.collect) return null;
  return screens.slice(0, screens.findIndex((item) => item.id === screen.id) + 1).filter((item) => item.collect).length;
}

function Mascot({ state }: { state: ValidationScreen["mascot"] }) {
  return (
    <div className={`mascot mascot-${state}`} aria-hidden="true">
      <div className="mascot-cap" />
      <div className="mascot-face">
        <span />
        <span />
      </div>
      <div className="mascot-band" />
      <div className="mascot-arm mascot-arm-left" />
      <div className="mascot-arm mascot-arm-right" />
    </div>
  );
}

function ScreenVisual({ screen }: { screen: ValidationScreen }) {
  if (screen.kind === "splash") {
    return (
      <div className="visual-block visual-splash">
        <Mascot state={screen.mascot} />
        <div className="splash-logo">Canetta</div>
      </div>
    );
  }

  if (screen.kind === "ruler") {
    return (
      <div className="visual-block">
        <div className="ruler-value">{screen.sample}</div>
        <div className="ruler-track">
          {Array.from({ length: 17 }).map((_, index) => (
            <span className={index === 8 ? "is-major" : ""} key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (screen.kind === "loading") {
    return (
      <div className="visual-block loading-visual">
        <div className="loading-ring" />
        <div>
          <span>Preparando seus registros</span>
          <span>Finalizando</span>
        </div>
      </div>
    );
  }

  if (screen.kind === "paywall") {
    return (
      <div className="plan-stack">
        <div className="plan-card plan-card-featured">
          <span>Melhor valor</span>
          <b>Anual</b>
          <p>3 dias grátis, depois R$ XX/ano</p>
        </div>
        <div className="plan-card">
          <b>Mensal</b>
          <p>R$ XX,XX/mês</p>
        </div>
      </div>
    );
  }

  if (screen.kind === "consult") {
    return (
      <div className="visual-block consult-card">
        <span>Exemplo · seus dados aparecem aqui</span>
        <b>{screen.sample ?? "Resumo pré-consulta"}</b>
        <p>Leve para discutir com seu médico.</p>
      </div>
    );
  }

  if (screen.options) {
    return (
      <div className="choice-grid">
        {screen.options.map((option) => (
          <span key={option}>{option}</span>
        ))}
      </div>
    );
  }

  if (screen.sample) {
    return <div className="input-preview">{screen.sample}</div>;
  }

  return (
    <div className="visual-block">
      <Mascot state={screen.mascot} />
    </div>
  );
}

export default function OnboardingValidationPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = screens[activeIndex];
  const step = collectStep(active);

  const sectionLabel = useMemo(() => `${active.id.toString().padStart(2, "0")} / ${screens.length}`, [active]);

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          Canetta
        </div>
        <span className="validation-pill">27 telas</span>
      </header>

      <section className="validation-stage">
        <div className="flow-toolbar">
          <div>
            <span>{sectionLabel}</span>
            <b>{active.section}</b>
          </div>
          <div className="flow-controls">
            <button className="icon-btn" disabled={activeIndex === 0} onClick={() => setActiveIndex((value) => value - 1)} type="button">
              ‹
            </button>
            <button
              className="icon-btn"
              disabled={activeIndex === screens.length - 1}
              onClick={() => setActiveIndex((value) => value + 1)}
              type="button"
            >
              ›
            </button>
          </div>
        </div>

        <article className={`artboard artboard-${active.kind}`}>
          {step ? (
            <div className="collect-progress" aria-label={`Passo ${step} de ${collectTotal}`}>
              {Array.from({ length: collectTotal }).map((_, index) => (
                <span className={index < step ? "is-active" : ""} key={index} />
              ))}
            </div>
          ) : null}

          <div className="artboard-hero">
            <Mascot state={active.mascot} />
            <span>{active.section}</span>
          </div>

          <div className="artboard-copy">
            <h1>{active.title}</h1>
            <p>{active.body}</p>
          </div>

          <ScreenVisual screen={active} />

          {active.notes ? (
            <div className="boundary-notes">
              {active.notes.map((note) => (
                <span key={note}>{note}</span>
              ))}
            </div>
          ) : null}

          <div className="artboard-footer">
            <button className={active.kind === "paywall" ? "btn btn-apricot" : "btn btn-primary"} type="button">
              {active.primary}
            </button>
            {active.secondary ? (
              <button className="btn btn-ghost" type="button">
                {active.secondary}
              </button>
            ) : null}
          </div>
        </article>

        <div className="screen-index" aria-label="Lista de telas">
          {screens.map((screen, index) => (
            <button className={index === activeIndex ? "is-selected" : ""} key={screen.id} onClick={() => setActiveIndex(index)} type="button">
              <span>{screen.id.toString().padStart(2, "0")}</span>
              {screen.section}
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
