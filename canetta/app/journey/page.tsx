"use client";

// App Canetta pós-onboarding (Hoje / Diário / Consulta / Mais + fluxos de registro),
// portado do design-code "Canetta App.dc.html" (Claude Design) para React funcional.
// Diário inteligente: registra e organiza; estados vazios reagem ao que foi registrado.
// Mantém os limites regulatórios (não diagnostica, não prescreve, não sugere conduta).
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  type AiWorkoutPlanRow,
  deleteMyAccountAction,
  deleteJourneyEntryAction,
  disablePushSubscriptionAction,
  exportMyDataAction,
  type ExerciseCatalogItem,
  generateAiWorkoutPlanAction,
  getPushPublicKeyAction,
  loadAiWorkoutPlanAction,
  loadMealEntriesAction,
  loadJourneyAction,
  saveApplicationAction,
  saveMissedDoseAction,
  saveProfileAction,
  savePushSubscriptionAction,
  saveQuestionAction,
  saveReminderAction,
  saveRoutineAction,
  saveAnamnesisAction,
  saveSessionCheckinAction,
  saveSymptomAction,
  saveBodyMeasurementAction,
  saveNutritionEntryAction,
  saveMealEntryAction,
  saveMealPhotoAction,
  confirmMealPhotoAction,
  savePersonalReportAction,
  saveTrainingProfileAction,
  saveTrainingReassessmentAction,
  saveWorkoutAction,
  saveWorkoutFeedbackAction,
  sendTestPushAction,
  saveWeightAction,
  type TrainingProfileRow
} from "./actions";
import { CONDITIONS, PAIN_REGIONS, RED_FLAGS, evaluateSessionCheckin, type AnamnesisData, type GateResult, type SessionCheckinData, type SessionCheckinResult } from "@/lib/ai/anamnesis";
import { signOutAction } from "@/app/auth/actions";
import WorkoutRedesign from "./WorkoutRedesign";

type Tab = "hoje" | "diario" | "consulta" | "treino" | "nutricao" | "mais";
type RegisterFlow = "aplicacao" | "sintoma" | "peso" | "rotina" | "medidas" | "nutricao" | "pergunta" | "treino" | null;
type RegisterStep = "form" | "missed" | "saved" | "missedSaved" | "checkin";

interface Draft {
  applicationId?: string;
  applicationTimestamp?: number;
  dataHora?: string; obs?: string; nota?: string; contexto?: string; pergunta?: string;
  local?: string; tipo?: string; duracao?: string; movimento?: string; motivo?: string;
  sono?: string; fome?: string; intensidade?: number; pesoKg?: number; agua?: number;
  exerciseExternalId?: string; exerciseName?: string; bodyPart?: string; equipment?: string;
  series?: number; repeticoes?: string; dificuldadeSentida?: string;
  nausea?: boolean; vomitos?: boolean; diarreia?: boolean; constipacao?: boolean; dorAbdominal?: boolean;
  energia?: number; apetite?: string;
  cinturaCm?: number; quadrilCm?: number; refeicao?: string; proteina?: string;
  refeicoesToleradas?: string; ingestaoHabitual?: string; hidratacaoStatus?: string; fraqueza?: string; metaProfissional?: string;
  metaProteinaGramas?: number; metaProteinaFonte?: string;
}
interface Aplicacao { id?: string; dataHora: string; local: string; obs: string; data: Date; }
interface DoseNaoAplicada { id?: string; dataHora: string; motivo: string; nota?: string; data: Date; }
interface Sintoma { id?: string; tipo: string; intensidade: number; duracao?: string; contexto?: string; nota?: string; data: Date; }
interface Peso { id?: string; kg: number; data: string; raw: Date; }
interface Rotina extends Draft { id?: string; photo?: boolean; data: Date; }
interface Medida { id?: string; cinturaCm?: number | null; quadrilCm?: number | null; nota?: string | null; data: Date; }
interface Nutricao { id?: string; refeicao?: string | null; proteina?: boolean | null; agua?: number | null; nota?: string | null; refeicoesToleradas?: string | null; ingestaoHabitual?: string | null; hidratacaoStatus?: string | null; fraqueza?: string | null; metaProfissional?: string | null; metaProteinaGramas?: number | null; metaProteinaFonte?: string | null; data: Date; }
interface MealEntry { id: string; label: string; calories: number; proteinG: number; carbsG: number; fatG: number; fiberG: number; loggedAt: Date; }
interface Pergunta { id?: string; texto: string; data: Date; }
interface Treino { id?: string; exerciseExternalId?: string; exerciseName: string; bodyPart?: string; equipment?: string; setsCompleted?: number; repsCompleted?: string; difficultyFelt?: string; note?: string; data: Date; }

interface AppState {
  nome: string; mascotNome: string; medicamento: string; dose: string; freqLabel: string;
  objetivo: string; faseAtual: string; lembretesOn: boolean; reminderWeekday: number; reminderTime: string;
  tab: Tab; diarioSub: string; consultaSub: string; treinoSub: string; maisSub: string; periodo: string; exerciseSearch: string;
  nutritionGoal: "diaria" | "tres_por_semana" | "livre";
  nutritionCaloriesToday: number; nutritionCaloriesDate: string; nutritionCalorieTarget: number; nutritionPhotoCount: number; nutritionPhotoDate: string;
  sheetOpen: boolean; registerFlow: RegisterFlow; registerStep: RegisterStep; nutritionStep: number; draft: Draft;
  aplicacoes: Aplicacao[]; dosesNaoAplicadas: DoseNaoAplicada[]; sintomas: Sintoma[]; pesos: Peso[]; rotinas: Rotina[]; medidas: Medida[]; nutricao: Nutricao[];
  perguntas: Pergunta[]; treinos: Treino[]; exercises: ExerciseCatalogItem[]; toastMsg: string;
}

const INITIAL: AppState = {
  nome: "você", mascotNome: "Canetta", medicamento: "Medicamento", dose: "Dose atual", freqLabel: "Semanal",
  objetivo: "Organizar meus registros", faseAtual: "Primeiro mês", lembretesOn: false, reminderWeekday: -1, reminderTime: "",
  tab: "hoje", diarioSub: "registros", consultaSub: "resumo", treinoSub: "plano", maisSub: "menu", periodo: "Últimos 7 dias", exerciseSearch: "", nutritionGoal: "livre", nutritionCaloriesToday: 0, nutritionCaloriesDate: "", nutritionCalorieTarget: 0, nutritionPhotoCount: 0, nutritionPhotoDate: "", nutritionStep: 0,
  sheetOpen: false, registerFlow: null, registerStep: "form", draft: {},
  aplicacoes: [], dosesNaoAplicadas: [], sintomas: [], pesos: [], rotinas: [], medidas: [], nutricao: [], perguntas: [], treinos: [], exercises: [], toastMsg: "",
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
const FALLBACK_EXERCISES: ExerciseCatalogItem[] = [
  { external_id: "canetta-bodyweight-squat", name: "Agachamento livre", body_part: "upper legs", equipment: "body weight", target_muscle: "quadriceps", muscle_group: "legs", secondary_muscles: ["glutes"], image_url: null, gif_url: null, attribution: "Canetta starter catalog" },
  { external_id: "canetta-wall-push-up", name: "Flexão na parede", body_part: "chest", equipment: "body weight", target_muscle: "pectorals", muscle_group: "chest", secondary_muscles: ["triceps", "shoulders"], image_url: null, gif_url: null, attribution: "Canetta starter catalog" },
  { external_id: "canetta-glute-bridge", name: "Ponte de glúteos", body_part: "upper legs", equipment: "body weight", target_muscle: "glutes", muscle_group: "legs", secondary_muscles: ["hamstrings"], image_url: null, gif_url: null, attribution: "Canetta starter catalog" },
  { external_id: "canetta-bird-dog", name: "Bird dog", body_part: "waist", equipment: "body weight", target_muscle: "abs", muscle_group: "core", secondary_muscles: ["back"], image_url: null, gif_url: null, attribution: "Canetta starter catalog" },
  { external_id: "canetta-dead-bug", name: "Dead bug", body_part: "waist", equipment: "body weight", target_muscle: "abs", muscle_group: "core", secondary_muscles: ["hip flexors"], image_url: null, gif_url: null, attribution: "Canetta starter catalog" },
  { external_id: "canetta-dumbbell-row", name: "Remada com halter", body_part: "back", equipment: "dumbbell", target_muscle: "lats", muscle_group: "back", secondary_muscles: ["biceps"], image_url: null, gif_url: null, attribution: "Canetta starter catalog" }
];

const EXERCISE_LABELS: Record<string, string> = {
  "upper legs": "pernas",
  chest: "peito",
  waist: "core",
  back: "costas",
  shoulders: "ombros",
  arms: "braços",
  "body weight": "peso corporal",
  dumbbell: "halter",
  band: "faixa elástica",
  kettlebell: "kettlebell",
  quadriceps: "quadríceps",
  glutes: "glúteos",
  hamstrings: "posteriores de coxa",
  pectorals: "peitorais",
  lats: "dorsais",
  abs: "abdômen",
  core: "core",
};

const exerciseLabel = (value?: string | null) => value ? (EXERCISE_LABELS[value.toLowerCase()] ?? value) : "";

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
    nutritionStep: 0,
    draft: {},
    toastMsg: "",
    aplicacoes: list(value.aplicacoes).map((item) => ({ ...item, data: date(item.data) })),
    dosesNaoAplicadas: list(value.dosesNaoAplicadas).map((item) => ({ ...item, data: date(item.data) })),
    sintomas: list(value.sintomas).map((item) => ({ ...item, data: date(item.data) })),
    pesos: list(value.pesos).map((item) => ({ ...item, raw: date(item.raw) })),
    rotinas: list(value.rotinas).map((item) => ({ ...item, data: date(item.data) })),
    medidas: list(value.medidas).map((item) => ({ ...item, data: date(item.data) })),
    nutricao: list(value.nutricao).map((item) => ({ ...item, data: date(item.data) })),
    perguntas: list(value.perguntas).map((item) => ({ ...item, data: date(item.data) })),
    treinos: list(value.treinos).map((item) => ({ ...item, data: date(item.data) })),
    exercises: list(value.exercises)
  };
}

// ---------- estilos ----------
const primaryBtn: CSSProperties = { width: "100%", padding: 17, background: "var(--brand)", color: "#fff", border: "none", borderRadius: 16, fontSize: 16, fontWeight: 700, cursor: "pointer" };
const closeX: CSSProperties = { background: "none", border: "none", color: "var(--ink-soft)", fontSize: 20, cursor: "pointer" };
const fieldLabel: CSSProperties = { fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 6 };
const inputSt: CSSProperties = { width: "100%", padding: "14px 16px", border: "1.5px solid var(--line)", borderRadius: 14, fontSize: 15, fontWeight: 600, color: "var(--ink)", background: "var(--surface)" };
const textareaSt: CSSProperties = { width: "100%", minHeight: 60, padding: "14px 16px", border: "1.5px solid var(--line)", borderRadius: 14, fontSize: 14, color: "var(--ink)", background: "var(--surface)", fontFamily: "inherit", resize: "none" };
const cardWhite: CSSProperties = { background: "var(--surface)", border: "1.5px solid var(--line)", borderRadius: 16, padding: 18 };
const flowHeader = (titulo: string, onClose: () => void) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
    <button type="button" aria-label={`Fechar ${titulo}`} onClick={onClose} style={{ ...closeX, minWidth: 44, minHeight: 44 }}>✕</button>
    <div style={{ fontSize: 15, fontWeight: 800, color: "#16302B" }}>{titulo}</div>
    <div style={{ width: 20 }} />
  </div>
);

const MASCOT_BADGE = `<svg width="36" height="36" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="8" width="20" height="20" rx="10" fill="#FF9E7D"/><path d="M6 14a10 10 0 0 1 20 0v2H6z" fill="#0E6B5C"/><circle cx="12" cy="20" r="1.6" fill="#16302B"/><circle cx="20" cy="20" r="1.6" fill="#16302B"/></svg>`;
function MascotBadge({ size = 36 }: { size?: number }) {
  return <div style={{ width: size }} dangerouslySetInnerHTML={{ __html: MASCOT_BADGE }} />;
}
const BODY_SVG = `<svg width="150" height="210" viewBox="0 0 150 210"><ellipse cx="75" cy="24" rx="18" ry="20" fill="#E2E7E2"/><rect x="45" y="44" width="60" height="90" rx="26" fill="#E2E7E2"/><rect x="18" y="52" width="20" height="80" rx="10" fill="#E2E7E2"/><rect x="112" y="52" width="20" height="80" rx="10" fill="#E2E7E2"/><rect x="52" y="132" width="20" height="70" rx="10" fill="#E2E7E2"/><rect x="78" y="132" width="20" height="70" rx="10" fill="#E2E7E2"/></svg>`;

function IconGlyph({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    AP: "M7 3v4m0 0v10m0-10h5m-5 0H5m2 10v2m10-16v4m0 0v10m0-10h3m-3 10v2M5 7h4m6 0h4",
    KG: "M6 8h12l2 12H4L6 8Zm3 0a3 3 0 0 1 6 0",
    SX: "M3 12h4l2-5 4 10 2-5h6",
    RT: "M5 8a7 7 0 0 1 12-2l2 2m0-4v4h-4M19 16a7 7 0 0 1-12 2l-2-2m0 4v-4h4",
    CM: "M4 6h16v12H4zM8 6v4m4-4v4m4-4v4",
    NU: "M4 13h16a8 8 0 0 1-16 0Zm4 5h8M8 9c0-2 1-3 3-4m2 4c0-2-1-3-3-4",
    TR: "M3 9h6v6H3zM15 9h6v6h-6zM9 12h6M6 7v10m12-10v10",
    "?": "M9 9a3 3 0 1 1 5 2c-2 1-3 2-3 4m0 3h.01",
    HO: "M4 11 12 4l8 7v8H4zM9 19v-5h6v5",
    JO: "M5 5h14M5 12h14M5 19h14",
    CO: "M4 6h16v12H4zM8 10h8m-8 4h5",
    "…": "M6 12h.01M12 12h.01M18 12h.01"
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name] || paths["?"]} /></svg>;
}

function chipStyle(sel: boolean, radius = 12): CSSProperties {
  return { background: sel ? "#EAF5F2" : "#fff", border: `1.5px solid ${sel ? "#0E6B5C" : "#E2E7E2"}`, borderRadius: radius, fontWeight: 700, color: "#16302B", cursor: "pointer" };
}

export default function JourneyPage() {
  const [st, setStRaw] = useState<AppState>(INITIAL);
  const [ready, setReady] = useState(false);
  const [clockReady, setClockReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushEndpoint, setPushEndpoint] = useState<string | undefined>();
  const [todayExpanded, setTodayExpanded] = useState(false);
  const [pushStatus, setPushStatus] = useState("Push ainda não ativado.");
  const [aiPlan, setAiPlan] = useState<AiWorkoutPlanRow | null>(null);
  const [aiPlanLoaded, setAiPlanLoaded] = useState(false);
  const [aiPlanBusy, setAiPlanBusy] = useState(false);
  const [aiPlanError, setAiPlanError] = useState("");
  const [aiTraining, setAiTraining] = useState<TrainingProfileRow | null>(null);
  const [aiAnamnesis, setAiAnamnesis] = useState<AnamnesisData | null>(null);
  const [aiGate, setAiGate] = useState<GateResult | null>(null);
  const [triageOpen, setTriageOpen] = useState(false);
  const [triageBusy, setTriageBusy] = useState(false);
  const [triage, setTriage] = useState({
    red_flags_today: [] as string[],
    red_flags_recent: [] as string[],
    conditions: [] as string[],
    conditions_unsure: false,
    diabetes: { usa_insulina: false, usa_secretagogo: false, protocolo_exercicio: false, hipoglicemia_exercicio: false },
    gi: { impede_alimentacao: false, impede_hidratacao: false, impede_atividade: false, piora_com_movimento: false },
    funcao: { caminhada_max: "" as string, sentar_levantar_sem_apoio: true, sobe_um_lance_escada: true, agacha_ate_cadeira: true },
    dores: [] as string[],
    dores_detalhe: "",
    consent: false
  });
  const [anamneseOpen, setAnamneseOpen] = useState(false);
  const [anamneseBusy, setAnamneseBusy] = useState(false);
  const [anamneseLevel, setAnamneseLevel] = useState("");
  const [anamneseLocation, setAnamneseLocation] = useState("");
  const [anamneseDays, setAnamneseDays] = useState("");
  const [anamneseMinutes, setAnamneseMinutes] = useState("");
  const [anamneseLimitations, setAnamneseLimitations] = useState("");
  const [anamneseStep, setAnamneseStep] = useState(0);
  const [sessionCheckinOpen, setSessionCheckinOpen] = useState(false);
  const [sessionCheckinBusy, setSessionCheckinBusy] = useState(false);
  const [sessionCheckin, setSessionCheckin] = useState<SessionCheckinData>({ feels_well: true, new_symptoms: [], can_hydrate: true, pain_changed: false, confidence: "sim" });
  const [sessionCheckinResult, setSessionCheckinResult] = useState<SessionCheckinResult | null>(null);
  const [sessionCheckinDate, setSessionCheckinDate] = useState("");
  const [pendingExercise, setPendingExercise] = useState<{ name: string; sets?: number; reps?: string } | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [pendingWorkoutId, setPendingWorkoutId] = useState<string | undefined>();
  const [feedbackCompleted, setFeedbackCompleted] = useState(true);
  const [feedbackRpe, setFeedbackRpe] = useState("");
  const [feedbackDuring, setFeedbackDuring] = useState<string[]>([]);
  const [feedbackAfter, setFeedbackAfter] = useState<string[]>([]);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [reassessment, setReassessment] = useState<{ created_at: string; anchor_strength: string; function_level: string; pain_level: string; adherence: string; medication_change: boolean; note?: string | null } | null>(null);
  const [reassessmentOpen, setReassessmentOpen] = useState(false);
  const registerFlowRef = useRef<HTMLDivElement>(null);
  const [reassessmentBusy, setReassessmentBusy] = useState(false);
  const [reassessmentDraft, setReassessmentDraft] = useState({ anchorStrength: "", functionLevel: "", painLevel: "", adherence: "", medicationChange: false, note: "" });
  const [mediaPreview, setMediaPreview] = useState<{ url: string; name: string } | null>(null);
  const [calorieInput, setCalorieInput] = useState("");
  const [mealEntries, setMealEntries] = useState<MealEntry[]>([]);
  const [mealName, setMealName] = useState("");
  const [mealFood, setMealFood] = useState("");
  const [mealGrams, setMealGrams] = useState("");
  const [mealKcal, setMealKcal] = useState("");
  const [mealProtein, setMealProtein] = useState("");
  const [mealCarbs, setMealCarbs] = useState("");
  const [mealFat, setMealFat] = useState("");
  const [mealFiber, setMealFiber] = useState("");
  const [photoReviewId, setPhotoReviewId] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteLoaded = useRef(false);
  const set = (p: Partial<AppState>) => setStRaw((s) => ({ ...s, ...p }));
  const setDraft = (p: Partial<Draft>) => setStRaw((s) => ({ ...s, draft: { ...s.draft, ...p } }));
  const toast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setStRaw((current) => ({ ...current, toastMsg: msg }));
    toastTimer.current = setTimeout(() => setStRaw((current) => ({ ...current, toastMsg: "" })), 1800);
  }, []);

  // Datas dependentes do fuso/localidade só entram depois da hidratação.
  // Isso evita que o servidor e o navegador produzam rótulos diferentes no primeiro render.
  useEffect(() => setClockReady(true), []);

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
      const measurements = Array.isArray(result.measurements) ? result.measurements : [];
      const nutrition = Array.isArray(result.nutrition) ? result.nutrition : [];
      const questions = Array.isArray(result.questions) ? result.questions : [];
      const workouts = Array.isArray(result.workouts) ? result.workouts : [];
      const exercises = Array.isArray(result.exercises) ? result.exercises : [];
      // Registros sem id são lançamentos locais ainda não sincronizados. Eles
      // não podem desaparecer quando a sessão remota termina de carregar.
      const keepPending = <R extends { id?: string }, L extends { id?: string }>(
        remoteItems: R[],
        localItems: L[]
      ): L[] => [
        ...(remoteItems as unknown as L[]),
        ...localItems.filter((item) => !item.id)
      ];
      setStRaw((current) => ({
        ...current,
        nome: result.profile?.name || current.nome,
        medicamento: result.profile?.medication || current.medicamento,
        dose: result.profile?.current_dose || current.dose,
        freqLabel: result.profile?.frequency || current.freqLabel,
        aplicacoes: keepPending(applications.map((item) => ({
          id: item.id,
          dataHora: fmtDateTime(new Date(item.applied_at)),
          local: item.site || "Não informado",
          obs: item.note || "",
          data: new Date(item.applied_at)
        })), current.aplicacoes),
        dosesNaoAplicadas: keepPending(missedDoses.map((item) => ({
          id: item.id,
          dataHora: fmtDateTime(new Date(item.scheduled_for)),
          motivo: item.reason || "Não informado",
          nota: item.note || undefined,
          data: new Date(item.scheduled_for)
        })), current.dosesNaoAplicadas),
        pesos: keepPending(weights.map((item) => ({ id: item.id, kg: Number(item.weight), data: fmtDate(new Date(item.recorded_at)), raw: new Date(item.recorded_at) })), current.pesos),
        sintomas: keepPending(symptoms.map((item) => ({ id: item.id, tipo: item.types?.[0] || "Sintoma", intensidade: item.intensity ?? 0, duracao: item.duration || undefined, nota: item.note || undefined, data: new Date(item.recorded_at) })), current.sintomas),
        rotinas: keepPending(routines.map((item) => ({ id: item.id, agua: item.water_cups ?? undefined, movimento: item.movement || undefined, sono: item.sleep || undefined, fome: item.hunger || undefined, nota: item.note || undefined, data: new Date(item.recorded_at) })), current.rotinas),
        medidas: keepPending(measurements.map((item) => ({ id: item.id, cinturaCm: item.waist_cm, quadrilCm: item.hip_cm, nota: item.note, data: new Date(item.recorded_at) })), current.medidas),
        nutricao: keepPending(nutrition.map((item) => ({ id: item.id, refeicao: item.meal_label, proteina: item.protein_logged, agua: item.water_cups, nota: item.note, refeicoesToleradas: item.meals_tolerated, ingestaoHabitual: item.intake_adequacy, hidratacaoStatus: item.hydration_status, fraqueza: item.weakness_status, metaProfissional: item.professional_target, metaProteinaGramas: item.protein_target_grams, metaProteinaFonte: item.protein_target_source, data: new Date(item.recorded_at) })), current.nutricao),
        perguntas: keepPending(questions.map((item) => ({ id: item.id, texto: item.question, data: new Date(item.recorded_at) })), current.perguntas),
        treinos: keepPending(workouts.map((item) => ({ id: item.id, exerciseExternalId: item.exercise_external_id || undefined, exerciseName: item.exercise_name, bodyPart: item.body_part || undefined, equipment: item.equipment || undefined, setsCompleted: item.sets_completed ?? undefined, repsCompleted: item.reps_completed || undefined, difficultyFelt: item.difficulty_felt || undefined, note: item.note || undefined, data: new Date(item.completed_at) })), current.treinos),
        exercises: exercises.length ? exercises : current.exercises,
        lembretesOn: result.reminder?.active ?? current.lembretesOn,
        reminderWeekday: result.reminder?.weekday ?? current.reminderWeekday,
        reminderTime: result.reminder?.time?.slice(0, 5) ?? current.reminderTime
      }));
      if ("sessionCheckins" in result && result.sessionCheckins?.[0]) {
        const latest = result.sessionCheckins[0];
        setSessionCheckinResult({ status: latest.status as SessionCheckinResult["status"], motivos: [] });
        setSessionCheckinDate(latest.session_date);
      }
      if ("reassessment" in result) setReassessment(result.reassessment ?? null);
    }).catch(() => toast("Não foi possível sincronizar agora."))
      .finally(() => setAuthChecked(true));
  }, [ready, toast]);

  useEffect(() => {
    if (!ready || !authenticated) return;
    loadMealEntriesAction().then((result) => {
      if (!result.synced) return;
      setMealEntries(result.meals.map((meal) => ({ id: meal.id, label: meal.meal_label || "Refeição", calories: Number(meal.calories || 0), proteinG: Number(meal.protein_g || 0), carbsG: Number(meal.carbs_g || 0), fatG: Number(meal.fat_g || 0), fiberG: Number(meal.fiber_g || 0), loggedAt: new Date(meal.logged_at) })));
    }).catch(() => {});
  }, [ready, authenticated]);

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

  useEffect(() => {
    if (!ready || !authenticated || aiPlanLoaded || st.tab !== "treino") return;
    setAiPlanLoaded(true);
    loadAiWorkoutPlanAction().then((result) => {
      if ("plan" in result) setAiPlan(result.plan ?? null);
      if ("trainingProfile" in result) setAiTraining(result.trainingProfile ?? null);
      if ("anamnesis" in result) setAiAnamnesis(result.anamnesis ?? null);
      if ("gate" in result) setAiGate(result.gate ?? null);
    }).catch(() => {});
  }, [ready, authenticated, aiPlanLoaded, st.tab]);

  const toggleInList = (list: string[], value: string) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

  const openTriage = () => {
    if (aiAnamnesis) {
      setTriage({
        red_flags_today: aiAnamnesis.red_flags_today ?? [],
        red_flags_recent: aiAnamnesis.red_flags_recent ?? [],
        conditions: aiAnamnesis.conditions ?? [],
        conditions_unsure: aiAnamnesis.conditions_unsure ?? false,
        diabetes: aiAnamnesis.diabetes ?? { usa_insulina: false, usa_secretagogo: false, protocolo_exercicio: false, hipoglicemia_exercicio: false },
        gi: aiAnamnesis.gi,
        funcao: { ...aiAnamnesis.funcao },
        dores: aiAnamnesis.dores ?? [],
        dores_detalhe: aiAnamnesis.dores_detalhe ?? "",
        consent: true
      });
    }
    setTriageOpen(true);
  };

  const saveTriage = async () => {
    if (!triage.funcao.caminhada_max) {
      setAiPlanError("Informe quanto tempo de caminhada contínua você tolera hoje.");
      return;
    }
    if (!triage.consent) {
      setAiPlanError("É preciso aceitar os limites do sistema para continuar.");
      return;
    }
    setTriageBusy(true);
    setAiPlanError("");
    const payload: AnamnesisData = {
      red_flags_today: triage.red_flags_today,
      red_flags_recent: triage.red_flags_recent,
      conditions: triage.conditions,
      conditions_unsure: triage.conditions_unsure,
      diabetes: triage.conditions.some((c) => c.startsWith("Diabetes")) ? triage.diabetes : undefined,
      gi: triage.gi,
      funcao: triage.funcao as AnamnesisData["funcao"],
      dores: triage.dores,
      dores_detalhe: triage.dores_detalhe.trim() || null
    };
    try {
      const result = await saveAnamnesisAction(payload, triage.consent);
      if (result.saved) {
        setAiAnamnesis(payload);
        setAiGate(result.gate);
        setTriageOpen(false);
        toast("Triagem salva.");
      } else if ("error" in result && result.error) {
        setAiPlanError(result.error);
      }
    } catch {
      setAiPlanError("Não foi possível salvar a triagem agora.");
    } finally {
      setTriageBusy(false);
    }
  };

  const ANAMNESE_LEVELS: Array<[string, TrainingProfileRow["experience_level"]]> = [
    ["Nunca treinei", "nunca_treinei"],
    ["Já treinei, parei", "retomando"],
    ["Treino regularmente", "treino_regular"]
  ];
  const ANAMNESE_LOCATIONS: Array<[string, TrainingProfileRow["training_location"]]> = [
    ["Casa, sem equipamento", "casa_sem_equipamento"],
    ["Casa, com equipamento", "casa_com_equipamento"],
    ["Academia", "academia"]
  ];

  const openAnamnese = () => {
    setAnamneseLevel(aiTraining ? ANAMNESE_LEVELS.find(([, code]) => code === aiTraining.experience_level)?.[0] ?? "" : "");
    setAnamneseLocation(aiTraining ? ANAMNESE_LOCATIONS.find(([, code]) => code === aiTraining.training_location)?.[0] ?? "" : "");
    setAnamneseDays(aiTraining ? String(aiTraining.days_per_week) : "");
    setAnamneseMinutes(aiTraining ? `${aiTraining.minutes_per_session} min` : "");
    setAnamneseLimitations(aiTraining?.limitations ?? "");
    setAnamneseStep(0);
    setAnamneseOpen(true);
  };

  const saveAnamnese = async () => {
    const level = ANAMNESE_LEVELS.find(([label]) => label === anamneseLevel)?.[1];
    const location = ANAMNESE_LOCATIONS.find(([label]) => label === anamneseLocation)?.[1];
    const days = Number(anamneseDays);
    const minutes = Number(anamneseMinutes.replace(/\D/g, ""));
    if (!level || !location || !days || !minutes) {
      setAiPlanError("Preencha nível, local, dias e tempo por sessão.");
      return;
    }
    setAnamneseBusy(true);
    setAiPlanError("");
    const payload: TrainingProfileRow = {
      experience_level: level,
      training_location: location,
      days_per_week: days,
      minutes_per_session: minutes,
      limitations: anamneseLimitations.trim() || null
    };
    try {
      const result = await saveTrainingProfileAction(payload);
      if (result.saved) {
        setAiTraining(payload);
        setAnamneseOpen(false);
        toast("Anamnese salva.");
      } else if ("error" in result && result.error) {
        setAiPlanError(result.error);
      }
    } catch {
      setAiPlanError("Não foi possível salvar a anamnese agora.");
    } finally {
      setAnamneseBusy(false);
    }
  };

  const generateAiPlan = async () => {
    setAiPlanBusy(true);
    setAiPlanError("");
    try {
      const result = await generateAiWorkoutPlanAction();
      if ("plan" in result && result.plan) {
        setAiPlan(result.plan);
        if ("gate" in result && result.gate) setAiGate(result.gate);
        toast("Plano da semana gerado.");
      } else if ("blockedGate" in result && result.blockedGate) {
        setAiGate(result.blockedGate);
      } else if ("error" in result && result.error) {
        setAiPlanError(result.error);
      }
    } catch {
      setAiPlanError("Não foi possível gerar o plano agora. Tente novamente em instantes.");
    } finally {
      setAiPlanBusy(false);
    }
  };

  const beginPlannedWorkout = (exercise: { name: string; sets?: number; reps?: string }) => {
    const today = new Date().toISOString().slice(0, 10);
    if (sessionCheckinDate !== today || !sessionCheckinResult) {
      setPendingExercise(exercise);
      setSessionCheckinOpen(true);
      return;
    }
    if (sessionCheckinResult.status === "vermelho") {
      setAiPlanError("O check-in de hoje bloqueou o treino. Pause e procure avaliação se necessário.");
      return;
    }
    set({ registerFlow: "treino", sheetOpen: false, draft: { exerciseName: exercise.name, series: exercise.sets, repeticoes: exercise.reps } });
  };

  const saveSessionCheckin = async () => {
    setSessionCheckinBusy(true);
    setAiPlanError("");
    const result = evaluateSessionCheckin(sessionCheckin, aiGate);
    try {
      const saved = await saveSessionCheckinAction({ sessionLabel: pendingExercise?.name || "sessao", data: sessionCheckin, gate: aiGate });
      if (saved.saved) {
        setSessionCheckinResult(result);
        setSessionCheckinDate(new Date().toISOString().slice(0, 10));
        setSessionCheckinOpen(false);
        toast(result.status === "verde" ? "Check-in liberado." : result.status === "amarelo" ? "Hoje fica em modo leve." : "Treino pausado por segurança.");
        if (pendingExercise && result.status !== "vermelho") set({ registerFlow: "treino", sheetOpen: false, draft: { exerciseName: pendingExercise.name, series: pendingExercise.sets, repeticoes: pendingExercise.reps } });
        setPendingExercise(null);
      } else if ("error" in saved && saved.error) setAiPlanError(saved.error);
    } catch { setAiPlanError("Não foi possível salvar o check-in agora."); }
    finally { setSessionCheckinBusy(false); }
  };

  const saveFeedback = async () => {
    setFeedbackBusy(true);
    try {
      const result = await saveWorkoutFeedbackAction({ workoutLogId: pendingWorkoutId, completed: feedbackCompleted, rpe: feedbackRpe ? Number(feedbackRpe) : undefined, symptomsDuring: feedbackDuring, symptomsAfter: feedbackAfter, note: feedbackNote });
      if (result.saved) { setFeedbackOpen(false); toast("Feedback salvo para o próximo plano."); }
      else if ("error" in result && result.error) setAiPlanError(result.error);
    } catch { setAiPlanError("Não foi possível salvar o feedback agora."); }
    finally { setFeedbackBusy(false); }
  };

  const saveReassessment = async () => {
    setReassessmentBusy(true);
    try {
      const result = await saveTrainingReassessmentAction(reassessmentDraft);
      if (result.saved) { setReassessment(result.reassessment); setReassessmentOpen(false); toast("Reavaliação salva."); }
      else if ("validation" in result && result.validation) setAiPlanError("Responda os quatro itens para salvar a reavaliação.");
      else if ("error" in result && result.error) setAiPlanError(result.error);
    } catch { setAiPlanError("Não foi possível salvar a reavaliação agora."); }
    finally { setReassessmentBusy(false); }
  };

  // navegação
  const setTab = (tab: Tab) => set({ tab, sheetOpen: false });
  const startFlow = (type: RegisterFlow) => set({ sheetOpen: false, registerFlow: type, registerStep: "form", nutritionStep: 0, draft: type === "aplicacao" ? { dataHora: toDatetimeLocal(new Date()) } : {} });
  const addNutritionCalories = () => {
    const calories = Number(calorieInput);
    if (!Number.isFinite(calories) || calories <= 0) return;
    set({ nutritionCaloriesToday: nutritionCaloriesToday + Math.round(calories), nutritionCaloriesDate: nutritionTodayKey });
    setCalorieInput("");
    toast(`${Math.round(calories)} kcal registradas.`);
  };
  const saveManualMeal = async () => {
    const grams = Number(mealGrams); const kcal = Number(mealKcal);
    if (!mealFood.trim() || !Number.isFinite(grams) || grams <= 0 || !Number.isFinite(kcal) || kcal < 0) {
      toast("Informe alimento, gramas e kcal por 100 g."); return;
    }
    setBusyAction("meal-save");
    const result = await saveMealEntryAction({ mealLabel: mealName || "Refeição", estimateBasis: "manual", reviewStatus: "confirmada", foods: [{ foodName: mealFood, grams, kcalPer100g: kcal, proteinPer100g: Number(mealProtein) || 0, carbsPer100g: Number(mealCarbs) || 0, fatPer100g: Number(mealFat) || 0, fiberPer100g: Number(mealFiber) || 0 }] });
    if (!result.synced) { setBusyAction(null); toast("Não foi possível salvar a refeição. Verifique a migração nutricional."); return; }
    const totals = result.meal.totals;
    setMealEntries((entries) => [{ id: result.meal.id, label: mealName || "Refeição", calories: totals.calories, proteinG: totals.proteinG, carbsG: totals.carbsG, fatG: totals.fatG, fiberG: totals.fiberG, loggedAt: new Date(result.meal.loggedAt) }, ...entries]);
    setMealName(""); setMealFood(""); setMealGrams(""); setMealKcal(""); setMealProtein(""); setMealCarbs(""); setMealFat(""); setMealFiber(""); setBusyAction(null); toast("Refeição salva com cálculo determinístico.");
  };
  const confirmPhotoReview = async () => {
    const grams = Number(mealGrams); const kcal = Number(mealKcal);
    if (!photoReviewId || !mealFood.trim() || !Number.isFinite(grams) || grams <= 0 || !Number.isFinite(kcal) || kcal < 0) { toast("Informe alimento, gramas e kcal por 100 g."); return; }
    setBusyAction("photo-review");
    const result = await confirmMealPhotoAction({ mealId: photoReviewId, foodName: mealFood, grams, kcalPer100g: kcal, proteinPer100g: Number(mealProtein) || 0, carbsPer100g: Number(mealCarbs) || 0, fatPer100g: Number(mealFat) || 0, fiberPer100g: Number(mealFiber) || 0 });
    if (!result.synced) { setBusyAction(null); toast("Não foi possível confirmar essa foto."); return; }
    const totals = result.meal.totals;
    setMealEntries((entries) => entries.map((meal) => meal.id === photoReviewId ? { ...meal, label: "Refeição por foto · confirmada", calories: totals.calories, proteinG: totals.proteinG, carbsG: totals.carbsG, fatG: totals.fatG, fiberG: totals.fiberG } : meal));
    setPhotoReviewId(null); setMealFood(""); setMealGrams(""); setMealKcal(""); setMealProtein(""); setMealCarbs(""); setMealFat(""); setMealFiber(""); setBusyAction(null); toast("Foto revisada e refeição confirmada.");
  };
  const registerNutritionPhoto = async (file?: File) => {
    if (!file) return;
    setBusyAction("nutrition-photo");
    const formData = new FormData(); formData.append("photo", file);
    const result = await saveMealPhotoAction(formData);
    if (!result.synced) { setBusyAction(null); toast("Não foi possível salvar a foto. Tente novamente."); return; }
    const recordedAt = new Date(result.meal.loggedAt);
    set({ nutritionPhotoCount: nutritionPhotoCount + 1, nutritionPhotoDate: nutritionTodayKey });
    setMealEntries((entries) => [{ id: result.meal.id, label: "Refeição por foto · revisão pendente", calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, loggedAt: recordedAt }, ...entries]);
    setBusyAction(null);
    toast("Foto da refeição registrada.");
  };

  useEffect(() => {
    if (!st.registerFlow) return;
    const frame = window.requestAnimationFrame(() => registerFlowRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [st.registerFlow]);
  const cancelFlow = () => set({ registerFlow: null, registerStep: "form", nutritionStep: 0, draft: {} });
  const finishToHoje = () => set({ registerFlow: null, registerStep: "form", nutritionStep: 0, draft: {}, tab: "hoje" });
  const finishToHistorico = () => set({ registerFlow: null, registerStep: "form", nutritionStep: 0, draft: {}, tab: "diario", diarioSub: "registros" });

  const lastPeso = () => (st.pesos.length ? st.pesos[st.pesos.length - 1].kg : 78);

  // salvar
  const saveAplicacao = async () => {
    const d = st.draft;
    setBusyAction("aplicacao");
    const localDate = fromDatetimeLocal(d.dataHora);
    const result = await saveApplicationAction({ id: d.applicationId, medication: st.medicamento, dose: st.dose, site: d.local, note: d.obs, appliedAt: localDate.toISOString() });
    const recordedAt = result.synced ? new Date(result.appliedAt) : localDate;
    const entry: Aplicacao = { id: result.synced ? result.id : undefined, dataHora: fmtDateTime(recordedAt), local: d.local || "Não informado", obs: d.obs || "", data: recordedAt };
    const editingApplication = d.applicationId || d.applicationTimestamp;
    const aplicacoes = editingApplication ? st.aplicacoes.map((item) => d.applicationId ? (item.id === d.applicationId ? entry : item) : (item.data.getTime() === d.applicationTimestamp ? entry : item)) : [...st.aplicacoes, entry];
    set({ aplicacoes, registerStep: "saved" });
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
    if (!st.draft.tipo) {
      toast("Selecione o sintoma antes de salvar.");
      return;
    }
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
    const entry = { id: result.synced ? result.id : undefined, kg, data: fmtDate(recordedAt), raw: recordedAt };
    const sameDayIndex = st.pesos.findIndex((item) => sameDay(item.raw, recordedAt));
    const pesos = sameDayIndex >= 0 ? st.pesos.map((item, index) => index === sameDayIndex ? entry : item) : [...st.pesos, entry];
    set({ pesos });
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
  const saveMedidas = async () => {
    setBusyAction("medidas");
    const result = await saveBodyMeasurementAction({ waistCm: st.draft.cinturaCm, hipCm: st.draft.quadrilCm, note: st.draft.nota });
    if ("validation" in result && result.validation) { setBusyAction(null); toast("Informe cintura ou quadril em centímetros."); return; }
    const recordedAt = result.synced ? new Date(result.measurement.recorded_at) : new Date();
    set({ medidas: [...st.medidas, { id: result.synced ? result.measurement.id : undefined, cinturaCm: st.draft.cinturaCm, quadrilCm: st.draft.quadrilCm, nota: st.draft.nota, data: recordedAt }] });
    setBusyAction(null); toast("Medidas registradas."); finishToHoje();
  };
  const saveNutricao = async () => {
    setBusyAction("nutricao");
    const result = await saveNutritionEntryAction({ mealLabel: st.draft.refeicao, proteinLogged: st.draft.proteina === "Sim" ? true : st.draft.proteina === "Não" ? false : undefined, waterCups: st.draft.agua, note: st.draft.nota, mealsTolerated: st.draft.refeicoesToleradas, intakeAdequacy: st.draft.ingestaoHabitual, hydrationStatus: st.draft.hidratacaoStatus, weaknessStatus: st.draft.fraqueza, professionalTarget: st.draft.metaProfissional, proteinTargetGrams: st.draft.metaProteinaGramas, proteinTargetSource: st.draft.metaProteinaFonte });
    const recordedAt = result.synced ? new Date(result.nutrition.recorded_at) : new Date();
    set({ nutricao: [...st.nutricao, { id: result.synced ? result.nutrition.id : undefined, refeicao: st.draft.refeicao, proteina: st.draft.proteina === "Sim" ? true : st.draft.proteina === "Não" ? false : null, agua: st.draft.agua, nota: st.draft.nota, refeicoesToleradas: st.draft.refeicoesToleradas, ingestaoHabitual: st.draft.ingestaoHabitual, hidratacaoStatus: st.draft.hidratacaoStatus, fraqueza: st.draft.fraqueza, metaProfissional: st.draft.metaProfissional, metaProteinaGramas: st.draft.metaProteinaGramas, metaProteinaFonte: st.draft.metaProteinaFonte, data: recordedAt }] });
    setBusyAction(null); toast("Registro de alimentação salvo."); finishToHoje();
  };
  const nutritionNext = () => {
    if (st.nutritionStep < 5) set({ nutritionStep: st.nutritionStep + 1 });
    else void saveNutricao();
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
  const saveTreino = async () => {
    const exerciseName = st.draft.exerciseName?.trim();
    if (!exerciseName) { toast("Escolha ou informe um exercício."); return; }
    setBusyAction("treino");
    const result = await saveWorkoutAction({
      exerciseExternalId: st.draft.exerciseExternalId,
      exerciseName,
      bodyPart: st.draft.bodyPart,
      equipment: st.draft.equipment,
      setsCompleted: st.draft.series,
      repsCompleted: st.draft.repeticoes,
      difficultyFelt: st.draft.dificuldadeSentida,
      note: st.draft.nota
    });
    const recordedAt = result.synced ? new Date(result.completedAt) : new Date();
    set({
      treinos: [...st.treinos, {
        id: result.synced ? result.id : undefined,
        exerciseExternalId: st.draft.exerciseExternalId,
        exerciseName,
        bodyPart: st.draft.bodyPart,
        equipment: st.draft.equipment,
        setsCompleted: st.draft.series,
        repsCompleted: st.draft.repeticoes,
        difficultyFelt: st.draft.dificuldadeSentida,
        note: st.draft.nota,
        data: recordedAt
      }],
      tab: "treino",
      treinoSub: "historico",
      sheetOpen: false,
      registerFlow: null
    });
    setBusyAction(null);
    setPendingWorkoutId(result.synced ? result.id : undefined);
    setFeedbackCompleted(true);
    setFeedbackRpe("");
    setFeedbackDuring([]);
    setFeedbackAfter([]);
    setFeedbackNote("");
    setFeedbackOpen(true);
    toast("Treino registrado. Como foi?");
  };
  const recordPlannedExercise = async (exercise: { name: string; name_pt?: string | null; sets: number; reps: string; why: string; gif_url?: string | null; image_url?: string | null }, completedSets: number) => {
    const result = await saveWorkoutAction({ exerciseName: exercise.name, setsCompleted: completedSets, repsCompleted: exercise.reps });
    const recordedAt = result.synced ? new Date(result.completedAt) : new Date();
    set({ treinos: [...st.treinos, { id: result.synced ? result.id : undefined, exerciseName: exercise.name, setsCompleted: completedSets, repsCompleted: exercise.reps, data: recordedAt }] });
    toast(`${exercise.name_pt || exercise.name}: série registrada.`);
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
      const workouts = st.treinos.filter((item) => inPeriod(item.data));
    const measurements = st.medidas.filter((item) => inPeriod(item.data));
    const nutrition = st.nutricao.filter((item) => inPeriod(item.data));
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
      `Treinos registrados: ${workouts.length}`,
      `Medidas corporais: ${measurements.length}`,
      `Registros de alimentação/água: ${nutrition.length}`,
      ...(workouts.length ? ["Treinos no período:", ...workouts.map((item) => `• ${fmtDate(item.data)} — ${item.exerciseName}${item.setsCompleted ? ` · ${item.setsCompleted} séries` : ""}${item.repsCompleted ? ` · ${item.repsCompleted}` : ""}`)] : []),
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

  const generatePdf = async () => {
    if (authenticated) {
      const period = st.periodo === "Últimos 7 dias" ? "7d" : st.periodo === "Últimos 30 dias" ? "30d" : "all";
      await savePersonalReportAction({ period, snapshot: { medication: st.medicamento, dose: st.dose, applications: st.aplicacoes.length, symptoms: st.sintomas.length, weights: st.pesos.length, measurements: st.medidas.length, nutrition: st.nutricao.length, generatedAt: new Date().toISOString() } });
    }
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

  const deleteJourneyEvent = async (event: JourneyEvent) => {
    if (!window.confirm("Excluir este registro? Essa ação não pode ser desfeita.")) return;
    if (event.id) {
      const result = await deleteJourneyEntryAction(event.kind, event.id);
      if (!result.deleted) { toast("Não foi possível excluir o registro agora."); return; }
    }
    const remove = <T extends { id?: string }>(items: T[]) => items.filter((item) => {
      if (event.id) return item.id !== event.id;
      const candidate = item as T & { data?: Date | string; raw?: Date };
      const date = candidate.raw ?? (candidate.data instanceof Date ? candidate.data : undefined);
      return date?.getTime() !== event.timestamp;
    });
    const next: Partial<AppState> = {};
    if (event.kind === "aplicacao") next.aplicacoes = remove(st.aplicacoes);
    if (event.kind === "doseNaoAplicada") next.dosesNaoAplicadas = remove(st.dosesNaoAplicadas);
    if (event.kind === "sintoma") next.sintomas = remove(st.sintomas);
    if (event.kind === "peso") next.pesos = remove(st.pesos);
    if (event.kind === "rotina") next.rotinas = remove(st.rotinas);
    if (event.kind === "medida") next.medidas = remove(st.medidas);
    if (event.kind === "nutricao") next.nutricao = remove(st.nutricao);
    if (event.kind === "treino") next.treinos = remove(st.treinos);
    if (event.kind === "pergunta") next.perguntas = remove(st.perguntas);
    set(next);
    toast("Registro excluído.");
  };

  const editJourneyEvent = (event: JourneyEvent) => {
    if (event.kind !== "aplicacao") return;
    const item = st.aplicacoes.find((application) => event.id ? application.id === event.id : application.data.getTime() === event.timestamp);
    if (!item) return;
    set({ registerFlow: "aplicacao", registerStep: "form", sheetOpen: false, draft: { applicationId: item.id, applicationTimestamp: item.data.getTime(), dataHora: toDatetimeLocal(item.data), local: item.local, obs: item.obs } });
  };

  // derivados
  const freqDays = ({ "Diária": 1, "Semanal": 7, "Quinzenal": 14, "Mensal": 30 } as Record<string, number>)[st.freqLabel] || 7;
  const expectedWorkoutCount = aiTraining?.days_per_week ?? 3;
  const planNeedsRegeneration = !!aiPlan && (aiPlan.workouts?.length ?? 0) !== expectedWorkoutCount;
  const nextReminderLabel = useMemo(() => {
    if (!st.aplicacoes.length) return "";
    const n = new Date(st.aplicacoes[st.aplicacoes.length - 1].data); n.setDate(n.getDate() + freqDays);
    return fmtDate(n) + ", mesmo horário registrado";
  }, [st.aplicacoes, freqDays]);

  type JourneyEvent = { kind: "aplicacao" | "doseNaoAplicada" | "sintoma" | "peso" | "rotina" | "medida" | "nutricao" | "treino" | "pergunta"; id?: string; icon: string; label: string; data: string; t: Date; timestamp: number };
  const events = useMemo(() => {
    const evs = [
      ...st.aplicacoes.map((a) => ({ kind: "aplicacao" as const, id: a.id, icon: "AP", label: "Aplicação · " + st.medicamento, data: a.dataHora, t: a.data, timestamp: a.data.getTime() })),
      ...st.dosesNaoAplicadas.map((a) => ({ kind: "doseNaoAplicada" as const, id: a.id, icon: "○", label: "Dose não aplicada · " + a.motivo, data: a.dataHora, t: a.data, timestamp: a.data.getTime() })),
      ...st.sintomas.map((a) => ({ kind: "sintoma" as const, id: a.id, icon: "SX", label: "Sintoma · " + a.tipo, data: fmtDate(a.data), t: a.data, timestamp: a.data.getTime() })),
      ...st.pesos.map((a) => ({ kind: "peso" as const, id: a.id, icon: "KG", label: "Peso · " + a.kg + " kg", data: a.data, t: a.raw, timestamp: a.raw.getTime() })),
      ...st.rotinas.map((a) => ({ kind: "rotina" as const, id: a.id, icon: "RT", label: "Rotina & hábitos", data: fmtDate(a.data), t: a.data, timestamp: a.data.getTime() })),
      ...st.medidas.map((a) => ({ kind: "medida" as const, id: a.id, icon: "CM", label: "Medidas corporais", data: fmtDate(a.data), t: a.data, timestamp: a.data.getTime() })),
      ...st.nutricao.map((a) => ({ kind: "nutricao" as const, id: a.id, icon: "NU", label: "Alimentação/água", data: fmtDate(a.data), t: a.data, timestamp: a.data.getTime() })),
      ...st.treinos.map((a) => ({ kind: "treino" as const, id: a.id, icon: "TR", label: "Treino · " + a.exerciseName, data: fmtDate(a.data), t: a.data, timestamp: a.data.getTime() })),
      ...st.perguntas.map((a) => ({ kind: "pergunta" as const, id: a.id, icon: "?", label: "Pergunta anotada", data: fmtDate(a.data), t: a.data, timestamp: a.data.getTime() })),
    ] satisfies JourneyEvent[];
    return evs.sort((x, y) => y.t.getTime() - x.t.getTime());
  }, [st.aplicacoes, st.dosesNaoAplicadas, st.sintomas, st.pesos, st.rotinas, st.medidas, st.nutricao, st.treinos, st.perguntas, st.medicamento]);

  const anyDado = st.aplicacoes.length || st.dosesNaoAplicadas.length || st.pesos.length || st.sintomas.length || st.rotinas.length || st.medidas.length || st.nutricao.length || st.treinos.length || st.perguntas.length;
  const conquista = anyDado > 0;
  const pesoAtual = st.pesos.length ? st.pesos[st.pesos.length - 1].kg : null;
  const expectedDoses = st.aplicacoes.length + st.dosesNaoAplicadas.length;
  const adherencePct = expectedDoses ? Math.round((st.aplicacoes.length / expectedDoses) * 100) : null;
  const now = useMemo(() => clockReady ? new Date() : new Date(0), [clockReady]);
  const nutritionTodayKey = now.getTime() ? now.toISOString().slice(0, 10) : "";
  const nutritionCaloriesToday = st.nutritionCaloriesDate === nutritionTodayKey ? st.nutritionCaloriesToday : 0;
  const nutritionPhotoCount = st.nutritionPhotoDate === nutritionTodayKey ? st.nutritionPhotoCount : 0;
  const mealCaloriesToday = mealEntries.filter((meal) => meal.loggedAt.toISOString().slice(0, 10) === nutritionTodayKey).reduce((sum, meal) => sum + meal.calories, 0);
  const mealProteinToday = mealEntries.filter((meal) => meal.loggedAt.toISOString().slice(0, 10) === nutritionTodayKey).reduce((sum, meal) => sum + meal.proteinG, 0);
  const mealsToday = mealEntries.filter((meal) => meal.loggedAt.toISOString().slice(0, 10) === nutritionTodayKey);
  const mealCarbsToday = mealsToday.reduce((sum, meal) => sum + meal.carbsG, 0);
  const mealFatToday = mealsToday.reduce((sum, meal) => sum + meal.fatG, 0);
  const mealFiberToday = mealsToday.reduce((sum, meal) => sum + meal.fiberG, 0);
  const waterToday = st.nutricao.filter((item) => item.data.toISOString().slice(0, 10) === nutritionTodayKey).reduce((sum, item) => sum + Number(item.agua || 0), 0);
  const nutritionWeekStart = new Date(now); nutritionWeekStart.setDate(nutritionWeekStart.getDate() - 6); nutritionWeekStart.setHours(0, 0, 0, 0);
  const mealsThisWeek = mealEntries.filter((meal) => meal.loggedAt >= nutritionWeekStart);
  const nutritionTrackedDays = new Set(mealsThisWeek.map((meal) => meal.loggedAt.toISOString().slice(0, 10))).size;
  const nutritionAverageCalories = nutritionTrackedDays ? mealsThisWeek.reduce((sum, meal) => sum + meal.calories, 0) / nutritionTrackedDays : 0;
  const nutritionInsight = !mealsThisWeek.length ? "Ainda não há registros suficientes para observar um padrão." : nutritionTrackedDays < 3 ? "Há poucos dias registrados para interpretar sua semana com confiança." : `Você registrou refeições em ${nutritionTrackedDays} dos últimos 7 dias; essa é uma descrição do seu registro, não uma avaliação da sua alimentação.`;
  const weekStart = startOfWeek(now);
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
    const date = startOfDay(now);
    date.setDate(date.getDate() - (6 - index));
    const applied = st.aplicacoes.some((item) => sameDay(item.data, date));
    const missed = st.dosesNaoAplicadas.some((item) => sameDay(item.data, date));
    return { date, applied, missed, label: date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "") };
  }), [now, st.aplicacoes, st.dosesNaoAplicadas]);
  const symptomDailyCount = (rotina: Rotina) => [
    rotina.nausea,
    rotina.vomitos,
    rotina.diarreia,
    rotina.constipacao,
    rotina.dorAbdominal
  ].filter(Boolean).length + (rotina.nota?.toLowerCase().includes("sintomas:") ? 1 : 0);
  const symptomTrend = useMemo(() => st.rotinas.slice(-7).map((item) => ({ date: item.data, value: symptomDailyCount(item) })), [st.rotinas]);
  const appliedLastSeven = lastSevenDays.filter((day) => day.applied).length;
  const missedLastSeven = lastSevenDays.filter((day) => day.missed).length;
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
      { label: "Treinos", value: String(st.treinos.length), detail: st.treinos.length ? "movimento salvo" : "sem registro" },
    ];
    return facts.filter((fact) => fact.value !== "0" && fact.value !== "—");
  }, [adherencePct, expectedDoses, pesoAtual, siteSummary, st.aplicacoes.length, st.dosesNaoAplicadas.length, st.pesos.length, st.sintomas.length, st.rotinas.length, st.treinos.length]);

  const quickDefs = [
    { key: "aplicacao", icon: "AP", label: "Aplicação" }, { key: "peso", icon: "KG", label: "Peso" },
    { key: "sintoma", icon: "SX", label: "Sintoma" }, { key: "rotina", icon: "RT", label: "Rotina" },
    { key: "medidas", icon: "CM", label: "Medidas" }, { key: "nutricao", icon: "NU", label: "Check-in nutricional" },
    { key: "treino", icon: "TR", label: "Treino" },
    { key: "pergunta", icon: "?", label: "Pergunta" },
  ] as const;
  const exerciseCatalog = st.exercises.length ? st.exercises : FALLBACK_EXERCISES;
  const filteredExercises = useMemo(() => {
    const query = st.exerciseSearch.trim().toLowerCase();
    if (!query) return exerciseCatalog.slice(0, 12);
    return exerciseCatalog.filter((item) => [item.name, item.body_part, item.equipment, item.target_muscle, item.muscle_group].filter(Boolean).join(" ").toLowerCase().includes(query)).slice(0, 12);
  }, [exerciseCatalog, st.exerciseSearch]);
  const workoutWeekStart = startOfWeek(now);
  const weeklyWorkouts = st.treinos.filter((item) => item.data >= workoutWeekStart).length;
  const nutritionWeekCount = st.nutricao.filter((item) => item.data >= workoutWeekStart).length;
  const nutritionGoalTarget = st.nutritionGoal === "diaria" ? 7 : st.nutritionGoal === "tres_por_semana" ? 3 : 0;
  const nutritionGoalLabel = st.nutritionGoal === "diaria" ? "1 registro por dia" : st.nutritionGoal === "tres_por_semana" ? "3 registros por semana" : "Sem meta fixa";
  const displayName = st.nome.replace(/^(oi|olá|ola)[,\s]*/i, "").trim() || "você";
  const syncLabel = authenticated ? "Dados sincronizados na conta." : "Dados salvos neste aparelho.";
  const hasProfileBasics = st.nome.trim().toLowerCase() !== "você" && st.medicamento.trim() !== "Medicamento" && st.dose.trim() !== "Dose atual";
  const hasDoseSchedule = st.lembretesOn && st.reminderWeekday >= 0 && /^\d{2}:\d{2}$/.test(st.reminderTime);
  const launchSetupComplete = hasProfileBasics && hasDoseSchedule && st.pesos.length > 0;
  const shouldShowLaunchSetup = ready && authChecked && authenticated && !launchSetupComplete && !anyDado;

  // Três níveis qualitativos em vez de escala 0-10 (a nota numérica seca não tem base clínica).
  // O valor salvo (intensity) segue numérico para compatibilidade: leve=3, moderado=6, forte=9.
  const INTENSITY_LEVELS: Array<{ label: string; hint: string; value: number }> = [
    { label: "Leve", hint: "incomoda pouco", value: 3 },
    { label: "Moderado", hint: "atrapalha o dia", value: 6 },
    { label: "Forte", hint: "limita bastante", value: 9 }
  ];
  const IntensityLevel = () => {
    const cur = st.draft.intensidade;
    return (
      <div style={{ display: "flex", gap: 8 }}>
        {INTENSITY_LEVELS.map((level) => {
          const active = cur === level.value;
          return (
            <button key={level.label} type="button" aria-pressed={active} onClick={() => setDraft({ intensidade: level.value })} style={{ flex: 1, padding: "12px 8px", border: `1.5px solid ${active ? "#0E6B5C" : "#E2E7E2"}`, borderRadius: 14, background: active ? "#EAF5F2" : "#fff", cursor: "pointer", textAlign: "center" }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: active ? "#0E6B5C" : "#16302B" }}>{level.label}</div>
              <div style={{ fontSize: 10.5, color: "#859891", marginTop: 2 }}>{level.hint}</div>
            </button>
          );
        })}
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
        {st.toastMsg && <div className="canetta-toast" role="status" aria-live="polite" style={{ position: "sticky", top: 0, zIndex: 4, background: "#16302B", color: "#fff", padding: "12px 16px", borderRadius: 12, fontSize: 13, fontWeight: 700, textAlign: "center", marginBottom: 14 }}>{st.toastMsg}</div>}
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
              <label htmlFor="setup-name" style={fieldLabel}>NOME</label>
              <input id="setup-name" className="j-in" value={st.nome === "você" ? "" : st.nome} onChange={(e) => set({ nome: e.target.value })} placeholder="Como quer aparecer no app?" style={inputSt} />
            </div>
            <div>
              <label htmlFor="setup-medication" style={fieldLabel}>MEDICAMENTO</label>
              <input id="setup-medication" className="j-in" list="canetta-medications" value={st.medicamento === "Medicamento" ? "" : st.medicamento} onChange={(e) => set({ medicamento: e.target.value, freqLabel: isTirzepatideMedication(e.target.value) ? "Semanal" : st.freqLabel })} placeholder="Ex: Tirzepatida, Mounjaro, Ozempic" style={inputSt} />
              <datalist id="canetta-medications">{MEDICATION_OPTIONS.map((item) => <option key={item} value={item} />)}</datalist>
            </div>
            <div className="responsive-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label htmlFor="setup-dose" style={fieldLabel}>DOSE</label>
                <input id="setup-dose" className="j-in" list={isTirzepatideMedication(st.medicamento) ? "canetta-tirzepatide-doses" : undefined} value={st.dose === "Dose atual" ? "" : st.dose} onChange={(e) => set({ dose: e.target.value })} placeholder={isTirzepatideMedication(st.medicamento) ? "Ex: 2.5 mg" : "Ex: 0,5 mg"} style={inputSt} />
                <datalist id="canetta-tirzepatide-doses">{TIRZEPATIDE_DOSES.map((item) => <option key={item} value={item} />)}</datalist>
              </div>
              <div>
                <label htmlFor="setup-frequency" style={fieldLabel}>FREQUÊNCIA</label>
                <select id="setup-frequency" className="j-in" value={st.freqLabel} onChange={(e) => set({ freqLabel: e.target.value })} style={inputSt}>
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
            <label htmlFor="setup-reminder-time" className="sr-only">Horário do lembrete</label>
            <input id="setup-reminder-time" className="j-in" type="time" value={st.reminderTime} onChange={(e) => set({ reminderTime: e.target.value, lembretesOn: true })} style={inputSt} />
          </div>

          <div style={{ ...cardWhite, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: "#16302B" }}>Peso inicial</div>
            <label htmlFor="setup-initial-weight" className="sr-only">Peso inicial em quilogramas</label>
            <input id="setup-initial-weight" className="j-in" type="number" inputMode="decimal" min={20} max={400} step="0.1" value={st.draft.pesoKg ?? lastPeso()} onChange={(e) => setDraft({ pesoKg: Number(e.target.value) })} style={{ ...inputSt, fontSize: 20, fontWeight: 900 }} />
            <div style={{ fontSize: 12, color: "#596E68", lineHeight: 1.45 }}>Usado apenas para mostrar sua própria evolução, sem meta ou interpretação médica.</div>
          </div>

          <button type="button" disabled={busyAction === "launch-setup"} onClick={saveLaunchSetup} style={{ ...primaryBtn, opacity: busyAction === "launch-setup" ? 0.65 : 1 }}>{busyAction === "launch-setup" ? "Salvando…" : "Salvar setup e começar"}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="canetta-journey canetta-stage" style={stage}>
      <style>{`@keyframes floaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}} .j-in:focus,.j-in textarea:focus{outline:none;border-color:#0E6B5C}@media (prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}`}</style>

      {st.toastMsg && (
        <div className="canetta-toast" role="status" aria-live="polite" style={{ position: "absolute", top: 8, left: 20, right: 20, zIndex: 40, background: "#16302B", color: "#fff", padding: "12px 16px", borderRadius: 12, fontSize: 13, fontWeight: 700, textAlign: "center" }}>{st.toastMsg}</div>
      )}

      {/* ================= REGISTER FLOWS ================= */}
      {st.registerFlow ? (
        <div ref={registerFlowRef} tabIndex={-1} aria-label="Formulário de registro" style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", outline: "none" }}>

          {/* APLICAÇÃO — FORM */}
          {st.registerFlow === "aplicacao" && st.registerStep === "form" && (
            <div className="registration-v2" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 24px 24px" }}>
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
                      <button className="map-point" key={r.label} type="button" aria-label={r.label} aria-pressed={st.draft.local === r.label} onClick={() => setDraft({ local: r.label })} style={{ position: "absolute", left: r.left, top: r.top, width: 26, height: 26, minHeight: 26, padding: 0, borderRadius: "50%", background: st.draft.local === r.label ? "#0E6B5C" : "#8DA9A2", border: "2px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,0.2)", cursor: "pointer" }} />
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
            <div className="registration-v2" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 24px 24px" }}>
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
              <div style={{ ...fieldLabel, marginBottom: 8 }}>DESCONFORTO GERAL</div>
              <div style={{ marginBottom: 18 }}><IntensityLevel /></div>
              <textarea className="j-in" value={st.draft.nota || ""} onChange={(e) => setDraft({ nota: e.target.value })} placeholder="Escreva uma nota (opcional)" style={{ ...textareaSt, minHeight: 70 }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: "#596E68", marginTop: 18 }}>O Canetta organiza o que você registra e não interpreta resultados.</div>
              <div style={{ flex: 1 }} />
              <button type="button" disabled={busyAction === "checkin"} onClick={saveCheckin} style={{ ...primaryBtn, opacity: busyAction === "checkin" ? 0.65 : 1 }}>{busyAction === "checkin" ? "Salvando…" : "Salvar"}</button>
            </div>
          )}

          {/* SINTOMA */}
          {st.registerFlow === "sintoma" && (
            <div className="registration-v2" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 24px 24px", overflowY: "auto" }}>
              {flowHeader("Registrar sintoma", cancelFlow)}
              <div style={{ ...fieldLabel, marginBottom: 8 }}>QUAL SINTOMA?</div>
              <div style={{ marginBottom: 20 }}><ChipRow options={["Náusea", "Vômitos", "Diarreia", "Constipação", "Refluxo", "Dor abdominal", "Fadiga", "Dor de cabeça", "Outro"]} current={st.draft.tipo} onPick={(v) => setDraft({ tipo: v })} radius={20} wrap /></div>
              <div style={{ ...fieldLabel, marginBottom: 8 }}>INTENSIDADE</div>
              <div style={{ marginBottom: 20 }}><IntensityLevel /></div>
              <div style={{ ...fieldLabel, marginBottom: 8 }}>QUANTO DUROU?</div>
              <div style={{ marginBottom: 20 }}><ChipRow options={["<1h", "1–3h", ">3h", "O dia todo"]} current={st.draft.duracao} onPick={(v) => setDraft({ duracao: v })} equal /></div>
              <div style={{ ...fieldLabel, marginBottom: 8 }}>OBSERVAÇÃO <span style={{ fontWeight: 600, color: "#859891" }}>(opcional)</span></div>
              <textarea className="j-in" value={st.draft.nota || ""} onChange={(e) => setDraft({ nota: e.target.value })} placeholder="Ex.: começou depois da refeição" style={{ ...textareaSt, minHeight: 60, fontSize: 13.5, marginBottom: 14 }} />
              <div style={{ fontSize: 11.5, color: "#859891", lineHeight: 1.5, marginBottom: 4 }}>O Canetta organiza o que você registra e não interpreta sintomas. Procure seu médico para orientações.</div>
              <button type="button" disabled={busyAction === "sintoma"} onClick={saveSintoma} style={{ ...primaryBtn, marginTop: 12, opacity: busyAction === "sintoma" ? 0.65 : 1 }}>{busyAction === "sintoma" ? "Salvando…" : "Salvar"}</button>
            </div>
          )}

          {/* PESO */}
          {st.registerFlow === "peso" && (
            <div className="registration-v2" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 24px 24px" }}>
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
                    <button type="button" aria-label="Remover um copo de água" onClick={() => setDraft({ agua: Math.max(0, (st.draft.agua ?? 0) - 1) })} style={{ width: 44, height: 44, borderRadius: "50%", background: "#fff", border: "1.5px solid #E2E7E2", fontSize: 18, fontWeight: 700, color: "#0E6B5C", cursor: "pointer" }}>−</button>
                    <div aria-live="polite" style={{ fontSize: 16, fontWeight: 700, color: "#16302B", fontVariantNumeric: "tabular-nums" }}>{st.draft.agua ?? 0} copos</div>
                    <button type="button" aria-label="Adicionar um copo de água" onClick={() => setDraft({ agua: (st.draft.agua ?? 0) + 1 })} style={{ width: 44, height: 44, borderRadius: "50%", background: "#fff", border: "1.5px solid #E2E7E2", fontSize: 18, fontWeight: 700, color: "#0E6B5C", cursor: "pointer" }}>+</button>
                  </div>
                </div>
                <div><div style={fieldLabel}>MOVIMENTO</div><ChipRow options={["Nenhum", "Leve", "Moderado", "Intenso"]} current={st.draft.movimento} onPick={(v) => setDraft({ movimento: v })} equal /></div>
                <div><div style={fieldLabel}>SONO</div><ChipRow options={["Ruim", "Regular", "Bom", "Ótimo"]} current={st.draft.sono} onPick={(v) => setDraft({ sono: v })} equal /></div>
              </div>
              <button type="button" disabled={busyAction === "rotina"} onClick={saveRotina} style={{ ...primaryBtn, marginTop: 18, opacity: busyAction === "rotina" ? 0.65 : 1 }}>{busyAction === "rotina" ? "Salvando…" : "Salvar check-in"}</button>
            </div>
          )}

          {/* MEDIDAS */}
          {st.registerFlow === "medidas" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 24px 24px", overflowY: "auto" }}>
              {flowHeader("Registrar medidas", cancelFlow)}
              <div style={{ ...cardWhite, padding: "14px 16px", fontSize: 12.5, color: "#4B5F59", lineHeight: 1.45, marginBottom: 16 }}>Registre medidas feitas por você. O Canetta mostra apenas os dados informados, sem meta ou interpretação.</div>
              <div className="responsive-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><div style={fieldLabel}>CINTURA (CM)</div><input className="j-in" type="number" min={20} max={300} step="0.1" value={st.draft.cinturaCm ?? ""} onChange={(e) => setDraft({ cinturaCm: Number(e.target.value) })} style={inputSt} placeholder="Ex: 96" /></div>
                <div><div style={fieldLabel}>QUADRIL (CM)</div><input className="j-in" type="number" min={20} max={300} step="0.1" value={st.draft.quadrilCm ?? ""} onChange={(e) => setDraft({ quadrilCm: Number(e.target.value) })} style={inputSt} placeholder="Ex: 108" /></div>
              </div>
              <textarea className="j-in" value={st.draft.nota || ""} onChange={(e) => setDraft({ nota: e.target.value })} placeholder="Nota opcional" style={{ ...textareaSt, marginTop: 14 }} />
              <div style={{ flex: 1 }} />
              <button type="button" disabled={busyAction === "medidas"} onClick={saveMedidas} style={{ ...primaryBtn, opacity: busyAction === "medidas" ? 0.65 : 1 }}>{busyAction === "medidas" ? "Salvando…" : "Salvar medidas"}</button>
            </div>
          )}

          {/* NUTRIÇÃO */}
          {st.registerFlow === "nutricao" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 24px 24px", overflowY: "auto" }}>
              {flowHeader("Check-in nutricional", cancelFlow)}
              <div style={{ display: "flex", gap: 5, marginBottom: 18 }} aria-label={`Etapa ${st.nutritionStep + 1} de 6`}>{Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 9, background: i <= st.nutritionStep ? "#0E6B5C" : "#E2E7E2" }} />)}</div>
              <div style={{ ...cardWhite, padding: "14px 16px", fontSize: 12.5, color: "#4B5F59", lineHeight: 1.45, marginBottom: 22 }}><strong style={{ color: "#16302B" }}>{st.nutritionStep === 0 ? "Vamos observar o que importa hoje." : "Cada resposta ajuda a acompanhar sua tolerância e energia."}</strong><br />O Canetta organiza sinais para você conversar com seu profissional. Ele não conclui sozinho se sua ingestão é suficiente nem prescreve calorias.</div>
              {st.nutritionStep === 0 && <div><div style={{ fontSize: 20, fontWeight: 900, color: "#16302B", lineHeight: 1.15, marginBottom: 16 }}>Qual é o foco deste check-in?</div><ChipRow options={["Tolerância e apetite", "Hidratação", "Proteína", "Só refeição"]} current={st.draft.contexto} onPick={(v) => setDraft({ contexto: v })} wrap /><div style={{ marginTop: 20 }}><div style={fieldLabel}>META DE REGISTRO (OPCIONAL)</div><ChipRow options={["1 registro por dia", "3 registros por semana", "Sem meta fixa"]} current={nutritionGoalLabel} onPick={(v) => set({ nutritionGoal: v === "1 registro por dia" ? "diaria" : v === "3 registros por semana" ? "tres_por_semana" : "livre" })} wrap /></div></div>}
              {st.nutritionStep === 1 && <div><div style={{ fontSize: 20, fontWeight: 900, color: "#16302B", lineHeight: 1.15, marginBottom: 16 }}>Quantas refeições você conseguiu tolerar hoje?</div><ChipRow options={["0", "1", "2", "3 ou mais", "Não sei"]} current={st.draft.refeicoesToleradas} onPick={(v) => setDraft({ refeicoesToleradas: v })} wrap /></div>}
              {st.nutritionStep === 2 && <div><div style={{ fontSize: 20, fontWeight: 900, color: "#16302B", lineHeight: 1.15, marginBottom: 16 }}>Como sua ingestão ficou comparada ao seu habitual?</div><ChipRow options={["Parecida", "Menor", "Muito menor", "Não sei"]} current={st.draft.ingestaoHabitual} onPick={(v) => setDraft({ ingestaoHabitual: v })} wrap /></div>}
              {st.nutritionStep === 3 && <div><div style={{ fontSize: 20, fontWeight: 900, color: "#16302B", lineHeight: 1.15, marginBottom: 16 }}>Você conseguiu manter líquidos?</div><ChipRow options={["Sim", "Parcialmente", "Não"]} current={st.draft.hidratacaoStatus} onPick={(v) => setDraft({ hidratacaoStatus: v })} equal /></div>}
              {st.nutritionStep === 4 && <div><div style={{ fontSize: 20, fontWeight: 900, color: "#16302B", lineHeight: 1.15, marginBottom: 16 }}>Como ficaram proteína e força?</div><div style={fieldLabel}>TEVE UMA FONTE DE PROTEÍNA?</div><ChipRow options={["Sim", "Não", "Não sei"]} current={st.draft.proteina} onPick={(v) => setDraft({ proteina: v })} equal /><div style={{ ...fieldLabel, marginTop: 22 }}>SENTIU FRAQUEZA OU QUEDA DE RENDIMENTO?</div><ChipRow options={["Não", "Um pouco", "Sim", "Não sei"]} current={st.draft.fraqueza} onPick={(v) => setDraft({ fraqueza: v })} wrap /></div>}
              {st.nutritionStep === 5 && <div><div style={{ fontSize: 20, fontWeight: 900, color: "#16302B", lineHeight: 1.15, marginBottom: 16 }}>Você tem uma meta de proteína para acompanhar?</div><div style={{ fontSize: 12.5, color: "#4B5F59", lineHeight: 1.4, marginBottom: 16 }}>Informe apenas uma meta já combinada com seu profissional ou que você já decidiu acompanhar. O Canetta não calcula uma meta clínica para você.</div><ChipRow options={["Tenho uma meta", "Não tenho", "Ainda não sei"]} current={st.draft.metaProteinaFonte} onPick={(v) => setDraft({ metaProteinaFonte: v })} equal />{st.draft.metaProteinaFonte === "Ainda não sei" && <div style={{ ...cardWhite, marginTop: 16, padding: "13px 14px", background: "#F2F8F6", borderColor: "#CFE3DC", color: "#315B50", fontSize: 12.5, lineHeight: 1.45 }}><strong style={{ color: "#16302B" }}>Tudo bem não ter essa informação agora.</strong><br />Você pode continuar sem meta. O Canetta ainda registra se houve uma fonte de proteína e como você se sentiu.<div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}><button type="button" onClick={() => setDraft({ metaProteinaFonte: "Não tenho" })} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #BBD8CE", background: "#fff", color: "#0E6B5C", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>Continuar sem meta</button><button type="button" onClick={() => setDraft({ nota: st.draft.nota ? `${st.draft.nota} · Perguntar na consulta: qual meta de proteína devo acompanhar por dia?` : "Perguntar na consulta: qual meta de proteína devo acompanhar por dia?" })} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #BBD8CE", background: "transparent", color: "#0E6B5C", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>Levar pergunta à consulta</button></div></div>}{st.draft.metaProteinaFonte === "Tenho uma meta" && <div style={{ marginTop: 16 }}><div style={fieldLabel}>META DE PROTEÍNA (GRAMAS/DIA)</div><input className="j-in" type="number" min={0} max={500} value={st.draft.metaProteinaGramas ?? ""} onChange={(e) => setDraft({ metaProteinaGramas: Number(e.target.value) })} style={inputSt} placeholder="Ex: 90" /></div>}<div style={{ ...fieldLabel, marginTop: 18 }}>ÁGUA NO DIA (COPOS)</div><input className="j-in" type="number" min={0} max={50} value={st.draft.agua ?? ""} onChange={(e) => setDraft({ agua: Number(e.target.value) })} style={inputSt} placeholder="Ex: 6" /><div style={{ ...fieldLabel, marginTop: 18 }}>REFEIÇÃO (OPCIONAL)</div><input className="j-in" value={st.draft.refeicao || ""} onChange={(e) => setDraft({ refeicao: e.target.value })} style={inputSt} placeholder="Ex: almoço" /><textarea className="j-in" value={st.draft.nota || ""} onChange={(e) => setDraft({ nota: e.target.value })} placeholder="Nota opcional" style={{ ...textareaSt, marginTop: 14 }} /></div>}
              {(st.draft.hidratacaoStatus === "Não" || st.draft.ingestaoHabitual === "Muito menor" || st.draft.fraqueza === "Sim") && <div style={{ ...cardWhite, marginTop: 18, padding: "12px 14px", background: "#FFF7F4", borderColor: "#F0D7CE", color: "#75443C", fontSize: 12.5, lineHeight: 1.45 }}>Esse registro merece atenção na conversa com seu profissional. Se você não consegue manter líquidos, tem vômitos repetidos ou fraqueza importante, pause o treino e procure orientação.</div>}
              <div style={{ flex: 1, minHeight: 26 }} />
              <div style={{ display: "flex", gap: 10 }}><button type="button" disabled={st.nutritionStep === 0} onClick={() => set({ nutritionStep: Math.max(0, st.nutritionStep - 1) })} style={{ flex: 1, padding: 13, background: "#fff", color: "#0E6B5C", border: "1px solid #D7E1DC", borderRadius: 14, fontSize: 13.5, fontWeight: 800, cursor: st.nutritionStep === 0 ? "default" : "pointer", opacity: st.nutritionStep === 0 ? 0.35 : 1 }}>Voltar</button><button type="button" disabled={busyAction === "nutricao"} onClick={nutritionNext} style={{ flex: 2, ...primaryBtn, opacity: busyAction === "nutricao" ? 0.65 : 1 }}>{busyAction === "nutricao" ? "Salvando…" : st.nutritionStep === 5 ? "Salvar check-in" : "Continuar"}</button></div>
            </div>
          )}

          {/* TREINO */}
          {st.registerFlow === "treino" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 24px 24px", overflowY: "auto" }}>
              {flowHeader("Registrar treino", cancelFlow)}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ ...cardWhite, padding: "14px 16px", fontSize: 12.5, color: "#4B5F59", lineHeight: 1.45 }}>Registre movimento feito. O Canetta não prescreve treino; use isso como histórico para conversar com seu médico, personal ou educador físico.</div>
                <div>
                  <div style={fieldLabel}>EXERCÍCIO</div>
                  <input className="j-in" value={st.draft.exerciseName || ""} onChange={(e) => setDraft({ exerciseName: e.target.value, exerciseExternalId: undefined })} placeholder="Ex: agachamento livre" style={inputSt} />
                </div>
              <div className="responsive-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={fieldLabel}>SÉRIES</div>
                    <input className="j-in" type="number" min={0} max={99} value={st.draft.series ?? ""} onChange={(e) => setDraft({ series: Number(e.target.value) })} placeholder="3" style={inputSt} />
                  </div>
                  <div>
                    <div style={fieldLabel}>REPS / TEMPO</div>
                    <input className="j-in" value={st.draft.repeticoes || ""} onChange={(e) => setDraft({ repeticoes: e.target.value })} placeholder="10–12 ou 20 min" style={inputSt} />
                  </div>
                </div>
                <div>
                  <div style={{ ...fieldLabel, marginBottom: 8 }}>COMO FOI?</div>
                  <ChipRow options={["Fácil", "Normal", "Difícil"]} current={st.draft.dificuldadeSentida} onPick={(v) => setDraft({ dificuldadeSentida: v })} equal />
                </div>
                <div>
                  <div style={fieldLabel}>NOTA (OPCIONAL)</div>
                  <textarea className="j-in" value={st.draft.nota || ""} onChange={(e) => setDraft({ nota: e.target.value })} placeholder="Ex: senti boa energia; sem náusea durante o treino" style={textareaSt} />
                </div>
              </div>
              <button type="button" disabled={busyAction === "treino"} onClick={saveTreino} style={{ ...primaryBtn, marginTop: 18, opacity: busyAction === "treino" ? 0.65 : 1 }}>{busyAction === "treino" ? "Salvando…" : "Salvar treino"}</button>
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
              <div className="today-screen today-prototype-mode" style={{ padding: "20px 22px 0", display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="today-prototype-view">
                  <header className="prototype-home-header">
                    <div>
                      <p className="prototype-date">{fmtDate(new Date())}</p>
                      <h1>Olá, {displayName}</h1>
                    </div>
                    <div className="prototype-avatar" aria-hidden><MascotBadge size={36} /></div>
                  </header>

                  <section className="prototype-dose-card">
                    <div>
                      <span className="prototype-label">Próxima dose</span>
                      <p className="prototype-dose-name">{st.medicamento} · {st.dose}</p>
                      <p className="prototype-dose-meta">{st.aplicacoes.length ? nextReminderLabel : "Registre sua primeira aplicação"}</p>
                    </div>
                    <button type="button" onClick={() => startFlow("aplicacao")}>Registrar</button>
                  </section>

                  <section className="prototype-weight-card">
                    <div className="prototype-weight-head">
                      <div><span className="prototype-label">Peso atual</span><p className="prototype-weight-value">{pesoAtual ?? "—"} <small>kg</small></p></div>
                      <span className="prototype-weight-badge">Acompanhar</span>
                    </div>
                    <button type="button" onClick={() => startFlow("peso")} className="prototype-text-action">Registrar peso <span>›</span></button>
                  </section>

                  <div className="prototype-section-label">Hoje</div>
                  <section className="prototype-timeline">
                    <button type="button" onClick={() => startFlow("sintoma")}><span className="prototype-timeline-dot" /><span><strong>Como você está se sentindo?</strong><small>Registre sintomas ou energia do dia</small></span><time>›</time></button>
                    <button type="button" onClick={() => startFlow("nutricao")}><span className="prototype-timeline-dot prototype-dot-amber" /><span><strong>Check-in nutricional</strong><small>Proteína, hidratação e tolerância</small></span><time>›</time></button>
                    <button type="button" onClick={() => set({ tab: "treino" })}><span className="prototype-timeline-dot prototype-dot-green" /><span><strong>Movimento</strong><small>Veja seu treino de hoje</small></span><time>›</time></button>
                  </section>

                  <button type="button" className="prototype-learning-card" onClick={() => set({ tab: "mais", maisSub: "conteudo" })}>
                    <span className="prototype-learning-icon">✦</span><span><strong>Náusea nas primeiras semanas</strong><small>O que observar e quando conversar com seu profissional.</small></span><span>›</span>
                  </button>
                </div>

                <header className="today-greeting">
                  <div className="today-kicker">HOJE</div>
                  <div className="today-heading-row">
                    <div>
                      <h1>Como você está hoje?</h1>
                      <p>{displayName} · {syncLabel}</p>
                    </div>
                    <div className="today-mascot" aria-hidden><MascotBadge size={44} /></div>
                  </div>
                </header>
                {!st.aplicacoes.length && (
                  <div className="today-welcome" style={{ ...cardWhite, display: "flex", flexDirection: "column", gap: 14, background: "#FFFDF8" }}>
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
                {st.aplicacoes.length > 0 && (
                  <div className="today-next-step" style={{ ...cardWhite, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, background: "#EAF5F2", borderColor: "#CBE3DC" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 850, letterSpacing: "0.04em", color: "#0E6B5C" }}>PRÓXIMO PASSO</div>
                      <div style={{ fontSize: 15, fontWeight: 850, color: "#16302B", marginTop: 3 }}>Como você está hoje?</div>
                      <div style={{ fontSize: 12, color: "#4B5F59", lineHeight: 1.4, marginTop: 3 }}>Um registro curto deixa sua jornada mais completa.</div>
                    </div>
                    <button type="button" onClick={() => startFlow(st.pesos.length ? "rotina" : "peso")} style={{ flexShrink: 0, padding: "10px 13px", background: "#0E6B5C", color: "#fff", border: "none", borderRadius: 12, fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}>{st.pesos.length ? "Fazer check-in" : "Registrar peso"}</button>
                  </div>
                )}
                <div className="today-next-dose" style={{ background: "#0E6B5C", borderRadius: 18, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
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
                <button type="button" onClick={() => setTodayExpanded((value) => !value)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "#fff", border: "1px solid #E2E7E2", borderRadius: 12, color: "#0E6B5C", fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}><span>{todayExpanded ? "Ocultar detalhes" : "Ver detalhes da jornada"}</span><span style={{ fontSize: 16 }}>{todayExpanded ? "⌃" : "⌄"}</span></button>
                <div style={{ ...cardWhite, display: todayExpanded ? "flex" : "none", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "#16302B" }}>Resumo do tratamento</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                    {[
                      ["Peso", pesoAtual ? `${pesoAtual} kg` : "—", "peso"],
                      ["Sintomas", String(st.sintomas.length), "sintoma"],
                      ["Medidas", String(st.medidas.length), "medidas"],
                      ["Água/proteína", String(st.nutricao.length), "nutricao"]
                    ].map(([label, value, key]) => (
                      <button key={key} type="button" onClick={() => startFlow(key as RegisterFlow)} style={{ textAlign: "left", padding: "11px 12px", background: "#F7F9F6", border: "1px solid #E2E7E2", borderRadius: 12, cursor: "pointer" }}><div style={{ fontSize: 11, color: "#596E68", fontWeight: 700 }}>{label}</div><div style={{ fontSize: 16, color: "#16302B", fontWeight: 900, marginTop: 3 }}>{value}</div></button>
                    ))}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#596E68", lineHeight: 1.4 }}>Painel factual: o Canetta organiza registros e não interpreta resultados.</div>
                </div>
                <div style={{ ...cardWhite, display: todayExpanded ? "flex" : "none", flexDirection: "column", gap: 10, background: "#F9FCFA" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                    <div><div style={{ fontSize: 14, fontWeight: 850, color: "#16302B" }}>Check-in nutricional</div><div style={{ fontSize: 12, color: "#596E68", marginTop: 3 }}>Meta de registro escolhida por você: {nutritionGoalLabel}</div></div>
                    <div style={{ fontSize: 15, fontWeight: 850, color: "#0E6B5C", whiteSpace: "nowrap" }}>{nutritionGoalTarget ? `${Math.min(nutritionWeekCount, nutritionGoalTarget)}/${nutritionGoalTarget}` : `${nutritionWeekCount}`}</div>
                  </div>
                  {nutritionGoalTarget > 0 && <div style={{ height: 8, borderRadius: 99, background: "#E2E7E2", overflow: "hidden" }}><div style={{ width: `${Math.min(100, (nutritionWeekCount / nutritionGoalTarget) * 100)}%`, height: "100%", borderRadius: 99, background: "#22B39A" }} /></div>}
                  <div style={{ fontSize: 11.5, color: "#596E68", lineHeight: 1.4 }}>Os registros acompanham tolerância, ingestão percebida, proteína, hidratação e força. Não são uma meta de calorias nem substituem uma orientação individual.</div>
                  <button type="button" onClick={() => startFlow("nutricao")} style={{ alignSelf: "flex-start", padding: "9px 13px", background: "#0E6B5C", color: "#fff", border: "none", borderRadius: 11, fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}>Fazer check-in</button>
                </div>
                <div style={{ ...cardWhite, display: todayExpanded ? "flex" : "none", flexDirection: "column", gap: 12 }}>
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
                <div className="today-quick-actions">
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#596E68", marginBottom: 10 }}>REGISTRO RÁPIDO</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {quickDefs.map((q) => (
                      <button key={q.key} type="button" onClick={() => startFlow(q.key)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, minHeight: 68, padding: "10px 2px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 14, cursor: "pointer" }}>
                        <span style={{ minWidth: 32, height: 32, padding: "0 4px", borderRadius: 10, background: "#EAF5F2", color: "#0E6B5C", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><IconGlyph name={q.icon} size={17} /></span><span style={{ fontSize: 10, fontWeight: 700, color: "#16302B", textAlign: "center" }}>{q.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <button type="button" onClick={() => set({ tab: "consulta", consultaSub: "resumo" })} style={{ display: todayExpanded ? "flex" : "none", width: "100%", alignItems: "center", justifyContent: "space-between", padding: "15px 18px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 16, cursor: "pointer" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#16302B" }}>📄 Preparar consulta</span><span style={{ color: "#8DA9A2", fontSize: 18 }}>›</span>
                </button>
                <div style={{ ...cardWhite, display: todayExpanded ? "flex" : "none", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#596E68" }}>HISTÓRICO RECENTE</div>
                  {recentDoseEvents.length ? recentDoseEvents.map((item, index) => (
                    <div key={`${item.status}-${item.date.toISOString()}-${index}`} style={{ display: "grid", gridTemplateColumns: "72px 1fr auto", gap: 8, alignItems: "center", fontSize: 12.5 }}>
                      <span style={{ color: "#596E68", fontWeight: 700 }}>{item.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "")}</span>
                      <span style={{ color: "#16302B", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.local}</span>
                      <span style={{ color: item.status === "aplicada" ? "#0E6B5C" : "#8A6426", fontWeight: 800 }}>{item.detail}</span>
                    </div>
                  )) : <div style={{ fontSize: 13, color: "#596E68" }}>As últimas aplicações aparecerão aqui.</div>}
                </div>
                <div style={{ ...cardWhite, display: todayExpanded ? "flex" : "none", justifyContent: "space-between", alignItems: "center", gap: 14, background: weeklyPerfect ? "#EAF5F2" : "#fff" }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: "#16302B" }}>{weeklyPerfect ? "Semana perfeita!" : "Meta semanal"}</div>
                    <div style={{ fontSize: 12, color: "#4B5F59", marginTop: 3 }}>{weeklyProgress}/{weeklyPlanned} aplicação(ões) planejadas</div>
                  </div>
                  <div style={{ width: 72, height: 10, borderRadius: 99, background: "#E2E7E2", overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(100, (weeklyProgress / weeklyPlanned) * 100)}%`, height: "100%", borderRadius: 99, background: "#0E6B5C" }} />
                  </div>
                </div>
                <div style={{ display: todayExpanded ? "flex" : "none", alignItems: "center", gap: 12, padding: "14px 18px", background: conquista ? "#EAF5F2" : "#fff", borderRadius: 16 }}>
                  <span style={{ fontSize: 20 }}>🏅</span>
                  <div><div style={{ fontSize: 13.5, fontWeight: 700, color: "#16302B" }}>Conquista do dia</div><div style={{ fontSize: 12, color: "#4B5F59" }}>{conquista ? "Você já registrou algo hoje." : "Faça seu primeiro registro para desbloquear."}</div></div>
                </div>
              </div>
            )}

            {/* JORNADA */}
            {st.tab === "diario" && (
              <div className="journey-screen" style={{ padding: "20px 22px 0", display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#16302B" }}>Jornada</div>
                  <div style={{ fontSize: 12.5, color: "#596E68", lineHeight: 1.45, marginTop: 4 }}>Uma linha do tempo dos registros que você escolheu guardar.</div>
                </div>
                <div style={{ display: "flex", gap: 6, background: "#E9EDE9", padding: 4, borderRadius: 14 }}>
                  {[["registros", "Linha do tempo"], ["espelho", "Visão geral"]].map(([k, label]) => (
                    <button key={k} type="button" aria-pressed={st.diarioSub === k} onClick={() => set({ diarioSub: k })} style={{ flex: 1, textAlign: "center", padding: "9px 2px", border: "none", background: st.diarioSub === k ? "#fff" : "transparent", color: st.diarioSub === k ? "#0E6B5C" : "#596E68", borderRadius: 11, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>{label}</button>
                  ))}
                </div>
                {reassessmentOpen && (
                  <div style={{ ...cardWhite, background: "#F4F6F4", display: "flex", flexDirection: "column", gap: 14 }}>
                    <div><div style={{ fontSize: 15, fontWeight: 800, color: "#16302B" }}>Reavaliação do ciclo</div><div style={{ fontSize: 12.5, color: "#596E68", lineHeight: 1.45, marginTop: 4 }}>Responda com base nas últimas 4–8 semanas. O resultado orienta o próximo ciclo; não substitui avaliação profissional.</div></div>
                    <div><div style={{ ...fieldLabel, marginBottom: 6 }}>FORÇA NOS EXERCÍCIOS-ÂNCORA</div><ChipRow options={["Piorou", "Igual", "Melhorou"]} current={reassessmentDraft.anchorStrength} onPick={(v) => setReassessmentDraft((d) => ({ ...d, anchorStrength: v }))} wrap /></div>
                    <div><div style={{ ...fieldLabel, marginBottom: 6 }}>FUNÇÃO NO DIA A DIA</div><ChipRow options={["Mais difícil", "Igual", "Mais fácil"]} current={reassessmentDraft.functionLevel} onPick={(v) => setReassessmentDraft((d) => ({ ...d, functionLevel: v }))} wrap /></div>
                    <div><div style={{ ...fieldLabel, marginBottom: 6 }}>DOR</div><ChipRow options={["Piorou", "Igual", "Melhorou", "Sem dor"]} current={reassessmentDraft.painLevel} onPick={(v) => setReassessmentDraft((d) => ({ ...d, painLevel: v }))} wrap /></div>
                    <div><div style={{ ...fieldLabel, marginBottom: 6 }}>ADERÊNCIA AO MOVIMENTO</div><ChipRow options={["Baixa", "Parcial", "Boa"]} current={reassessmentDraft.adherence} onPick={(v) => setReassessmentDraft((d) => ({ ...d, adherence: v }))} wrap /></div>
                    <button type="button" onClick={() => setReassessmentDraft((d) => ({ ...d, medicationChange: !d.medicationChange }))} style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", background: reassessmentDraft.medicationChange ? "#EAF5F2" : "#fff", border: `1.5px solid ${reassessmentDraft.medicationChange ? "#0E6B5C" : "#E2E7E2"}`, borderRadius: 12, cursor: "pointer", textAlign: "left" }}><span style={{ fontSize: 16 }}>{reassessmentDraft.medicationChange ? "☑️" : "⬜"}</span><span style={{ fontSize: 12.5, color: "#16302B", fontWeight: 700 }}>Minha dose ou medicamento mudou neste ciclo</span></button>
                    <label style={{ ...fieldLabel, display: "flex", flexDirection: "column", gap: 6 }}>NOTA (OPCIONAL)<input className="j-in" value={reassessmentDraft.note} onChange={(e) => setReassessmentDraft((d) => ({ ...d, note: e.target.value }))} placeholder="Algo importante para o próximo ciclo?" style={{ ...inputSt, padding: "12px 14px", fontSize: 13.5, fontWeight: 500, textTransform: "none" }} /></label>
                    <button type="button" disabled={reassessmentBusy} onClick={saveReassessment} style={{ ...primaryBtn, padding: 13, fontSize: 14, opacity: reassessmentBusy ? 0.6 : 1 }}>{reassessmentBusy ? "Salvando…" : "Salvar reavaliação"}</button>
                    <button type="button" onClick={() => setReassessmentOpen(false)} style={{ background: "transparent", border: "none", color: "#596E68", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancelar</button>
                  </div>
                )}

                {st.diarioSub === "registros" && (events.length ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {events.map((ev) => (
                      <div key={`${ev.kind}-${ev.id || ev.timestamp}`} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "13px 16px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 14 }}>
                        <span style={{ fontSize: 18 }}>{ev.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 700, color: "#16302B" }}>{ev.label}</div><div style={{ fontSize: 11.5, color: "#596E68" }}>{ev.data}</div></div>
                        {ev.kind === "aplicacao" && <button type="button" aria-label={`Editar ${ev.label}`} onClick={() => editJourneyEvent(ev)} style={{ minHeight: 36, padding: "6px 8px", border: "none", background: "transparent", color: "#0E6B5C", fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}>Editar</button>}
                        <button type="button" aria-label={`Excluir ${ev.label}`} onClick={() => deleteJourneyEvent(ev)} style={{ minHeight: 36, padding: "6px 8px", border: "none", background: "transparent", color: "#8A493A", fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}>Excluir</button>
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
                      <div role="img" aria-label={`Aplicações nos últimos 7 dias: ${appliedLastSeven} aplicadas e ${missedLastSeven} não aplicadas`} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, alignItems: "end" }}>
                        {lastSevenDays.map((day) => (
                          <div key={`diario-${day.date.toISOString()}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                            <div style={{ width: "100%", height: day.applied ? 38 : day.missed ? 24 : 12, borderRadius: 7, background: day.applied ? "#0E6B5C" : day.missed ? "#C49A36" : "#E2E7E2" }} />
                            <div style={{ fontSize: 9.5, fontWeight: 700, color: "#596E68", textTransform: "capitalize" }}>{day.label}</div>
                          </div>
                        ))}
                      </div>
                      <div className="sr-only">Resumo do período: {appliedLastSeven} aplicações registradas e {missedLastSeven} doses não aplicadas nos últimos 7 dias.</div>
                    </div>
                    <div style={{ ...cardWhite, display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: "#16302B" }}>Sintomas · check-ins recentes</div>
                      {symptomTrend.length ? (
                        <><div role="img" aria-label={`Check-ins de sintomas recentes: ${symptomTrend.map((item) => `${fmtDate(item.date)} com ${item.value} sinais`).join(", ")}`} style={{ display: "grid", gridTemplateColumns: `repeat(${symptomTrend.length}, 1fr)`, gap: 8, alignItems: "end", minHeight: 58 }}>
                          {symptomTrend.map((item) => (
                            <div key={item.date.toISOString()} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                              <div style={{ width: "100%", height: Math.max(8, item.value * 14), borderRadius: 7, background: item.value ? "#0E6B5C" : "#E2E7E2" }} />
                              <div style={{ fontSize: 9.5, fontWeight: 700, color: "#596E68" }}>{fmtDate(item.date).split(",")[0]}</div>
                            </div>
                          ))}
                        </div><ul className="sr-only">{symptomTrend.map((item) => <li key={`text-${item.date.toISOString()}`}>{fmtDate(item.date)}: {item.value} sinais registrados.</li>)}</ul></>
                      ) : <div style={{ fontSize: 13, color: "#596E68" }}>Registre um check-in diário para ver esta linha factual.</div>}
                    </div>
                    <div style={{ ...cardWhite, display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: "#16302B" }}>Peso</div>
                      {st.pesos.length >= 2 ? (
                        <div role="img" aria-label={`Evolução do peso: ${st.pesos.slice(-8).map((item) => `${item.kg} kg em ${item.data}`).join(", ")}`} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ display: "flex", alignItems: "end", gap: 6, minHeight: 58 }}>
                          {st.pesos.slice(-8).map((item) => {
                            const span = Math.max(1, weightMax - weightMin);
                            const height = 16 + ((item.kg - weightMin) / span) * 40;
                            return <div key={item.raw.toISOString()} title={`${item.kg} kg · ${item.data}`} style={{ flex: 1, height, borderRadius: 7, background: "#0E6B5C" }} />;
                          })}
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11.5, color: "#596E68" }}><span>Inicial: {st.pesos[0].kg} kg</span><span>Atual: {st.pesos[st.pesos.length - 1].kg} kg</span></div>
                        </div>
                      ) : <div style={{ fontSize: 13, color: "#596E68" }}>Com dois registros de peso, o gráfico aparece aqui.</div>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CONSULTA */}
            {st.tab === "consulta" && (
              <div className="consultation-screen" style={{ padding: "20px 22px 0", display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#16302B" }}>Consulta</div>
                  <div style={{ fontSize: 12.5, color: "#596E68", lineHeight: 1.45, marginTop: 4 }}>Organize fatos e perguntas para conversar com seu profissional.</div>
                </div>
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

            {/* NUTRIÇÃO */}
            {st.tab === "nutricao" && (
              <div className="nutrition-screen" style={{ padding: "20px 22px 0", display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 850, color: "#16302B" }}>Nutrição</div>
                  <div style={{ fontSize: 13, color: "#596E68", lineHeight: 1.45, marginTop: 4 }}>Registre o que come e bebe para acompanhar seu dia com mais clareza.</div>
                </div>
                <section style={{ ...cardWhite, background: "#F8FBF8", borderColor: "#CFE0D7" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}><div style={{ fontSize: 15, fontWeight: 850, color: "#16302B" }}>Resumo de hoje</div><span style={{ fontSize: 11.5, color: "#596E68" }}>{mealsToday.length} refeição(ões)</span></div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 7, marginTop: 13 }}>
                    {[["Proteína", mealProteinToday, "g"], ["Carboidrato", mealCarbsToday, "g"], ["Gordura", mealFatToday, "g"], ["Fibra", mealFiberToday, "g"]].map(([label, value, unit]) => <div key={String(label)} style={{ padding: "9px 7px", borderRadius: 11, background: "#fff", border: "1px solid #E2E7E2" }}><div style={{ fontSize: 10, color: "#596E68", lineHeight: 1.2 }}>{label}</div><div style={{ fontSize: 14, fontWeight: 850, color: "#16302B", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{Number(value).toFixed(1)}<small style={{ fontSize: 10, fontWeight: 700, color: "#596E68" }}> {unit}</small></div></div>)}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 12, fontSize: 12, color: "#596E68" }}><span>Água registrada</span><strong style={{ color: "#0E6B5C" }}>{waterToday} copo(s)</strong></div>
                  {!mealsToday.length && <div style={{ marginTop: 11, padding: "9px 10px", borderRadius: 10, background: "#FFF8F2", color: "#75443C", fontSize: 11.5, lineHeight: 1.4 }}>Poucos dados para interpretar seu dia. Comece registrando uma refeição.</div>}
                </section>
                <section style={{ ...cardWhite, background: "#FFFDF8" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}><div style={{ fontSize: 15, fontWeight: 850, color: "#16302B" }}>Padrão da semana</div><span style={{ fontSize: 11.5, color: "#596E68" }}>últimos 7 dias</span></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                    <div style={{ padding: "10px 11px", borderRadius: 11, background: "#fff", border: "1px solid #E2E7E2" }}><div style={{ fontSize: 10, color: "#596E68" }}>Média de calorias</div><div style={{ fontSize: 18, fontWeight: 850, color: "#16302B", marginTop: 4 }}>{nutritionAverageCalories ? nutritionAverageCalories.toFixed(0) : "—"} <small style={{ fontSize: 10, color: "#596E68" }}>kcal/dia</small></div></div>
                    <div style={{ padding: "10px 11px", borderRadius: 11, background: "#fff", border: "1px solid #E2E7E2" }}><div style={{ fontSize: 10, color: "#596E68" }}>Dias registrados</div><div style={{ fontSize: 18, fontWeight: 850, color: "#16302B", marginTop: 4 }}>{nutritionTrackedDays}/7</div></div>
                  </div>
                  <div style={{ marginTop: 12, padding: "10px 11px", borderRadius: 11, background: "#F2F8F6", color: "#315B50", fontSize: 12, lineHeight: 1.45 }}>{nutritionInsight}</div>
                  <div style={{ fontSize: 11, color: "#596E68", lineHeight: 1.4, marginTop: 9 }}>Este resumo descreve seus registros; não é uma meta nem uma prescrição nutricional.</div>
                </section>
                <section style={{ ...cardWhite, background: "#123A2F", color: "#fff", borderColor: "#123A2F" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#BEE0D6", textTransform: "uppercase" }}>Contador de calorias</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}><strong style={{ fontSize: 40, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{mealCaloriesToday || nutritionCaloriesToday}</strong><span style={{ color: "#DFF0EA", fontSize: 14 }}>kcal registradas hoje</span></div>
                  <div style={{ fontSize: 11.5, color: "#BEE0D6", lineHeight: 1.4, marginTop: 10 }}>A meta é opcional e só deve ser usada se já foi combinada com seu profissional.</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 14 }}><input aria-label="Calorias da refeição" inputMode="numeric" type="number" min={1} max={10000} value={calorieInput} onChange={(event) => setCalorieInput(event.target.value)} placeholder="kcal" style={{ ...inputSt, flex: 1, minWidth: 0, background: "#fff", color: "#16302B", border: "none", padding: "11px 12px" }} /><button type="button" onClick={addNutritionCalories} style={{ padding: "10px 13px", border: "none", borderRadius: 12, background: "#E08A5B", color: "#17201C", fontSize: 12.5, fontWeight: 850, cursor: "pointer" }}>Adicionar</button></div>
                </section>
                <section style={{ ...cardWhite }}>
                  <div style={{ fontSize: 15, fontWeight: 850, color: "#16302B" }}>Adicionar refeição manual</div>
                  <div style={{ fontSize: 12, color: "#596E68", lineHeight: 1.4, marginTop: 3 }}>Os valores vêm da informação que você confirmar. O cálculo é feito pelo Canetta.</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                    <input aria-label="Nome da refeição" value={mealName} onChange={(event) => setMealName(event.target.value)} placeholder="Ex.: Almoço" style={{ ...inputSt, gridColumn: "1 / -1", padding: "11px 12px" }} />
                    <input aria-label="Alimento" value={mealFood} onChange={(event) => setMealFood(event.target.value)} placeholder="Alimento" style={{ ...inputSt, padding: "11px 12px" }} />
                    <input aria-label="Gramas" inputMode="numeric" type="number" value={mealGrams} onChange={(event) => setMealGrams(event.target.value)} placeholder="Gramas" style={{ ...inputSt, padding: "11px 12px" }} />
                    <input aria-label="Calorias por 100 gramas" inputMode="numeric" type="number" value={mealKcal} onChange={(event) => setMealKcal(event.target.value)} placeholder="kcal/100 g" style={{ ...inputSt, padding: "11px 12px" }} />
                    <input aria-label="Proteína por 100 gramas" inputMode="numeric" type="number" value={mealProtein} onChange={(event) => setMealProtein(event.target.value)} placeholder="Prot. g/100" style={{ ...inputSt, padding: "11px 12px" }} />
                    <input aria-label="Carboidratos por 100 gramas" inputMode="numeric" type="number" value={mealCarbs} onChange={(event) => setMealCarbs(event.target.value)} placeholder="Carb. g/100" style={{ ...inputSt, padding: "11px 12px" }} />
                    <input aria-label="Gordura por 100 gramas" inputMode="numeric" type="number" value={mealFat} onChange={(event) => setMealFat(event.target.value)} placeholder="Gord. g/100" style={{ ...inputSt, padding: "11px 12px" }} />
                    <input aria-label="Fibra por 100 gramas" inputMode="numeric" type="number" value={mealFiber} onChange={(event) => setMealFiber(event.target.value)} placeholder="Fibra g/100" style={{ ...inputSt, padding: "11px 12px" }} />
                  </div>
                  <button type="button" disabled={busyAction === "meal-save"} onClick={saveManualMeal} style={{ ...primaryBtn, padding: 12, fontSize: 13.5, marginTop: 12, opacity: busyAction === "meal-save" ? 0.6 : 1 }}>{busyAction === "meal-save" ? "Salvando…" : "Salvar refeição"}</button>
                </section>
                <section style={{ ...cardWhite, background: "#F8FBF8", borderColor: "#CFE0D7" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}><div><div style={{ fontSize: 15, fontWeight: 850, color: "#16302B" }}>Meta diária (opcional)</div><div style={{ fontSize: 12, color: "#596E68", marginTop: 3 }}>Use somente uma meta definida com seu profissional.</div></div><div style={{ fontSize: 14, fontWeight: 850, color: "#0E6B5C" }}>{st.nutritionCalorieTarget ? `${st.nutritionCalorieTarget} kcal` : "Sem meta"}</div></div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}><input aria-label="Meta diária de calorias" inputMode="numeric" type="number" min={0} max={10000} value={st.nutritionCalorieTarget || ""} onChange={(event) => set({ nutritionCalorieTarget: Math.max(0, Number(event.target.value) || 0) })} placeholder="Ex.: 1800" style={{ ...inputSt, flex: 1, minWidth: 0, padding: "11px 12px" }} /><button type="button" onClick={() => set({ nutritionCalorieTarget: 0 })} style={{ padding: "10px 12px", border: "1.5px solid #D7E1DC", borderRadius: 12, background: "#fff", color: "#0E6B5C", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>Limpar</button></div>
                </section>
                <section style={{ ...cardWhite, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><div><div style={{ fontSize: 15, fontWeight: 850, color: "#16302B" }}>Registrar por foto</div><div style={{ fontSize: 12, color: "#596E68", lineHeight: 1.4, marginTop: 3 }}>{nutritionPhotoCount} foto(s) registrada(s) hoje</div></div><span style={{ fontSize: 24 }}>📷</span></div>
                  <div style={{ fontSize: 12.5, color: "#596E68", lineHeight: 1.45 }}>Fotografe sua refeição para manter um registro visual. O Canetta não estima calorias automaticamente.</div>
                  <label style={{ width: "100%", padding: "12px 14px", borderRadius: 13, background: "#0E6B5C", color: "#fff", fontSize: 13, fontWeight: 850, textAlign: "center", cursor: "pointer" }}>{busyAction === "nutrition-photo" ? "Registrando…" : "Tirar ou escolher foto"}<input aria-label="Tirar ou escolher foto da refeição" type="file" accept="image/*" capture="environment" disabled={busyAction === "nutrition-photo"} onChange={(event) => { void registerNutritionPhoto(event.target.files?.[0]); event.currentTarget.value = ""; }} style={{ display: "none" }} /></label>
                </section>
                <section style={{ ...cardWhite }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><div style={{ fontSize: 15, fontWeight: 850, color: "#16302B" }}>Refeições recentes</div><span style={{ fontSize: 12, color: "#596E68" }}>{mealEntries.length} registro(s)</span></div>
                  {mealEntries.length ? <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 12 }}>{mealEntries.slice(0, 5).map((meal) => <div key={meal.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, paddingBottom: 9, borderBottom: "1px solid #E9E5DC" }}><div style={{ minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 800, color: "#16302B" }}>{meal.label}</div><div style={{ fontSize: 11.5, color: "#596E68", marginTop: 2 }}>{meal.loggedAt.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} · {meal.proteinG.toFixed(1)} g proteína</div>{meal.label.includes("revisão pendente") && <button type="button" onClick={() => { setPhotoReviewId(meal.id); setMealFood(""); setMealGrams(""); setMealKcal(""); }} style={{ marginTop: 6, border: "none", background: "transparent", padding: 0, color: "#0E6B5C", fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}>Revisar foto</button>}</div><strong style={{ color: "#0E6B5C", fontSize: 13 }}>{meal.calories.toFixed(0)} kcal</strong></div>)}</div> : <div style={{ fontSize: 12.5, color: "#596E68", marginTop: 10 }}>As refeições confirmadas aparecerão aqui.</div>}
                  {mealEntries.length > 0 && <div style={{ fontSize: 11.5, color: "#596E68", marginTop: 10 }}>Totais calculados a partir dos itens e porções informados.</div>}
                </section>
                {photoReviewId && <section style={{ ...cardWhite, background: "#FFF8F2", borderColor: "#E8C7B3" }}><div style={{ fontSize: 15, fontWeight: 850, color: "#16302B" }}>Revisar foto</div><div style={{ fontSize: 12, color: "#596E68", lineHeight: 1.4, marginTop: 4 }}>Confirme pelo menos um alimento e sua porção antes de incluir a estimativa no resumo.</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}><input aria-label="Alimento identificado na foto" value={mealFood} onChange={(event) => setMealFood(event.target.value)} placeholder="Alimento" style={{ ...inputSt, padding: "11px 12px" }} /><input aria-label="Gramas do alimento da foto" type="number" value={mealGrams} onChange={(event) => setMealGrams(event.target.value)} placeholder="Gramas" style={{ ...inputSt, padding: "11px 12px" }} /><input aria-label="Calorias por 100 gramas do alimento da foto" type="number" value={mealKcal} onChange={(event) => setMealKcal(event.target.value)} placeholder="kcal/100 g" style={{ ...inputSt, padding: "11px 12px" }} /><input aria-label="Proteína por 100 gramas do alimento da foto" type="number" value={mealProtein} onChange={(event) => setMealProtein(event.target.value)} placeholder="Prot. g/100" style={{ ...inputSt, padding: "11px 12px" }} /></div><div style={{ display: "flex", gap: 8, marginTop: 12 }}><button type="button" onClick={confirmPhotoReview} disabled={busyAction === "photo-review"} style={{ ...primaryBtn, padding: 12, fontSize: 13, opacity: busyAction === "photo-review" ? 0.6 : 1 }}>{busyAction === "photo-review" ? "Confirmando…" : "Confirmar revisão"}</button><button type="button" onClick={() => setPhotoReviewId(null)} style={{ flex: 1, border: "1.5px solid #D7E1DC", borderRadius: 14, background: "#fff", color: "#0E6B5C", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>Cancelar</button></div></section>}
                <section style={{ ...cardWhite, background: "#FFFDF8" }}><div style={{ fontSize: 12, fontWeight: 800, color: "#596E68", letterSpacing: "0.05em", textTransform: "uppercase" }}>Check-in nutricional</div><div style={{ fontSize: 15, fontWeight: 850, color: "#16302B", marginTop: 5 }}>Tolerância, proteína, hidratação e força</div><div style={{ fontSize: 12.5, color: "#596E68", lineHeight: 1.45, marginTop: 5 }}>Use o check-in em cascata para registrar como sua alimentação está sendo tolerada no tratamento.</div><button type="button" onClick={() => startFlow("nutricao")} style={{ ...primaryBtn, padding: 12, fontSize: 13.5, marginTop: 12 }}>Abrir check-in nutricional</button></section>
              </div>
            )}

            {/* TREINO */}
            {st.tab === "treino" && (
              <div className="training-screen" style={{ padding: "20px 22px 0", display: "flex", flexDirection: "column", gap: 14 }}>
                {st.treinoSub !== "plano" && (
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#16302B" }}>Meu treino</div>
                    <div style={{ fontSize: 12.5, color: "#596E68", lineHeight: 1.45, marginTop: 4 }}>Plano semanal sugerido pela IA, biblioteca e histórico de movimento.</div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 6, background: "#E9EDE9", padding: 4, borderRadius: 14 }}>
                  {[["plano", "Plano IA"], ["biblioteca", "Biblioteca"], ["historico", "Histórico"]].map(([k, label]) => (
                    <button key={k} type="button" aria-pressed={st.treinoSub === k} onClick={() => set({ treinoSub: k })} style={{ flex: 1, textAlign: "center", padding: "9px 2px", border: "none", background: st.treinoSub === k ? "#fff" : "transparent", color: st.treinoSub === k ? "#0E6B5C" : "#596E68", borderRadius: 11, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>{label}</button>
                  ))}
                </div>

                <div style={{ ...cardWhite, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, background: weeklyWorkouts ? "#EAF5F2" : "#fff" }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: "#16302B" }}>Semana de movimento</div>
                    <div style={{ fontSize: 12, color: "#4B5F59", marginTop: 3 }}>{weeklyWorkouts} treino(s) registrado(s)</div>
                  </div>
                  <button type="button" onClick={() => startFlow("treino")} style={{ padding: "10px 12px", background: "#0E6B5C", color: "#fff", border: "none", borderRadius: 12, fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}>Registrar movimento</button>
                </div>

                {st.treinoSub === "plano" && (
                  <>
                    {sessionCheckinOpen && (
                      <div style={{ ...cardWhite, background: "#F4F6F4", display: "flex", flexDirection: "column", gap: 14 }}>
                        <div><div style={{ fontSize: 15, fontWeight: 800, color: "#16302B" }}>Check-in pré-sessão</div><div style={{ fontSize: 12.5, color: "#596E68", lineHeight: 1.45, marginTop: 4 }}>Responda pensando em agora. Se algo parecer fora do seu padrão, pare e procure orientação.</div></div>
                        <div><div style={{ ...fieldLabel, marginBottom: 6 }}>COMO VOCÊ ESTÁ?</div><ChipRow options={["Estou bem", "Mais limitado(a) hoje"]} current={sessionCheckin.feels_well ? "Estou bem" : "Mais limitado(a) hoje"} onPick={(v) => setSessionCheckin((s) => ({ ...s, feels_well: v === "Estou bem" }))} wrap /></div>
                        <div><div style={{ ...fieldLabel, marginBottom: 6 }}>CONSEGUE MANTER LÍQUIDOS?</div><ChipRow options={["Sim", "Não"]} current={sessionCheckin.can_hydrate ? "Sim" : "Não"} onPick={(v) => setSessionCheckin((s) => ({ ...s, can_hydrate: v === "Sim" }))} equal /></div>
                        <div><div style={{ ...fieldLabel, marginBottom: 6 }}>A DOR MUDOU DESDE A ÚLTIMA SESSÃO?</div><ChipRow options={["Não", "Sim"]} current={sessionCheckin.pain_changed ? "Sim" : "Não"} onPick={(v) => setSessionCheckin((s) => ({ ...s, pain_changed: v === "Sim" }))} equal /></div>
                        <div><div style={{ ...fieldLabel, marginBottom: 6 }}>ALGUM SINTOMA NOVO AGORA?</div><ChipRow options={["Nenhum", "Tenho um sintoma novo"]} current={sessionCheckin.new_symptoms.length ? "Tenho um sintoma novo" : "Nenhum"} onPick={(v) => setSessionCheckin((s) => ({ ...s, new_symptoms: v === "Nenhum" ? [] : ["Sintoma novo informado"] }))} wrap /></div>
                        <div><div style={{ ...fieldLabel, marginBottom: 6 }}>VOCÊ SE SENTE SEGURO(A) PARA TREINAR?</div><ChipRow options={["Sim", "Com cuidado", "Não"]} current={sessionCheckin.confidence === "sim" ? "Sim" : sessionCheckin.confidence === "com_cuidado" ? "Com cuidado" : "Não"} onPick={(v) => setSessionCheckin((s) => ({ ...s, confidence: v === "Sim" ? "sim" : v === "Com cuidado" ? "com_cuidado" : "nao" }))} wrap /></div>
                        <button type="button" disabled={sessionCheckinBusy} onClick={saveSessionCheckin} style={{ ...primaryBtn, padding: 13, fontSize: 14, opacity: sessionCheckinBusy ? 0.6 : 1 }}>{sessionCheckinBusy ? "Salvando…" : "Salvar check-in"}</button>
                        <button type="button" onClick={() => { setSessionCheckinOpen(false); setPendingExercise(null); }} style={{ background: "transparent", border: "none", color: "#596E68", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Agora não</button>
                      </div>
                    )}
                    {(!aiTraining || anamneseOpen) ? (
                      <div style={{ ...cardWhite, display: "flex", flexDirection: "column", gap: 14 }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: "#16302B" }}>Anamnese rápida</div>
                          <div style={{ fontSize: 12.5, color: "#596E68", lineHeight: 1.5, marginTop: 4 }}>Vamos por partes. Leva menos de 1 minuto.</div>
                          <div style={{ display: "flex", gap: 5, marginTop: 12 }}>{[0, 1, 2, 3, 4].map((step) => <div key={step} style={{ height: 4, flex: 1, borderRadius: 4, background: step <= anamneseStep ? "#0E6B5C" : "#DDE6E2" }} />)}</div>
                        </div>
                        {anamneseStep === 0 && <div><div style={{ fontSize: 18, fontWeight: 800, color: "#16302B", marginBottom: 10 }}>Qual é sua experiência?</div><ChipRow options={["Nunca treinei", "Já treinei, parei", "Treino regularmente"]} current={anamneseLevel} onPick={(v) => { setAnamneseOpen(true); setAnamneseLevel(v); setAnamneseStep(1); }} wrap /></div>}
                        {anamneseStep === 1 && <div><div style={{ fontSize: 18, fontWeight: 800, color: "#16302B", marginBottom: 10 }}>Onde você vai treinar?</div><ChipRow options={["Casa, sem equipamento", "Casa, com equipamento", "Academia"]} current={anamneseLocation} onPick={(v) => { setAnamneseOpen(true); setAnamneseLocation(v); setAnamneseStep(2); }} wrap /></div>}
                        {anamneseStep === 2 && <div><div style={{ fontSize: 18, fontWeight: 800, color: "#16302B", marginBottom: 10 }}>Quantos dias por semana?</div><ChipRow options={["2", "3", "4"]} current={anamneseDays} onPick={(v) => { setAnamneseOpen(true); setAnamneseDays(v); setAnamneseStep(3); }} equal /></div>}
                        {anamneseStep === 3 && <div><div style={{ fontSize: 18, fontWeight: 800, color: "#16302B", marginBottom: 10 }}>Quanto tempo por sessão?</div><ChipRow options={["30 min", "45 min", "60 min"]} current={anamneseMinutes} onPick={(v) => { setAnamneseOpen(true); setAnamneseMinutes(v); setAnamneseStep(4); }} equal /></div>}
                        {anamneseStep === 4 && <div><div style={{ fontSize: 18, fontWeight: 800, color: "#16302B", marginBottom: 10 }}>Existe dor ou limitação?</div><div style={{ fontSize: 12.5, color: "#596E68", marginBottom: 8 }}>Opcional — você pode pular.</div><input aria-label="Dor, lesão ou limitação" className="j-in" value={anamneseLimitations} onChange={(e) => setAnamneseLimitations(e.target.value)} placeholder="Ex.: dor no joelho direito" style={{ ...inputSt, padding: "13px 15px", fontSize: 14 }} /></div>}
                        <div style={{ display: "flex", gap: 8 }}>
                          {anamneseStep > 0 && <button type="button" onClick={() => setAnamneseStep((step) => step - 1)} style={{ flex: 1, padding: 13, background: "transparent", color: "#596E68", border: "1.5px solid #E2E7E2", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Voltar</button>}
                          {anamneseStep < 4 ? <button type="button" onClick={() => { setAnamneseOpen(true); setAnamneseStep((step) => step + 1); }} style={{ ...primaryBtn, flex: 1, padding: 13, fontSize: 14 }}>Continuar</button> : <button type="button" disabled={anamneseBusy} onClick={saveAnamnese} style={{ ...primaryBtn, flex: 1, padding: 13, fontSize: 14, opacity: anamneseBusy ? 0.6 : 1 }}>{anamneseBusy ? "Salvando…" : "Salvar anamnese"}</button>}
                        </div>
                        {aiTraining && <button type="button" onClick={() => setAnamneseOpen(false)} style={{ background: "transparent", border: "none", color: "#596E68", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 6 }}>Cancelar</button>}
                      </div>
                    ) : (!aiAnamnesis || triageOpen) ? (
                      <div style={{ ...cardWhite, display: "flex", flexDirection: "column", gap: 16 }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: "#16302B" }}>Triagem de segurança</div>
                          <div style={{ fontSize: 12.5, color: "#596E68", lineHeight: 1.5, marginTop: 4 }}>Antes do plano, precisamos saber se é seguro treinar agora. Leva 1 minuto.</div>
                        </div>
                        <div>
                          <div style={{ ...fieldLabel, marginBottom: 6 }}>ALGUM DESTES ESTÁ ACONTECENDO HOJE?</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                            <button type="button" onClick={() => setTriage((t) => ({ ...t, red_flags_today: [] }))} style={{ ...chipStyle(triage.red_flags_today.length === 0, 20), padding: "8px 13px", fontSize: 12 }}>Nenhum</button>
                            {RED_FLAGS.map((flag) => (
                              <button key={flag} type="button" onClick={() => setTriage((t) => ({ ...t, red_flags_today: toggleInList(t.red_flags_today, flag) }))} style={{ ...chipStyle(triage.red_flags_today.includes(flag), 20), padding: "8px 13px", fontSize: 12 }}>{flag}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div style={{ ...fieldLabel, marginBottom: 6 }}>E NOS ÚLTIMOS 30 DIAS, SEM TER SIDO AVALIADO POR MÉDICO?</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                            <button type="button" onClick={() => setTriage((t) => ({ ...t, red_flags_recent: [] }))} style={{ ...chipStyle(triage.red_flags_recent.length === 0, 20), padding: "8px 13px", fontSize: 12 }}>Nenhum</button>
                            {RED_FLAGS.map((flag) => (
                              <button key={flag} type="button" onClick={() => setTriage((t) => ({ ...t, red_flags_recent: toggleInList(t.red_flags_recent, flag) }))} style={{ ...chipStyle(triage.red_flags_recent.includes(flag), 20), padding: "8px 13px", fontSize: 12 }}>{flag}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div style={{ ...fieldLabel, marginBottom: 6 }}>CONDIÇÕES DE SAÚDE DIAGNOSTICADAS</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                            <button type="button" onClick={() => setTriage((t) => ({ ...t, conditions: [], conditions_unsure: false }))} style={{ ...chipStyle(triage.conditions.length === 0 && !triage.conditions_unsure, 20), padding: "8px 13px", fontSize: 12 }}>Nenhuma</button>
                            {CONDITIONS.map((condition) => (
                              <button key={condition} type="button" onClick={() => setTriage((t) => ({ ...t, conditions: toggleInList(t.conditions, condition) }))} style={{ ...chipStyle(triage.conditions.includes(condition), 20), padding: "8px 13px", fontSize: 12 }}>{condition}</button>
                            ))}
                            <button type="button" onClick={() => setTriage((t) => ({ ...t, conditions_unsure: !t.conditions_unsure }))} style={{ ...chipStyle(triage.conditions_unsure, 20), padding: "8px 13px", fontSize: 12 }}>Não sei responder</button>
                          </div>
                        </div>
                        {triage.conditions.some((c) => c.startsWith("Diabetes")) && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 14px", background: "#F4F6F4", borderRadius: 12 }}>
                            <div style={{ ...fieldLabel }}>SOBRE O DIABETES</div>
                            {([["Usa insulina?", "usa_insulina"], ["Usa glibenclamida/gliclazida (ou similar)?", "usa_secretagogo"], ["Seu médico definiu orientação para exercício?", "protocolo_exercicio"], ["Já teve hipoglicemia durante/após exercício?", "hipoglicemia_exercicio"]] as const).map(([label, key]) => (
                              <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                                <div style={{ fontSize: 12.5, color: "#16302B", fontWeight: 600, flex: 1 }}>{label}</div>
                                <div style={{ display: "flex", gap: 6 }}>
                                  <button type="button" onClick={() => setTriage((t) => ({ ...t, diabetes: { ...t.diabetes, [key]: true } }))} style={{ ...chipStyle(triage.diabetes[key], 12), padding: "6px 13px", fontSize: 12 }}>Sim</button>
                                  <button type="button" onClick={() => setTriage((t) => ({ ...t, diabetes: { ...t.diabetes, [key]: false } }))} style={{ ...chipStyle(!triage.diabetes[key], 12), padding: "6px 13px", fontSize: 12 }}>Não</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div>
                          <div style={{ ...fieldLabel, marginBottom: 6 }}>OS SINTOMAS (ENJOO, ETC.) ESTÃO…</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {([["Impedindo você de comer normalmente?", "impede_alimentacao"], ["Impedindo você de beber líquidos?", "impede_hidratacao"], ["Limitando suas atividades do dia a dia?", "impede_atividade"], ["Piorando quando você se movimenta?", "piora_com_movimento"]] as const).map(([label, key]) => (
                              <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                                <div style={{ fontSize: 12.5, color: "#16302B", fontWeight: 600, flex: 1 }}>{label}</div>
                                <div style={{ display: "flex", gap: 6 }}>
                                  <button type="button" onClick={() => setTriage((t) => ({ ...t, gi: { ...t.gi, [key]: true } }))} style={{ ...chipStyle(triage.gi[key], 12), padding: "6px 13px", fontSize: 12 }}>Sim</button>
                                  <button type="button" onClick={() => setTriage((t) => ({ ...t, gi: { ...t.gi, [key]: false } }))} style={{ ...chipStyle(!triage.gi[key], 12), padding: "6px 13px", fontSize: 12 }}>Não</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div style={{ ...fieldLabel, marginBottom: 6 }}>QUANTO CONSEGUE CAMINHAR SEM PARAR, HOJE?</div>
                          <ChipRow options={["<10 min", "10-20 min", "20-30 min", "30+ min"]} current={triage.funcao.caminhada_max} onPick={(v) => setTriage((t) => ({ ...t, funcao: { ...t.funcao, caminhada_max: v } }))} equal />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {([["Senta e levanta da cadeira sem apoiar as mãos?", "sentar_levantar_sem_apoio"], ["Sobe um lance de escada sem parar?", "sobe_um_lance_escada"], ["Consegue agachar até a altura de uma cadeira?", "agacha_ate_cadeira"]] as const).map(([label, key]) => (
                            <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                              <div style={{ fontSize: 12.5, color: "#16302B", fontWeight: 600, flex: 1 }}>{label}</div>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button type="button" onClick={() => setTriage((t) => ({ ...t, funcao: { ...t.funcao, [key]: true } }))} style={{ ...chipStyle(triage.funcao[key] === true, 12), padding: "6px 13px", fontSize: 12 }}>Sim</button>
                                <button type="button" onClick={() => setTriage((t) => ({ ...t, funcao: { ...t.funcao, [key]: false } }))} style={{ ...chipStyle(triage.funcao[key] === false, 12), padding: "6px 13px", fontSize: 12 }}>Não</button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div>
                          <div style={{ ...fieldLabel, marginBottom: 6 }}>DOR QUE LIMITA MOVIMENTO (REGIÕES)</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                            <button type="button" onClick={() => setTriage((t) => ({ ...t, dores: [] }))} style={{ ...chipStyle(triage.dores.length === 0, 20), padding: "8px 13px", fontSize: 12 }}>Nenhuma</button>
                            {PAIN_REGIONS.map((region) => (
                              <button key={region} type="button" onClick={() => setTriage((t) => ({ ...t, dores: toggleInList(t.dores, region) }))} style={{ ...chipStyle(triage.dores.includes(region), 20), padding: "8px 13px", fontSize: 12 }}>{region}</button>
                            ))}
                          </div>
                          {triage.dores.length > 0 && (
                            <input className="j-in" value={triage.dores_detalhe} onChange={(e) => setTriage((t) => ({ ...t, dores_detalhe: e.target.value }))} placeholder="Detalhe (ex.: piora ao agachar, diagnóstico…)" style={{ ...inputSt, padding: "12px 14px", fontSize: 13.5, marginTop: 8 }} />
                          )}
                        </div>
                        <button type="button" onClick={() => setTriage((t) => ({ ...t, consent: !t.consent }))} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", background: triage.consent ? "#EAF5F2" : "#F4F6F4", border: `1.5px solid ${triage.consent ? "#0E6B5C" : "#E2E7E2"}`, borderRadius: 12, cursor: "pointer", textAlign: "left" }}>
                          <div style={{ fontSize: 16, lineHeight: 1 }}>{triage.consent ? "☑️" : "⬜"}</div>
                          <div style={{ fontSize: 12, color: "#16302B", lineHeight: 1.5 }}>Entendo que esta é uma orientação educacional de movimento: não substitui médico, nutricionista ou fisioterapeuta; o sistema não altera medicamentos; devo comunicar sintomas relevantes; informações incorretas tornam a orientação insegura; o plano pode ser bloqueado por segurança.</div>
                        </button>
                        <button type="button" disabled={triageBusy} onClick={saveTriage} style={{ ...primaryBtn, padding: 14, fontSize: 14.5, opacity: triageBusy ? 0.6 : 1, cursor: triageBusy ? "wait" : "pointer" }}>{triageBusy ? "Salvando…" : "Salvar triagem"}</button>
                        {aiAnamnesis && <button type="button" onClick={() => setTriageOpen(false)} style={{ background: "transparent", border: "none", color: "#596E68", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 6 }}>Cancelar</button>}
                      </div>
                    ) : aiGate?.status === "vermelho" ? (
                      <div style={{ ...cardWhite, background: "#FBEDEA", border: "1.5px solid #E3B7AC", display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#8A3B2A" }}>⛔ Treino pausado por segurança</div>
                        <div style={{ fontSize: 13, color: "#6E4437", lineHeight: 1.55 }}>Você relatou:</div>
                        {aiGate.motivos.map((motivo) => (<div key={motivo} style={{ fontSize: 12.5, color: "#6E4437" }}>• {motivo}</div>))}
                        <div style={{ fontSize: 13, color: "#6E4437", lineHeight: 1.55, fontWeight: 700 }}>Não vamos gerar treino agora. Procure avaliação médica antes de retomar. Quando estiver melhor e avaliado(a), atualize a triagem.</div>
                        <button type="button" onClick={openTriage} style={{ ...primaryBtn, background: "#8A3B2A", padding: 13, fontSize: 14 }}>Atualizar triagem</button>
                      </div>
                    ) : aiGate?.status === "liberacao" ? (
                      <div style={{ ...cardWhite, background: "#FDF6E3", border: "1.5px solid #EAD9A8", display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#7A6017" }}>🩺 Precisamos de liberação clínica</div>
                        <div style={{ fontSize: 13, color: "#6B5A28", lineHeight: 1.55 }}>Pelo que você relatou, o plano personalizado fica pausado até uma liberação do seu médico:</div>
                        {aiGate.motivos.map((motivo) => (<div key={motivo} style={{ fontSize: 12.5, color: "#6B5A28" }}>• {motivo}</div>))}
                        <div style={{ fontSize: 12.5, color: "#6B5A28", lineHeight: 1.55 }}>Enquanto isso, caminhada leve conforme sua tolerância costuma ser segura para a maioria das pessoas — confirme com quem acompanha você. Depois da liberação, atualize a triagem.</div>
                        <button type="button" onClick={openTriage} style={{ ...primaryBtn, padding: 13, fontSize: 14 }}>Atualizar triagem</button>
                      </div>
                    ) : aiPlan ? (
                      aiGate && aiPlan.workouts.length < 0 ? (
                        <>
                        {planNeedsRegeneration && (
                          <div style={{ ...cardWhite, background: "#FDF6E3", border: "1.5px solid #EAD9A8", display: "flex", flexDirection: "column", gap: 9 }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: "#7A6017" }}>Este plano está incompleto</div>
                            <div style={{ fontSize: 12.5, color: "#6B5A28", lineHeight: 1.45 }}>Sua anamnese indica {expectedWorkoutCount} dias por semana, mas este plano tem {aiPlan.workouts?.length ?? 0}. Gere novamente para criar a semana completa.</div>
                            <button type="button" disabled={aiPlanBusy} onClick={generateAiPlan} style={{ ...primaryBtn, padding: 12, fontSize: 13.5, opacity: aiPlanBusy ? 0.6 : 1 }}>{aiPlanBusy ? "Gerando…" : `Gerar ${expectedWorkoutCount} sessões`}</button>
                          </div>
                        )}
                        {aiGate?.status === "amarelo" && (
                          <div style={{ ...cardWhite, background: "#FDF6E3", border: "1.5px solid #EAD9A8", fontSize: 12.5, color: "#7A6017", lineHeight: 1.5 }}>⚠️ Semana em modo leve: {aiGate.motivos.join("; ")}. O plano foi ajustado para baixa demanda.</div>
                        )}
                        <div style={{ ...cardWhite, display: "flex", flexDirection: "column", gap: 8, background: "#EAF5F2", border: "1.5px solid #CBE3DC" }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: "#0E6B5C", letterSpacing: 0.4 }}>SEMANA DE {new Date(`${aiPlan.week_start}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: "#16302B" }}>{aiPlan.focus}</div>
                          {aiPlan.rationale && <div style={{ fontSize: 12.5, color: "#4B5F59", lineHeight: 1.5 }}>{aiPlan.rationale}</div>}
                        </div>
                        {aiPlan.warning && (
                          <div style={{ ...cardWhite, background: "#FDF6E3", border: "1.5px solid #EAD9A8", fontSize: 12.5, color: "#7A6017", lineHeight: 1.5 }}>⚠️ {aiPlan.warning}</div>
                        )}
                        {(aiPlan.workouts ?? []).map((day) => (
                          <div key={day.day} style={{ ...cardWhite, display: "flex", flexDirection: "column", gap: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                              <div style={{ fontSize: 14.5, fontWeight: 800, color: "#16302B" }}>{day.day}</div>
                              <div style={{ fontSize: 11.5, fontWeight: 700, color: "#0E6B5C" }}>{day.focus}</div>
                            </div>
                            {(day.exercises ?? []).map((exercise) => (
                              <div key={`${day.day}-${exercise.name}`} style={{ background: "#F7FAF8", border: "1.5px solid #DCEBE5", borderRadius: 14, padding: 10, display: "flex", gap: 10 }}>
                                {(exercise.gif_url || exercise.image_url) && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <button type="button" aria-label={`Abrir demonstração de ${exercise.name}`} onClick={() => setMediaPreview({ url: exercise.gif_url || exercise.image_url || "", name: exercise.name })} style={{ padding: 0, border: "none", background: "transparent", cursor: "zoom-in", flexShrink: 0 }}><img src={exercise.gif_url || exercise.image_url || ""} alt={`Ver demonstração de ${exercise.name}`} loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 12, border: "1.5px solid #E2E7E2", background: "#fff", display: "block" }} /></button>
                                )}
                                <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                                    <div style={{ fontSize: 13.5, fontWeight: 800, color: "#16302B", minWidth: 0, overflowWrap: "anywhere" }}>{exercise.name_pt || exercise.name}</div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: "#596E68", whiteSpace: "nowrap" }}>{exercise.sets} × {exercise.reps}</div>
                                  </div>
                                  <div style={{ fontSize: 11.5, color: "#596E68", lineHeight: 1.45 }}>{exercise.why}</div>
                                    <button type="button" onClick={() => beginPlannedWorkout({ name: exercise.name, sets: exercise.sets, reps: exercise.reps })} style={{ alignSelf: "flex-start", marginTop: 3, padding: "6px 10px", background: "transparent", color: "#0E6B5C", border: "1.5px solid #CBE3DC", borderRadius: 10, fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}>Registrar este</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                        {aiPlan.nutrition_advice && (
                          <div style={{ ...cardWhite, fontSize: 12.5, color: "#4B5F59", lineHeight: 1.5 }}>🥗 {aiPlan.nutrition_advice}</div>
                        )}
                        <div style={{ ...cardWhite, background: "#F4F6F4", display: "flex", flexDirection: "column", gap: 10 }}>
                          <div style={{ fontSize: 14.5, fontWeight: 800, color: "#16302B" }}>Reavaliação periódica</div>
                          <div style={{ fontSize: 12, color: "#596E68", lineHeight: 1.45 }}>{reassessment ? `Última resposta em ${new Date(reassessment.created_at).toLocaleDateString("pt-BR")}. Ela entra na próxima geração do plano.` : "Depois de algumas semanas, registre força, função, dor e aderência para ajustar o próximo ciclo."}</div>
                          <button type="button" onClick={() => setReassessmentOpen(true)} style={{ ...primaryBtn, padding: 12, fontSize: 13.5 }}>{reassessment ? "Atualizar reavaliação" : "Fazer reavaliação"}</button>
                        </div>
                        <button type="button" disabled={aiPlanBusy} onClick={generateAiPlan} style={{ width: "100%", padding: 13, background: "transparent", color: "#0E6B5C", border: "1.5px solid #E2E7E2", borderRadius: 14, fontSize: 13.5, fontWeight: 700, cursor: aiPlanBusy ? "wait" : "pointer", opacity: aiPlanBusy ? 0.6 : 1 }}>{aiPlanBusy ? "Gerando novo plano…" : "Gerar plano atualizado"}</button>
                        <button type="button" onClick={openAnamnese} style={{ background: "transparent", border: "none", color: "#596E68", fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: 4 }}>✏️ Editar anamnese (nível, equipamento, dias)</button>
                        <button type="button" onClick={openTriage} style={{ background: "transparent", border: "none", color: "#596E68", fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: 4 }}>🩺 Atualizar triagem de segurança</button>
                        </>
                      ) : (
                        <WorkoutRedesign
                          plan={aiPlan}
                          training={aiTraining}
                          onGenerate={generateAiPlan}
                          generating={aiPlanBusy}
                          onOpenAnamnese={openAnamnese}
                          onOpenTriage={openTriage}
                          onOpenReassessment={() => setReassessmentOpen(true)}
                          onOpenMedia={setMediaPreview}
                          onRecordExercise={recordPlannedExercise}
                          checkin={sessionCheckinResult && sessionCheckinDate === new Date().toISOString().slice(0, 10) ? sessionCheckinResult : null}
                          onOpenCheckin={() => { setPendingExercise(null); setSessionCheckinOpen(true); }}
                          isYellow={aiGate?.status === "amarelo"}
                        />
                      )
                    ) : (
                      <div style={{ textAlign: "center", padding: "32px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                        <MascotBadge size={52} />
                        <div style={{ fontSize: 14.5, fontWeight: 800, color: "#16302B" }}>Seu plano de movimento da semana</div>
                        <div style={{ fontSize: 12.5, color: "#596E68", lineHeight: 1.5, maxWidth: 300 }}>A IA analisa seus registros (peso, sintomas, energia, histórico de treino) e monta uma sugestão semanal de movimento para você.</div>
                        <button type="button" disabled={aiPlanBusy} onClick={generateAiPlan} style={{ ...primaryBtn, maxWidth: 260, padding: 14, fontSize: 14, opacity: aiPlanBusy ? 0.6 : 1, cursor: aiPlanBusy ? "wait" : "pointer" }}>{aiPlanBusy ? "Analisando seus registros…" : "Gerar meu plano da semana"}</button>
                      </div>
                    )}
                    {aiPlanError && <div id="ai-plan-error" role="alert" aria-live="assertive" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, fontSize: 12.5, color: "#A3552B", textAlign: "center" }}><span>{aiPlanError}</span>{!aiPlanBusy && <button type="button" onClick={generateAiPlan} style={{ minHeight: 44, padding: "8px 14px", borderRadius: 12, border: "1.5px solid #D8B4A8", background: "#FFF7F4", color: "#8A493A", fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}>Tentar novamente</button>}</div>}
                  </>
                )}

                {st.treinoSub === "biblioteca" && (
                  <>
                    <input aria-label="Buscar exercício, músculo ou equipamento" className="j-in" value={st.exerciseSearch} onChange={(e) => set({ exerciseSearch: e.target.value })} placeholder="Buscar por exercício, músculo ou equipamento" style={{ ...inputSt, padding: "13px 15px", fontSize: 14 }} />
                    <div style={{ ...cardWhite, padding: "14px 16px", fontSize: 12.5, color: "#4B5F59", lineHeight: 1.45 }}>
                      {st.exercises.length ? "Catálogo de exercícios disponível para consulta." : "Catálogo básico disponível enquanto a biblioteca completa é carregada."}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {filteredExercises.map((exercise) => (
                        <div key={exercise.external_id} role="button" tabIndex={0} onClick={() => set({ registerFlow: "treino", sheetOpen: false, draft: { exerciseExternalId: exercise.external_id, exerciseName: exercise.name, bodyPart: exercise.body_part || undefined, equipment: exercise.equipment || undefined } })} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); set({ registerFlow: "treino", sheetOpen: false, draft: { exerciseExternalId: exercise.external_id, exerciseName: exercise.name, bodyPart: exercise.body_part || undefined, equipment: exercise.equipment || undefined } }); } }} style={{ width: "100%", padding: "12px 14px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 14, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" }}>
                          {(exercise.gif_url || exercise.image_url) && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <button type="button" aria-label={`Abrir demonstração de ${exercise.name}`} onClick={(event) => { event.stopPropagation(); setMediaPreview({ url: exercise.gif_url || exercise.image_url || "", name: exercise.name }); }} style={{ padding: 0, border: "none", background: "transparent", cursor: "zoom-in", flexShrink: 0 }}><img src={exercise.gif_url || exercise.image_url || ""} alt={`Ver demonstração de ${exercise.name}`} loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 10, border: "1px solid #E2E7E2", background: "#F4F6F4", display: "block" }} /></button>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: "#16302B" }}>{exercise.name_pt || exercise.name}</div>
                            <div style={{ fontSize: 11.5, color: "#596E68", marginTop: 3 }}>{[exerciseLabel(exercise.body_part), exerciseLabel(exercise.equipment), exerciseLabel(exercise.target_muscle), exercise.difficulty_level].filter(Boolean).join(" · ") || "exercício"}</div>
                          </div>
                          <span style={{ color: "#8DA9A2", fontSize: 18 }}>›</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {st.treinoSub === "historico" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {feedbackOpen && (
                      <div style={{ ...cardWhite, background: "#EAF5F2", display: "flex", flexDirection: "column", gap: 13 }}>
                        <div><div style={{ fontSize: 15, fontWeight: 800, color: "#16302B" }}>Como foi a sessão?</div><div style={{ fontSize: 12.5, color: "#596E68", lineHeight: 1.45, marginTop: 4 }}>Esse retorno ajuda a deixar o próximo plano mais ajustado. Não é uma avaliação médica.</div></div>
                        <div><div style={{ ...fieldLabel, marginBottom: 6 }}>VOCÊ CONCLUIU?</div><ChipRow options={["Sim", "Não"]} current={feedbackCompleted ? "Sim" : "Não"} onPick={(v) => setFeedbackCompleted(v === "Sim")} equal /></div>
                        <div><div style={{ ...fieldLabel, marginBottom: 6 }}>ESFORÇO SENTIDO (1–10)</div><ChipRow options={["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]} current={feedbackRpe} onPick={setFeedbackRpe} wrap /></div>
                        <div><div style={{ ...fieldLabel, marginBottom: 6 }}>SINTOMAS DURANTE</div><ChipRow options={["Nenhum", "Tontura", "Náusea", "Dor", "Falta de ar"]} current={feedbackDuring.length ? feedbackDuring[0] : "Nenhum"} onPick={(v) => setFeedbackDuring(v === "Nenhum" ? [] : [v])} wrap /></div>
                        <div><div style={{ ...fieldLabel, marginBottom: 6 }}>SINTOMAS DEPOIS</div><ChipRow options={["Nenhum", "Náusea", "Dor", "Cansaço fora do esperado"]} current={feedbackAfter.length ? feedbackAfter[0] : "Nenhum"} onPick={(v) => setFeedbackAfter(v === "Nenhum" ? [] : [v])} wrap /></div>
                        <label style={{ ...fieldLabel, display: "flex", flexDirection: "column", gap: 6 }}>OBSERVAÇÃO<input aria-label="Observação sobre como seu corpo respondeu" className="j-in" value={feedbackNote} onChange={(e) => setFeedbackNote(e.target.value)} placeholder="Como seu corpo respondeu?" style={{ ...inputSt, padding: "12px 14px", fontSize: 13.5, fontWeight: 500, textTransform: "none" }} /></label>
                        <button type="button" disabled={feedbackBusy} onClick={saveFeedback} style={{ ...primaryBtn, padding: 13, fontSize: 14, opacity: feedbackBusy ? 0.6 : 1 }}>{feedbackBusy ? "Salvando…" : "Salvar feedback"}</button>
                        <button type="button" onClick={() => setFeedbackOpen(false)} style={{ background: "transparent", border: "none", color: "#596E68", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Responder depois</button>
                      </div>
                    )}
                    {st.treinos.length ? st.treinos.slice(-12).reverse().map((item) => (
                      <div key={`${item.id || item.exerciseName}-${item.data.toISOString()}`} style={{ padding: "14px 16px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#16302B" }}>{item.exerciseName}</div>
                          <div style={{ fontSize: 11.5, color: "#596E68", fontWeight: 700 }}>{fmtDate(item.data)}</div>
                        </div>
                        <div style={{ fontSize: 12, color: "#4B5F59", marginTop: 5 }}>{[item.setsCompleted ? `${item.setsCompleted} séries` : "", item.repsCompleted, item.difficultyFelt].filter(Boolean).join(" · ") || "Treino registrado"}</div>
                        {item.note && <div style={{ fontSize: 12, color: "#596E68", marginTop: 6, lineHeight: 1.45 }}>{item.note}</div>}
                      </div>
                    )) : (
                      <div style={{ textAlign: "center", padding: "36px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                        <MascotBadge size={52} />
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#16302B" }}>Seu histórico de treino começa no primeiro registro.</div>
                        <button type="button" onClick={() => startFlow("treino")} style={{ ...primaryBtn, maxWidth: 240, padding: 13, fontSize: 14 }}>Registrar treino</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* MAIS */}
            {st.tab === "mais" && (
              <div className="more-screen" style={{ padding: "20px 22px 0", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {st.maisSub !== "menu" && <button onClick={() => set({ maisSub: "menu" })} style={{ ...closeX, padding: 0 }}>←</button>}
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#16302B" }}>{st.maisSub === "menu" ? "Mais" : st.maisSub === "conteudo" ? "Conteúdo educativo" : "Perfil & ajustes"}</div>
                </div>

                {st.maisSub === "menu" && (
                  <>
                    <button type="button" onClick={() => set({ maisSub: "conteudo" })} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 16, cursor: "pointer" }}><span style={{ fontSize: 14.5, fontWeight: 700, color: "#16302B" }}>📚 Conteúdo educativo</span><span style={{ color: "#8DA9A2", fontSize: 18 }}>›</span></button>
                    <button type="button" onClick={() => set({ maisSub: "perfil" })} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 16, cursor: "pointer" }}><span style={{ fontSize: 14.5, fontWeight: 700, color: "#16302B" }}>⚙️ Perfil &amp; ajustes</span><span style={{ color: "#8DA9A2", fontSize: 18 }}>›</span></button>
                    {authenticated && <form action={signOutAction} style={{ marginTop: 4 }}><button type="submit" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: "#FFF8F5", color: "#75443C", border: "1.5px solid #F0D8D0", borderRadius: 16, cursor: "pointer", fontSize: 14.5, fontWeight: 700 }}><span>↪ Sair da conta</span><span style={{ color: "#A56D61", fontSize: 18 }}>›</span></button></form>}
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
                      <details key={a.titulo} style={{ padding: "15px 17px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 14 }}>
                        <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#16302B" }}>{a.titulo}</summary>
                        <div style={{ display: "flex", flexDirection: "column", gap: 7, paddingTop: 10 }}>
                          <div style={{ fontSize: 12.5, color: "#4B5F59", lineHeight: 1.5 }}>{a.corpo}</div>
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: "#596E68" }}>{a.fonte}</div>
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: "#0E6B5C" }}>Conteúdo educativo. Procure seu médico para orientações.</div>
                        </div>
                      </details>
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
          <div className="bottom-nav" style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "#fff", borderTop: "1px solid #E2E7E2", display: "flex", alignItems: "center", justifyContent: "space-around", padding: "10px 10px 18px", zIndex: 10 }}>
            {([["hoje", "HO", "Hoje"], ["diario", "JO", "Diário"], ["consulta", "CO", "Relatório"], ["nutricao", "NU", "Nutrição"], ["treino", "TR", "Treino"], ["mais", "…", "Mais"]] as const).map(([key, icon, label]) => (
              <button key={key} type="button" aria-label={`Abrir ${label}`} aria-current={st.tab === key ? "page" : undefined} onClick={() => setTab(key)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", width: 64, padding: "5px 4px", background: st.tab === key ? "#EAF5F2" : "transparent", border: "none", borderRadius: 12 }}>
                <span style={{ minWidth: 28, height: 24, display: "inline-flex", alignItems: "center", justifyContent: "center", color: st.tab === key ? "#0E6B5C" : "#596E68" }}><IconGlyph name={icon} size={18} /></span><span style={{ fontSize: 10.5, fontWeight: 750, color: st.tab === key ? "#0E6B5C" : "#596E68" }}>{label}</span>
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
          <div className="sheet-panel" role="dialog" aria-modal="true" aria-labelledby="new-record-title" style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "#F4F6F3", borderRadius: "24px 24px 0 0", padding: "10px 20px 26px", zIndex: 31, boxShadow: "0 -8px 30px rgba(0,0,0,0.15)" }}>
            <div style={{ width: 40, height: 5, background: "#E2E7E2", borderRadius: 3, margin: "6px auto 16px" }} />
            <div id="new-record-title" style={{ fontSize: 15, fontWeight: 800, color: "#16302B", marginBottom: 12 }}>Novo registro</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {quickDefs.map((q) => (
                <button key={q.key} type="button" onClick={() => startFlow(q.key)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "#fff", border: "1.5px solid #E2E7E2", borderRadius: 14, cursor: "pointer" }}>
                  <span style={{ minWidth: 34, height: 34, borderRadius: 10, background: "#EAF5F2", color: "#0E6B5C", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><IconGlyph name={q.icon} size={18} /></span><span style={{ fontSize: 14.5, fontWeight: 700, color: "#16302B" }}>{q.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      {mediaPreview && (
        <div role="dialog" aria-modal="true" aria-label={`Demonstração de ${mediaPreview.name}`} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(8,28,24,0.82)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setMediaPreview(null)}>
          <div style={{ width: "min(94vw, 560px)", maxHeight: "90vh", overflowY: "auto", background: "#fff", borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 12 }} onClick={(event) => event.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><div style={{ fontSize: 15, fontWeight: 800, color: "#16302B" }}>{mediaPreview.name}</div><button type="button" aria-label="Fechar demonstração" onClick={() => setMediaPreview(null)} style={{ border: "none", background: "#F4F6F4", color: "#16302B", width: 34, height: 34, borderRadius: 10, fontSize: 20, cursor: "pointer" }}>×</button></div>
            {/* GIFs stay animated in the enlarged preview. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaPreview.url} alt={`Demonstração de ${mediaPreview.name}`} style={{ width: "100%", maxHeight: "72vh", objectFit: "contain", borderRadius: 12, background: "#F4F6F4" }} />
            <div style={{ fontSize: 12, color: "#4C635D", textAlign: "center" }}>Demonstração do exercício · toque fora para fechar</div>
          </div>
        </div>
      )}
    </div>
  );
}
