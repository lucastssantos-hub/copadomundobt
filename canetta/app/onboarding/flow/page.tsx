"use client";

// Fluxo de onboarding do Canetta (27 telas), portado do design-code
// "Canetta Onboarding.dc.html" (Claude Design) para React funcional.
// Mantém os limites regulatórios: registra/organiza, sem prescrever, sem
// projeção de resultado, sem meta calculada.

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { completeOnboardingAction } from "./actions";

interface FlowState {
  i: number;
  nome: string;
  mascotNome: string;
  estagio: string | null;
  medicamento: string | null;
  dose: string | null;
  freq: string | null;
  pesoKg: number;
  alturaCm: number;
  objetivo: string | null;
  fase: string | null;
  doseTrend: string | null;
  dificuldade: string | null;
  diario: string[];
  sintoma: number;
}

const INITIAL: FlowState = {
  i: 1,
  nome: "",
  mascotNome: "",
  estagio: null,
  medicamento: null,
  dose: null,
  freq: null,
  pesoKg: 78,
  alturaCm: 168,
  objetivo: null,
  fase: null,
  doseTrend: null,
  dificuldade: null,
  diario: [],
  sintoma: 3,
};

const STEP_MAP: Record<number, number> = {
  5: 1, 6: 2, 7: 3, 8: 4, 9: 5, 10: 6, 11: 7, 12: 8, 13: 9, 14: 10, 15: 11, 16: 12, 17: 13,
  18: 14, 19: 15, 20: 16, 21: 17, 22: 18,
};

const LOADING_MSGS = ["Organizando seu diário", "Preparando seus registros", "Finalizando"];
const MEDICATION_OPTIONS = ["Tirzepatida", "Mounjaro", "Zepbound", "Ozempic", "Wegovy", "Trulicity", "Saxenda", "Victoza", "Rybelsus", "Outro"];
const TIRZEPATIDE_DOSES = ["2.5 mg", "5 mg", "7.5 mg", "10 mg", "12.5 mg", "15 mg", "Ainda não sei"];
const SEMAGLUTIDE_DOSES: Record<string, string[]> = {
  Ozempic: ["0.25 mg", "0.5 mg", "1 mg", "2 mg", "Ainda não sei"],
  Wegovy: ["0.25 mg", "0.5 mg", "1 mg", "1.7 mg", "2.4 mg", "Ainda não sei"],
  Rybelsus: ["3 mg", "7 mg", "14 mg", "Ainda não sei"]
};
const DEFAULT_DOSES = ["Informe a dose prescrita", "Ainda não sei"];

function isTirzepatideMedication(value: string | null | undefined) {
  const normalized = `${value ?? ""}`.toLowerCase();
  return normalized.includes("tirzepatida") || normalized.includes("mounjaro") || normalized.includes("zepbound");
}

function doseOptionsForMedication(value: string | null | undefined) {
  if (isTirzepatideMedication(value)) return TIRZEPATIDE_DOSES;
  return SEMAGLUTIDE_DOSES[value || ""] || DEFAULT_DOSES;
}

// ---------- estilos compartilhados ----------
const primaryBtn: CSSProperties = {
  width: "100%", padding: 17, background: "#0E6B5C", color: "#fff", border: "none",
  borderRadius: 16, fontSize: 16, fontWeight: 700, cursor: "pointer",
};
const ctaLight: CSSProperties = {
  width: "100%", padding: 17, background: "#22B39A", color: "#0E2A23", border: "none",
  borderRadius: 16, fontSize: 16, fontWeight: 800, cursor: "pointer",
};
const ghostBtn: CSSProperties = {
  width: "100%", padding: 14, background: "transparent", color: "#5C7A72", border: "none",
  fontSize: 14.5, fontWeight: 600, cursor: "pointer",
};
const backBtn: CSSProperties = {
  alignSelf: "flex-start", background: "none", border: "none", color: "#5C7A72",
  fontSize: 20, cursor: "pointer", padding: 0,
};
const title: CSSProperties = { fontSize: 22, fontWeight: 800, color: "#16302B", lineHeight: 1.3 };
const subLine: CSSProperties = { fontSize: 13, color: "#596E68" };
const inputStyle: CSSProperties = {
  width: "100%", padding: "16px 18px", border: "1.5px solid #E2E7E2", borderRadius: 16,
  fontSize: 16, fontWeight: 600, color: "#16302B", background: "#fff",
};
const spacer: CSSProperties = { flex: 1 };
const screenBase: CSSProperties = { flex: 1, display: "flex", flexDirection: "column" };

function optRowStyle(selected: boolean, pad = "16px 18px", fontSize = 15): CSSProperties {
  return {
    display: "flex", alignItems: "center", justifyContent: "space-between", padding: pad,
    background: selected ? "#EAF5F2" : "#fff",
    border: `1.5px solid ${selected ? "#0E6B5C" : "#E2E7E2"}`,
    borderRadius: 14, fontSize, fontWeight: 700, color: "#16302B", cursor: "pointer",
  };
}

// ---------- mascote (SVG do design) ----------
function mascotSvg(pose: "wave" | "think" | "celebrate" | "neutral"): string {
  const arms: Record<string, string> = {
    wave: '<path d="M90 70 q20 -10 22 -30" stroke="#FF9E7D" stroke-width="12" stroke-linecap="round" fill="none"/><circle cx="112" cy="38" r="8" fill="#FF9E7D"/><path d="M30 75 q-15 10 -12 28" stroke="#FF9E7D" stroke-width="12" stroke-linecap="round" fill="none"/>',
    think: '<path d="M92 68 q12 6 6 22" stroke="#FF9E7D" stroke-width="12" stroke-linecap="round" fill="none"/><circle cx="96" cy="92" r="8" fill="#FF9E7D"/><path d="M30 75 q-15 10 -12 28" stroke="#FF9E7D" stroke-width="12" stroke-linecap="round" fill="none"/><circle cx="98" cy="18" r="5" fill="#fff" opacity="0.85"/><circle cx="106" cy="10" r="7" fill="#fff" opacity="0.85"/>',
    celebrate: '<path d="M92 68 q22 -22 14 -46" stroke="#FF9E7D" stroke-width="12" stroke-linecap="round" fill="none"/><circle cx="104" cy="18" r="8" fill="#FF9E7D"/><path d="M28 68 q-22 -22 -14 -46" stroke="#FF9E7D" stroke-width="12" stroke-linecap="round" fill="none"/><circle cx="16" cy="18" r="8" fill="#FF9E7D"/>',
    neutral: '<path d="M30 75 q-15 10 -12 28" stroke="#FF9E7D" stroke-width="12" stroke-linecap="round" fill="none"/><path d="M90 75 q15 10 12 28" stroke="#FF9E7D" stroke-width="12" stroke-linecap="round" fill="none"/>',
  };
  return `<svg width="120" height="150" viewBox="0 0 120 150" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="60" cy="142" rx="30" ry="7" fill="#16302B" opacity="0.10"/>
    ${arms[pose]}
    <rect x="30" y="30" width="60" height="90" rx="30" fill="#FF9E7D"/>
    <path d="M30 45 a30 30 0 0 1 60 0 v8 h-60 z" fill="#0E6B5C"/>
    <rect x="45" y="12" width="30" height="20" rx="8" fill="#0E6B5C"/>
    <circle cx="40" cy="88" r="5" fill="#FFC9B3" opacity="0.7"/>
    <circle cx="80" cy="88" r="5" fill="#FFC9B3" opacity="0.7"/>
    <circle cx="48" cy="80" r="5" fill="#16302B"/>
    <circle cx="72" cy="80" r="5" fill="#16302B"/>
    <path d="M48 95 q12 10 24 0" stroke="#16302B" stroke-width="3" stroke-linecap="round" fill="none"/>
  </svg>`;
}
function mascotBadgeSvg(): string {
  return `<svg width="40" height="40" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="8" width="20" height="20" rx="10" fill="#FF9E7D"/>
    <path d="M6 14a10 10 0 0 1 20 0v2H6z" fill="#0E6B5C"/>
    <circle cx="12" cy="20" r="1.6" fill="#16302B"/>
    <circle cx="20" cy="20" r="1.6" fill="#16302B"/>
  </svg>`;
}
function Mascot({ pose }: { pose: "wave" | "think" | "celebrate" | "neutral" }) {
  return <div style={{ width: 120, animation: "floaty 3.5s ease-in-out infinite" }} dangerouslySetInnerHTML={{ __html: mascotSvg(pose) }} />;
}
function MascotBadge() {
  return <div style={{ width: 40 }} dangerouslySetInnerHTML={{ __html: mascotBadgeSvg() }} />;
}

export default function OnboardingFlowPage() {
  const router = useRouter();
  const [st, setSt] = useState<FlowState>(INITIAL);
  const [difficultyInsightOpen, setDifficultyInsightOpen] = useState(false);
  const [loadingIdx, setLoadingIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const set = (p: Partial<FlowState>) => setSt((s) => ({ ...s, ...p }));
  const next = () => setSt((s) => ({ ...s, i: Math.min(27, s.i + 1) }));
  const back = () => setSt((s) => ({ ...s, i: Math.max(1, s.i - 1) }));
  const goto27 = () => set({ i: 27 });

  const finishToJourney = async () => {
    const payload = {
      nome: st.nome,
      estagio: st.estagio,
      medicamento: st.medicamento,
      dose: st.dose,
      freq: st.freq,
      alturaCm: st.alturaCm,
      pesoKg: st.pesoKg,
      objetivo: st.objetivo,
      fase: st.fase,
      doseTrend: st.doseTrend,
      dificuldade: st.dificuldade,
      mascotNome: st.mascotNome
    };
    window.localStorage.setItem("canetta:onboarding:v1", JSON.stringify(payload));
    try {
      const result = await completeOnboardingAction(payload);
      router.push(result.next);
    } catch {
      router.push("/journey");
    }
  };

  // loading auto-advance (tela 23 -> 24)
  useEffect(() => {
    if (st.i !== 23) return;
    setLoadingIdx(0);
    let idx = 0;
    const t = setInterval(() => {
      idx += 1;
      if (idx >= LOADING_MSGS.length) {
        clearInterval(t);
        setSt((s) => ({ ...s, i: 24 }));
      } else {
        setLoadingIdx(idx);
      }
    }, 900);
    timerRef.current = t;
    return () => clearInterval(t);
  }, [st.i]);

  const nomeDisplay = st.nome.trim() ? st.nome.trim() : "Você";
  const mascotNomeDisplay = st.mascotNome.trim() ? st.mascotNome.trim() : "Canetta";
  const doseLabelSafe = st.dose ?? "Não informado";
  const dificuldadeLabelSafe = st.dificuldade ?? "sua rotina";
  const faseLabelSafe = st.fase ?? "Primeiro mês";
  const difficultyInsight: Record<string, { title: string; body: string; actions: string[] }> = {
    "Atividade física e massa magra": {
      title: "Vamos acompanhar força e movimento, não só o peso.",
      body: "O Canetta registra seus treinos, esforço percebido, função e resposta do corpo. Depois da triagem de segurança, ele pode organizar sessões de movimento adequadas ao seu nível — sem prometer preservar massa magra nem substituir acompanhamento profissional.",
      actions: ["Registrar treino e exercícios", "Acompanhar força e função", "Fazer check-in antes da sessão"]
    },
    "Fome à noite": {
      title: "Vamos entender melhor esse momento do dia.",
      body: "O Canetta ajuda você a registrar quando a fome aparece, como foi seu dia e o que estava acontecendo antes. Assim, você leva fatos — não suposições — para a conversa com seu profissional.",
      actions: ["Registrar contexto e horário", "Observar padrões na Jornada", "Anotar perguntas para a consulta"]
    },
    "Náusea": {
      title: "Vamos acompanhar como seu corpo responde.",
      body: "Você pode registrar intensidade, duração, hidratação e contexto da náusea. Se houver sinais de alerta, o Canetta orienta pausar o treino e procurar avaliação — sem alterar seu medicamento.",
      actions: ["Registrar intensidade e duração", "Acompanhar hidratação", "Preparar um resumo para a consulta"]
    },
    "Constipação": {
      title: "Vamos deixar esse padrão visível.",
      body: "O Canetta organiza seus registros de rotina e sintomas para você perceber quando a constipação aparece e conversar com seu profissional. Ele não prescreve laxantes, dieta ou mudanças de dose.",
      actions: ["Registrar o sintoma", "Relacionar com sua rotina", "Levar perguntas para a consulta"]
    },
    "Fim de semana": {
      title: "Vamos organizar os dias que saem do padrão.",
      body: "O Canetta registra aplicações, rotina e contexto ao longo da semana. Assim você revisa o que aconteceu no fim de semana sem depender da memória.",
      actions: ["Ativar lembrete de dose", "Fazer um check-in curto", "Revisar a semana na Jornada"]
    },
    "Esquecimento": {
      title: "Vamos tornar a próxima aplicação mais fácil de lembrar.",
      body: "Você pode configurar agenda e push da dose e registrar quando aplicou ou quando não conseguiu. O Canetta organiza o histórico; não decide o que fazer com uma dose perdida.",
      actions: ["Configurar lembrete", "Registrar aplicação", "Anotar uma dose não aplicada"]
    },
    "Ainda não sei": {
      title: "Tudo bem começar sem uma resposta pronta.",
      body: "O Canetta começa com registros simples. Com o tempo, você poderá observar seus próprios padrões e levar informações mais concretas para a consulta.",
      actions: ["Começar pelo registro de aplicação", "Registrar como você está", "Revisar sua Jornada"]
    }
  };
  const selectedDifficultyInsight = difficultyInsight[st.dificuldade ?? "Ainda não sei"] ?? difficultyInsight["Ainda não sei"];

  // header com voltar + progresso explícito, inspirado em fluxos de quiz
  const Header = () => {
    const stepIndex = STEP_MAP[st.i] ?? 0;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 48 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button aria-label="Voltar" onClick={back} style={backBtn}>←</button>
          <div style={{ flex: 1, fontSize: 11.5, fontWeight: 750, color: "#596E68", textAlign: "right" }}>Etapa {Math.min(stepIndex, 18)} de 18</div>
        </div>
        <div style={{ display: "flex", gap: 4, width: "100%" }}>
          {Array.from({ length: 18 }, (_, k) => (
            <div key={k} style={{ flex: 1, height: 4, borderRadius: 3, background: k < stepIndex ? "#0E6B5C" : "#E2E7E2", transition: "background-color .18s ease" }} />
          ))}
        </div>
      </div>
    );
  };

  const Pager = ({ active }: { active: number }) => (
    <div style={{ display: "flex", justifyContent: "center", gap: 7 }}>
      {Array.from({ length: 2 }, (_, k) => (
        <div key={k} style={{ width: k === active ? 20 : 7, height: 7, borderRadius: 4, background: k === active ? "#0E6B5C" : "#D9DED9", transition: "all .2s" }} />
      ))}
    </div>
  );

  // lista de opções de escolha única
  const ChoiceList = ({ options, current, onPick, pad, fontSize, gap = 10 }: {
    options: string[]; current: string | null; onPick: (v: string) => void; pad?: string; fontSize?: number; gap?: number;
  }) => (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {options.map((label) => (
        <button key={label} type="button" aria-pressed={current === label} onClick={() => onPick(label)} style={{ width: "100%", ...optRowStyle(current === label, pad, fontSize) }}>
          <span>{label}</span><span aria-hidden style={{ color: current === label ? "#0E6B5C" : "transparent", fontSize: 17, lineHeight: 1 }}>✓</span>
        </button>
      ))}
    </div>
  );

  const Ruler = () => (
    <div style={{ display: "flex", gap: 5, alignItems: "flex-end" }}>
      {Array.from({ length: 21 }, (_, k) => (
        <div key={k} style={{ width: 2, height: k === 10 ? 24 : k % 5 === 0 ? 16 : 9, background: k === 10 ? "#0E6B5C" : "#D9DED9", borderRadius: 2 }} />
      ))}
    </div>
  );

  const rotinaItems = [
    { icon: "🍽️", label: "Refeições", sub: "Nota opcional" },
    { icon: "💧", label: "Água", sub: "Registro do dia" },
    { icon: "🚶", label: "Movimento", sub: "Como você se sentiu" },
    { icon: "😴", label: "Sono", sub: "Qualidade percebida" },
    { icon: "🫄", label: "Fome percebida", sub: "Sem contagem de calorias" },
  ];
  const iconMap: Record<string, string> = { "Aplicações": "💉", "Peso": "⚖️", "Sintomas": "📝", "Rotina & hábitos": "🗓️", "Movimento e força": "🏋️", "Perguntas": "❓" };
  const revealItems = (st.diario.length ? st.diario : ["Aplicações", "Peso", "Sintomas", "Movimento e força"]).map((k) => ({ icon: iconMap[k] ?? "📌", label: k }));

  const toggleDiario = (key: string) =>
    setSt((s) => ({ ...s, diario: s.diario.includes(key) ? s.diario.filter((k) => k !== key) : [...s.diario, key] }));

  const stage: CSSProperties = {
    height: "100%", minHeight: "calc(100vh - 56px)", display: "flex", flexDirection: "column",
    background: "#F4F6F3", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
  };

  return (
    <div style={stage}>
      <style>{`
        @keyframes confettiFall{0%{transform:translateY(-40px) rotate(0deg);opacity:1}100%{transform:translateY(760px) rotate(380deg);opacity:0}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes floaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        .flow-input:focus{outline:none;border-color:#0E6B5C}
        @media (prefers-reduced-motion: reduce){*{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
      `}</style>

      {/* SCREEN 1 — SPLASH */}
      {st.i === 1 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26, background: "#0E6B5C", padding: 40, position: "relative" }}>
          <Mascot pose="wave" />
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 34, fontWeight: 800, color: "#F4F6F3", letterSpacing: "-0.5px" }}>Canetta</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: "#BEE0D6", lineHeight: 1.5, maxWidth: 280 }}>Seu tratamento GLP-1, do começo ao fim.</div>
          </div>
          <div style={{ position: "absolute", bottom: 48, left: 26, right: 26 }}>
            <button onClick={next} style={ctaLight}>Começar</button>
          </div>
        </div>
      )}

      {/* SCREEN 2 — VALOR · DOSES */}
      {st.i === 2 && (
        <div style={{ ...screenBase, padding: "24px 26px 26px" }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={goto27} style={{ background: "none", border: "none", color: "#5C7A72", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Pular</button>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {["Ontem", "Hoje", "Amanhã"].map((label, k) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: k === 1 ? "#0E6B5C" : "#E2E7E2", display: "flex", alignItems: "center", justifyContent: "center", color: k === 1 ? "#fff" : "#596E68", fontWeight: 800, fontSize: 16 }}>{k === 0 ? "✓" : k === 1 ? "●" : ""}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#596E68" }}>{label}</div>
                  </div>
                  {k < 2 && <div style={{ width: 26, height: 2, background: "#E2E7E2" }} />}
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#16302B", lineHeight: 1.25 }}>Aplique com confiança e no dia certo</div>
              <div style={{ fontSize: 14.5, color: "#4B5F59", lineHeight: 1.55, maxWidth: 290 }}>Registro de doses e agenda — para você consultar quando aplicou e qual é a próxima data estimada.</div>
            </div>
          </div>
          <Pager active={0} />
          <button onClick={next} style={{ ...primaryBtn, marginTop: 20 }}>Continuar</button>
        </div>
      )}

      {/* SCREEN 3 — VALOR · JORNADA */}
      {st.i === 3 && (
        <div style={{ ...screenBase, padding: "24px 26px 26px" }}>
          <button onClick={back} style={backBtn}>←</button>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
            <div style={{ display: "flex" }}>
              {["#0E6B5C", "#22B39A", "#FF9E7D"].map((bg, k) => (
                <div key={k} style={{ width: 52, height: 52, borderRadius: "50%", background: bg, marginLeft: k === 0 ? 0 : -14, border: "3px solid #F4F6F3", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800 }}>🖊️</div>
              ))}
            </div>
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#16302B", lineHeight: 1.25 }}>Você não precisa passar por essa jornada no escuro.</div>
              <div style={{ fontSize: 14.5, color: "#4B5F59", lineHeight: 1.55, maxWidth: 290 }}>Acompanhamento, agenda e um resumo claro para levar à consulta.</div>
            </div>
          </div>
          <Pager active={1} />
          <button onClick={next} style={{ ...primaryBtn, marginTop: 20 }}>Continuar</button>
        </div>
      )}

      {/* SCREEN 4 — LIMITE & PRIVACIDADE */}
      {st.i === 4 && (
        <div style={{ ...screenBase, padding: "24px 26px 26px" }}>
          <button onClick={back} style={backBtn}>←</button>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#16302B", lineHeight: 1.3, marginTop: 8 }}>Espelho dos seus registros, e sob seu controle.</div>
          <div style={{ fontSize: 14, color: "#4B5F59", lineHeight: 1.6, marginTop: 12 }}>O Canetta não diagnostica, não prescreve e não recomenda dose, alimento, treino ou mudança de tratamento. Seus dados são privados e você decide o que registrar.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 22 }}>
            <details style={{ padding: "16px 18px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 16 }}>
              <summary style={{ cursor: "pointer", fontSize: 14.5, fontWeight: 700, color: "#16302B" }}>Termos de uso</summary>
              <p style={{ margin: "12px 0 0", fontSize: 13, color: "#4B5F59", lineHeight: 1.55 }}>O Canetta organiza registros informados por você para acompanhamento e conversa com profissionais. Ele não diagnostica, não prescreve, não altera medicamentos e não substitui atendimento profissional. Você pode exportar ou apagar seus registros nas configurações.</p>
            </details>
            <details style={{ padding: "16px 18px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 16 }}>
              <summary style={{ cursor: "pointer", fontSize: 14.5, fontWeight: 700, color: "#16302B" }}>Política de privacidade (LGPD)</summary>
              <p style={{ margin: "12px 0 0", fontSize: 13, color: "#4B5F59", lineHeight: 1.55 }}>Seus registros de saúde são usados para exibir sua jornada, gerar exportações e, quando você entra em uma conta, sincronizar os dados com segurança. Não compartilhe sua senha. Você pode solicitar exportação ou exclusão da conta em Perfil &amp; ajustes.</p>
            </details>
          </div>
          <div style={spacer} />
          <button onClick={next} style={primaryBtn}>Aceitar e continuar</button>
        </div>
      )}

      {/* SCREEN 5 — NOME */}
      {st.i === 5 && (
        <div style={{ ...screenBase, padding: "8px 26px 26px" }}>
          <Header />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 22 }}>
            <MascotBadge />
            <div style={{ fontSize: 23, fontWeight: 800, color: "#16302B", lineHeight: 1.3 }}>Como podemos te chamar?</div>
            <input className="flow-input" value={st.nome} onChange={(e) => set({ nome: e.target.value })} placeholder="Digite seu nome" style={inputStyle} />
          </div>
          <button onClick={next} style={primaryBtn}>Continuar</button>
          <button onClick={next} style={{ ...ghostBtn, padding: 15 }}>Pular</button>
        </div>
      )}

      {/* SCREEN 6 — ESTÁGIO */}
      {st.i === 6 && (
        <div style={{ ...screenBase, padding: "8px 26px 26px" }}>
          <Header />
          <div style={{ ...title, margin: "18px 0 22px" }}>{nomeDisplay}, onde você está na sua jornada GLP-1?</div>
          <ChoiceList options={["Já uso GLP-1", "Quero começar", "Ainda não decidi"]} current={st.estagio} onPick={(v) => set({ estagio: v })} pad="18px" fontSize={15.5} gap={12} />
          <div style={spacer} />
          <button onClick={next} style={primaryBtn}>Continuar</button>
        </div>
      )}

      {/* SCREEN 7 — MEDICAMENTO */}
      {st.i === 7 && (
        <div style={{ ...screenBase, padding: "8px 26px 26px" }}>
          <Header />
          <div style={{ ...title, margin: "18px 0 6px" }}>Qual medicamento você usa?</div>
          <div style={{ ...subLine, marginBottom: 14 }}>Escolha o nome que aparece na sua prescrição ou embalagem.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
            {MEDICATION_OPTIONS.map((label) => (
              <button key={label} type="button" aria-pressed={st.medicamento === label} onClick={() => set({ medicamento: label, dose: null, freq: isTirzepatideMedication(label) ? "Semanal" : st.freq })} style={{ width: "100%", ...optRowStyle(st.medicamento === label, "15px 18px") }}>{label}</button>
            ))}
          </div>
          <div style={spacer} />
          <button onClick={next} style={{ ...primaryBtn, marginTop: 14 }}>Continuar</button>
        </div>
      )}

      {/* SCREEN 8 — VALOR · REGISTRO DE DOSE */}
      {st.i === 8 && (
        <div style={{ ...screenBase, padding: "24px 26px 26px" }}>
          <button onClick={back} style={backBtn}>←</button>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90 }}>
              {[30, 55, 80].map((h, k) => (
                <div key={k} style={{ width: 26, height: h, borderRadius: 8, background: k === 2 ? "#0E6B5C" : "#BEE0D6" }} />
              ))}
            </div>
            <div style={{ textAlign: "center", fontSize: 24, fontWeight: 800, color: "#16302B", lineHeight: 1.3, maxWidth: 290 }}>Cada dose registrada é uma dúvida a menos.</div>
          </div>
          <button onClick={next} style={primaryBtn}>Continuar</button>
        </div>
      )}

      {/* SCREEN 9 — DOSE ATUAL */}
      {st.i === 9 && (
        <div style={{ ...screenBase, padding: "8px 26px 26px" }}>
          <Header />
          <div style={{ ...title, margin: "18px 0 6px" }}>Qual sua dose atual?</div>
          <div style={{ ...subLine, marginBottom: 16 }}>{isTirzepatideMedication(st.medicamento) ? "Doses comuns de tirzepatida. O Canetta não valida nem sugere dose." : "O Canetta não valida nem sugere dose."}</div>
          <ChoiceList options={doseOptionsForMedication(st.medicamento)} current={st.dose} onPick={(v) => set({ dose: v })} />
          <div style={spacer} />
          <button onClick={next} style={primaryBtn}>Continuar</button>
        </div>
      )}

      {/* SCREEN 10 — FREQUÊNCIA */}
      {st.i === 10 && (
        <div style={{ ...screenBase, padding: "8px 26px 26px" }}>
          <Header />
          <div style={{ ...title, margin: "18px 0 22px" }}>Com que frequência você aplica?</div>
          <ChoiceList options={["Diária", "Semanal", "Quinzenal", "Mensal", "Ainda não sei"]} current={st.freq} onPick={(v) => set({ freq: v })} />
          <div style={spacer} />
          <button onClick={next} style={primaryBtn}>Continuar</button>
        </div>
      )}

      {/* SCREEN 11 — PESO */}
      {st.i === 11 && (
        <div style={{ ...screenBase, padding: "8px 26px 26px" }}>
          <Header />
          <div style={{ ...title, margin: "18px 0 6px" }}>Qual seu peso atual?</div>
          <div style={{ ...subLine, marginBottom: 20 }}>Opcional — apenas um registro, sem julgamento.</div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
              <button onClick={() => set({ pesoKg: Math.max(35, st.pesoKg - 1) })} style={{ width: 48, height: 48, borderRadius: "50%", background: "#fff", border: "1.5px solid #E2E7E2", fontSize: 22, fontWeight: 700, color: "#0E6B5C", cursor: "pointer" }}>−</button>
              <div style={{ fontSize: 44, fontWeight: 800, color: "#16302B", fontVariantNumeric: "tabular-nums", minWidth: 140, textAlign: "center" }}>{st.pesoKg}<span style={{ fontSize: 18, color: "#596E68", fontWeight: 700 }}> kg</span></div>
              <button onClick={() => set({ pesoKg: Math.min(220, st.pesoKg + 1) })} style={{ width: 48, height: 48, borderRadius: "50%", background: "#fff", border: "1.5px solid #E2E7E2", fontSize: 22, fontWeight: 700, color: "#0E6B5C", cursor: "pointer" }}>+</button>
            </div>
            <Ruler />
          </div>
          <button onClick={next} style={primaryBtn}>Continuar</button>
          <button onClick={next} style={ghostBtn}>Pular</button>
        </div>
      )}

      {/* SCREEN 12 — ALTURA */}
      {st.i === 12 && (
        <div style={{ ...screenBase, padding: "8px 26px 26px" }}>
          <Header />
          <div style={{ ...title, margin: "18px 0 6px" }}>Qual sua altura?</div>
          <div style={{ ...subLine, marginBottom: 20 }}>Opcional — para organizar seus registros.</div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
              <button onClick={() => set({ alturaCm: Math.max(120, st.alturaCm - 1) })} style={{ width: 48, height: 48, borderRadius: "50%", background: "#fff", border: "1.5px solid #E2E7E2", fontSize: 22, fontWeight: 700, color: "#0E6B5C", cursor: "pointer" }}>−</button>
              <div style={{ fontSize: 44, fontWeight: 800, color: "#16302B", fontVariantNumeric: "tabular-nums", minWidth: 140, textAlign: "center" }}>{st.alturaCm}<span style={{ fontSize: 18, color: "#596E68", fontWeight: 700 }}> cm</span></div>
              <button onClick={() => set({ alturaCm: Math.min(220, st.alturaCm + 1) })} style={{ width: 48, height: 48, borderRadius: "50%", background: "#fff", border: "1.5px solid #E2E7E2", fontSize: 22, fontWeight: 700, color: "#0E6B5C", cursor: "pointer" }}>+</button>
            </div>
            <Ruler />
          </div>
          <button onClick={next} style={primaryBtn}>Continuar</button>
          <button onClick={next} style={ghostBtn}>Pular</button>
        </div>
      )}

      {/* SCREEN 13 — OBJETIVO PESSOAL */}
      {st.i === 13 && (
        <div style={{ ...screenBase, padding: "8px 26px 26px" }}>
          <Header />
          <div style={{ ...title, margin: "18px 0 6px" }}>Qual objetivo você quer acompanhar?</div>
          <div style={{ ...subLine, marginBottom: 16 }}>Opcional — um rótulo pessoal, sem cálculo em cima.</div>
          <ChoiceList
            options={["Ter mais consistência no tratamento", "Reduzir efeitos colaterais no dia a dia", "Manter uma rotina saudável", "Chegar mais preparado(a) às consultas", "Só quero registrar, sem objetivo específico"]}
            current={st.objetivo} onPick={(v) => set({ objetivo: v })} pad="15px 18px" fontSize={14.5}
          />
          <div style={spacer} />
          <button onClick={next} style={primaryBtn}>Continuar</button>
        </div>
      )}

      {/* SCREEN 14 — FASE */}
      {st.i === 14 && (
        <div style={{ ...screenBase, padding: "8px 26px 26px" }}>
          <Header />
          <div style={{ fontSize: 21, fontWeight: 800, color: "#16302B", lineHeight: 1.3, margin: "18px 0 14px" }}>Marque a fase e o estado atual da sua rotina.</div>
          <ChoiceList options={["Primeiro mês", "Até 3 meses", "3 a 6 meses", "Manutenção", "Redução ou pausa"]} current={st.fase} onPick={(v) => set({ fase: v })} pad="14px 18px" fontSize={14.5} gap={9} />
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#596E68", margin: "16px 0 8px", letterSpacing: "0.3px" }}>DOSE ESTÁ</div>
          <div style={{ display: "flex", gap: 8 }}>
            {["Aumentando", "Fixa", "Reduzindo"].map((label) => (
              <button key={label} type="button" aria-pressed={st.doseTrend === label} onClick={() => set({ doseTrend: label })} style={{ flex: 1, textAlign: "center", padding: "12px 6px", background: st.doseTrend === label ? "#EAF5F2" : "#fff", border: `1.5px solid ${st.doseTrend === label ? "#0E6B5C" : "#E2E7E2"}`, borderRadius: 12, fontSize: 13, fontWeight: 700, color: "#16302B", cursor: "pointer" }}>{label}</button>
            ))}
          </div>
          <div style={spacer} />
          <button onClick={next} style={primaryBtn}>Continuar</button>
        </div>
      )}

      {/* SCREEN 15 — MAIOR DIFICULDADE */}
      {st.i === 15 && difficultyInsightOpen && (
        <div style={{ ...screenBase, padding: "8px 26px 26px" }}>
          <Header />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: "#EAF5F2", color: "#0E6B5C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>✦</div>
            <div style={{ ...title, marginTop: 2 }}>{selectedDifficultyInsight.title}</div>
            <div style={{ ...subLine, fontSize: 14, lineHeight: 1.6 }}>{selectedDifficultyInsight.body}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 4 }}>
              {selectedDifficultyInsight.actions.map((action) => (
                <div key={action} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 13 }}>
                  <span style={{ color: "#0E6B5C", fontWeight: 900 }}>✓</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: "#16302B" }}>{action}</span>
                </div>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => { setDifficultyInsightOpen(false); next(); }} style={primaryBtn}>Continuar</button>
          <button type="button" onClick={() => setDifficultyInsightOpen(false)} style={ghostBtn}>Voltar à pergunta</button>
        </div>
      )}
      {st.i === 15 && !difficultyInsightOpen && (
        <div style={{ ...screenBase, padding: "8px 26px 26px" }}>
          <Header />
          <div style={{ ...title, margin: "18px 0 20px" }}>Qual sua maior dificuldade hoje?</div>
          <ChoiceList options={["Atividade física e massa magra", "Fome à noite", "Náusea", "Constipação", "Fim de semana", "Esquecimento", "Ainda não sei"]} current={st.dificuldade} onPick={(v) => { set({ dificuldade: v }); setDifficultyInsightOpen(true); }} />
          <div style={spacer} />
          <button onClick={next} style={primaryBtn}>Continuar</button>
        </div>
      )}

      {/* SCREEN 16 — MONTE SEU DIÁRIO */}
      {st.i === 16 && (
        <div style={{ ...screenBase, padding: "8px 26px 26px" }}>
          <Header />
          <div style={{ ...title, margin: "18px 0 6px" }}>Escolha o que quer acompanhar primeiro.</div>
          <div style={{ ...subLine, marginBottom: 16 }}>Toque para selecionar quantos quiser.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {["Aplicações", "Peso", "Sintomas", "Rotina & hábitos", "Movimento e força", "Perguntas"].map((label) => {
              const on = st.diario.includes(label);
              return (
                <button key={label} type="button" aria-pressed={on} onClick={() => toggleDiario(label)} style={{ width: "100%", ...optRowStyle(on) }}>
                  <span>{label}</span>
                  <span style={{ color: on ? "#0E6B5C" : "transparent" }}>✓</span>
                </button>
              );
            })}
          </div>
          <div style={spacer} />
          <button onClick={next} style={primaryBtn}>Continuar</button>
        </div>
      )}

      {/* SCREEN 17 — PRIVACIDADE */}
      {st.i === 17 && (
        <div style={{ ...screenBase, padding: "8px 26px 26px" }}>
          <Header />
          <div style={{ ...title, margin: "18px 0 6px" }}>Privacidade por padrão.</div>
          <div style={{ ...subLine, marginBottom: 18, lineHeight: 1.55 }}>O Canetta salva somente o necessário para organizar seu diário. Você pode exportar ou apagar tudo quando quiser.</div>
          <div style={{ padding: "16px 18px", background: "#EAF5F2", borderRadius: 14, color: "#0E6B5C", fontSize: 13.5, fontWeight: 700, lineHeight: 1.5 }}>Sem venda de dados. Sem diagnóstico automático. Sem recomendação de dose.</div>
          <div style={spacer} />
          <button onClick={next} style={primaryBtn}>Continuar</button>
        </div>
      )}

      {/* SCREEN 18 — SINTOMAS → CONSULTA */}
      {st.i === 18 && (
        <div style={{ ...screenBase, padding: "24px 26px 26px" }}>
          <button onClick={back} style={backBtn}>←</button>
          <div style={{ ...title, margin: "14px 0 20px" }}>Chegue à consulta sabendo exatamente como seu corpo respondeu ao tratamento.</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#596E68", marginBottom: 10 }}>INTENSIDADE DO SINTOMA</div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 4, marginBottom: 8 }}>
            {Array.from({ length: 11 }, (_, n) => (
              <button key={n} type="button" aria-label={`Intensidade ${n}`} aria-pressed={st.sintoma === n} onClick={() => set({ sintoma: n })} style={{ width: 26, height: 26, padding: 0, border: "none", borderRadius: "50%", background: st.sintoma === n ? "#0E6B5C" : "#fff", color: st.sintoma === n ? "#fff" : "#596E68", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>{n}</button>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#596E68", marginBottom: 22 }}><span>Nenhum</span><span>Intenso</span></div>
          <div style={{ background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 16, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#16302B" }}>Sobre náusea e efeitos digestivos</div>
            <div style={{ fontSize: 13, color: "#4B5F59", lineHeight: 1.55 }}>Efeitos gastrointestinais são comuns em tratamentos GLP-1 e costumam variar de intensidade. Fonte: bula do fabricante.</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0E6B5C", marginTop: 4 }}>Procure seu médico para orientações.</div>
          </div>
          <div style={spacer} />
          <button onClick={next} style={primaryBtn}>Continuar</button>
        </div>
      )}

      {/* SCREEN 19 — RESUMO PRÉ-CONSULTA */}
      {st.i === 19 && (
        <div style={{ ...screenBase, padding: "24px 26px 26px" }}>
          <button onClick={back} style={backBtn}>←</button>
          <div style={{ ...title, margin: "14px 0 6px" }}>Seu resumo, pronto antes de cada consulta.</div>
          <div style={{ alignSelf: "flex-start", fontSize: 11, fontWeight: 700, color: "#8DA9E8", background: "#EAF0FC", padding: "4px 10px", borderRadius: 8, marginBottom: 14 }}>EXEMPLO · SEUS DADOS APARECEM AQUI</div>
          <div style={{ background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 13 }}>
            {[
              ["Peso inicial → atual", "82,4 kg → 79,1 kg"],
              ["Dose atual", doseLabelSafe],
              ["Aplicações registradas", "6"],
              ["Sintomas mais frequentes", "Náusea leve (3x)"],
              ["Rotinas registradas", "4"],
              ["Perguntas anotadas", "2"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                <span style={{ color: "#596E68", fontWeight: 600 }}>{k}</span>
                <span style={{ fontWeight: 700, color: "#16302B", fontVariantNumeric: "tabular-nums" }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 13, color: "#4B5F59", marginTop: 14 }}>Leve para discutir com seu médico.</div>
          <div style={spacer} />
          <button onClick={next} style={primaryBtn}>Continuar</button>
        </div>
      )}

      {/* SCREEN 20 — ROTINA & HÁBITOS */}
      {st.i === 20 && (
        <div style={{ ...screenBase, padding: "24px 26px 26px" }}>
          <button onClick={back} style={backBtn}>←</button>
          <div style={{ ...title, margin: "14px 0 20px" }}>Acompanhe sinais da rotina, sem metas prescritas.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rotinaItems.map((r) => (
              <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: "#EAF5F2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{r.icon}</div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700, color: "#16302B" }}>{r.label}</span>
                  <span style={{ fontSize: 12, color: "#596E68" }}>{r.sub}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={spacer} />
          <button onClick={next} style={primaryBtn}>Continuar</button>
        </div>
      )}

      {/* SCREEN 21 — NOME DO MASCOTE */}
      {st.i === 21 && (
        <div style={{ ...screenBase, padding: "24px 26px 26px" }}>
          <button onClick={back} style={backBtn}>←</button>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
            <Mascot pose="wave" />
            <div style={{ textAlign: "center", fontSize: 21, fontWeight: 800, color: "#16302B", lineHeight: 1.3, maxWidth: 280 }}>Esse é o Canetta. Ele vai te acompanhar em cada etapa.</div>
            <input className="flow-input" value={st.mascotNome} onChange={(e) => set({ mascotNome: e.target.value })} placeholder="Dê um nome a ele" style={{ ...inputStyle, textAlign: "center" }} />
          </div>
          <button onClick={next} style={primaryBtn}>Continuar</button>
        </div>
      )}

      {/* SCREEN 22 — INSIGHT */}
      {st.i === 22 && (
        <div style={{ ...screenBase, padding: "24px 26px 26px" }}>
          <button onClick={back} style={backBtn}>←</button>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
            <Mascot pose="think" />
            <div style={{ textAlign: "center", fontSize: 17.5, fontWeight: 600, color: "#16302B", lineHeight: 1.5, maxWidth: 290 }}>
              Você apontou <b>{dificuldadeLabelSafe}</b> como seu maior desafio. O {mascotNomeDisplay} vai registrar sua jornada e destacar padrões observados — para você levar dados concretos à próxima consulta.
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#596E68" }}>Não diagnostica nem recomenda.</div>
          </div>
          <button onClick={next} style={primaryBtn}>Continuar</button>
        </div>
      )}

      {/* SCREEN 23 — LOADING */}
      {st.i === 23 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, background: "#0E6B5C", padding: 40 }}>
          <div style={{ width: 88, height: 88, borderRadius: "50%", border: "6px solid rgba(244,246,243,0.25)", borderTopColor: "#22B39A", animation: "spin 1s linear infinite" }} />
          <div style={{ fontSize: 17, fontWeight: 700, color: "#F4F6F3", textAlign: "center" }}>{LOADING_MSGS[Math.min(loadingIdx, LOADING_MSGS.length - 1)]}</div>
        </div>
      )}

      {/* SCREEN 24 — REVEAL */}
      {st.i === 24 && (
        <div style={{ ...screenBase, padding: 26 }}>
          <div style={{ fontSize: 23, fontWeight: 800, color: "#16302B", lineHeight: 1.3 }}>{nomeDisplay}, seu acompanhamento está configurado.</div>
          <div style={{ display: "inline-flex", alignSelf: "flex-start", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#0E6B5C", background: "#EAF5F2", padding: "5px 10px", borderRadius: 8, marginTop: 10 }}>✓ Registros sob seu controle</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#596E68", margin: "20px 0 10px", letterSpacing: "0.3px" }}>VOCÊ VAI ACOMPANHAR</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {revealItems.map((it) => (
              <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 14 }}>
                <span style={{ fontSize: 16 }}>{it.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#16302B" }}>{it.label}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: "14px 16px", background: "#EAF5F2", borderRadius: 14, fontSize: 13.5, fontWeight: 700, color: "#0E6B5C" }}>Fase atual: {faseLabelSafe}</div>
          <div style={spacer} />
          <button onClick={next} style={primaryBtn}>Continuar</button>
        </div>
      )}

      {/* SCREEN 25 — COMPROMISSO */}
      {st.i === 25 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, background: "#0E6B5C", padding: 40, position: "relative" }}>
          <Mascot pose="wave" />
          <div style={{ textAlign: "center", fontSize: 22, fontWeight: 800, color: "#F4F6F3", lineHeight: 1.35, maxWidth: 280 }}>{nomeDisplay}, seu próximo passo está claro.</div>
          <div style={{ position: "absolute", bottom: 48, left: 26, right: 26 }}>
            <button onClick={next} style={ctaLight}>Ver meu próximo passo</button>
          </div>
        </div>
      )}

      {/* SCREEN 26 — ACESSO AO MVP */}
      {st.i === 26 && (
        <div style={{ ...screenBase, padding: "24px 24px 22px" }}>
          <div style={{ fontSize: 21, fontWeight: 800, color: "#16302B", lineHeight: 1.3 }}>{nomeDisplay}, vamos organizar seu primeiro registro.</div>
          <div style={{ fontSize: 13, color: "#4B5F59", marginTop: 8, lineHeight: 1.5 }}>Nesta versão MVP, o acesso é gratuito e não há cobrança ou renovação automática.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 16 }}>
            {["Registro de aplicações, peso e sintomas", "Rotina e perguntas para a consulta", "Resumo em PDF e compartilhamento", "Exportação e exclusão dos seus dados"].map((b) => (
              <div key={b} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: "#22B39A", fontWeight: 800 }}>✓</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#16302B" }}>{b}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, padding: 16, borderRadius: 16, background: "#EAF5F2", color: "#0E6B5C", fontSize: 14, fontWeight: 800 }}>Acesso MVP gratuito</div>
          <div style={{ flex: 1, minHeight: 10 }} />
          <button onClick={next} style={{ width: "100%", padding: 18, background: "#FF9E7D", color: "#16302B", border: "none", borderRadius: 16, fontSize: 16, fontWeight: 800, cursor: "pointer" }}>Continuar para o Canetta</button>
          <div style={{ textAlign: "center", fontSize: 11.5, color: "#596E68", marginTop: 10 }}>Você poderá exportar ou apagar seus dados quando quiser.</div>
        </div>
      )}

      {/* SCREEN 27 — CONCLUSÃO */}
      {st.i === 27 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, background: "#0E6B5C", padding: 40, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            {Array.from({ length: 16 }, (_, k) => (
              <div key={k} style={{ position: "absolute", left: `${(k * 6.2) % 100}%`, top: -20, width: 8, height: 8, borderRadius: k % 2 ? "50%" : 2, background: ["#22B39A", "#FF9E7D", "#8DA9E8", "#F4F6F3"][k % 4], animation: `confettiFall ${1.6 + (k % 5) * 0.3}s linear ${k * 0.12}s infinite` }} />
            ))}
          </div>
          <Mascot pose="celebrate" />
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 8, zIndex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#F4F6F3", lineHeight: 1.35, maxWidth: 280 }}>Seu diário está pronto, {nomeDisplay}.</div>
            <div style={{ fontSize: 14, color: "#BEE0D6" }}>O {mascotNomeDisplay} acompanha os registros que você decidir salvar.</div>
          </div>
          <div style={{ position: "absolute", bottom: 48, left: 26, right: 26, display: "flex", flexDirection: "column", gap: 10, zIndex: 1 }}>
            <button onClick={finishToJourney} style={ctaLight}>Começar minha jornada</button>
          </div>
        </div>
      )}
    </div>
  );
}
