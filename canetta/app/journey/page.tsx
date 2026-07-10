"use client";

// App Canetta pós-onboarding (Hoje / Diário / Consulta / Mais + fluxos de registro),
// portado do design-code "Canetta App.dc.html" (Claude Design) para React funcional.
// Diário inteligente: registra e organiza; estados vazios reagem ao que foi registrado.
// Mantém os limites regulatórios (não diagnostica, não prescreve, não sugere conduta).
// Estado é client-side; persistência no Supabase fica para a próxima fase.

import { useMemo, useRef, useState, type CSSProperties } from "react";

type Tab = "hoje" | "diario" | "consulta" | "mais";
type RegisterFlow = "aplicacao" | "sintoma" | "peso" | "rotina" | "pergunta" | null;
type RegisterStep = "form" | "saved" | "checkin";

interface Draft {
  dataHora?: string; obs?: string; nota?: string; contexto?: string; pergunta?: string;
  foto?: boolean; local?: string; tipo?: string; duracao?: string; movimento?: string;
  sono?: string; fome?: string; intensidade?: number; pesoKg?: number; agua?: number;
}
interface Aplicacao { dataHora: string; local: string; obs: string; foto: boolean; data: Date; }
interface Sintoma { tipo: string; intensidade: number; duracao?: string; contexto?: string; nota?: string; data: Date; }
interface Peso { kg: number; data: string; raw: Date; }
interface Rotina extends Draft { data: Date; }
interface Pergunta { texto: string; data: Date; }
interface Foto { icon: string; type: string; }

interface AppState {
  nome: string; mascotNome: string; medicamento: string; dose: string; freqLabel: string;
  objetivo: string; faseAtual: string; lembretesOn: boolean;
  tab: Tab; diarioSub: string; consultaSub: string; maisSub: string; periodo: string;
  sheetOpen: boolean; registerFlow: RegisterFlow; registerStep: RegisterStep; draft: Draft;
  aplicacoes: Aplicacao[]; sintomas: Sintoma[]; pesos: Peso[]; rotinas: Rotina[];
  perguntas: Pergunta[]; fotos: Foto[]; toastMsg: string;
}

const INITIAL: AppState = {
  nome: "Ana", mascotNome: "Canetta", medicamento: "Ozempic", dose: "Dose 2", freqLabel: "Semanal",
  objetivo: "Manter uma rotina saudável", faseAtual: "Primeiro mês", lembretesOn: true,
  tab: "hoje", diarioSub: "registros", consultaSub: "resumo", maisSub: "menu", periodo: "Últimos 7 dias",
  sheetOpen: false, registerFlow: null, registerStep: "form", draft: {},
  aplicacoes: [], sintomas: [], pesos: [], rotinas: [], perguntas: [], fotos: [], toastMsg: "",
};

const REGION_COORDS = [
  { label: "Abdômen (esq.)", left: "38%", top: "38%" },
  { label: "Abdômen (dir.)", left: "56%", top: "38%" },
  { label: "Coxa (esq.)", left: "36%", top: "66%" },
  { label: "Coxa (dir.)", left: "58%", top: "66%" },
  { label: "Braço (esq.)", left: "8%", top: "36%" },
  { label: "Braço (dir.)", left: "82%", top: "36%" },
];

const fmtDate = (d: Date) => d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });

// ---------- estilos ----------
const primaryBtn: CSSProperties = { width: "100%", padding: 17, background: "#0E6B5C", color: "#fff", border: "none", borderRadius: 16, fontSize: 16, fontWeight: 700, cursor: "pointer" };
const closeX: CSSProperties = { background: "none", border: "none", color: "#5C7A72", fontSize: 20, cursor: "pointer" };
const fieldLabel: CSSProperties = { fontSize: 12, fontWeight: 700, color: "#7A8E88", marginBottom: 6 };
const inputSt: CSSProperties = { width: "100%", padding: "14px 16px", border: "1.5px solid #E2E7E2", borderRadius: 14, fontSize: 15, fontWeight: 600, color: "#16302B", background: "#fff" };
const textareaSt: CSSProperties = { width: "100%", minHeight: 60, padding: "14px 16px", border: "1.5px solid #E2E7E2", borderRadius: 14, fontSize: 14, color: "#16302B", background: "#fff", fontFamily: "inherit", resize: "none" };
const cardWhite: CSSProperties = { background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 16, padding: 18 };
const flowHeader = (titulo: string, onClose: () => void) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
    <button onClick={onClose} style={closeX}>✕</button>
    <div style={{ fontSize: 15, fontWeight: 800, color: "#16302B" }}>{titulo}</div>
    <div style={{ width: 20 }} />
  </div>
);

const MASCOT_BADGE = `<svg width="36" height="36" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="8" width="20" height="20" rx="10" fill="#FF9E7D"/><path d="M6 14a10 10 0 0 1 20 0v2H6z" fill="#0E6B5C"/><circle cx="12" cy="20" r="1.6" fill="#16302B"/><circle cx="20" cy="20" r="1.6" fill="#16302B"/></svg>`;
function MascotBadge({ size = 36 }: { size?: number }) {
  return <div style={{ width: size }} dangerouslySetInnerHTML={{ __html: MASCOT_BADGE }} />;
}
const BODY_SVG = `<svg width="150" height="210" viewBox="0 0 150 210"><ellipse cx="75" cy="24" rx="18" ry="20" fill="#E2E7E2"/><rect x="45" y="44" width="60" height="90" rx="26" fill="#E2E7E2"/><rect x="18" y="52" width="20" height="80" rx="10" fill="#E2E7E2"/><rect x="112" y="52" width="20" height="80" rx="10" fill="#E2E7E2"/><rect x="52" y="132" width="20" height="70" rx="10" fill="#E2E7E2"/><rect x="78" y="132" width="20" height="70" rx="10" fill="#E2E7E2"/></svg>`;

function chipStyle(sel: boolean, radius = 12): CSSProperties {
  return { background: sel ? "#EAF5F2" : "#fff", border: `1.5px solid ${sel ? "#0E6B5C" : "#E2E7E2"}`, borderRadius: radius, fontWeight: 700, color: "#16302B", cursor: "pointer" };
}

export default function JourneyPage() {
  const [st, setStRaw] = useState<AppState>(INITIAL);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const set = (p: Partial<AppState>) => setStRaw((s) => ({ ...s, ...p }));
  const setDraft = (p: Partial<Draft>) => setStRaw((s) => ({ ...s, draft: { ...s.draft, ...p } }));

  const toast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    set({ toastMsg: msg });
    toastTimer.current = setTimeout(() => set({ toastMsg: "" }), 1800);
  };

  // navegação
  const setTab = (tab: Tab) => set({ tab, sheetOpen: false });
  const startFlow = (type: RegisterFlow) => set({ sheetOpen: false, registerFlow: type, registerStep: "form", draft: {} });
  const cancelFlow = () => set({ registerFlow: null, registerStep: "form", draft: {} });
  const finishToHoje = () => set({ registerFlow: null, registerStep: "form", draft: {}, tab: "hoje" });
  const finishToHistorico = () => set({ registerFlow: null, registerStep: "form", draft: {}, tab: "diario", diarioSub: "registros" });

  const lastPeso = () => (st.pesos.length ? st.pesos[st.pesos.length - 1].kg : 78);

  // salvar
  const saveAplicacao = () => {
    const d = st.draft;
    const entry: Aplicacao = { dataHora: d.dataHora || "Hoje, agora", local: d.local || "Não informado", obs: d.obs || "", foto: !!d.foto, data: new Date() };
    set({ aplicacoes: [...st.aplicacoes, entry], fotos: d.foto ? [...st.fotos, { icon: "💉", type: "aplicacao" }] : st.fotos, registerStep: "saved" });
  };
  const saveCheckin = () => {
    set({ sintomas: [...st.sintomas, { tipo: "Check-in pós-dose", intensidade: st.draft.intensidade ?? 0, nota: st.draft.nota || "", data: new Date() }] });
    toast("Check-in salvo."); finishToHoje();
  };
  const saveSintoma = () => {
    set({ sintomas: [...st.sintomas, { tipo: st.draft.tipo || "Sintoma", intensidade: st.draft.intensidade ?? 0, duracao: st.draft.duracao, contexto: st.draft.contexto, nota: st.draft.nota, data: new Date() }] });
    toast("Sintoma registrado."); finishToHoje();
  };
  const savePeso = () => {
    const kg = st.draft.pesoKg ?? lastPeso();
    set({ pesos: [...st.pesos, { kg, data: fmtDate(new Date()), raw: new Date() }], fotos: st.draft.foto ? [...st.fotos, { icon: "⚖️", type: "peso" }] : st.fotos });
    toast("Peso registrado."); finishToHoje();
  };
  const saveRotina = () => {
    set({ rotinas: [...st.rotinas, { ...st.draft, data: new Date() }], fotos: st.draft.foto ? [...st.fotos, { icon: "🍽️", type: "rotina" }] : st.fotos });
    toast("Rotina registrada."); finishToHoje();
  };
  const savePergunta = () => {
    if (!st.draft.pergunta) { finishToHoje(); return; }
    set({ perguntas: [...st.perguntas, { texto: st.draft.pergunta, data: new Date() }] });
    toast("Pergunta salva na pauta."); finishToHoje();
  };

  // derivados
  const freqDays = ({ "Diária": 1, "Semanal": 7, "Quinzenal": 14, "Mensal": 30 } as Record<string, number>)[st.freqLabel] || 7;
  const nextReminderLabel = useMemo(() => {
    if (!st.aplicacoes.length) return "";
    const n = new Date(); n.setDate(n.getDate() + freqDays);
    return fmtDate(n) + ", mesmo horário registrado";
  }, [st.aplicacoes.length, freqDays]);

  const events = useMemo(() => {
    const evs = [
      ...st.aplicacoes.map((a) => ({ icon: "💉", label: "Aplicação · " + st.medicamento, data: a.dataHora, t: a.data })),
      ...st.sintomas.map((a) => ({ icon: "📝", label: "Sintoma · " + a.tipo, data: fmtDate(a.data), t: a.data })),
      ...st.pesos.map((a) => ({ icon: "⚖️", label: "Peso · " + a.kg + " kg", data: a.data, t: a.raw })),
      ...st.rotinas.map((a) => ({ icon: "🗓️", label: "Rotina & hábitos", data: fmtDate(a.data), t: a.data })),
      ...st.perguntas.map((a) => ({ icon: "❓", label: "Pergunta anotada", data: fmtDate(a.data), t: a.data })),
    ];
    return evs.sort((x, y) => y.t.getTime() - x.t.getTime());
  }, [st.aplicacoes, st.sintomas, st.pesos, st.rotinas, st.perguntas, st.medicamento]);

  const anyDado = st.aplicacoes.length || st.pesos.length || st.sintomas.length || st.rotinas.length || st.perguntas.length;
  const conquista = anyDado > 0;
  const pesoAtual = st.pesos.length ? st.pesos[st.pesos.length - 1].kg : null;
  const espelhoFacts = useMemo(() => {
    const facts = [
      { label: "Aplicações", value: String(st.aplicacoes.length), detail: st.aplicacoes.length ? "salvas no histórico" : "sem registro" },
      { label: "Pesos", value: String(st.pesos.length), detail: pesoAtual ? `${pesoAtual} kg no último registro` : "sem registro" },
      { label: "Sintomas", value: String(st.sintomas.length), detail: st.sintomas.length ? "informados por você" : "sem registro" },
      { label: "Rotina", value: String(st.rotinas.length), detail: st.rotinas.length ? "hábitos salvos" : "sem registro" },
    ];
    return facts.filter((fact) => fact.value !== "0");
  }, [pesoAtual, st.aplicacoes.length, st.pesos.length, st.sintomas.length, st.rotinas.length]);

  const quickDefs = [
    { key: "aplicacao", icon: "💉", label: "Aplicação" }, { key: "peso", icon: "⚖️", label: "Peso" },
    { key: "sintoma", icon: "📝", label: "Sintoma" }, { key: "rotina", icon: "🗓️", label: "Rotina" },
    { key: "pergunta", icon: "❓", label: "Pergunta" },
  ] as const;

  const IntensityScale = ({ size = 26 }: { size?: number }) => {
    const cur = st.draft.intensidade ?? -1;
    return (
      <div style={{ display: "flex", justifyContent: "space-between", gap: 4 }}>
        {Array.from({ length: 11 }, (_, n) => (
          <div key={n} onClick={() => setDraft({ intensidade: n })} style={{ width: size, height: size, borderRadius: "50%", background: cur === n ? "#0E6B5C" : "#fff", color: cur === n ? "#fff" : "#7A8E88", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>{n}</div>
        ))}
      </div>
    );
  };
  const ChipRow = ({ options, current, onPick, radius = 12, equal = false, wrap = false }: { options: readonly string[]; current?: string; onPick: (v: string) => void; radius?: number; equal?: boolean; wrap?: boolean; }) => (
    <div style={{ display: "flex", gap: 8, flexWrap: wrap ? "wrap" : "nowrap" }}>
      {options.map((label) => (
        <div key={label} onClick={() => onPick(label)} style={{ ...chipStyle(current === label, radius), ...(equal ? { flex: 1, textAlign: "center" as const } : {}), padding: wrap ? "9px 14px" : "10px 4px", fontSize: 12.5 }}>{label}</div>
      ))}
    </div>
  );

  const stage: CSSProperties = { position: "relative", height: "100%", minHeight: "calc(100vh - 56px)", display: "flex", flexDirection: "column", overflow: "hidden", background: "#F4F6F3", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" };

  return (
    <div style={stage}>
      <style>{`@keyframes floaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}} .j-in:focus,.j-in textarea:focus{outline:none;border-color:#0E6B5C}`}</style>

      {st.toastMsg && (
        <div style={{ position: "absolute", top: 8, left: 20, right: 20, zIndex: 40, background: "#16302B", color: "#fff", padding: "12px 16px", borderRadius: 12, fontSize: 13, fontWeight: 700, textAlign: "center" }}>{st.toastMsg}</div>
      )}

      {/* ================= REGISTER FLOWS ================= */}
      {st.registerFlow ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>

          {/* APLICAÇÃO — FORM */}
          {st.registerFlow === "aplicacao" && st.registerStep === "form" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 24px 24px" }}>
              {flowHeader("Registrar aplicação", cancelFlow)}
              <div style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", flex: 1 }}>
                <div>
                  <div style={fieldLabel}>DATA E HORA</div>
                  <input className="j-in" value={st.draft.dataHora || ""} onChange={(e) => setDraft({ dataHora: e.target.value })} placeholder="Hoje, 08:00" style={inputSt} />
                </div>
                <div>
                  <div style={fieldLabel}>MEDICAMENTO E DOSE</div>
                  <div style={{ padding: "14px 16px", borderRadius: 14, background: "#EAF5F2", fontSize: 14.5, fontWeight: 700, color: "#0E6B5C" }}>{st.medicamento} · {st.dose}</div>
                </div>
                <div>
                  <div style={{ ...fieldLabel, marginBottom: 8 }}>LOCAL NO CORPO</div>
                  <div style={{ position: "relative", width: 150, height: 210, margin: "0 auto" }}>
                    <div style={{ position: "absolute", top: 0, left: 0 }} dangerouslySetInnerHTML={{ __html: BODY_SVG }} />
                    {REGION_COORDS.map((r) => (
                      <div key={r.label} onClick={() => setDraft({ local: r.label })} style={{ position: "absolute", left: r.left, top: r.top, width: 26, height: 26, borderRadius: "50%", background: st.draft.local === r.label ? "#0E6B5C" : "#8DA9A2", border: "2px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,0.2)", cursor: "pointer" }} />
                    ))}
                  </div>
                  <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: "#0E6B5C", marginTop: 8 }}>{st.draft.local || "Toque em um ponto do corpo"}</div>
                </div>
                <div>
                  <div style={fieldLabel}>OBSERVAÇÃO (OPCIONAL)</div>
                  <textarea className="j-in" value={st.draft.obs || ""} onChange={(e) => setDraft({ obs: e.target.value })} placeholder="Alguma nota sobre esta aplicação" style={textareaSt} />
                </div>
                <div onClick={() => setDraft({ foto: !st.draft.foto })} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", ...chipStyle(!!st.draft.foto, 14) }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#16302B" }}>📷 Adicionar foto</span><span style={{ color: "#0E6B5C", fontWeight: 800 }}>{st.draft.foto ? "✓" : ""}</span>
                </div>
              </div>
              <button onClick={saveAplicacao} style={{ ...primaryBtn, marginTop: 14 }}>Salvar</button>
            </div>
          )}

          {/* APLICAÇÃO — SALVA */}
          {st.registerFlow === "aplicacao" && st.registerStep === "saved" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 40, background: "#0E6B5C" }}>
              <div style={{ width: 74, height: 74, borderRadius: "50%", background: "#22B39A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, color: "#0E2A23" }}>✓</div>
              <div style={{ textAlign: "center", fontSize: 20, fontWeight: 800, color: "#F4F6F3" }}>Aplicação registrada.</div>
              <div style={{ textAlign: "center", fontSize: 13.5, color: "#BEE0D6", maxWidth: 260 }}>Próximo lembrete: {nextReminderLabel}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 280, marginTop: 10 }}>
                <button onClick={() => set({ registerStep: "checkin" })} style={{ width: "100%", padding: 15, background: "#22B39A", color: "#0E2A23", border: "none", borderRadius: 14, fontSize: 14.5, fontWeight: 800, cursor: "pointer" }}>Registrar como me senti</button>
                <button onClick={finishToHistorico} style={{ width: "100%", padding: 13, background: "transparent", color: "#BEE0D6", border: "none", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>Ver no histórico</button>
              </div>
            </div>
          )}

          {/* CHECK-IN */}
          {st.registerFlow === "aplicacao" && st.registerStep === "checkin" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 24px 24px" }}>
              <button onClick={finishToHoje} style={{ ...closeX, alignSelf: "flex-start" }}>✕</button>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#16302B", margin: "14px 0 18px" }}>Como você se sentiu?</div>
              <textarea className="j-in" value={st.draft.nota || ""} onChange={(e) => setDraft({ nota: e.target.value })} placeholder="Escreva uma nota (opcional)" style={{ ...textareaSt, minHeight: 70 }} />
              <div style={{ ...fieldLabel, margin: "18px 0 8px" }}>INTENSIDADE GERAL</div>
              <IntensityScale />
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9AAAA5", marginTop: 22 }}>O Canetta não interpreta este valor — apenas registra.</div>
              <div style={{ flex: 1 }} />
              <button onClick={saveCheckin} style={primaryBtn}>Salvar</button>
            </div>
          )}

          {/* SINTOMA */}
          {st.registerFlow === "sintoma" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 24px 24px", overflowY: "auto" }}>
              {flowHeader("Registrar sintoma", cancelFlow)}
              <div style={{ ...fieldLabel, marginBottom: 8 }}>TIPO</div>
              <div style={{ marginBottom: 16 }}><ChipRow options={["Náusea", "Fadiga", "Dor de cabeça", "Constipação", "Diarreia", "Outro"]} current={st.draft.tipo} onPick={(v) => setDraft({ tipo: v })} radius={20} wrap /></div>
              <div style={{ ...fieldLabel, marginBottom: 8 }}>INTENSIDADE</div>
              <div style={{ marginBottom: 16 }}><IntensityScale size={24} /></div>
              <div style={{ ...fieldLabel, marginBottom: 8 }}>DURAÇÃO</div>
              <div style={{ marginBottom: 16 }}><ChipRow options={["<1h", "1–3h", ">3h", "O dia todo"]} current={st.draft.duracao} onPick={(v) => setDraft({ duracao: v })} equal /></div>
              <textarea className="j-in" value={st.draft.contexto || ""} onChange={(e) => setDraft({ contexto: e.target.value })} placeholder="Contexto (ex: após a refeição)" style={{ ...textareaSt, minHeight: 44, fontSize: 13.5, marginBottom: 10 }} />
              <textarea className="j-in" value={st.draft.nota || ""} onChange={(e) => setDraft({ nota: e.target.value })} placeholder="Nota adicional (opcional)" style={{ ...textareaSt, minHeight: 44, fontSize: 13.5, marginBottom: 16 }} />
              <div style={{ ...cardWhite, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 5, marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#16302B" }}>Sobre efeitos digestivos</div>
                <div style={{ fontSize: 12.5, color: "#4B5F59", lineHeight: 1.5 }}>Sintomas gastrointestinais variam de pessoa para pessoa. Fonte: bula do fabricante.</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#0E6B5C" }}>Procure seu médico para orientações.</div>
              </div>
              <button onClick={saveSintoma} style={{ ...primaryBtn, marginTop: 12 }}>Salvar</button>
            </div>
          )}

          {/* PESO */}
          {st.registerFlow === "peso" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 24px 24px" }}>
              {flowHeader("Registrar peso", cancelFlow)}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
                  <button onClick={() => setDraft({ pesoKg: (st.draft.pesoKg ?? lastPeso()) - 1 })} style={{ width: 48, height: 48, borderRadius: "50%", background: "#fff", border: "1.5px solid #E2E7E2", fontSize: 22, fontWeight: 700, color: "#0E6B5C", cursor: "pointer" }}>−</button>
                  <div style={{ fontSize: 44, fontWeight: 800, color: "#16302B", fontVariantNumeric: "tabular-nums", minWidth: 150, textAlign: "center" }}>{st.draft.pesoKg ?? lastPeso()}<span style={{ fontSize: 18, color: "#7A8E88", fontWeight: 700 }}> kg</span></div>
                  <button onClick={() => setDraft({ pesoKg: (st.draft.pesoKg ?? lastPeso()) + 1 })} style={{ width: 48, height: 48, borderRadius: "50%", background: "#fff", border: "1.5px solid #E2E7E2", fontSize: 22, fontWeight: 700, color: "#0E6B5C", cursor: "pointer" }}>+</button>
                </div>
                <div onClick={() => setDraft({ foto: !st.draft.foto })} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", ...chipStyle(!!st.draft.foto, 20) }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#16302B" }}>📷 Adicionar foto ou medida</span><span style={{ color: "#0E6B5C", fontWeight: 800 }}>{st.draft.foto ? "✓" : ""}</span>
                </div>
                <div style={{ width: "100%", ...cardWhite, padding: "14px 16px" }}>
                  <div style={{ ...fieldLabel, marginBottom: 8 }}>ESPELHO DE REGISTROS</div>
                  {st.pesos.length ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {st.pesos.slice(-3).reverse().map((p, k) => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: "#7A8E88" }}>{p.data}</span><span style={{ fontWeight: 700, color: "#16302B", fontVariantNumeric: "tabular-nums" }}>{p.kg} kg</span></div>
                      ))}
                      <div style={{ fontSize: 11.5, color: "#7A8E88", lineHeight: 1.4, marginTop: 4 }}>Fato neutro: mostra pesos informados por você, sem alerta, meta ou interpretação.</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: "#9AAAA5" }}>Ainda sem histórico — este será seu primeiro registro.</div>
                  )}
                </div>
              </div>
              <button onClick={savePeso} style={primaryBtn}>Salvar</button>
            </div>
          )}

          {/* ROTINA */}
          {st.registerFlow === "rotina" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 24px 24px", overflowY: "auto" }}>
              {flowHeader("Rotina & hábitos", cancelFlow)}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div style={fieldLabel}>REFEIÇÕES</div>
                  <div onClick={() => setDraft({ foto: !st.draft.foto })} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", ...chipStyle(!!st.draft.foto, 14), marginBottom: 8 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: "#16302B" }}>📷 Foto da refeição</span><span style={{ color: "#0E6B5C", fontWeight: 800 }}>{st.draft.foto ? "✓" : ""}</span>
                  </div>
                  <textarea className="j-in" value={st.draft.nota || ""} onChange={(e) => setDraft({ nota: e.target.value })} placeholder="Nota (opcional)" style={{ ...textareaSt, minHeight: 40, fontSize: 13.5 }} />
                </div>
                <div>
                  <div style={fieldLabel}>ÁGUA</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <button onClick={() => setDraft({ agua: Math.max(0, (st.draft.agua ?? 0) - 1) })} style={{ width: 38, height: 38, borderRadius: "50%", background: "#fff", border: "1.5px solid #E2E7E2", fontSize: 18, fontWeight: 700, color: "#0E6B5C", cursor: "pointer" }}>−</button>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#16302B", fontVariantNumeric: "tabular-nums" }}>{st.draft.agua ?? 0} copos</div>
                    <button onClick={() => setDraft({ agua: (st.draft.agua ?? 0) + 1 })} style={{ width: 38, height: 38, borderRadius: "50%", background: "#fff", border: "1.5px solid #E2E7E2", fontSize: 18, fontWeight: 700, color: "#0E6B5C", cursor: "pointer" }}>+</button>
                  </div>
                </div>
                <div><div style={fieldLabel}>MOVIMENTO</div><ChipRow options={["Nenhum", "Leve", "Moderado", "Intenso"]} current={st.draft.movimento} onPick={(v) => setDraft({ movimento: v })} equal /></div>
                <div><div style={fieldLabel}>SONO</div><ChipRow options={["Ruim", "Regular", "Bom", "Ótimo"]} current={st.draft.sono} onPick={(v) => setDraft({ sono: v })} equal /></div>
                <div><div style={fieldLabel}>FOME PERCEBIDA</div><ChipRow options={["Baixa", "Normal", "Alta"]} current={st.draft.fome} onPick={(v) => setDraft({ fome: v })} equal /></div>
              </div>
              <button onClick={saveRotina} style={{ ...primaryBtn, marginTop: 18 }}>Salvar</button>
            </div>
          )}

          {/* PERGUNTA */}
          {st.registerFlow === "pergunta" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 24px 24px" }}>
              {flowHeader("Anotar pergunta", cancelFlow)}
              <div style={{ fontSize: 13, color: "#4B5F59", marginBottom: 12 }}>Vai direto para a pauta do resumo da consulta.</div>
              <textarea className="j-in" value={st.draft.pergunta || ""} onChange={(e) => setDraft({ pergunta: e.target.value })} placeholder="Ex: Posso ajustar o horário da aplicação?" style={{ ...textareaSt, minHeight: 110, fontSize: 14.5 }} />
              <div style={{ flex: 1 }} />
              <button onClick={savePergunta} style={primaryBtn}>Salvar na pauta</button>
            </div>
          )}
        </div>
      ) : (
        /* ================= MAIN (tabs) ================= */
        <>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: 90, overflowY: "auto" }}>

            {/* HOJE */}
            {st.tab === "hoje" && (
              <div style={{ padding: "20px 22px 0", display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ animation: "floaty 3.5s ease-in-out infinite" }}><MascotBadge /></div>
                  <div><div style={{ fontSize: 20, fontWeight: 800, color: "#16302B" }}>Oi, {st.nome}</div><div style={{ fontSize: 12.5, color: "#7A8E88" }}>{st.mascotNome} está por aqui hoje.</div></div>
                </div>
                <div style={{ background: "#0E6B5C", borderRadius: 18, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#BEE0D6", letterSpacing: "0.3px" }}>PRÓXIMA DOSE</div>
                  {st.aplicacoes.length ? (
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#F4F6F3" }}>{nextReminderLabel}</div>
                  ) : (
                    <>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#DFF0EA" }}>Nenhuma aplicação registrada ainda.</div>
                      <button onClick={() => startFlow("aplicacao")} style={{ alignSelf: "flex-start", marginTop: 4, padding: "9px 16px", background: "#22B39A", color: "#0E2A23", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>Registrar aplicação</button>
                    </>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#7A8E88", marginBottom: 10 }}>REGISTRO RÁPIDO</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {quickDefs.map((q) => (
                      <div key={q.key} onClick={() => startFlow(q.key)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 70, padding: "12px 6px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 14, cursor: "pointer" }}>
                        <span style={{ fontSize: 20 }}>{q.icon}</span><span style={{ fontSize: 11, fontWeight: 700, color: "#16302B", textAlign: "center" }}>{q.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div onClick={() => set({ tab: "consulta", consultaSub: "resumo" })} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 18px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 16, cursor: "pointer" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#16302B" }}>📄 Resumo da consulta</span><span style={{ color: "#8DA9A2", fontSize: 18 }}>›</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: conquista ? "#EAF5F2" : "#fff", borderRadius: 16 }}>
                  <span style={{ fontSize: 20 }}>🏅</span>
                  <div><div style={{ fontSize: 13.5, fontWeight: 700, color: "#16302B" }}>Conquista do dia</div><div style={{ fontSize: 12, color: "#4B5F59" }}>{conquista ? "Você já registrou algo hoje." : "Faça seu primeiro registro para desbloquear."}</div></div>
                </div>
              </div>
            )}

            {/* DIÁRIO */}
            {st.tab === "diario" && (
              <div style={{ padding: "20px 22px 0", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#16302B" }}>Diário</div>
                <div style={{ display: "flex", gap: 6, background: "#E9EDE9", padding: 4, borderRadius: 14 }}>
                  {[["registros", "Registros"], ["espelho", "Espelho"]].map(([k, label]) => (
                    <div key={k} onClick={() => set({ diarioSub: k })} style={{ flex: 1, textAlign: "center", padding: "9px 2px", background: st.diarioSub === k ? "#fff" : "transparent", color: st.diarioSub === k ? "#0E6B5C" : "#7A8E88", borderRadius: 11, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>{label}</div>
                  ))}
                </div>

                {st.diarioSub === "registros" && (events.length ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {events.map((ev, k) => (
                      <div key={k} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "13px 16px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 14 }}>
                        <span style={{ fontSize: 18 }}>{ev.icon}</span>
                        <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 700, color: "#16302B" }}>{ev.label}</div><div style={{ fontSize: 11.5, color: "#7A8E88" }}>{ev.data}</div></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                    <MascotBadge size={52} />
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#16302B" }}>Seu diário começa com o próximo registro.</div>
                  </div>
                ))}

                {st.diarioSub === "espelho" && (
                  <div style={{ ...cardWhite, display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#16302B" }}>Espelho de tendência</div>
                      <div style={{ fontSize: 12.5, color: "#4B5F59", lineHeight: 1.45, marginTop: 4 }}>Mostra somente fatos salvos no diário. Não é alerta, diagnóstico, meta ou recomendação.</div>
                    </div>
                    {espelhoFacts.length ? espelhoFacts.map((fact) => (
                      <div key={fact.label} style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "baseline", paddingTop: 10, borderTop: "1px solid #EDF0EC" }}>
                        <div><div style={{ fontSize: 13.5, fontWeight: 700, color: "#16302B" }}>{fact.label}</div><div style={{ fontSize: 11.5, color: "#7A8E88" }}>{fact.detail}</div></div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#0E6B5C", fontVariantNumeric: "tabular-nums" }}>{fact.value}</div>
                      </div>
                    )) : (
                      <div style={{ fontSize: 13, color: "#7A8E88", lineHeight: 1.45 }}>Ainda não há registros suficientes para espelhar uma tendência. Quando você salvar dados, eles aparecem aqui como contagem factual.</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* CONSULTA */}
            {st.tab === "consulta" && (
              <div style={{ padding: "20px 22px 0", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#16302B" }}>Consulta</div>
                <div style={{ display: "flex", gap: 6, background: "#E9EDE9", padding: 4, borderRadius: 14 }}>
                  {[["resumo", "Resumo"], ["exportar", "Exportar"], ["fases", "Fases"]].map(([k, label]) => (
                    <div key={k} onClick={() => set({ consultaSub: k })} style={{ flex: 1, textAlign: "center", padding: "9px 2px", background: st.consultaSub === k ? "#fff" : "transparent", color: st.consultaSub === k ? "#0E6B5C" : "#7A8E88", borderRadius: 11, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>{label}</div>
                  ))}
                </div>

                {st.consultaSub === "resumo" && (anyDado ? (
                  <>
                    <div style={{ ...cardWhite, display: "flex", flexDirection: "column", gap: 12 }}>
                      {st.pesos.length > 0 && (<div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}><span style={{ color: "#7A8E88", fontWeight: 600 }}>Peso inicial → atual</span><span style={{ fontWeight: 700, color: "#16302B", fontVariantNumeric: "tabular-nums" }}>{st.pesos[0].kg} kg → {st.pesos[st.pesos.length - 1].kg} kg</span></div>)}
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}><span style={{ color: "#7A8E88", fontWeight: 600 }}>Dose atual</span><span style={{ fontWeight: 700, color: "#16302B" }}>{st.medicamento} · {st.dose}</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}><span style={{ color: "#7A8E88", fontWeight: 600 }}>Aplicações registradas</span><span style={{ fontWeight: 700, color: "#16302B", fontVariantNumeric: "tabular-nums" }}>{st.aplicacoes.length}</span></div>
                      {st.sintomas.length > 0 && (<div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}><span style={{ color: "#7A8E88", fontWeight: 600 }}>Sintomas registrados</span><span style={{ fontWeight: 700, color: "#16302B" }}>{st.sintomas.length} registro(s)</span></div>)}
                      {st.rotinas.length > 0 && (<div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}><span style={{ color: "#7A8E88", fontWeight: 600 }}>Hábitos registrados</span><span style={{ fontWeight: 700, color: "#16302B", fontVariantNumeric: "tabular-nums" }}>{st.rotinas.length}</span></div>)}
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}><span style={{ color: "#7A8E88", fontWeight: 600 }}>Fotos anexadas</span><span style={{ fontWeight: 700, color: "#16302B" }}>{st.fotos.length}</span></div>
                      {st.perguntas.length > 0 && (
                        <>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#7A8E88", marginTop: 4 }}>PERGUNTAS ANOTADAS</div>
                          {st.perguntas.map((p, k) => (<div key={k} style={{ fontSize: 13, color: "#16302B", padding: "4px 0" }}>• {p.texto}</div>))}
                        </>
                      )}
                    </div>
                    <div style={{ fontSize: 12.5, color: "#4B5F59", marginTop: 10 }}>Leve para discutir com seu médico.</div>
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "40px 20px", fontSize: 14, fontWeight: 700, color: "#16302B" }}>Seu resumo ganha seções conforme você registra.</div>
                ))}

                {st.consultaSub === "exportar" && (
                  <>
                    <div style={{ ...fieldLabel, marginBottom: 4 }}>PERÍODO</div>
                    <ChipRow options={["Últimos 7 dias", "Últimos 30 dias", "Tudo"]} current={st.periodo} onPick={(v) => set({ periodo: v })} equal />
                    <button onClick={() => toast("Resumo pronto para compartilhar.")} style={{ ...primaryBtn, padding: 16, borderRadius: 14, fontSize: 15, marginTop: 16 }}>Gerar PDF</button>
                    <button onClick={() => toast("Resumo pronto para compartilhar.")} style={{ width: "100%", padding: 14, background: "transparent", color: "#0E6B5C", border: "1.5px solid #E2E7E2", borderRadius: 14, fontSize: 14.5, fontWeight: 700, cursor: "pointer", marginTop: 8 }}>Compartilhar</button>
                    <div style={{ fontSize: 11.5, color: "#9AAAA5", marginTop: 10 }}>Seus dados ficam no seu aparelho até você optar por exportar ou compartilhar.</div>
                  </>
                )}

                {st.consultaSub === "fases" && (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {["Primeiro mês", "Até 3 meses", "3 a 6 meses", "Manutenção", "Redução ou pausa"].map((label) => (
                        <div key={label} onClick={() => set({ faseAtual: label })} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", ...chipStyle(st.faseAtual === label, 14) }}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", background: st.faseAtual === label ? "#0E6B5C" : "#E2E7E2" }} />
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#16302B" }}>{label}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: "#7A8E88", marginTop: 12, lineHeight: 1.5 }}>As condutas de cada fase são definidas com seu médico. O Canetta apenas organiza seus registros por período.</div>
                  </>
                )}
              </div>
            )}

            {/* MAIS */}
            {st.tab === "mais" && (
              <div style={{ padding: "20px 22px 0", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {st.maisSub !== "menu" && <button onClick={() => set({ maisSub: "menu" })} style={{ ...closeX, padding: 0 }}>←</button>}
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#16302B" }}>{st.maisSub === "menu" ? "Mais" : st.maisSub === "conteudo" ? "Conteúdo educativo" : "Perfil & ajustes"}</div>
                </div>

                {st.maisSub === "menu" && (
                  <>
                    <div onClick={() => set({ maisSub: "conteudo" })} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 16, cursor: "pointer" }}><span style={{ fontSize: 14.5, fontWeight: 700, color: "#16302B" }}>📚 Conteúdo educativo</span><span style={{ color: "#8DA9A2", fontSize: 18 }}>›</span></div>
                    <div onClick={() => set({ maisSub: "perfil" })} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 16, cursor: "pointer" }}><span style={{ fontSize: 14.5, fontWeight: 700, color: "#16302B" }}>⚙️ Perfil &amp; ajustes</span><span style={{ color: "#8DA9A2", fontSize: 18 }}>›</span></div>
                  </>
                )}

                {st.maisSub === "conteudo" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { titulo: "Náusea e efeitos digestivos: o que observar", fonte: "Fonte: bula do fabricante" },
                      { titulo: "Como preparar perguntas para sua consulta", fonte: "Fonte: orientação médica geral" },
                      { titulo: "Hidratação no dia a dia", fonte: "Fonte: Ministério da Saúde" },
                      { titulo: "Entendendo as fases do tratamento", fonte: "Fonte: SBEM" },
                    ].map((a) => (
                      <div key={a.titulo} style={{ padding: "15px 17px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 14, display: "flex", flexDirection: "column", gap: 5 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#16302B" }}>{a.titulo}</div>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: "#8DA9E8" }}>{a.fonte}</div>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: "#0E6B5C" }}>Procure seu médico para orientações.</div>
                      </div>
                    ))}
                  </div>
                )}

                {st.maisSub === "perfil" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {([["NOME", "nome"], ["NOME DO MASCOTE", "mascotNome"], ["MEDICAMENTO", "medicamento"], ["DOSE", "dose"], ["OBJETIVO", "objetivo"]] as const).map(([label, key]) => (
                      <div key={key}><div style={{ ...fieldLabel, marginBottom: 5 }}>{label}</div><input className="j-in" value={st[key] as string} onChange={(e) => set({ [key]: e.target.value } as Partial<AppState>)} style={{ ...inputSt, padding: "13px 15px", borderRadius: 12, fontSize: 14 }} /></div>
                    ))}
                    <div onClick={() => set({ lembretesOn: !st.lembretesOn })} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 14, cursor: "pointer" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#16302B" }}>Lembretes de dose</span>
                      <div style={{ width: 42, height: 24, borderRadius: 12, background: st.lembretesOn ? "#22B39A" : "#E2E7E2", position: "relative" }}><div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: st.lembretesOn ? 21 : 3, transition: "left .15s" }} /></div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 14 }}><span style={{ fontSize: 14, fontWeight: 700, color: "#16302B" }}>Assinatura</span><span style={{ fontSize: 12.5, fontWeight: 700, color: "#0E6B5C" }}>Anual ativa</span></div>
                    <div style={{ ...fieldLabel, marginTop: 6 }}>PRIVACIDADE (LGPD)</div>
                    <div onClick={() => toast("Exportação preparada.")} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 14, cursor: "pointer" }}><span style={{ fontSize: 14, fontWeight: 700, color: "#16302B" }}>Exportar meus dados</span><span style={{ color: "#8DA9A2", fontSize: 18 }}>›</span></div>
                    <div onClick={() => toast("Solicitação de exclusão registrada.")} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 14, cursor: "pointer" }}><span style={{ fontSize: 14, fontWeight: 700, color: "#B3574A" }}>Apagar meus dados</span><span style={{ color: "#8DA9A2", fontSize: 18 }}>›</span></div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* TAB BAR */}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "#fff", borderTop: "1px solid #E2E7E2", display: "flex", alignItems: "center", justifyContent: "space-around", padding: "10px 10px 18px", zIndex: 10 }}>
            {([["hoje", "🏠", "Hoje"], ["diario", "📖", "Diário"], ["consulta", "📋", "Consulta"], ["mais", "⋯", "Mais"]] as const).map(([key, icon, label]) => (
              <div key={key} onClick={() => setTab(key)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", width: 60 }}>
                <span style={{ fontSize: 19 }}>{icon}</span><span style={{ fontSize: 10.5, fontWeight: 700, color: st.tab === key ? "#0E6B5C" : "#9AAAA5" }}>{label}</span>
              </div>
            ))}
            <div onClick={() => set({ sheetOpen: true })} style={{ position: "absolute", left: "50%", top: -22, transform: "translateX(-50%)", width: 52, height: 52, borderRadius: "50%", background: "#0E6B5C", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 26, cursor: "pointer", boxShadow: "0 6px 16px rgba(14,107,92,0.4)" }}>＋</div>
          </div>
        </>
      )}

      {/* SHEET */}
      {st.sheetOpen && (
        <>
          <div onClick={() => set({ sheetOpen: false })} style={{ position: "absolute", inset: 0, background: "rgba(22,48,43,0.4)", zIndex: 30 }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "#F4F6F3", borderRadius: "24px 24px 0 0", padding: "10px 20px 26px", zIndex: 31, boxShadow: "0 -8px 30px rgba(0,0,0,0.15)" }}>
            <div style={{ width: 40, height: 5, background: "#E2E7E2", borderRadius: 3, margin: "6px auto 16px" }} />
            <div style={{ fontSize: 15, fontWeight: 800, color: "#16302B", marginBottom: 12 }}>Novo registro</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {quickDefs.map((q) => (
                <div key={q.key} onClick={() => startFlow(q.key)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 14, cursor: "pointer" }}>
                  <span style={{ fontSize: 19 }}>{q.icon}</span><span style={{ fontSize: 14.5, fontWeight: 700, color: "#16302B" }}>{q.label}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
