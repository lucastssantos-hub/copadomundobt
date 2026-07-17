"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import type { AiWorkoutPlanRow, TrainingProfileRow } from "./actions";

type Workout = AiWorkoutPlanRow["workouts"][number];
type Exercise = Workout["exercises"][number];

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
  checkinLabel?: string;
  isYellow?: boolean;
};

const colors = {
  bg: "#F4F6F3",
  surface: "#FFFFFF",
  line: "#E2E7E2",
  ink: "#16302B",
  soft: "#4C635D",
  muted: "#859891",
  brand: "#0E6B5C",
  mint: "#EAF5F2",
  mintLine: "#CBE3DC",
  warning: "#7A6017",
  warningBg: "#FDF6E3"
};

function exerciseLabel(exercise: Exercise) {
  return exercise.name_pt || exercise.name;
}

export default function WorkoutRedesign({ plan, training, onGenerate, generating, onOpenAnamnese, onOpenTriage, onOpenReassessment, onOpenMedia, onRecordExercise, checkinLabel, isYellow }: Props) {
  const [selectedDay, setSelectedDay] = useState(0);
  const [execution, setExecution] = useState<{ day: number; exercise: number } | null>(null);
  const [completed, setCompleted] = useState<Record<string, number>>({});
  const workout = plan.workouts[selectedDay] ?? plan.workouts[0];
  const exercises = workout?.exercises ?? [];
  const executionWorkout = execution ? plan.workouts[execution.day] : null;
  const executionExercise = execution && executionWorkout ? executionWorkout.exercises[execution.exercise] : undefined;
  const doneCount = exercises.filter((exercise) => (completed[`${selectedDay}:${exercise.name}`] ?? 0) >= exercise.sets).length;
  const totalSets = exercises.reduce((sum, exercise) => sum + exercise.sets, 0);
  const completedSets = exercises.reduce((sum, exercise) => sum + Math.min(exercise.sets, completed[`${selectedDay}:${exercise.name}`] ?? 0), 0);
  const progress = totalSets ? Math.round((completedSets / totalSets) * 100) : 0;
  const sessionMinutes = training?.minutes_per_session ?? 30;

  const dayLabels = useMemo(() => plan.workouts.map((item) => item.day.replace("Treino ", "")), [plan.workouts]);

  const markSet = async (dayIndex: number, exerciseIndex: number, exercise: Exercise) => {
    const key = `${dayIndex}:${exercise.name}`;
    const next = Math.min(exercise.sets, (completed[key] ?? 0) + 1);
    setCompleted((current) => ({ ...current, [key]: next }));
    if (next === exercise.sets) await onRecordExercise(exercise, next);
  };

  if (!workout) return null;

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: colors.ink }}>Meu treino</div>
            <div style={{ fontSize: 13, color: colors.soft, marginTop: 4 }}>Uma sessão por vez, com o movimento visível.</div>
          </div>
          <button type="button" onClick={onGenerate} disabled={generating} style={{ border: `1.5px solid ${colors.line}`, background: colors.surface, color: colors.brand, borderRadius: 12, padding: "8px 10px", fontSize: 12, fontWeight: 800, cursor: generating ? "wait" : "pointer", opacity: generating ? 0.6 : 1 }}>{generating ? "Gerando…" : "Atualizar"}</button>
        </div>

        <div role="tablist" aria-label="Sessões da semana" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
          {plan.workouts.map((item, index) => (
            <button key={`${item.day}-${index}`} type="button" role="tab" aria-selected={selectedDay === index} onClick={() => setSelectedDay(index)} style={{ flex: "0 0 auto", minWidth: 68, padding: "10px 12px", borderRadius: 14, border: `1.5px solid ${selectedDay === index ? colors.brand : colors.line}`, background: selectedDay === index ? colors.brand : colors.surface, color: selectedDay === index ? "#fff" : colors.soft, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
              <span style={{ display: "block", fontSize: 10, opacity: 0.78, marginBottom: 3 }}>SESSÃO</span>{dayLabels[index]}
            </button>
          ))}
        </div>

        {isYellow && <div style={{ padding: "11px 13px", background: colors.warningBg, border: "1.5px solid #EAD9A8", borderRadius: 14, color: colors.warning, fontSize: 12.5, lineHeight: 1.45 }}>Semana em modo leve. Faça o check-in de hoje antes de iniciar.</div>}

        <section style={{ background: colors.surface, border: `1.5px solid ${colors.line}`, borderRadius: 16, padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: colors.ink }}>{workout.day}</div>
              <div style={{ fontSize: 12.5, color: colors.soft, lineHeight: 1.4, marginTop: 3 }}>{workout.focus}</div>
            </div>
            <div style={{ textAlign: "right", color: colors.brand, fontSize: 12, fontWeight: 800 }}>{doneCount}/{exercises.length}<span style={{ display: "block", color: colors.muted, fontWeight: 600, marginTop: 2 }}>exercícios</span></div>
          </div>
          <div style={{ display: "flex", gap: 4, margin: "16px 0 14px" }} aria-label={`${progress}% concluído`}>
            {exercises.map((exercise, index) => <span key={`${exercise.name}-${index}`} style={{ flex: 1, height: 5, borderRadius: 5, background: (completed[`${selectedDay}:${exercise.name}`] ?? 0) >= exercise.sets ? colors.brand : colors.line }} />)}
          </div>
          <button type="button" onClick={() => setExecution({ day: selectedDay, exercise: 0 })} style={{ width: "100%", border: "none", borderRadius: 14, background: colors.brand, color: "#fff", padding: 14, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>{progress ? "Continuar sessão" : "Iniciar treino"}<span style={{ display: "block", fontSize: 11, opacity: 0.8, marginTop: 3 }}>~{sessionMinutes} min · {totalSets} séries planejadas</span></button>
        </section>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><div style={{ fontSize: 12, fontWeight: 800, color: colors.soft, letterSpacing: "0.03em" }}>PRÉVIA DOS EXERCÍCIOS</div><div style={{ fontSize: 11, color: colors.muted }}>toque para abrir</div></div>
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 2 }}>
          {exercises.map((exercise, index) => {
            const media = exercise.gif_url || exercise.image_url;
            return <button key={`${exercise.name}-${index}`} type="button" onClick={() => media ? onOpenMedia({ url: media, name: exerciseLabel(exercise) }) : setExecution({ day: selectedDay, exercise: index })} style={{ flex: "0 0 86px", border: "none", background: "transparent", padding: 0, textAlign: "left", cursor: "pointer" }}>
              <div style={{ width: 86, height: 86, borderRadius: 14, overflow: "hidden", background: colors.mint, border: `1.5px solid ${colors.line}`, display: "flex", alignItems: "center", justifyContent: "center" }}>{media ? <img src={media} alt={`Abrir demonstração de ${exerciseLabel(exercise)}`} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: colors.brand, fontSize: 24 }}>↗</span>}</div>
              <div style={{ fontSize: 11.5, lineHeight: 1.25, color: colors.ink, fontWeight: 700, marginTop: 6 }}>{exerciseLabel(exercise)}</div>
            </button>;
          })}
        </div>

        <div style={{ fontSize: 12, fontWeight: 800, color: colors.soft, letterSpacing: "0.03em" }}>ACOMPANHAMENTO</div>
        <div style={{ background: colors.surface, border: `1.5px solid ${colors.line}`, borderRadius: 16, overflow: "hidden" }}>
          {exercises.map((exercise, index) => {
            const count = completed[`${selectedDay}:${exercise.name}`] ?? 0;
            return <button key={`${exercise.name}-check-${index}`} type="button" onClick={() => setExecution({ day: selectedDay, exercise: index })} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "13px 15px", border: "none", borderBottom: index === exercises.length - 1 ? "none" : `1px solid ${colors.line}`, background: "transparent", textAlign: "left", cursor: "pointer" }}><span style={{ width: 22, height: 22, borderRadius: "50%", border: `1.5px solid ${count >= exercise.sets ? colors.brand : colors.line}`, background: count >= exercise.sets ? colors.brand : colors.surface, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{count >= exercise.sets ? "✓" : ""}</span><span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{exerciseLabel(exercise)}</span><span style={{ fontSize: 11.5, color: colors.soft }}>{count}/{exercise.sets}</span></button>;
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          <button type="button" onClick={onOpenReassessment} style={{ padding: "11px 8px", borderRadius: 13, border: `1.5px solid ${colors.line}`, background: colors.surface, color: colors.soft, fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}>Reavaliar</button>
          <button type="button" onClick={onOpenAnamnese} style={{ padding: "11px 8px", borderRadius: 13, border: `1.5px solid ${colors.line}`, background: colors.surface, color: colors.soft, fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}>Anamnese</button>
          <button type="button" onClick={onOpenTriage} style={{ padding: "11px 8px", borderRadius: 13, border: `1.5px solid ${colors.line}`, background: colors.surface, color: colors.soft, fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}>Triagem</button>
        </div>
        {checkinLabel && <div style={{ fontSize: 12, color: colors.soft, textAlign: "center" }}>{checkinLabel}</div>}
        <div style={{ fontSize: 11.5, color: colors.soft, lineHeight: 1.5 }}>Orientação educacional de movimento gerada a partir dos seus registros. Não substitui avaliação profissional.</div>
      </div>

      {execution && executionWorkout && executionExercise && (
        <div role="dialog" aria-modal="true" aria-label="Modo de execução" style={{ position: "fixed", inset: 0, zIndex: 50, background: colors.bg, overflowY: "auto", padding: "18px 18px 28px" }}>
          <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ display: "flex", gap: 5, flex: 1 }}>{executionWorkout.exercises.map((item, index) => <span key={`${item.name}-dot-${index}`} style={{ height: 4, flex: 1, borderRadius: 4, background: index <= execution.exercise ? colors.brand : colors.line }} />)}</div><button type="button" onClick={() => setExecution(null)} aria-label="Fechar modo de execução" style={{ marginLeft: 14, width: 36, height: 36, borderRadius: 12, border: `1.5px solid ${colors.line}`, background: colors.surface, color: colors.ink, fontSize: 20, cursor: "pointer" }}>×</button></div>
            <div style={{ fontSize: 12, color: colors.soft, marginTop: 18 }}>Exercício {execution.exercise + 1} de {executionWorkout.exercises.length} · {executionWorkout.day}</div>
            <div style={{ marginTop: 12, width: "100%", aspectRatio: "1.12", borderRadius: 18, overflow: "hidden", background: colors.mint, border: `1.5px solid ${colors.line}`, display: "flex", alignItems: "center", justifyContent: "center" }}>{executionExercise.gif_url || executionExercise.image_url ? <img src={executionExercise.gif_url || executionExercise.image_url || ""} alt={`Demonstração de ${exerciseLabel(executionExercise)}`} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <div style={{ color: colors.brand, fontSize: 42 }}>↗</div>}</div>
            <div style={{ marginTop: 18 }}><div style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-0.02em", color: colors.ink }}>{exerciseLabel(executionExercise)}</div><div style={{ fontSize: 13, color: colors.soft, marginTop: 5 }}>{executionExercise.sets} séries · {executionExercise.reps}</div></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18 }}>{Array.from({ length: executionExercise.sets }, (_, index) => { const key = `${execution.day}:${executionExercise.name}`; const done = (completed[key] ?? 0) > index; return <button key={`${executionExercise.name}-set-${index}`} type="button" onClick={() => !done && markSet(execution.day, execution.exercise, executionExercise)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "13px 14px", borderRadius: 13, border: `1.5px solid ${done ? colors.brand : colors.line}`, background: done ? colors.mint : colors.surface, color: colors.ink, textAlign: "left", cursor: done ? "default" : "pointer" }}><span style={{ width: 24, height: 24, borderRadius: "50%", background: done ? colors.brand : colors.surface, border: `1.5px solid ${done ? colors.brand : colors.line}`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>{done ? "✓" : index + 1}</span><span style={{ fontSize: 13, fontWeight: 800 }}>{done ? "Série concluída" : `Marcar série ${index + 1}`}</span></button>; })}</div>
            <div style={{ flex: 1 }} />
            <div style={{ display: "flex", gap: 9, marginTop: 24 }}><button type="button" disabled={execution.exercise === 0} onClick={() => setExecution((current) => current ? ({ ...current, exercise: Math.max(0, current.exercise - 1) }) : current)} style={{ flex: 1, padding: 13, borderRadius: 13, border: `1.5px solid ${colors.line}`, background: colors.surface, color: colors.soft, fontSize: 13, fontWeight: 800, cursor: execution.exercise === 0 ? "not-allowed" : "pointer", opacity: execution.exercise === 0 ? 0.45 : 1 }}>Anterior</button><button type="button" onClick={() => execution.exercise < executionWorkout.exercises.length - 1 ? setExecution({ ...execution, exercise: execution.exercise + 1 }) : setExecution(null)} style={{ flex: 1, padding: 13, borderRadius: 13, border: "none", background: colors.brand, color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>{execution.exercise < executionWorkout.exercises.length - 1 ? "Próximo" : "Concluir"}</button></div>
          </div>
        </div>
      )}
    </>
  );
}
