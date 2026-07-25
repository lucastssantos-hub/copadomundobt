"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import type { AiWorkoutPlanRow, TrainingProfileRow } from "./actions";

type Workout = AiWorkoutPlanRow["workouts"][number];
type Exercise = Workout["exercises"][number];

type CheckinState = { status: "verde" | "amarelo" | "vermelho"; motivos: string[] } | null;

type Props = {
  plan: AiWorkoutPlanRow;
  training: TrainingProfileRow | null;
  onGenerate: () => void;
  generating: boolean;
  onOpenAnamnese: () => void;
  onOpenTriage: () => void;
  onOpenReassessment: () => void;
  onOpenMedia: (media: { url: string; name: string }) => void;
  onRecordExercise: (exercise: Exercise, completedSets: number) => Promise<void>;
  checkin: CheckinState;
  onOpenCheckin: () => void;
  isYellow?: boolean;
};

const colors = {
  bg: "#F7F8F6",
  surface: "#FFFFFF",
  line: "#DFE6E1",
  ink: "#17201C",
  soft: "#4B6259",
  muted: "#71867D",
  brand: "#1E5F4E",
  pine: "#123A2F",
  pineDeep: "#0D2D24",
  mint: "#E5F0EB",
  mintLine: "#C9DED6",
  onDark: "#F2FAF7",
  onDarkSoft: "rgba(242,250,247,0.66)",
  tickOn: "#8FDCC8",
  tickOff: "rgba(242,250,247,0.22)",
  amberOnDark: "#F4D98B",
  warning: "#7A6017",
  warningBg: "#FDF6E3",
  warningLine: "#EAD9A8"
};

const label: React.CSSProperties = { fontSize: 10.5, fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase" };
const tabular: React.CSSProperties = { fontVariantNumeric: "tabular-nums" };

const REST_SECONDS = 90;

function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    // haptics são opcionais
  }
}

function exerciseLabel(exercise: Exercise) {
  return exercise.name_pt || exercise.name;
}

function dayAbbrev(day: string) {
  return day.replace("Treino ", "").slice(0, 3).toUpperCase();
}

// Régua de dose: progresso em tracinhos, como o seletor de unidades da caneta.
function DoseDial({ total, filled, onDark = false }: { total: number; filled: number; onDark?: boolean }) {
  const count = Math.min(total, 26);
  const scale = total > count ? total / count : 1;
  const filledCount = Math.round(Math.min(filled, total) / scale);
  return (
    <div aria-hidden="true" style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 16 }}>
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          style={{
            width: 3,
            height: index % 5 === 0 ? 16 : 10,
            borderRadius: 2,
            background: index < filledCount ? (onDark ? colors.tickOn : colors.brand) : (onDark ? colors.tickOff : colors.line),
            transition: "background 220ms ease"
          }}
        />
      ))}
    </div>
  );
}

export default function WorkoutRedesign({ plan, training, onGenerate, generating, onOpenAnamnese, onOpenTriage, onOpenReassessment, onOpenMedia, onRecordExercise, checkin, onOpenCheckin, isYellow }: Props) {
  const [selectedDay, setSelectedDay] = useState(0);
  const [showWhy, setShowWhy] = useState(false);
  const [execution, setExecution] = useState<{ day: number; exercise: number } | null>(null);
  const [completed, setCompleted] = useState<Record<string, number>>({});
  const [rest, setRest] = useState<{ endsAt: number; total: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const workout = plan.workouts[selectedDay] ?? plan.workouts[0];
  const exercises = workout?.exercises ?? [];
  const executionWorkout = execution ? plan.workouts[execution.day] : null;
  const executionExercise = execution && executionWorkout ? executionWorkout.exercises[execution.exercise] : undefined;
  const totalSets = exercises.reduce((sum, exercise) => sum + exercise.sets, 0);
  const completedSets = exercises.reduce((sum, exercise) => sum + Math.min(exercise.sets, completed[`${selectedDay}:${exercise.name}`] ?? 0), 0);
  const sessionMinutes = training?.minutes_per_session ?? 30;
  const weekLabel = new Date(`${plan.week_start}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

  const dayNames = useMemo(() => plan.workouts.map((item) => item.day.replace("Treino ", "")), [plan.workouts]);

  useEffect(() => {
    if (!rest) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [rest]);

  const restRemaining = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : 0;

  useEffect(() => {
    if (rest && restRemaining === 0) {
      vibrate(160);
      setRest(null);
    }
  }, [rest, restRemaining]);

  // Todo início de sessão passa pelo check-in do dia (o gate não tem atalho).
  const startExecution = (day: number, exercise: number) => {
    if (!checkin) {
      onOpenCheckin();
      return;
    }
    if (checkin.status === "vermelho") return;
    setRest(null);
    setExecution({ day, exercise });
  };

  const markSet = async (dayIndex: number, exerciseIndex: number, exercise: Exercise) => {
    const key = `${dayIndex}:${exercise.name}`;
    const next = Math.min(exercise.sets, (completed[key] ?? 0) + 1);
    setCompleted((current) => ({ ...current, [key]: next }));
    if (next === exercise.sets) {
      vibrate([30, 60, 30]);
      setRest(null);
      await onRecordExercise(exercise, next);
    } else {
      vibrate(30);
      setRest({ endsAt: Date.now() + REST_SECONDS * 1000, total: REST_SECONDS });
      setNow(Date.now());
    }
  };

  if (!workout) return null;

  const checkinToday = checkin;
  const isRed = checkinToday?.status === "vermelho";
  const isLightDay = checkinToday?.status === "amarelo";

  return (
    <>
      <div className="workout-redesign" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: colors.ink }}>Meu treino</div>
            <div style={{ fontSize: 13, color: colors.soft, marginTop: 4 }}>Movimento no mesmo ritmo do tratamento: uma sessão por vez.</div>
          </div>
          <button type="button" onClick={onGenerate} disabled={generating} style={{ border: `1.5px solid ${colors.line}`, background: colors.surface, color: colors.brand, borderRadius: 12, padding: "8px 10px", fontSize: 12, fontWeight: 800, cursor: generating ? "wait" : "pointer", opacity: generating ? 0.6 : 1 }}>{generating ? "Gerando…" : "Atualizar"}</button>
        </div>

        <div role="tablist" aria-label="Sessões da semana" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
          {plan.workouts.map((item, index) => {
            const selected = selectedDay === index;
            return (
              <button key={`${item.day}-${index}`} type="button" role="tab" aria-selected={selected} onClick={() => setSelectedDay(index)} style={{ flex: "0 0 auto", minWidth: 66, padding: "9px 12px 10px", borderRadius: 14, border: `1.5px solid ${selected ? colors.pine : colors.line}`, background: selected ? colors.pine : colors.surface, color: selected ? colors.onDark : colors.soft, cursor: "pointer", textAlign: "center" }}>
                <span style={{ ...label, display: "block", fontSize: 9, opacity: selected ? 0.7 : 0.8, marginBottom: 3 }}>Sessão {index + 1}</span>
                <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.02em" }}>{dayAbbrev(item.day)}</span>
              </button>
            );
          })}
        </div>

        {isYellow && (
          <div style={{ padding: "11px 13px", background: colors.warningBg, border: `1.5px solid ${colors.warningLine}`, borderRadius: 14 }}>
            <div style={{ ...label, color: colors.warning, marginBottom: 3 }}>Semana em modo leve</div>
            <div style={{ color: colors.warning, fontSize: 12.5, lineHeight: 1.45 }}>Sessões de baixa demanda esta semana, conforme sua triagem.</div>
          </div>
        )}

        {/* Cartão de dose: a decisão do dia num lugar só — check-in, estado e início da sessão. */}
        <section className="workout-session-card" style={{ background: colors.pine, borderRadius: 16, padding: "18px 18px 16px", color: colors.onDark }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
            <div style={{ ...label, fontSize: 10, color: colors.onDarkSoft }}>Sessão {selectedDay + 1} de {plan.workouts.length} · semana de {weekLabel}</div>
            {checkinToday && (
              <div style={{ ...label, fontSize: 10, color: isRed ? "#F2B8A8" : isLightDay ? colors.amberOnDark : colors.tickOn }}>
                {isRed ? "Pausa hoje" : isLightDay ? "Modo leve" : "Liberado"}
              </div>
            )}
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 6 }}>{dayNames[selectedDay]}</div>
          <div style={{ fontSize: 13, color: colors.onDarkSoft, lineHeight: 1.45, marginTop: 3 }}>{workout.focus}</div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, margin: "16px 0 14px" }} aria-label={`${completedSets} de ${totalSets} séries concluídas`}>
            <DoseDial total={totalSets} filled={completedSets} onDark />
            <div style={{ ...tabular, fontSize: 12.5, fontWeight: 800, whiteSpace: "nowrap" }}>{completedSets}<span style={{ color: colors.onDarkSoft, fontWeight: 600 }}>/{totalSets} séries</span></div>
          </div>

          {!checkinToday && (
            <button type="button" onClick={onOpenCheckin} style={{ width: "100%", border: "none", borderRadius: 14, background: colors.onDark, color: colors.pine, padding: 14, fontSize: 14.5, fontWeight: 800, cursor: "pointer" }}>
              Fazer check-in de hoje
              <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: colors.pine, opacity: 0.66, marginTop: 3 }}>1 minuto · decide se hoje é dia normal, leve ou de pausa</span>
            </button>
          )}
          {checkinToday && !isRed && (
            <button type="button" onClick={() => startExecution(selectedDay, 0)} style={{ width: "100%", border: "none", borderRadius: 14, background: colors.onDark, color: colors.pine, padding: 14, fontSize: 14.5, fontWeight: 800, cursor: "pointer" }}>
              {completedSets ? "Continuar sessão" : isLightDay ? "Iniciar sessão leve" : "Iniciar treino"}
              <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: colors.pine, opacity: 0.66, marginTop: 3 }}>~{sessionMinutes} min · {exercises.length} exercícios{isLightDay ? " · pegue mais leve hoje" : ""}</span>
            </button>
          )}
          {isRed && (
            <div style={{ borderRadius: 14, background: "rgba(242,250,247,0.1)", border: `1.5px solid ${colors.tickOff}`, padding: "13px 14px" }}>
              <div style={{ fontSize: 13.5, fontWeight: 800 }}>Hoje é dia de pausa</div>
              <div style={{ fontSize: 12, color: colors.onDarkSoft, lineHeight: 1.5, marginTop: 3 }}>{checkinToday?.motivos.join(" ") || "O check-in indicou pausa."} Se os sintomas persistirem, procure avaliação.</div>
            </div>
          )}
          <button type="button" onClick={onOpenCheckin} style={{ width: "100%", marginTop: 8, border: "none", background: "transparent", color: colors.onDarkSoft, fontSize: 11.5, fontWeight: 700, cursor: "pointer", padding: 4 }}>
            {checkinToday ? "Refazer check-in do dia" : "Já fiz check-in? Atualize aqui"}
          </button>
        </section>

        {isLightDay && checkinToday?.motivos.length ? (
          <div style={{ fontSize: 12, color: colors.soft, lineHeight: 1.5, padding: "0 4px" }}>{checkinToday.motivos.join(" ")}</div>
        ) : null}

        {(plan.focus || plan.rationale) && (
          <div style={{ background: colors.mint, border: `1.5px solid ${colors.mintLine}`, borderRadius: 14, padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
              <div style={{ ...label, color: colors.brand }}>Foco da semana</div>
              {plan.rationale && (
                <button type="button" onClick={() => setShowWhy((value) => !value)} aria-expanded={showWhy} style={{ border: "none", background: "transparent", color: colors.brand, fontSize: 11.5, fontWeight: 800, cursor: "pointer", padding: 0 }}>{showWhy ? "ocultar" : "por quê?"}</button>
              )}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: colors.ink, lineHeight: 1.45, marginTop: 4 }}>{plan.focus}</div>
            {showWhy && plan.rationale && <div style={{ fontSize: 12.5, color: colors.soft, lineHeight: 1.5, marginTop: 6 }}>{plan.rationale}</div>}
          </div>
        )}

        {plan.warning && (
          <div style={{ padding: "11px 13px", background: colors.warningBg, border: `1.5px solid ${colors.warningLine}`, borderRadius: 14 }}>
            <div style={{ ...label, color: colors.warning, marginBottom: 3 }}>Atenção</div>
            <div style={{ color: colors.warning, fontSize: 12.5, lineHeight: 1.5 }}>{plan.warning}</div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ ...label, color: colors.soft }}>Prévia dos exercícios</div>
          <div style={{ fontSize: 11, color: colors.muted }}>toque para abrir</div>
        </div>
        <div className="workout-exercise-strip" style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 2 }}>
          {exercises.map((exercise, index) => {
            const media = exercise.gif_url || exercise.image_url;
            return (
              <button key={`${exercise.name}-${index}`} type="button" onClick={() => media ? onOpenMedia({ url: media, name: exerciseLabel(exercise) }) : startExecution(selectedDay, index)} style={{ flex: "0 0 86px", border: "none", background: "transparent", padding: 0, textAlign: "left", cursor: "pointer" }}>
                <div style={{ width: 86, height: 86, borderRadius: 16, overflow: "hidden", background: colors.mint, border: `1.5px solid ${colors.mintLine}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {media ? <img src={media} alt={`Abrir demonstração de ${exerciseLabel(exercise)}`} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: colors.brand, fontSize: 24 }}>↗</span>}
                </div>
                <div style={{ fontSize: 11.5, lineHeight: 1.25, color: colors.ink, fontWeight: 700, marginTop: 6 }}>{exerciseLabel(exercise)}</div>
              </button>
            );
          })}
        </div>

        <div style={{ ...label, color: colors.soft }}>Acompanhamento</div>
        <div style={{ background: colors.surface, border: `1.5px solid ${colors.line}`, borderRadius: 16, overflow: "hidden" }}>
          {exercises.map((exercise, index) => {
            const count = completed[`${selectedDay}:${exercise.name}`] ?? 0;
            const done = count >= exercise.sets;
            return (
              <button key={`${exercise.name}-check-${index}`} type="button" onClick={() => startExecution(selectedDay, index)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "13px 15px", border: "none", borderBottom: index === exercises.length - 1 ? "none" : `1px solid ${colors.line}`, background: "transparent", textAlign: "left", cursor: "pointer" }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", border: `1.5px solid ${done ? colors.brand : colors.line}`, background: done ? colors.brand : colors.surface, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>{done ? "✓" : ""}</span>
                <span className="workout-exercise-name" style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: colors.ink }}>{exerciseLabel(exercise)}</span>
                <span style={{ ...tabular, fontSize: 12, fontWeight: 800, color: done ? colors.brand : colors.soft }}>{count}<span style={{ fontWeight: 600, color: colors.muted }}>/{exercise.sets}</span></span>
              </button>
            );
          })}
        </div>

        {plan.nutrition_advice && (
          <div style={{ borderTop: `1px solid ${colors.line}`, paddingTop: 12 }}>
            <div style={{ ...label, color: colors.soft, marginBottom: 4 }}>Nutrição</div>
            <div style={{ fontSize: 12.5, color: colors.soft, lineHeight: 1.5 }}>{plan.nutrition_advice}</div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          <button type="button" onClick={onOpenReassessment} style={{ padding: "11px 8px", borderRadius: 13, border: `1.5px solid ${colors.line}`, background: colors.surface, color: colors.soft, fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}>Reavaliar</button>
          <button type="button" onClick={onOpenAnamnese} style={{ padding: "11px 8px", borderRadius: 13, border: `1.5px solid ${colors.line}`, background: colors.surface, color: colors.soft, fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}>Anamnese</button>
          <button type="button" onClick={onOpenTriage} style={{ padding: "11px 8px", borderRadius: 13, border: `1.5px solid ${colors.line}`, background: colors.surface, color: colors.soft, fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}>Triagem</button>
        </div>
        <div style={{ fontSize: 11.5, color: colors.soft, lineHeight: 1.5 }}>Orientação educacional de movimento gerada a partir dos seus registros. Não substitui avaliação profissional.</div>
      </div>

      {execution && executionWorkout && executionExercise && (
        <div role="dialog" aria-modal="true" aria-label="Modo de execução" style={{ position: "fixed", inset: 0, zIndex: 50, background: colors.bg, overflowY: "auto", padding: "18px 18px 28px" }}>
          <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 5, flex: 1 }}>{executionWorkout.exercises.map((item, index) => <span key={`${item.name}-dot-${index}`} style={{ height: 4, flex: 1, borderRadius: 4, background: index <= execution.exercise ? colors.pine : colors.line }} />)}</div>
              <button type="button" onClick={() => { setRest(null); setExecution(null); }} aria-label="Fechar modo de execução" style={{ marginLeft: 14, width: 36, height: 36, borderRadius: 12, border: `1.5px solid ${colors.line}`, background: colors.surface, color: colors.ink, fontSize: 20, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ ...label, color: colors.soft, marginTop: 18 }}>Exercício {execution.exercise + 1} de {executionWorkout.exercises.length} · {executionWorkout.day}</div>
            <div style={{ marginTop: 12, width: "100%", aspectRatio: "1.12", borderRadius: 18, overflow: "hidden", background: colors.mint, border: `1.5px solid ${colors.mintLine}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {executionExercise.gif_url || executionExercise.image_url ? <img src={executionExercise.gif_url || executionExercise.image_url || ""} alt={`Demonstração de ${exerciseLabel(executionExercise)}`} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <div style={{ color: colors.brand, fontSize: 42 }}>↗</div>}
            </div>
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-0.02em", color: colors.ink }}>{exerciseLabel(executionExercise)}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                <DoseDial total={executionExercise.sets} filled={completed[`${execution.day}:${executionExercise.name}`] ?? 0} />
                <span style={{ ...tabular, fontSize: 13, fontWeight: 800, color: colors.soft }}>{executionExercise.sets} × {executionExercise.reps}</span>
              </div>
              {executionExercise.why && <div style={{ fontSize: 12.5, color: colors.soft, lineHeight: 1.5, marginTop: 8 }}>{executionExercise.why}</div>}
            </div>

            {rest ? (
              <div style={{ marginTop: 18, borderRadius: 16, background: colors.pine, color: colors.onDark, padding: "16px 16px 14px" }} role="timer" aria-label={`Descanso: ${restRemaining} segundos restantes`}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                  <div style={{ ...label, fontSize: 10, color: colors.onDarkSoft }}>Descanso</div>
                  <div style={{ ...tabular, fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em" }}>{Math.floor(restRemaining / 60)}:{String(restRemaining % 60).padStart(2, "0")}</div>
                </div>
                <div style={{ height: 5, borderRadius: 5, background: colors.tickOff, marginTop: 10, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${rest.total ? Math.max(0, Math.min(100, (restRemaining / rest.total) * 100)) : 0}%`, borderRadius: 5, background: colors.tickOn, transition: "width 250ms linear" }} />
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button type="button" onClick={() => setRest((current) => current ? { ...current, endsAt: current.endsAt + 30000, total: current.total + 30 } : current)} style={{ flex: 1, padding: 11, borderRadius: 12, border: `1.5px solid ${colors.tickOff}`, background: "transparent", color: colors.onDark, fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}>+30s</button>
                  <button type="button" onClick={() => setRest(null)} style={{ flex: 1, padding: 11, borderRadius: 12, border: "none", background: colors.onDark, color: colors.pine, fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}>Pular descanso</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18 }}>
                {Array.from({ length: executionExercise.sets }, (_, index) => {
                  const key = `${execution.day}:${executionExercise.name}`;
                  const done = (completed[key] ?? 0) > index;
                  return (
                    <button key={`${executionExercise.name}-set-${index}`} type="button" onClick={() => !done && markSet(execution.day, execution.exercise, executionExercise)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "13px 14px", borderRadius: 13, border: `1.5px solid ${done ? colors.brand : colors.line}`, background: done ? colors.mint : colors.surface, color: colors.ink, textAlign: "left", cursor: done ? "default" : "pointer" }}>
                      <span style={{ ...tabular, width: 24, height: 24, borderRadius: "50%", background: done ? colors.brand : colors.surface, border: `1.5px solid ${done ? colors.brand : colors.line}`, color: done ? "#fff" : colors.soft, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 }}>{done ? "✓" : index + 1}</span>
                      <span style={{ fontSize: 13, fontWeight: 800 }}>{done ? "Série concluída" : `Marcar série ${index + 1}`}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div style={{ flex: 1 }} />
            <div style={{ display: "flex", gap: 9, marginTop: 24 }}>
              <button type="button" disabled={execution.exercise === 0} onClick={() => { setRest(null); setExecution((current) => current ? ({ ...current, exercise: Math.max(0, current.exercise - 1) }) : current); }} style={{ flex: 1, padding: 13, borderRadius: 13, border: `1.5px solid ${colors.line}`, background: colors.surface, color: colors.soft, fontSize: 13, fontWeight: 800, cursor: execution.exercise === 0 ? "not-allowed" : "pointer", opacity: execution.exercise === 0 ? 0.45 : 1 }}>Anterior</button>
              <button type="button" onClick={() => { setRest(null); if (execution.exercise < executionWorkout.exercises.length - 1) { setExecution({ ...execution, exercise: execution.exercise + 1 }); } else { setExecution(null); } }} style={{ flex: 1, padding: 13, borderRadius: 13, border: "none", background: colors.pine, color: colors.onDark, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>{execution.exercise < executionWorkout.exercises.length - 1 ? "Próximo" : "Concluir"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
