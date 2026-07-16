"use client";

// App Canetta pós-onboarding (Hoje / Diário / Consulta / Mais + fluxos de registro),
// portado do design-code "Canetta App.dc.html" (Claude Design) para React funcional.
// Diário inteligente: registra e organiza; estados vazios reagem ao que foi registrado.
// Mantém os limites regulatórios (não diagnostica, não prescreve, não sugere conduta).
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  deleteMyAccountAction,
  disablePushSubscriptionAction,
  exportMyDataAction,
  getPushPublicKeyAction,
  loadJourneyAction,
  saveApplicationAction,
  saveMissedDoseAction,
  saveProfileAction,
  savePushSubscriptionAction,
  saveQuestionAction,
  saveReminderAction,
  saveRoutineAction,
  saveSymptomAction,
  sendTestPushAction,
  saveWeightAction
} from "./actions";
import { signOutAction } from "@/app/auth/actions";

type Tab = "hoje" | "diario" | "consulta" | "mais";
type RegisterFlow = "aplicacao" | "sintoma" | "peso" | "rotina" | "pergunta" | null;
type RegisterStep = "form" | "missed" | "saved" | "missedSaved" | "checkin";

interface Draft {
  dataHora?: string; obs?: string; nota?: string; contexto?: string; pergunta?: string;
  local?: string; tipo?: string; duracao?: string; movimento?: string; motivo?: string;
  sono?: string; fome?: string; intensidade?: number; pesoKg?: number; agua?: number;
  nausea?: boolean; vomitos?: boolean; diarreia?: boolean; constipacao?: boolean; dorAbdominal?: boolean;
  energia?: number; apetite?: string;
}
interface Aplicacao { id?: string; dataHora: string; local: string; obs: string; data: Date; }
interface DoseNaoAplicada { id?: string; dataHora: string; motivo: string; nota?: string; data: Date; }
interface Sintoma { id?: string; tipo: string; intensidade: number; duracao?: string; contexto?: string; nota?: string; data: Date; }
interface Peso { id?: string; kg: number; data: string; raw: Date; }
interface Rotina extends Draft { id?: string; data: Date; }
interface Pergunta { id?: string; texto: string; data: Date; }

interface AppState {
  nome: string; mascotNome: string; medicamento: string; dose: string; freqLabel: string;
  objetivo: string; faseAtual: string; lembretesOn: boolean; reminderWeekday: number; reminderTime: string;
  tab: Tab; diarioSub: string; consultaSub: string; maisSub: string; periodo: string;
  sheetOpen: boolean; registerFlow: RegisterFlow; registerStep: RegisterStep; draft: Draft;
  aplicacoes: Aplicacao[]; dosesNaoAplicadas: DoseNaoAplicada[]; sintomas: Sintoma[]; pesos: Peso[]; rotinas: Rotina[];
  perguntas: Pergunta[]; toastMsg: string;
}

const INITIAL: AppState = {
  nome: "você", mascotNome: "Canetta", medicamento: "Medicamento", dose: "Dose atual", freqLabel: "Semanal",
  objetivo: "Organizar meus registros", faseAtual: "Primeiro mês", lembretesOn: false, reminderWeekday: -1, reminderTime: "",
  tab: "hoje", diarioSub: "registros", consultaSub: "resumo", maisSub: "menu", periodo: "Últimos 7 dias",
  sheetOpen: false, registerFlow: null, registerStep: "form", draft: {},
  aplicacoes: [], dosesNaoAplicadas: [], sintomas: [], pesos: [], rotinas: [], perguntas: [], toastMsg: "",
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
const fmtDateTime = (d: Date) => d.toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const toDatetimeLocal = (d: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromDatetimeLocal = (value?: string) => {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const startOfWeek = (d: Date) => {
  const start = startOfDay(d);
  const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  return start;
};
const ONBOARDING_STORAGE_KEY = "canetta:onboarding:v1";
const JOURNEY_STORAGE_KEY = "canetta:journey:v1";
const MEDICATION_OPTIONS = ["Tirzepatida", "Mounjaro", "Zepbound", "Ozempic", "Wegovy", "Trulicity", "Saxenda", "Victoza", "Rybelsus", "Outro"];
const TIRZEPATIDE_DOSES = ["2.5 mg", "5 mg", "7.5 mg", "10 mg", "12.5 mg", "15 mg"];

function isTirzepatideMedication(value: string | null | undefined) {
  const normalized = `${value ?? ""}`.toLowerCase();
  return normalized.includes("tirzepatida") || normalized.includes("mounjaro") || normalized.includes("zepbound");
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function reviveState(value: Partial<AppState>): Partial<AppState> {
  const date = (input: Date | string) => new Date(input);
  const list = <T,>(items: T[] | null | undefined) => Array.isArray(items) ? items : [];
  return {
    ...value,
    sheetOpen: false,
    registerFlow: null,
    registerStep: "form",
    draft: {},
    toastMsg: "",
    aplicacoes: list(value.aplicacoes).map((item) => ({ ...item, data: date(item.data) })),
    dosesNaoAplicadas: list(value.dosesNaoAplicadas).map((item) => ({ ...item, data: date(item.data) })),
    sintomas: list(value.sintomas).map((item) => ({ ...item, data: date(item.data) })),
    pesos: list(value.pesos).map((item) => ({ ...item, raw: date(item.raw) })),
    rotinas: list(value.rotinas).map((item) => ({ ...item, data: date(item.data) })),
    perguntas: list(value.perguntas).map((item) => ({ ...item, data: date(item.data) }))
  };
}

// ---------- estilos ----------
const primaryBtn: CSSProperties = { width: "100%", padding: 17, background: "#0E6B5C", color: "#fff", border: "none", borderRadius: 16, fontSize: 16, fontWeight: 700, cursor: "pointer" };
const closeX: CSSProperties = { background: "none", border: "none", color: "#5C7A72", fontSize: 20, cursor: "pointer" };
const fieldLabel: CSSProperties = { fontSize: 12, fontWeight: 700, color: "#596E68", marginBottom: 6 };
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
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushEndpoint, setPushEndpoint] = useState<string | undefined>();
  const [pushStatus, setPushStatus] = useState("Push ainda não ativado.");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteLoaded = useRef(false);
  const set = (p: Partial<AppState>) => setStRaw((s) => ({ ...s, ...p }));
  const setDraft = (p: Partial<Draft>) => setStRaw((s) => ({ ...s, draft: { ...s.draft, ...p } }));
  const toast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setStRaw((current) => ({ ...current, toastMsg: msg }));
    toastTimer.current = setTimeout(() => setStRaw((current) => ({ ...current, toastMsg: "" })), 1800);
  }, []);

  useEffect(() => {
    try {
      const journeyRaw = window.localStorage.getItem(JOURNEY_STORAGE_KEY);
      const onboardingRaw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
      const onboarding = onboardingRaw ? JSON.parse(onboardingRaw) : {};
      const journey = journeyRaw ? reviveState(JSON.parse(journeyRaw)) : {};
      setStRaw((current) => ({
        ...current,
        nome: typeof onboarding.nome === "string" && onboarding.nome.trim() ? onboarding.nome : current.nome,
        mascotNome: typeof onboarding.mascotNome === "string" && onboarding.mascotNome.trim() ? onboarding.mascotNome : current.mascotNome,
        medicamento: typeof onboarding.medicamento === "string" ? onboarding.medicamento : current.medicamento,
        dose: typeof onboarding.dose === "string" ? onboarding.dose : current.dose,
        freqLabel: typeof onboarding.freq === "string" ? onboarding.freq : current.freqLabel,
        objetivo: typeof onboarding.objetivo === "string" ? onboarding.objetivo : current.objetivo,
        faseAtual: typeof onboarding.fase === "string" ? onboarding.fase : current.faseAtual,
        lembretesOn: typeof onboarding.notifOn === "boolean" ? onboarding.notifOn : current.lembretesOn,
        ...journey
      }));
    } catch {
      window.localStorage.removeItem(JOURNEY_STORAGE_KEY);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    const persisted = { ...st, sheetOpen: false, registerFlow: null, registerStep: "form" as const, draft: {}, toastMsg: "" };
    window.localStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(persisted));
  }, [ready, st]);

  useEffect(() => {
    if (!ready || remoteLoaded.current) return;
    remoteLoaded.current = true;
    const onboardingRaw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    loadJourneyAction(onboardingRaw ? JSON.parse(onboardingRaw) : undefined).then((result) => {
      setAuthenticated(result.authenticated);
      if (!result.authenticated) return;
      if ("error" in result) {
        toast(result.error || "Não foi possível sincronizar agora.");
        return;
      }
      const applications = Array.isArray(result.applications) ? result.applications : [];
      const missedDoses = Array.isArray(result.missedDoses) ? result.missedDoses : [];
      const weights = Array.isArray(result.weights) ? result.weights : [];
      const symptoms = Array.isArray(result.symptoms) ? result.symptoms : [];
      const routines = Array.isArray(result.routines) ? result.routines : [];
      const questions = Array.isArray(result.questions) ? result.questions : [];
      setStRaw((current) => ({
        ...current,
        nome: result.profile?.name || current.nome,
        medicamento: result.profile?.medication || current.medicamento,
        dose: result.profile?.current_dose || current.dose,
        freqLabel: result.profile?.frequency || current.freqLabel,
        aplicacoes: applications.map((item) => ({
          id: item.id,
          dataHora: fmtDateTime(new Date(item.applied_at)),
          local: item.site || "Não informado",
          obs: item.note || "",
          data: new Date(item.applied_at)
        })),
        dosesNaoAplicadas: missedDoses.map((item) => ({
          id: item.id,
          dataHora: fmtDateTime(new Date(item.scheduled_for)),
          motivo: item.reason || "Não informado",
          nota: item.note || undefined,
          data: new Date(item.scheduled_for)
        })),
        pesos: weights.map((item) => ({ id: item.id, kg: Number(item.weight), data: fmtDate(new Date(item.recorded_at)), raw: new Date(item.recorded_at) })),
        sintomas: symptoms.map((item) => ({ id: item.id, tipo: item.types?.[0] || "Sintoma", intensidade: item.intensity ?? 0, duracao: item.duration || undefined, nota: item.note || undefined, data: new Date(item.recorded_at) })),
        rotinas: routines.map((item) => ({ id: item.id, agua: item.water_cups ?? undefined, movimento: item.movement || undefined, sono: item.sleep || undefined, fome: item.hunger || undefined, nota: item.note || undefined, data: new Date(item.recorded_at) })),
        perguntas: questions.map((item) => ({ id: item.id, texto: item.question, data: new Date(item.recorded_at) })),
        lembretesOn: result.reminder?.active ?? current.lembretesOn,
        reminderWeekday: result.reminder?.weekday ?? current.reminderWeekday,
        reminderTime: result.reminder?.time?.slice(0, 5) ?? current.reminderTime
      }));
    }).catch(() => toast("Não foi possível sincronizar agora."))
      .finally(() => setAuthChecked(true));
  }, [ready, toast]);

  useEffect(() => {
    if (!ready) return;
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setPushSupported(supported);
    if (!supported) {
      setPushStatus("Este navegador não suporta push web.");
      return;
    }
    navigator.serviceWorker.getRegistration("/sw.js")
      .then((registration) => registration?.pushManager.getSubscription())
      .then((subscription) => {
        setPushEnabled(!!subscription);
        setPushEndpoint(subscription?.endpoint);
        setPushStatus(subscription ? "Push ativo neste navegador." : "Push ainda não ativado.");
      })
      .catch(() => setPushStatus("Não foi possível verificar o push."));
  }, [ready]);

  // navegação
  const setTab = (tab: Tab) => set({ tab, sheetOpen: false });
  const startFlow = (type: RegisterFlow) => set({ sheetOpen: false, registerFlow: type, registerStep: "form", draft: type === "aplicacao" ? { dataHora: toDatetimeLocal(new Date()) } : {} });
  const cancelFlow = () => set({ registerFlow: null, registerStep: "form", draft: {} });
  const finishToHoje = () => set({ registerFlow: null, registerStep: "form", draft: {}, tab: "hoje" });
  const finishToHistorico = () => set({ registerFlow: null, registerStep: "form", draft: {}, tab: "diario", diarioSub: "registros" });

  const lastPeso = () => (st.pesos.length ? st.pesos[st.pesos.length - 1].kg : 78);

  // salvar
  const saveAplicacao = async () => {
    const d = st.draft;
    setBusyAction("aplicacao");
    const localDate = fromDatetimeLocal(d.dataHora);
    const result = await saveApplicationAction({ medication: st.medicamento, dose: st.dose, site: d.local, note: d.obs, appliedAt: localDate.toISOString() });
    const recordedAt = result.synced ? new Date(result.appliedAt) : localDate;
    const entry: Aplicacao = { id: result.synced ? result.id : undefined, dataHora: fmtDateTime(recordedAt), local: d.local || "Não informado", obs: d.obs || "", data: recordedAt };
    set({ aplicacoes: [...st.aplicacoes, entry], registerStep: "saved" });
    setBusyAction(null);
    if (!result.synced && authenticated) toast("Registro salvo no aparelho; sincronização pendente.");
  };
  const saveDoseNaoAplicada = async () => {
    const d = st.draft;
    const localDate = fromDatetimeLocal(d.dataHora);
    setBusyAction("missed");
    const result = await saveMissedDoseAction({ medication: st.medicamento, dose: st.dose, reason: d.motivo, note: d.nota, scheduledFor: localDate.toISOString() });
    const recordedAt = result.synced ? new Date(result.scheduledFor) : localDate;
    set({
      dosesNaoAplicadas: [...st.dosesNaoAplicadas, { id: result.synced ? result.id : undefined, dataHora: fmtDateTime(recordedAt), motivo: d.motivo || "Não informado", nota: d.nota, data: recordedAt }],
      registerStep: "missedSaved"
    });
    setBusyAction(null);
    if (!result.synced && authenticated) toast("Registro salvo no aparelho; sincronização pendente.");
  };
  const saveCheckin = async () => {
    setBusyAction("checkin");
    const result = await saveSymptomAction({ type: "Check-in pós-dose", intensity: st.draft.intensidade ?? 0, note: st.draft.nota });
    set({ sintomas: [...st.sintomas, { id: result.synced ? result.id : undefined, tipo: "Check-in pós-dose", intensidade: st.draft.intensidade ?? 0, nota: st.draft.nota || "", data: result.synced ? new Date(result.recordedAt) : new Date() }] });
    setBusyAction(null);
    toast("Check-in salvo."); finishToHoje();
  };
  const saveSintoma = async () => {
    setBusyAction("sintoma");
    const note = [st.draft.contexto, st.draft.nota].filter(Boolean).join(" · ");
    const result = await saveSymptomAction({ type: st.draft.tipo, intensity: st.draft.intensidade ?? 0, duration: st.draft.duracao, note });
    set({ sintomas: [...st.sintomas, { id: result.synced ? result.id : undefined, tipo: st.draft.tipo || "Sintoma", intensidade: st.draft.intensidade ?? 0, duracao: st.draft.duracao, contexto: st.draft.contexto, nota: st.draft.nota, data: result.synced ? new Date(result.recordedAt) : new Date() }] });
    setBusyAction(null);
    toast("Sintoma registrado."); finishToHoje();
  };
  const savePeso = async () => {
    const kg = st.draft.pesoKg ?? lastPeso();
    setBusyAction("peso");
    const result = await saveWeightAction({ weight: kg });
    if ("validation" in result) { setBusyAction(null); toast("Informe um peso válido."); return; }
    const recordedAt = result.synced ? new Date(result.recordedAt) : new Date();
    set({ pesos: [...st.pesos, { id: result.synced ? result.id : undefined, kg, data: fmtDate(recordedAt), raw: recordedAt }] });
    setBusyAction(null);
    toast("Peso registrado."); finishToHoje();
  };
  const saveRotina = async () => {
    setBusyAction("rotina");
    const symptoms = [
      st.draft.nausea ? "náusea" : "",
      st.draft.vomitos ? "vômitos" : "",
      st.draft.diarreia ? "diarreia" : "",
      st.draft.constipacao ? "constipação" : "",
      st.draft.dorAbdominal ? "dor abdominal" : ""
    ].filter(Boolean);
    const noteParts = [
      symptoms.length ? `Sintomas: ${symptoms.join(", ")}` : "",
      Number.isFinite(st.draft.energia) ? `Energia: ${st.draft.energia}/5` : "",
      st.draft.apetite ? `Apetite: ${st.draft.apetite}` : "",
      st.draft.nota
    ].filter(Boolean);
    const note = noteParts.join(" · ");
    const result = await saveRoutineAction({ waterCups: st.draft.agua, movement: st.draft.movimento, sleep: st.draft.sono, hunger: st.draft.fome || st.draft.apetite, note });
    const recordedAt = result.synced ? new Date(result.recordedAt) : new Date();
    set({ rotinas: [...st.rotinas, { ...st.draft, nota: note, id: result.synced ? result.id : undefined, data: recordedAt }] });
    setBusyAction(null);
    toast("Check-in diário registrado."); finishToHoje();
  };
  const savePergunta = async () => {
    if (!st.draft.pergunta) { finishToHoje(); return; }
    setBusyAction("pergunta");
    const result = await saveQuestionAction({ question: st.draft.pergunta });
    const recordedAt = result.synced ? new Date(result.recordedAt) : new Date();
    set({ perguntas: [...st.perguntas, { id: result.synced ? result.id : undefined, texto: st.draft.pergunta, data: recordedAt }] });
    setBusyAction(null);
    toast("Pergunta salva na pauta."); finishToHoje();
  };

  const periodStart = () => {
    if (st.periodo === "Tudo") return null;
    const start = new Date();
    start.setDate(start.getDate() - (st.periodo === "Últimos 30 dias" ? 30 : 7));
    return start;
  };

  const reportText = () => {
    const start = periodStart();
    const inPeriod = (date: Date) => !start || date >= start;
    const applications = st.aplicacoes.filter((item) => inPeriod(item.data));
    const missedDoses = st.dosesNaoAplicadas.filter((item) => inPeriod(item.data));
    const weights = st.pesos.filter((item) => inPeriod(item.raw));
    const symptoms = st.sintomas.filter((item) => inPeriod(item.data));
    const routines = st.rotinas.filter((item) => inPeriod(item.data));
    const questions = st.perguntas.filter((item) => inPeriod(item.data));
    const expected = applications.length + missedDoses.length;
    const adherence = expected ? Math.round((applications.length / expected) * 100) : null;
    const symptomSummary = symptoms.reduce<Record<string, number>>((acc, item) => {
      acc[item.tipo] = (acc[item.tipo] ?? 0) + 1;
      return acc;
    }, {});
    const routineSymptomMentions = routines.reduce<Record<string, number>>((acc, item) => {
      const note = (item.nota || "").toLowerCase();
      ["náusea", "vômitos", "diarreia", "constipação", "dor abdominal"].forEach((label) => {
        if (note.includes(label)) acc[label] = (acc[label] ?? 0) + 1;
      });
      return acc;
    }, {});
    const firstWeight = weights[0]?.kg;
    const lastWeight = weights[weights.length - 1]?.kg;
    const weightDelta = Number.isFinite(firstWeight) && Number.isFinite(lastWeight) ? Number(lastWeight) - Number(firstWeight) : null;
    const lines = [
      `Canetta — meu relatório de ${st.nome}`,
      `Período: ${st.periodo}`,
      `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
      "",
      `Medicamento registrado: ${st.medicamento || "Não informado"}`,
      `Dose registrada: ${st.dose || "Não informada"}`,
      `Aplicações: ${applications.length}`,
      `Doses não aplicadas: ${missedDoses.length}`,
      `Aderência registrada: ${adherence === null ? "sem dados suficientes" : `${adherence}% das doses registradas neste período`}`,
      `Peso: ${weights.length ? `${firstWeight} kg → ${lastWeight} kg${weightDelta !== null ? ` (${weightDelta > 0 ? "+" : ""}${weightDelta.toFixed(1)} kg)` : ""}` : "sem registros"}`,
      `Sintomas/check-ins: ${symptoms.length}`,
      ...(Object.keys(symptomSummary).length ? ["Sintomas por tipo:", ...Object.entries(symptomSummary).map(([tipo, total]) => `• ${tipo}: ${total}`)] : []),
      `Registros de rotina: ${routines.length}`,
      ...(Object.keys(routineSymptomMentions).length ? ["Sintomas citados nos check-ins diários:", ...Object.entries(routineSymptomMentions).map(([tipo, total]) => `• ${tipo}: ${total}`)] : []),
      ...(missedDoses.length ? ["", "Doses não aplicadas:", ...missedDoses.map((item) => `• ${item.dataHora} — ${item.motivo}${item.nota ? ` (${item.nota})` : ""}`)] : []),
      "",
      "Perguntas para a consulta:",
      ...(questions.length ? questions.map((item) => `• ${item.texto}`) : ["• Nenhuma pergunta registrada neste período."]),
      "",
      "Este documento organiza informações registradas pela pessoa usuária. Não contém diagnóstico, prescrição ou recomendação médica."
    ];
    return lines.join("\n");
  };

  const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[char] || char);

  const generatePdf = () => {
    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (!popup) { toast("Permita a abertura da janela para gerar o PDF."); return; }
    const content = escapeHtml(reportText()).replace(/\n/g, "<br>");
    popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Resumo Canetta</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#16302b;max-width:720px;margin:48px auto;padding:0 24px;line-height:1.55}h1{font-size:24px;color:#0e6b5c}main{white-space:normal}small{display:block;margin-top:32px;color:#5c6f69}@media print{body{margin:20mm auto}.no-print{display:none}}</style></head><body><h1>Resumo Canetta</h1><main>${content}</main><small>Use “Salvar como PDF” na janela de impressão.</small><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
  };

  const shareReport = async () => {
    const text = reportText();
    try {
      if (navigator.share) {
        await navigator.share({ title: "Resumo Canetta", text });
        toast("Resumo compartilhado.");
        return;
      }
      await navigator.clipboard.writeText(text);
      toast("Resumo copiado para compartilhar.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast("Não foi possível compartilhar agora.");
    }
  };

  const downloadJson = (value: unknown) => {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `canetta-dados-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportData = async () => {
    setBusyAction("export");
    try {
      const remote = await exportMyDataAction();
      if (remote.authenticated && !("error" in remote)) {
        downloadJson(remote);
      } else if (remote.authenticated && "error" in remote) {
        toast(remote.error || "Não foi possível exportar todos os dados agora.");
        return;
      } else {
        downloadJson({ exportedAt: new Date().toISOString(), source: "local", data: st });
      }
      toast("Seus dados foram exportados.");
    } finally {
      setBusyAction(null);
    }
  };

  const saveProfile = async () => {
    setBusyAction("profile");
    const result = await saveProfileAction({ name: st.nome, medication: st.medicamento, dose: st.dose, frequency: st.freqLabel });
    setBusyAction(null);
    toast(result.synced ? "Perfil sincronizado." : "Perfil salvo neste dispositivo.");
  };

  const saveReminder = async () => {
    setBusyAction("reminder");
    const result = await saveReminderAction({ active: st.lembretesOn, weekday: st.reminderWeekday, time: st.reminderTime });
    setBusyAction(null);
    if ("validation" in result) { toast("Escolha o dia e o horário do lembrete."); return; }
    toast(result.synced ? "Agenda sincronizada." : "Agenda salva neste dispositivo.");
  };

  const saveLaunchSetup = async () => {
    const medication = st.medicamento.trim();
    const dose = st.dose.trim();
    const name = st.nome.trim();
    const time = st.reminderTime.trim();
    if (!name || name.toLowerCase() === "você" || !medication || medication === "Medicamento" || !dose || dose === "Dose atual") {
      toast("Complete nome, medicamento e dose para começar.");
      return;
    }
    if (!Number.isInteger(st.reminderWeekday) || st.reminderWeekday < 0 || st.reminderWeekday > 6 || !/^\d{2}:\d{2}$/.test(time)) {
      toast("Escolha o dia e o horário da dose.");
      return;
    }

    setBusyAction("launch-setup");
    const [profileResult, reminderResult, weightResult] = await Promise.all([
      saveProfileAction({ name, medication, dose, frequency: st.freqLabel }),
      saveReminderAction({ active: true, weekday: st.reminderWeekday, time }),
      st.pesos.length ? Promise.resolve({ synced: true as const }) : saveWeightAction({ weight: st.draft.pesoKg ?? lastPeso() })
    ]);
    setBusyAction(null);
    if ("validation" in reminderResult || "validation" in weightResult) {
      toast("Revise agenda e peso inicial.");
      return;
    }
    const setupWeight = st.draft.pesoKg ?? lastPeso();
    set({
      lembretesOn: true,
      pesos: st.pesos.length ? st.pesos : [{ kg: setupWeight, data: fmtDate(new Date()), raw: new Date() }]
    });
    toast(profileResult.synced && reminderResult.synced ? "Setup salvo. Agora registre sua primeira dose." : "Setup salvo neste aparelho.");
  };

  const enablePush = async () => {
    if (!pushSupported) { toast("Este navegador não suporta push web."); return; }
    if (!authenticated) { toast("Entre na conta para ativar push sincronizado."); return; }
    setBusyAction("push");
    try {
      const { available, publicKey } = await getPushPublicKeyAction();
      if (!available || !publicKey) { toast("Push ainda não configurado no servidor."); return; }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { toast("Permissão de notificação não concedida."); return; }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
      const result = await savePushSubscriptionAction({
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent
      });
      if (!result.saved) { toast("Não foi possível salvar o push agora."); return; }
      setPushEnabled(true);
      setPushEndpoint(subscription.endpoint);
      setPushStatus("Push ativo neste navegador.");
      toast("Push ativado.");
    } finally {
      setBusyAction(null);
    }
  };

  const disablePush = async () => {
    if (!pushSupported) return;
    setBusyAction("push");
    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = await registration?.pushManager.getSubscription();
      await disablePushSubscriptionAction(subscription?.endpoint || pushEndpoint);
      await subscription?.unsubscribe();
      setPushEnabled(false);
      setPushEndpoint(undefined);
      setPushStatus("Push desativado neste navegador.");
      toast("Push desativado.");
    } finally {
      setBusyAction(null);
    }
  };

  const sendTestPush = async () => {
    setBusyAction("push-test");
    try {
      const result = await sendTestPushAction(pushEndpoint);
      toast(result.sent ? "Push de teste enviado." : "Não foi possível enviar o teste.");
    } finally {
      setBusyAction(null);
    }
  };

  const deleteAccount = async () => {
    if (deleteConfirmation !== "APAGAR") { toast("Digite APAGAR para confirmar."); return; }
    setBusyAction("delete");
    const result = await deleteMyAccountAction(deleteConfirmation);
    setBusyAction(null);
    if (!result.deleted) { toast("error" in result ? result.error || "Não foi possível apagar a conta." : "Não foi possível apagar a conta."); return; }
    window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    window.localStorage.removeItem(JOURNEY_STORAGE_KEY);
    window.location.assign("/auth?deleted=1");
  };

  // derivados
  const freqDays = ({ "Diária": 1, "Semanal": 7, "Quinzenal": 14, "Mensal": 30 } as Record<string, number>)[st.freqLabel] || 7;
  const nextReminderLabel = useMemo(() => {
    if (!st.aplicacoes.length) return "";
    const n = new Date(st.aplicacoes[st.aplicacoes.length - 1].data); n.setDate(n.getDate() + freqDays);
    return fmtDate(n) + ", mesmo horário registrado";
  }, [st.aplicacoes, freqDays]);

  const events = useMemo(() => {
    const evs = [
      ...st.aplicacoes.map((a) => ({ icon: "💉", label: "Aplicação · " + st.medicamento, data: a.dataHora, t: a.data })),
      ...st.dosesNaoAplicadas.map((a) => ({ icon: "○", label: "Dose não aplicada · " + a.motivo, data: a.dataHora, t: a.data })),
      ...st.sintomas.map((a) => ({ icon: "📝", label: "Sintoma · " + a.tipo, data: fmtDate(a.data), t: a.data })),
      ...st.pesos.map((a) => ({ icon: "⚖️", label: "Peso · " + a.kg + " kg", data: a.data, t: a.raw })),
      ...st.rotinas.map((a) => ({ icon: "🗓️", label: "Rotina & hábitos", data: fmtDate(a.data), t: a.data })),
      ...st.perguntas.map((a) => ({ icon: "❓", label: "Pergunta anotada", data: fmtDate(a.data), t: a.data })),
    ];
    return evs.sort((x, y) => y.t.getTime() - x.t.getTime());
  }, [st.aplicacoes, st.dosesNaoAplicadas, st.sintomas, st.pesos, st.rotinas, st.perguntas, st.medicamento]);

  const anyDado = st.aplicacoes.length || st.dosesNaoAplicadas.length || st.pesos.length || st.sintomas.length || st.rotinas.length || st.perguntas.length;
  const conquista = anyDado > 0;
  const pesoAtual = st.pesos.length ? st.pesos[st.pesos.length - 1].kg : null;
  const expectedDoses = st.aplicacoes.length + st.dosesNaoAplicadas.length;
  const adherencePct = expectedDoses ? Math.round((st.aplicacoes.length / expectedDoses) * 100) : null;
  const weekStart = startOfWeek(new Date());
  const weeklyApplied = st.aplicacoes.filter((item) => item.data >= weekStart).length;
  const weeklyMissed = st.dosesNaoAplicadas.filter((item) => item.data >= weekStart).length;
  const weeklyPlanned = Math.max(1, Math.round(7 / Math.max(1, freqDays)));
  const weeklyProgress = Math.min(weeklyApplied, weeklyPlanned);
  const weeklyPerfect = weeklyApplied >= weeklyPlanned && weeklyMissed === 0;
  const recentDoseEvents = useMemo(() => ([
    ...st.aplicacoes.map((item) => ({ status: "aplicada" as const, date: item.data, label: item.dataHora, local: item.local, detail: "✓ Aplicada" })),
    ...st.dosesNaoAplicadas.map((item) => ({ status: "nao_aplicada" as const, date: item.data, label: item.dataHora, local: "--", detail: `○ ${item.motivo}` }))
  ]).sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 3), [st.aplicacoes, st.dosesNaoAplicadas]);
  const lastSevenDays = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = startOfDay(new Date());
    date.setDate(date.getDate() - (6 - index));
    const applied = st.aplicacoes.some((item) => sameDay(item.data, date));
    const missed = st.dosesNaoAplicadas.some((item) => sameDay(item.data, date));
    return { date, applied, missed, label: date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "") };
  }), [st.aplicacoes, st.dosesNaoAplicadas]);
  const symptomDailyCount = (rotina: Rotina) => [
    rotina.nausea,
    rotina.vomitos,
    rotina.diarreia,
    rotina.constipacao,
    rotina.dorAbdominal
  ].filter(Boolean).length + (rotina.nota?.toLowerCase().includes("sintomas:") ? 1 : 0);
  const symptomTrend = useMemo(() => st.rotinas.slice(-7).map((item) => ({ date: item.data, value: symptomDailyCount(item) })), [st.rotinas]);
  const weightMin = st.pesos.length ? Math.min(...st.pesos.map((item) => item.kg)) : 0;
  const weightMax = st.pesos.length ? Math.max(...st.pesos.map((item) => item.kg)) : 0;
  const siteSummary = useMemo(() => {
    const sites = st.aplicacoes.reduce<Record<string, number>>((acc, item) => {
      const site = item.local || "Não informado";
      acc[site] = (acc[site] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(sites).sort((a, b) => b[1] - a[1]);
  }, [st.aplicacoes]);
  const espelhoFacts = useMemo(() => {
    const facts = [
      { label: "Aderência registrada", value: adherencePct === null ? "—" : `${adherencePct}%`, detail: expectedDoses ? `${st.aplicacoes.length} aplicadas de ${expectedDoses} dose(s) registradas` : "sem dados suficientes" },
      { label: "Aplicações", value: String(st.aplicacoes.length), detail: siteSummary.length ? `local mais usado: ${siteSummary[0][0]}` : "sem registro" },
      { label: "Doses não aplicadas", value: String(st.dosesNaoAplicadas.length), detail: st.dosesNaoAplicadas.length ? "com motivo salvo" : "sem registro" },
      { label: "Pesos", value: String(st.pesos.length), detail: pesoAtual ? `${pesoAtual} kg no último registro` : "sem registro" },
      { label: "Sintomas", value: String(st.sintomas.length), detail: st.sintomas.length ? "informados por você" : "sem registro" },
      { label: "Rotina", value: String(st.rotinas.length), detail: st.rotinas.length ? "hábitos salvos" : "sem registro" },
    ];
    return facts.filter((fact) => fact.value !== "0" && fact.value !== "—");
  }, [adherencePct, expectedDoses, pesoAtual, siteSummary, st.aplicacoes.length, st.dosesNaoAplicadas.length, st.pesos.length, st.sintomas.length, st.rotinas.length]);

  const quickDefs = [
    { key: "aplicacao", icon: "💉", label: "Aplicação" }, { key: "peso", icon: "⚖️", label: "Peso" },
    { key: "sintoma", icon: "📝", label: "Sintoma" }, { key: "rotina", icon: "🗓️", label: "Rotina" },
    { key: "pergunta", icon: "❓", label: "Pergunta" },
  ] as const;
  const greetingName = st.nome.trim().toLowerCase() === "você" ? "Oi" : `Oi, ${st.nome}`;
  const syncLabel = authenticated ? "Dados sincronizados na conta." : "Dados salvos neste aparelho.";
  const hasProfileBasics = st.nome.trim().toLowerCase() !== "você" && st.medicamento.trim() !== "Medicamento" && st.dose.trim() !== "Dose atual";
  const hasDoseSchedule = st.lembretesOn && st.reminderWeekday >= 0 && /^\d{2}:\d{2}$/.test(st.reminderTime);
  const launchSetupComplete = hasProfileBasics && hasDoseSchedule && st.pesos.length > 0;
  const shouldShowLaunchSetup = ready && authChecked && authenticated && !launchSetupComplete && !anyDado;

  const IntensityScale = ({ size = 26 }: { size?: number }) => {
    const cur = st.draft.intensidade ?? -1;
    return (
      <div style={{ display: "flex", justifyContent: "space-between", gap: 4 }}>
        {Array.from({ length: 11 }, (_, n) => (
          <button key={n} type="button" aria-label={`Intensidade ${n}`} aria-pressed={cur === n} onClick={() => setDraft({ intensidade: n })} style={{ width: size, height: size, padding: 0, border: "none", borderRadius: "50%", background: cur === n ? "#0E6B5C" : "#fff", color: cur === n ? "#fff" : "#596E68", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>{n}</button>
        ))}
      </div>
    );
  };
  const ChipRow = ({ options, current, onPick, radius = 12, equal = false, wrap = false }: { options: readonly string[]; current?: string; onPick: (v: string) => void; radius?: number; equal?: boolean; wrap?: boolean; }) => (
    <div style={{ display: "flex", gap: 8, flexWrap: wrap ? "wrap" : "nowrap" }}>
      {options.map((label) => (
        <button key={label} type="button" aria-pressed={current === label} onClick={() => onPick(label)} style={{ ...chipStyle(current === label, radius), ...(equal ? { flex: 1, textAlign: "center" as const } : {}), padding: wrap ? "9px 14px" : "10px 4px", fontSize: 12.5 }}>{label}</button>
      ))}
    </div>
  );

  const stage: CSSProperties = { position: "relative", height: "100%", minHeight: "calc(100vh - 56px)", display: "flex", flexDirection: "column", overflow: "hidden", background: "#F4F6F3", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" };

  if (ready && authChecked && !authenticated) {
    return (
      <div style={{ ...stage, justifyContent: "center", padding: 24 }}>
        <div style={{ ...cardWhite, display: "flex", flexDirection: "column", gap: 18 }}>
          <MascotBadge size={52} />
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#16302B", lineHeight: 1.15 }}>Entre para usar o Canetta com segurança.</div>
            <div style={{ fontSize: 13.5, color: "#4B5F59", lineHeight: 1.5, marginTop: 8 }}>Para o beta, os registros precisam ficar vinculados à sua conta. Assim eles não somem ao trocar de aparelho ou limpar o navegador.</div>
          </div>
          <button type="button" onClick={() => window.location.assign("/auth")} style={primaryBtn}>Entrar ou criar conta</button>
          <button type="button" onClick={() => window.location.assign("/onboarding/flow")} style={{ width: "100%", padding: 13, background: "transparent", color: "#0E6B5C", border: "none", fontSize: 13.5, fontWeight: 800, cursor: "pointer" }}>Refazer onboarding</button>
        </div>
      </div>
    );
  }

  if (shouldShowLaunchSetup) {
    const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    return (
      <div style={{ ...stage, overflowY: "auto", padding: "22px 22px 28px" }}>
        {st.toastMsg && <div style={{ position: "sticky", top: 0, zIndex: 4, background: "#16302B", color: "#fff", padding: "12px 16px", borderRadius: 12, fontSize: 13, fontWeight: 700, textAlign: "center", marginBottom: 14 }}>{st.toastMsg}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <MascotBadge size={46} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#16302B" }}>Finalize seu Canetta</div>
              <div style={{ fontSize: 13, color: "#596E68" }}>Leva menos de um minuto.</div>
            </div>
          </div>

          <div style={{ ...cardWhite, display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={fieldLabel}>NOME</div>
              <input className="j-in" value={st.nome === "você" ? "" : st.nome} onChange={(e) => set({ nome: e.target.value })} placeholder="Como quer aparecer no app?" style={inputSt} />
            </div>
            <div>
              <div style={fieldLabel}>MEDICAMENTO</div>
              <input className="j-in" list="canetta-medications" value={st.medicamento === "Medicamento" ? "" : st.medicamento} onChange={(e) => set({ medicamento: e.target.value, freqLabel: isTirzepatideMedication(e.target.value) ? "Semanal" : st.freqLabel })} placeholder="Ex: Tirzepatida, Mounjaro, Ozempic" style={inputSt} />
              <datalist id="canetta-medications">{MEDICATION_OPTIONS.map((item) => <option key={item} value={item} />)}</datalist>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={fieldLabel}>DOSE</div>
                <input className="j-in" list={isTirzepatideMedication(st.medicamento) ? "canetta-tirzepatide-doses" : undefined} value={st.dose === "Dose atual" ? "" : st.dose} onChange={(e) => set({ dose: e.target.value })} placeholder={isTirzepatideMedication(st.medicamento) ? "Ex: 2.5 mg" : "Ex: 0,5 mg"} style={inputSt} />
                <datalist id="canetta-tirzepatide-doses">{TIRZEPATIDE_DOSES.map((item) => <option key={item} value={item} />)}</datalist>
              </div>
              <div>
                <div style={fieldLabel}>FREQUÊNCIA</div>
                <select className="j-in" value={st.freqLabel} onChange={(e) => set({ freqLabel: e.target.value })} style={inputSt}>
                  <option>Diária</option>
                  <option>Semanal</option>
                  <option>Quinzenal</option>
                  <option>Mensal</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ ...cardWhite, display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#16302B" }}>Agenda da dose</div>
              <div style={{ fontSize: 12.5, color: "#4B5F59", lineHeight: 1.45, marginTop: 3 }}>Sem agenda, o push não tem quando lembrar você.</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
              {weekdays.map((label, index) => (
                <button key={label} type="button" aria-pressed={st.reminderWeekday === index} onClick={() => set({ reminderWeekday: index, lembretesOn: true })} style={{ ...chipStyle(st.reminderWeekday === index), padding: "10px 0", fontSize: 11.5 }}>{label}</button>
              ))}
            </div>
            <input className="j-in" type="time" value={st.reminderTime} onChange={(e) => set({ reminderTime: e.target.value, lembretesOn: true })} style={inputSt} />
          </div>

          <div style={{ ...cardWhite, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: "#16302B" }}>Peso inicial</div>
            <input className="j-in" type="number" inputMode="decimal" min={20} max={400} step="0.1" value={st.draft.pesoKg ?? lastPeso()} onChange={(e) => setDraft({ pesoKg: Number(e.target.value) })} style={{ ...inputSt, fontSize: 20, fontWeight: 900 }} />
            <div style={{ fontSize: 12, color: "#596E68", lineHeight: 1.45 }}>Usado apenas para mostrar sua própria evolução, sem meta ou interpretação médica.</div>
          </div>

          <button type="button" disabled={busyAction === "launch-setup"} onClick={saveLaunchSetup} style={{ ...primaryBtn, opacity: busyAction === "launch-setup" ? 0.65 : 1 }}>{busyAction === "launch-setup" ? "Salvando…" : "Salvar setup e começar"}</button>
        </div>
      </div>
    );
  }

  return (
    <div style={stage}>
      <style>{`@keyframes floaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}} .j-in:focus,.j-in textarea:focus{outline:none;border-color:#0E6B5C}@media (prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}`}</style>

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
                  <input className="j-in" type="datetime-local" value={st.draft.dataHora || ""} onChange={(e) => setDraft({ dataHora: e.target.value })} style={inputSt} />
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
                      <button key={r.label} type="button" aria-label={r.label} aria-pressed={st.draft.local === r.label} onClick={() => setDraft({ local: r.label })} style={{ position: "absolute", left: r.left, top: r.top, width: 26, height: 26, padding: 0, borderRadius: "50%", background: st.draft.local === r.label ? "#0E6B5C" : "#8DA9A2", border: "2px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,0.2)", cursor: "pointer" }} />
                    ))}
                  </div>
                  <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: "#0E6B5C", marginTop: 8 }}>{st.draft.local || "Toque em um ponto do corpo"}</div>
                </div>
                <div>
                  <div style={fieldLabel}>OBSERVAÇÃO (OPCIONAL)</div>
                  <textarea className="j-in" value={st.draft.obs || ""} onChange={(e) => setDraft({ obs: e.target.value })} placeholder="Alguma nota sobre esta aplicação" style={textareaSt} />
                </div>
              </div>
              <button type="button" disabled={busyAction === "aplicacao"} onClick={saveAplicacao} style={{ ...primaryBtn, marginTop: 14, opacity: busyAction === "aplicacao" ? 0.65 : 1 }}>{busyAction === "aplicacao" ? "Salvando…" : "Salvar aplicação"}</button>
              <button type="button" onClick={() => set({ registerStep: "missed" })} style={{ width: "100%", padding: 13, background: "transparent", color: "#0E6B5C", border: "none", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>Não apliquei esta dose</button>
            </div>
          )}

          {/* APLICAÇÃO — NÃO APLICADA */}
          {st.registerFlow === "aplicacao" && st.registerStep === "missed" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 24px 24px" }}>
              {flowHeader("Dose não aplicada", () => set({ registerStep: "form" }))}
              <div style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", flex: 1 }}>
                <div>
                  <div style={fieldLabel}>DATA PREVISTA</div>
                  <input className="j-in" type="datetime-local" value={st.draft.dataHora || ""} onChange={(e) => setDraft({ dataHora: e.target.value })} style={inputSt} />
                </div>
                <div>
                  <div style={{ ...fieldLabel, marginBottom: 8 }}>MOTIVO</div>
                  <ChipRow options={["Esqueci", "Sem medicamento", "Efeito colateral", "Viagem/rotina", "Orientação médica", "Outro"]} current={st.draft.motivo} onPick={(v) => setDraft({ motivo: v })} radius={20} wrap />
                </div>
                <div>
                  <div style={fieldLabel}>NOTA (OPCIONAL)</div>
                  <textarea className="j-in" value={st.draft.nota || ""} onChange={(e) => setDraft({ nota: e.target.value })} placeholder="Contexto para lembrar na consulta" style={textareaSt} />
                </div>
                <div style={{ ...cardWhite, padding: "14px 16px", fontSize: 12.5, color: "#4B5F59", lineHeight: 1.45 }}>Este registro não orienta compensação de dose. Ele apenas organiza o histórico para conversar com seu médico.</div>
              </div>
              <button type="button" disabled={busyAction === "missed"} onClick={saveDoseNaoAplicada} style={{ ...primaryBtn, marginTop: 14, opacity: busyAction === "missed" ? 0.65 : 1 }}>{busyAction === "missed" ? "Salvando…" : "Salvar dose não aplicada"}</button>
            </div>
          )}

          {/* APLICAÇÃO — SALVA */}
          {st.registerFlow === "aplicacao" && st.registerStep === "saved" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 40, background: "#0E6B5C" }}>
              <div style={{ width: 74, height: 74, borderRadius: "50%", background: "#22B39A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, color: "#0E2A23" }}>✓</div>
              <div style={{ textAlign: "center", fontSize: 20, fontWeight: 800, color: "#F4F6F3" }}>Aplicação registrada.</div>
              <div style={{ textAlign: "center", fontSize: 13.5, color: "#BEE0D6", maxWidth: 260 }}>Próxima data estimada na agenda: {nextReminderLabel}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 280, marginTop: 10 }}>
                <button onClick={() => set({ registerStep: "checkin" })} style={{ width: "100%", padding: 15, background: "#22B39A", color: "#0E2A23", border: "none", borderRadius: 14, fontSize: 14.5, fontWeight: 800, cursor: "pointer" }}>Registrar como me senti</button>
                <button onClick={finishToHistorico} style={{ width: "100%", padding: 13, background: "transparent", color: "#BEE0D6", border: "none", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>Ver no histórico</button>
              </div>
            </div>
          )}

          {/* APLICAÇÃO — NÃO APLICADA SALVA */}
          {st.registerFlow === "aplicacao" && st.registerStep === "missedSaved" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 40, background: "#16302B" }}>
              <div style={{ width: 74, height: 74, borderRadius: "50%", background: "#EAF5F2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, color: "#0E6B5C" }}>○</div>
              <div style={{ textAlign: "center", fontSize: 20, fontWeight: 800, color: "#F4F6F3" }}>Dose não aplicada registrada.</div>
              <div style={{ textAlign: "center", fontSize: 13.5, color: "#BEE0D6", maxWidth: 280 }}>O histórico guarda o motivo sem sugerir nenhuma conduta.</div>
              <button onClick={finishToHistorico} style={{ width: "100%", maxWidth: 280, padding: 15, background: "#22B39A", color: "#0E2A23", border: "none", borderRadius: 14, fontSize: 14.5, fontWeight: 800, cursor: "pointer" }}>Ver no histórico</button>
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
              <div style={{ fontSize: 11, fontWeight: 700, color: "#596E68", marginTop: 22 }}>O Canetta não interpreta este valor — apenas registra.</div>
              <div style={{ flex: 1 }} />
              <button type="button" disabled={busyAction === "checkin"} onClick={saveCheckin} style={{ ...primaryBtn, opacity: busyAction === "checkin" ? 0.65 : 1 }}>{busyAction === "checkin" ? "Salvando…" : "Salvar"}</button>
            </div>
          )}

          {/* SINTOMA */}
          {st.registerFlow === "sintoma" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 24px 24px", overflowY: "auto" }}>
              {flowHeader("Registrar sintoma", cancelFlow)}
              <div style={{ ...fieldLabel, marginBottom: 8 }}>TIPO</div>
              <div style={{ marginBottom: 16 }}><ChipRow options={["Náusea", "Vômitos", "Diarreia", "Constipação", "Refluxo", "Dor abdominal", "Fadiga", "Dor de cabeça", "Outro"]} current={st.draft.tipo} onPick={(v) => setDraft({ tipo: v })} radius={20} wrap /></div>
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
              <button type="button" disabled={busyAction === "sintoma"} onClick={saveSintoma} style={{ ...primaryBtn, marginTop: 12, opacity: busyAction === "sintoma" ? 0.65 : 1 }}>{busyAction === "sintoma" ? "Salvando…" : "Salvar"}</button>
            </div>
          )}

          {/* PESO */}
          {st.registerFlow === "peso" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 24px 24px" }}>
              {flowHeader("Registrar peso", cancelFlow)}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
                  <button onClick={() => setDraft({ pesoKg: (st.draft.pesoKg ?? lastPeso()) - 1 })} style={{ width: 48, height: 48, borderRadius: "50%", background: "#fff", border: "1.5px solid #E2E7E2", fontSize: 22, fontWeight: 700, color: "#0E6B5C", cursor: "pointer" }}>−</button>
                  <div style={{ fontSize: 44, fontWeight: 800, color: "#16302B", fontVariantNumeric: "tabular-nums", minWidth: 150, textAlign: "center" }}>{st.draft.pesoKg ?? lastPeso()}<span style={{ fontSize: 18, color: "#596E68", fontWeight: 700 }}> kg</span></div>
                  <button onClick={() => setDraft({ pesoKg: (st.draft.pesoKg ?? lastPeso()) + 1 })} style={{ width: 48, height: 48, borderRadius: "50%", background: "#fff", border: "1.5px solid #E2E7E2", fontSize: 22, fontWeight: 700, color: "#0E6B5C", cursor: "pointer" }}>+</button>
                </div>
                <div style={{ width: "100%", ...cardWhite, padding: "14px 16px" }}>
                  <div style={{ ...fieldLabel, marginBottom: 8 }}>ESPELHO DE REGISTROS</div>
                  {st.pesos.length ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {st.pesos.slice(-3).reverse().map((p, k) => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: "#596E68" }}>{p.data}</span><span style={{ fontWeight: 700, color: "#16302B", fontVariantNumeric: "tabular-nums" }}>{p.kg} kg</span></div>
                      ))}
                      <div style={{ fontSize: 11.5, color: "#596E68", lineHeight: 1.4, marginTop: 4 }}>Fato neutro: mostra pesos informados por você, sem alerta, meta ou interpretação.</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: "#596E68" }}>Ainda sem histórico — este será seu primeiro registro.</div>
                  )}
                </div>
              </div>
              <button type="button" disabled={busyAction === "peso"} onClick={savePeso} style={{ ...primaryBtn, opacity: busyAction === "peso" ? 0.65 : 1 }}>{busyAction === "peso" ? "Salvando…" : "Salvar"}</button>
            </div>
          )}

          {/* ROTINA */}
          {st.registerFlow === "rotina" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 24px 24px", overflowY: "auto" }}>
              {flowHeader("Check-in diário", cancelFlow)}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ ...cardWhite, padding: "14px 16px", fontSize: 12.5, color: "#4B5F59", lineHeight: 1.45 }}>Registre o dia mesmo sem aplicação. O Canetta só organiza fatos para você acompanhar padrões.</div>
                <div>
                  <div style={{ ...fieldLabel, marginBottom: 8 }}>SINTOMAS DE HOJE</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {([
                      ["nausea", "Náusea"],
                      ["vomitos", "Vômitos"],
                      ["diarreia", "Diarreia"],
                      ["constipacao", "Constipação"],
                      ["dorAbdominal", "Dor abdominal"]
                    ] as const).map(([key, label]) => (
                      <button key={key} type="button" aria-pressed={!!st.draft[key]} onClick={() => setDraft({ [key]: !st.draft[key] } as Partial<Draft>)} style={{ ...chipStyle(!!st.draft[key], 14), padding: "11px 8px", fontSize: 12.5 }}>{label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ ...fieldLabel, marginBottom: 8 }}>ENERGIA</div>
                  <ChipRow options={["1", "2", "3", "4", "5"]} current={st.draft.energia ? String(st.draft.energia) : undefined} onPick={(v) => setDraft({ energia: Number(v) })} equal />
                </div>
                <div><div style={fieldLabel}>APETITE</div><ChipRow options={["Reduzido", "Normal", "Aumentado"]} current={st.draft.apetite} onPick={(v) => setDraft({ apetite: v, fome: v })} equal /></div>
                <div>
                  <div style={fieldLabel}>NOTA LIVRE (OPCIONAL)</div>
                  <textarea className="j-in" value={st.draft.nota || ""} onChange={(e) => setDraft({ nota: e.target.value })} placeholder="Ex: náusea após almoço, energia melhor à tarde" style={{ ...textareaSt, minHeight: 56, fontSize: 13.5 }} />
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
              </div>
              <button type="button" disabled={busyAction === "rotina"} onClick={saveRotina} style={{ ...primaryBtn, marginTop: 18, opacity: busyAction === "rotina" ? 0.65 : 1 }}>{busyAction === "rotina" ? "Salvando…" : "Salvar check-in"}</button>
            </div>
          )}

          {/* PERGUNTA */}
          {st.registerFlow === "pergunta" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 24px 24px" }}>
              {flowHeader("Anotar pergunta", cancelFlow)}
              <div style={{ fontSize: 13, color: "#4B5F59", marginBottom: 12 }}>Vai direto para a pauta do resumo da consulta.</div>
              <textarea className="j-in" value={st.draft.pergunta || ""} onChange={(e) => setDraft({ pergunta: e.target.value })} placeholder="Ex: Posso ajustar o horário da aplicação?" style={{ ...textareaSt, minHeight: 110, fontSize: 14.5 }} />
              <div style={{ flex: 1 }} />
              <button type="button" disabled={busyAction === "pergunta"} onClick={savePergunta} style={{ ...primaryBtn, opacity: busyAction === "pergunta" ? 0.65 : 1 }}>{busyAction === "pergunta" ? "Salvando…" : "Salvar na pauta"}</button>
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
                  <div><div style={{ fontSize: 20, fontWeight: 800, color: "#16302B" }}>{greetingName}</div><div style={{ fontSize: 12.5, color: "#596E68" }}>{st.mascotNome} está por aqui hoje.</div></div>
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#596E68", marginTop: -8 }}>{syncLabel}</div>
                {!st.aplicacoes.length && (
                  <div style={{ ...cardWhite, display: "flex", flexDirection: "column", gap: 14, background: "#FFFDF8" }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#16302B" }}>Bem-vindo ao Canetta 👋</div>
                      <div style={{ fontSize: 13, color: "#4B5F59", lineHeight: 1.45, marginTop: 4 }}>Comece pelo essencial: registre a primeira aplicação. Depois ative o push e acompanhe peso/sintomas quando fizer sentido.</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[
                        ["1", "Registrar primeira aplicação"],
                        ["2", pushEnabled ? "Push já está ativo" : "Ativar lembrete de dose"],
                        ["3", st.pesos.length ? "Peso inicial salvo" : "Salvar peso inicial"]
                      ].map(([num, label]) => (
                        <div key={num} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12.5, color: "#16302B", fontWeight: 700 }}>
                          <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#EAF5F2", color: "#0E6B5C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900 }}>{num}</span>
                          {label}
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={() => startFlow("aplicacao")} style={primaryBtn}>Registrar aplicação agora</button>
                    {!pushEnabled && <button type="button" onClick={enablePush} disabled={busyAction === "push"} style={{ width: "100%", padding: 12, background: "#fff", color: "#0E6B5C", border: "1.5px solid #C7D6D1", borderRadius: 14, fontSize: 13, fontWeight: 800, cursor: "pointer", opacity: busyAction === "push" ? 0.65 : 1 }}>{busyAction === "push" ? "Ativando…" : "Ativar push"}</button>}
                  </div>
                )}
                <div style={{ background: "#0E6B5C", borderRadius: 18, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#BEE0D6", letterSpacing: "0.3px" }}>PRÓXIMA DOSE</div>
                  {st.aplicacoes.length ? (
                    <>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#F4F6F3" }}>{nextReminderLabel}</div>
                      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        <button type="button" onClick={() => startFlow("aplicacao")} style={{ flex: 1, padding: "10px 12px", background: "#22B39A", color: "#0E2A23", border: "none", borderRadius: 12, fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}>Já apliquei</button>
                        <button type="button" onClick={() => set({ sheetOpen: false, registerFlow: "aplicacao", registerStep: "missed", draft: { dataHora: toDatetimeLocal(new Date()) } })} style={{ flex: 1, padding: "10px 12px", background: "rgba(255,255,255,.12)", color: "#DFF0EA", border: "1px solid rgba(255,255,255,.18)", borderRadius: 12, fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}>Esqueci</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#DFF0EA" }}>Nenhuma aplicação registrada ainda.</div>
                      <button onClick={() => startFlow("aplicacao")} style={{ alignSelf: "flex-start", marginTop: 4, padding: "9px 16px", background: "#22B39A", color: "#0E2A23", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>Registrar aplicação</button>
                    </>
                  )}
                </div>
                <div style={{ ...cardWhite, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#596E68" }}>ADERÊNCIA RÁPIDA</div>
                      <div style={{ fontSize: 12.5, color: "#4B5F59", marginTop: 3 }}>Últimos 7 dias registrados</div>
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: "#0E6B5C", fontVariantNumeric: "tabular-nums" }}>{adherencePct === null ? "—" : `${adherencePct}%`}</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, alignItems: "end" }}>
                    {lastSevenDays.map((day) => (
                      <div key={day.date.toISOString()} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                        <div title={day.date.toLocaleDateString("pt-BR")} style={{ width: "100%", height: day.applied ? 34 : day.missed ? 22 : 10, borderRadius: 7, background: day.applied ? "#0E6B5C" : day.missed ? "#C49A36" : "#E2E7E2" }} />
                        <div style={{ fontSize: 9.5, fontWeight: 700, color: "#596E68", textTransform: "capitalize" }}>{day.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#596E68", marginBottom: 10 }}>REGISTRO RÁPIDO</div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                    {quickDefs.map((q) => (
                      <button key={q.key} type="button" onClick={() => startFlow(q.key)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, width: 58, minHeight: 68, padding: "10px 2px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 14, cursor: "pointer" }}>
                        <span style={{ fontSize: 19 }}>{q.icon}</span><span style={{ fontSize: 10, fontWeight: 700, color: "#16302B", textAlign: "center" }}>{q.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <button type="button" onClick={() => set({ tab: "consulta", consultaSub: "resumo" })} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 18px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 16, cursor: "pointer" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#16302B" }}>📄 Resumo da consulta</span><span style={{ color: "#8DA9A2", fontSize: 18 }}>›</span>
                </button>
                <div style={{ ...cardWhite, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#596E68" }}>HISTÓRICO RECENTE</div>
                  {recentDoseEvents.length ? recentDoseEvents.map((item, index) => (
                    <div key={`${item.status}-${item.date.toISOString()}-${index}`} style={{ display: "grid", gridTemplateColumns: "72px 1fr auto", gap: 8, alignItems: "center", fontSize: 12.5 }}>
                      <span style={{ color: "#596E68", fontWeight: 700 }}>{item.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "")}</span>
                      <span style={{ color: "#16302B", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.local}</span>
                      <span style={{ color: item.status === "aplicada" ? "#0E6B5C" : "#8A6426", fontWeight: 800 }}>{item.detail}</span>
                    </div>
                  )) : <div style={{ fontSize: 13, color: "#596E68" }}>As últimas aplicações aparecerão aqui.</div>}
                </div>
                <div style={{ ...cardWhite, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, background: weeklyPerfect ? "#EAF5F2" : "#fff" }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: "#16302B" }}>{weeklyPerfect ? "Semana perfeita!" : "Meta semanal"}</div>
                    <div style={{ fontSize: 12, color: "#4B5F59", marginTop: 3 }}>{weeklyProgress}/{weeklyPlanned} aplicação(ões) planejadas</div>
                  </div>
                  <div style={{ width: 72, height: 10, borderRadius: 99, background: "#E2E7E2", overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(100, (weeklyProgress / weeklyPlanned) * 100)}%`, height: "100%", borderRadius: 99, background: "#0E6B5C" }} />
                  </div>
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
                    <button key={k} type="button" aria-pressed={st.diarioSub === k} onClick={() => set({ diarioSub: k })} style={{ flex: 1, textAlign: "center", padding: "9px 2px", border: "none", background: st.diarioSub === k ? "#fff" : "transparent", color: st.diarioSub === k ? "#0E6B5C" : "#596E68", borderRadius: 11, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>{label}</button>
                  ))}
                </div>

                {st.diarioSub === "registros" && (events.length ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {events.map((ev, k) => (
                      <div key={k} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "13px 16px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 14 }}>
                        <span style={{ fontSize: 18 }}>{ev.icon}</span>
                        <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 700, color: "#16302B" }}>{ev.label}</div><div style={{ fontSize: 11.5, color: "#596E68" }}>{ev.data}</div></div>
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
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ ...cardWhite, display: "flex", flexDirection: "column", gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#16302B" }}>Espelho de tendência</div>
                        <div style={{ fontSize: 12.5, color: "#4B5F59", lineHeight: 1.45, marginTop: 4 }}>Mostra somente fatos salvos no diário. Não é alerta, diagnóstico, meta ou recomendação.</div>
                      </div>
                      {espelhoFacts.length ? espelhoFacts.map((fact) => (
                        <div key={fact.label} style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "baseline", paddingTop: 10, borderTop: "1px solid #EDF0EC" }}>
                          <div><div style={{ fontSize: 13.5, fontWeight: 700, color: "#16302B" }}>{fact.label}</div><div style={{ fontSize: 11.5, color: "#596E68" }}>{fact.detail}</div></div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "#0E6B5C", fontVariantNumeric: "tabular-nums" }}>{fact.value}</div>
                        </div>
                      )) : (
                        <div style={{ fontSize: 13, color: "#596E68", lineHeight: 1.45 }}>Ainda não há registros suficientes para espelhar uma tendência. Quando você salvar dados, eles aparecem aqui como contagem factual.</div>
                      )}
                    </div>
                    <div style={{ ...cardWhite, display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: "#16302B" }}>Aplicações · últimos 7 dias</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, alignItems: "end" }}>
                        {lastSevenDays.map((day) => (
                          <div key={`diario-${day.date.toISOString()}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                            <div style={{ width: "100%", height: day.applied ? 38 : day.missed ? 24 : 12, borderRadius: 7, background: day.applied ? "#0E6B5C" : day.missed ? "#C49A36" : "#E2E7E2" }} />
                            <div style={{ fontSize: 9.5, fontWeight: 700, color: "#596E68", textTransform: "capitalize" }}>{day.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ ...cardWhite, display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: "#16302B" }}>Sintomas · check-ins recentes</div>
                      {symptomTrend.length ? (
                        <div style={{ display: "grid", gridTemplateColumns: `repeat(${symptomTrend.length}, 1fr)`, gap: 8, alignItems: "end", minHeight: 58 }}>
                          {symptomTrend.map((item) => (
                            <div key={item.date.toISOString()} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                              <div style={{ width: "100%", height: Math.max(8, item.value * 14), borderRadius: 7, background: item.value ? "#0E6B5C" : "#E2E7E2" }} />
                              <div style={{ fontSize: 9.5, fontWeight: 700, color: "#596E68" }}>{fmtDate(item.date).split(",")[0]}</div>
                            </div>
                          ))}
                        </div>
                      ) : <div style={{ fontSize: 13, color: "#596E68" }}>Registre um check-in diário para ver esta linha factual.</div>}
                    </div>
                    <div style={{ ...cardWhite, display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: "#16302B" }}>Peso</div>
                      {st.pesos.length >= 2 ? (
                        <div style={{ display: "flex", alignItems: "end", gap: 6, minHeight: 58 }}>
                          {st.pesos.slice(-8).map((item) => {
                            const span = Math.max(1, weightMax - weightMin);
                            const height = 16 + ((item.kg - weightMin) / span) * 40;
                            return <div key={item.raw.toISOString()} title={`${item.kg} kg`} style={{ flex: 1, height, borderRadius: 7, background: "#0E6B5C" }} />;
                          })}
                        </div>
                      ) : <div style={{ fontSize: 13, color: "#596E68" }}>Com dois registros de peso, o gráfico aparece aqui.</div>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CONSULTA */}
            {st.tab === "consulta" && (
              <div style={{ padding: "20px 22px 0", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#16302B" }}>Consulta</div>
                <div style={{ display: "flex", gap: 6, background: "#E9EDE9", padding: 4, borderRadius: 14 }}>
                  {[["resumo", "Relatório"], ["exportar", "Exportar"], ["fases", "Fases"]].map(([k, label]) => (
                    <button key={k} type="button" aria-pressed={st.consultaSub === k} onClick={() => set({ consultaSub: k })} style={{ flex: 1, textAlign: "center", padding: "9px 2px", border: "none", background: st.consultaSub === k ? "#fff" : "transparent", color: st.consultaSub === k ? "#0E6B5C" : "#596E68", borderRadius: 11, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>{label}</button>
                  ))}
                </div>

                {st.consultaSub === "resumo" && (anyDado ? (
                  <>
                    <div style={{ ...cardWhite, display: "flex", flexDirection: "column", gap: 12 }}>
                      {st.pesos.length > 0 && (<div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}><span style={{ color: "#596E68", fontWeight: 600 }}>Peso inicial → atual</span><span style={{ fontWeight: 700, color: "#16302B", fontVariantNumeric: "tabular-nums" }}>{st.pesos[0].kg} kg → {st.pesos[st.pesos.length - 1].kg} kg</span></div>)}
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}><span style={{ color: "#596E68", fontWeight: 600 }}>Dose atual</span><span style={{ fontWeight: 700, color: "#16302B" }}>{st.medicamento} · {st.dose}</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}><span style={{ color: "#596E68", fontWeight: 600 }}>Aplicações registradas</span><span style={{ fontWeight: 700, color: "#16302B", fontVariantNumeric: "tabular-nums" }}>{st.aplicacoes.length}</span></div>
                      {expectedDoses > 0 && (<div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}><span style={{ color: "#596E68", fontWeight: 600 }}>Aderência registrada</span><span style={{ fontWeight: 700, color: "#16302B", fontVariantNumeric: "tabular-nums" }}>{adherencePct}%</span></div>)}
                      {st.dosesNaoAplicadas.length > 0 && (<div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}><span style={{ color: "#596E68", fontWeight: 600 }}>Doses não aplicadas</span><span style={{ fontWeight: 700, color: "#16302B", fontVariantNumeric: "tabular-nums" }}>{st.dosesNaoAplicadas.length}</span></div>)}
                      {st.sintomas.length > 0 && (<div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}><span style={{ color: "#596E68", fontWeight: 600 }}>Sintomas registrados</span><span style={{ fontWeight: 700, color: "#16302B" }}>{st.sintomas.length} registro(s)</span></div>)}
                      {st.rotinas.length > 0 && (<div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}><span style={{ color: "#596E68", fontWeight: 600 }}>Hábitos registrados</span><span style={{ fontWeight: 700, color: "#16302B", fontVariantNumeric: "tabular-nums" }}>{st.rotinas.length}</span></div>)}
                      {st.perguntas.length > 0 && (
                        <>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#596E68", marginTop: 4 }}>PERGUNTAS ANOTADAS</div>
                          {st.perguntas.map((p, k) => (<div key={k} style={{ fontSize: 13, color: "#16302B", padding: "4px 0" }}>• {p.texto}</div>))}
                        </>
                      )}
                      {st.dosesNaoAplicadas.length > 0 && (
                        <>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#596E68", marginTop: 4 }}>MOTIVOS DE DOSE NÃO APLICADA</div>
                          {st.dosesNaoAplicadas.slice(-3).reverse().map((item, k) => (<div key={k} style={{ fontSize: 13, color: "#16302B", padding: "4px 0" }}>• {item.motivo} · {item.dataHora}</div>))}
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
                    <button type="button" onClick={generatePdf} style={{ ...primaryBtn, padding: 16, borderRadius: 14, fontSize: 15, marginTop: 16 }}>Baixar PDF</button>
                    <button type="button" onClick={shareReport} style={{ width: "100%", padding: 14, background: "transparent", color: "#0E6B5C", border: "1.5px solid #E2E7E2", borderRadius: 14, fontSize: 14.5, fontWeight: 700, cursor: "pointer", marginTop: 8 }}>Copiar resumo</button>
                    <div style={{ fontSize: 11.5, color: "#596E68", marginTop: 10 }}>O relatório usa somente o período selecionado e os registros visíveis no Canetta.</div>
                  </>
                )}

                {st.consultaSub === "fases" && (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {["Primeiro mês", "Até 3 meses", "3 a 6 meses", "Manutenção", "Redução ou pausa"].map((label) => (
                        <button key={label} type="button" aria-pressed={st.faseAtual === label} onClick={() => set({ faseAtual: label })} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", ...chipStyle(st.faseAtual === label, 14) }}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", background: st.faseAtual === label ? "#0E6B5C" : "#E2E7E2" }} />
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#16302B" }}>{label}</span>
                        </button>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: "#596E68", marginTop: 12, lineHeight: 1.5 }}>As condutas de cada fase são definidas com seu médico. O Canetta apenas organiza seus registros por período.</div>
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
                    <button type="button" onClick={() => set({ maisSub: "conteudo" })} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 16, cursor: "pointer" }}><span style={{ fontSize: 14.5, fontWeight: 700, color: "#16302B" }}>📚 Conteúdo educativo</span><span style={{ color: "#8DA9A2", fontSize: 18 }}>›</span></button>
                    <button type="button" onClick={() => set({ maisSub: "perfil" })} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 16, cursor: "pointer" }}><span style={{ fontSize: 14.5, fontWeight: 700, color: "#16302B" }}>⚙️ Perfil &amp; ajustes</span><span style={{ color: "#8DA9A2", fontSize: 18 }}>›</span></button>
                  </>
                )}

                {st.maisSub === "conteudo" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { titulo: "Náusea e efeitos digestivos: o que observar", fonte: "Fonte: bula do fabricante", corpo: "Anote tipo, duração, intensidade e contexto. Esses fatos ajudam a conversa na consulta." },
                      { titulo: "Como preparar perguntas para sua consulta", fonte: "Fonte: orientação médica geral", corpo: "Salve dúvidas quando elas aparecem. O resumo junta tudo em uma pauta simples." },
                      { titulo: "Hidratação no dia a dia", fonte: "Fonte: Ministério da Saúde", corpo: "Use o registro de rotina para lembrar como estavam água, fome, sono e movimento." },
                      { titulo: "Entendendo as fases do tratamento", fonte: "Fonte: SBEM", corpo: "As fases ajudam a organizar o tempo de acompanhamento, sem definir conduta." },
                    ].map((a) => (
                      <div key={a.titulo} style={{ padding: "15px 17px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 14, display: "flex", flexDirection: "column", gap: 5 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#16302B" }}>{a.titulo}</div>
                        <div style={{ fontSize: 12.5, color: "#4B5F59", lineHeight: 1.45 }}>{a.corpo}</div>
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
                    <button type="button" aria-pressed={st.lembretesOn} onClick={() => set({ lembretesOn: !st.lembretesOn })} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 14, cursor: "pointer" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#16302B" }}>Agenda da dose</span>
                      <div style={{ width: 42, height: 24, borderRadius: 12, background: st.lembretesOn ? "#22B39A" : "#E2E7E2", position: "relative" }}><div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: st.lembretesOn ? 21 : 3, transition: "left .15s" }} /></div>
                    </button>
                    {st.lembretesOn && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 10 }}>
                        <div><label htmlFor="reminder-weekday" style={fieldLabel}>DIA</label><select id="reminder-weekday" className="j-in" value={st.reminderWeekday} onChange={(event) => set({ reminderWeekday: Number(event.target.value) })} style={{ ...inputSt, padding: "12px 13px", fontSize: 13.5 }}><option value={-1}>Escolher</option>{[[1, "Segunda"], [2, "Terça"], [3, "Quarta"], [4, "Quinta"], [5, "Sexta"], [6, "Sábado"], [0, "Domingo"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                        <div><label htmlFor="reminder-time" style={fieldLabel}>HORÁRIO</label><input id="reminder-time" className="j-in" type="time" value={st.reminderTime} onChange={(event) => set({ reminderTime: event.target.value })} style={{ ...inputSt, padding: "12px 13px", fontSize: 13.5 }} /></div>
                      </div>
                    )}
                    <button type="button" disabled={busyAction === "reminder"} onClick={saveReminder} style={{ ...primaryBtn, padding: 13, fontSize: 14, opacity: busyAction === "reminder" ? 0.65 : 1 }}>{busyAction === "reminder" ? "Salvando…" : st.lembretesOn ? "Salvar agenda" : "Salvar agenda desativada"}</button>
                    <div style={{ ...cardWhite, display: "flex", flexDirection: "column", gap: 10, padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#16302B" }}>Push da dose</div>
                          <div style={{ fontSize: 12, color: "#596E68", lineHeight: 1.4, marginTop: 3 }}>{pushStatus}</div>
                        </div>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: pushEnabled ? "#22B39A" : "#D9DED9", flex: "0 0 auto" }} />
                      </div>
                      {!authenticated && <div style={{ fontSize: 12, color: "#596E68", lineHeight: 1.4 }}>Entre na conta para receber lembretes mesmo com o app fechado.</div>}
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" disabled={busyAction === "push" || !pushSupported || pushEnabled} onClick={enablePush} style={{ flex: 1, padding: 12, background: pushEnabled ? "#D9DED9" : "#0E6B5C", color: pushEnabled ? "#596E68" : "#fff", border: "none", borderRadius: 12, fontSize: 12.5, fontWeight: 800, cursor: pushEnabled ? "not-allowed" : "pointer" }}>{busyAction === "push" ? "Ativando…" : pushEnabled ? "Ativo" : "Ativar push"}</button>
                        <button type="button" disabled={busyAction === "push-test" || !pushEnabled} onClick={sendTestPush} style={{ flex: 1, padding: 12, background: "#fff", color: "#0E6B5C", border: "1.5px solid #C7D6D1", borderRadius: 12, fontSize: 12.5, fontWeight: 800, cursor: pushEnabled ? "pointer" : "not-allowed", opacity: pushEnabled ? 1 : 0.55 }}>{busyAction === "push-test" ? "Enviando…" : "Testar"}</button>
                      </div>
                      {pushEnabled && <button type="button" disabled={busyAction === "push"} onClick={disablePush} style={{ width: "100%", padding: 11, background: "transparent", color: "#75443C", border: "none", borderRadius: 12, fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}>Desativar push neste navegador</button>}
                      <div style={{ fontSize: 11.5, color: "#596E68", lineHeight: 1.4 }}>No MVP, o push automático sai uma vez ao dia no dia configurado e mostra o horário escolhido na mensagem.</div>
                    </div>
                    <button type="button" disabled={busyAction === "profile"} onClick={saveProfile} style={{ ...primaryBtn, padding: 13, fontSize: 14, opacity: busyAction === "profile" ? 0.65 : 1 }}>{busyAction === "profile" ? "Salvando…" : "Salvar perfil"}</button>
                    {authenticated && <form action={signOutAction}><button type="submit" style={{ width: "100%", padding: 13, background: "transparent", color: "#0E6B5C", border: "1.5px solid #C7D6D1", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Sair da conta</button></form>}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 14 }}><span style={{ fontSize: 14, fontWeight: 700, color: "#16302B" }}>Versão</span><span style={{ fontSize: 12.5, fontWeight: 700, color: "#0E6B5C" }}>MVP</span></div>
                    <div style={{ ...fieldLabel, marginTop: 6 }}>PRIVACIDADE (LGPD)</div>
                    <button type="button" disabled={busyAction === "export"} onClick={exportData} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 14, cursor: "pointer" }}><span style={{ fontSize: 14, fontWeight: 700, color: "#16302B" }}>{busyAction === "export" ? "Preparando exportação…" : "Exportar meus dados"}</span><span aria-hidden style={{ color: "#8DA9A2", fontSize: 18 }}>›</span></button>
                    {authenticated ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 14, background: "#FFF7F5", borderRadius: 14 }}>
                        <div style={{ fontSize: 12.5, color: "#75443C", lineHeight: 1.45 }}>Para apagar definitivamente a conta e todos os registros, digite <strong>APAGAR</strong>.</div>
                        <input aria-label="Confirmação para apagar conta" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value.toUpperCase())} placeholder="APAGAR" style={{ ...inputSt, padding: "11px 13px", borderColor: "#E5B7AF" }} />
                        <button type="button" disabled={busyAction === "delete" || deleteConfirmation !== "APAGAR"} onClick={deleteAccount} style={{ width: "100%", padding: 13, background: deleteConfirmation === "APAGAR" ? "#B3574A" : "#D7C8C5", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: deleteConfirmation === "APAGAR" ? "pointer" : "not-allowed" }}>{busyAction === "delete" ? "Apagando…" : "Apagar conta e dados"}</button>
                      </div>
                    ) : <div style={{ fontSize: 12.5, color: "#596E68", lineHeight: 1.45 }}>Entre na sua conta para solicitar a exclusão definitiva dos dados sincronizados.</div>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* TAB BAR */}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "#fff", borderTop: "1px solid #E2E7E2", display: "flex", alignItems: "center", justifyContent: "space-around", padding: "10px 10px 18px", zIndex: 10 }}>
            {([["hoje", "🏠", "Hoje"], ["diario", "📖", "Diário"], ["consulta", "📋", "Consulta"], ["mais", "⋯", "Mais"]] as const).map(([key, icon, label]) => (
              <button key={key} type="button" aria-current={st.tab === key ? "page" : undefined} onClick={() => setTab(key)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", width: 60, padding: 0, background: "none", border: "none" }}>
                <span style={{ fontSize: 19 }}>{icon}</span><span style={{ fontSize: 10.5, fontWeight: 700, color: st.tab === key ? "#0E6B5C" : "#596E68" }}>{label}</span>
              </button>
            ))}
            <button type="button" aria-label="Novo registro" onClick={() => set({ sheetOpen: true })} style={{ position: "absolute", left: "50%", top: -22, transform: "translateX(-50%)", width: 52, height: 52, padding: 0, border: "none", borderRadius: "50%", background: "#0E6B5C", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 26, cursor: "pointer", boxShadow: "0 6px 16px rgba(14,107,92,0.4)" }}>＋</button>
          </div>
        </>
      )}

      {/* SHEET */}
      {st.sheetOpen && (
        <>
          <button type="button" aria-label="Fechar novo registro" onClick={() => set({ sheetOpen: false })} style={{ position: "absolute", inset: 0, width: "100%", border: "none", background: "rgba(22,48,43,0.4)", zIndex: 30 }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "#F4F6F3", borderRadius: "24px 24px 0 0", padding: "10px 20px 26px", zIndex: 31, boxShadow: "0 -8px 30px rgba(0,0,0,0.15)" }}>
            <div style={{ width: 40, height: 5, background: "#E2E7E2", borderRadius: 3, margin: "6px auto 16px" }} />
            <div style={{ fontSize: 15, fontWeight: 800, color: "#16302B", marginBottom: 12 }}>Novo registro</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {quickDefs.map((q) => (
                <button key={q.key} type="button" onClick={() => startFlow(q.key)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 14, cursor: "pointer" }}>
                  <span style={{ fontSize: 19 }}>{q.icon}</span><span style={{ fontSize: 14.5, fontWeight: 700, color: "#16302B" }}>{q.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
