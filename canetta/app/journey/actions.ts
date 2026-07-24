"use server";

import { createSupabaseServerClient } from "@/lib/supabase";
import { configureWebPush, getVapidPublicKey } from "@/lib/push";
import type { OnboardingPayload } from "@/app/onboarding/flow/actions";

export type ExerciseCatalogItem = {
  external_id: string;
  name: string;
  name_pt?: string | null;
  difficulty_level?: "iniciante" | "intermediario" | "avancado";
  body_part: string | null;
  equipment: string | null;
  target_muscle: string | null;
  muscle_group: string | null;
  secondary_muscles: string[] | null;
  image_url: string | null;
  gif_url: string | null;
  attribution: string | null;
};

export type BodyMeasurementRow = { id: string; waist_cm: number | null; hip_cm: number | null; note: string | null; recorded_at: string };
export type NutritionEntryRow = { id: string; meal_label: string | null; protein_logged: boolean | null; water_cups: number | null; note: string | null; meals_tolerated?: string | null; intake_adequacy?: string | null; hydration_status?: string | null; weakness_status?: string | null; professional_target?: string | null; protein_target_grams?: number | null; protein_target_source?: string | null; recorded_at: string };

async function currentSession() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    return { supabase, user };
  } catch {
    return { supabase: null, user: null };
  }
}

function applicationSite(value?: string) {
  const normalized = `${value ?? ""}`.toLowerCase();
  if (normalized.includes("abdômen")) return "abdomen";
  if (normalized.includes("coxa")) return "coxa";
  if (normalized.includes("braço")) return "braco";
  return null;
}

export async function loadJourneyAction(onboarding?: OnboardingPayload) {
  const { supabase, user } = await currentSession();
  if (!user || !supabase) return { authenticated: false as const };

  if (onboarding) {
    await supabase.from("canetta_profiles").upsert({
      user_id: user.id,
      name: onboarding.nome?.trim() || null,
      stage: onboarding.estagio === "Quero começar" ? "quer_comecar" : "usa",
      medication: onboarding.medicamento || null,
      current_dose: onboarding.dose || null,
      frequency: onboarding.freq || null,
      height_cm: Number.isFinite(onboarding.alturaCm) ? onboarding.alturaCm : null,
      biggest_difficulty: onboarding.dificuldade || null
    }, { onConflict: "user_id" });
  }

  const [profileResult, applicationsResult, missedDosesResult, weightsResult, symptomsResult, routinesResult, questionsResult, remindersResult, workoutsResult, exercisesResult, sessionCheckinsResult, feedbackResult, reassessmentResult, measurementsResult, nutritionResult] = await Promise.all([
    supabase.from("canetta_profiles").select("name, medication, medication_code, current_dose, frequency, route, dose_unit, schedule_interval_days, biggest_difficulty").eq("user_id", user.id).maybeSingle(),
    supabase.from("canetta_dose_applications").select("id, medication, dose, dose_unit, route, site, note, applied_at, scheduled_for").eq("user_id", user.id).order("applied_at", { ascending: true }),
    supabase.from("canetta_missed_doses").select("id, medication, dose, reason, note, scheduled_for, recorded_at").eq("user_id", user.id).order("scheduled_for", { ascending: true }),
    supabase.from("canetta_weight_entries").select("id, weight, recorded_at").eq("user_id", user.id).order("recorded_at", { ascending: true }),
    supabase.from("canetta_side_effects").select("id, types, intensity, duration, note, application_id, days_since_application, hydration_ok, recorded_at").eq("user_id", user.id).order("recorded_at", { ascending: true }),
    supabase.from("canetta_routine_entries").select("id, water_cups, movement, sleep, hunger, note, photo, recorded_at").eq("user_id", user.id).order("recorded_at", { ascending: true }),
    supabase.from("canetta_questions").select("id, question, recorded_at").eq("user_id", user.id).order("recorded_at", { ascending: true }),
    supabase.from("canetta_reminders").select("id, weekday, time, active").eq("user_id", user.id).limit(1),
    supabase.from("canetta_workout_logs").select("id, exercise_external_id, exercise_name, body_part, equipment, sets_completed, reps_completed, difficulty_felt, note, completed_at").eq("user_id", user.id).order("completed_at", { ascending: true }),
    supabase.from("canetta_exercises").select("external_id, name, name_pt, difficulty_level, body_part, equipment, target_muscle, muscle_group, secondary_muscles, image_url, gif_url, attribution").order("name_pt", { ascending: true }).limit(36),
    supabase.from("canetta_session_checkins").select("id, session_date, session_label, status, data, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(14),
    supabase.from("canetta_workout_feedback").select("id, workout_log_id, completed, rpe, symptoms_during, symptoms_after, note, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("canetta_training_reassessments").select("id, anchor_strength, function_level, pain_level, adherence, medication_change, note, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1),
    supabase.from("canetta_body_measurements").select("id, waist_cm, hip_cm, note, recorded_at").eq("user_id", user.id).order("recorded_at", { ascending: true }),
    supabase.from("canetta_nutrition_entries").select("id, meal_label, protein_logged, water_cups, note, meals_tolerated, intake_adequacy, hydration_status, weakness_status, professional_target, protein_target_grams, protein_target_source, recorded_at").eq("user_id", user.id).order("recorded_at", { ascending: true })
  ]);

  const error = profileResult.error || applicationsResult.error || missedDosesResult.error || weightsResult.error || symptomsResult.error || routinesResult.error || questionsResult.error || remindersResult.error || workoutsResult.error || exercisesResult.error || sessionCheckinsResult.error || feedbackResult.error || reassessmentResult.error || measurementsResult.error || nutritionResult.error;
  if (error) return { authenticated: true as const, error: "Não foi possível carregar os registros sincronizados." };

  return {
    authenticated: true as const,
    profile: profileResult.data,
    applications: applicationsResult.data ?? [],
    missedDoses: missedDosesResult.data ?? [],
    weights: weightsResult.data ?? [],
    symptoms: symptomsResult.data ?? [],
    routines: routinesResult.data ?? [],
    questions: questionsResult.data ?? [],
    reminder: remindersResult.data?.[0] ?? null,
    workouts: workoutsResult.data ?? [],
    exercises: (exercisesResult.data ?? []) as ExerciseCatalogItem[],
    sessionCheckins: sessionCheckinsResult.data ?? [],
    workoutFeedback: feedbackResult.data ?? [],
    reassessment: reassessmentResult.data?.[0] ?? null
    ,measurements: (measurementsResult.data ?? []) as BodyMeasurementRow[]
    ,nutrition: (nutritionResult.data ?? []) as NutritionEntryRow[]
  };
}

export async function saveApplicationAction(input: { medication: string; dose: string; doseUnit?: string; route?: string; site?: string; note?: string; appliedAt?: string; scheduledFor?: string }) {
  const { supabase, user } = await currentSession();
  if (!user || !supabase) return { synced: false as const };
  const appliedAt = input.appliedAt && !Number.isNaN(Date.parse(input.appliedAt)) ? input.appliedAt : new Date().toISOString();
  const { data, error } = await supabase.from("canetta_dose_applications").insert({
    user_id: user.id,
    medication: input.medication || null,
    dose: input.dose || null,
    dose_unit: input.doseUnit?.trim() || null,
    route: input.route?.trim() || null,
    site: applicationSite(input.site),
    note: input.note?.trim() || null,
    applied_at: appliedAt,
    scheduled_for: input.scheduledFor && !Number.isNaN(Date.parse(input.scheduledFor)) ? input.scheduledFor : null
  }).select("id, applied_at").single();
  return error ? { synced: false as const } : { synced: true as const, id: data.id, appliedAt: data.applied_at };
}

const JOURNEY_TABLES = {
  aplicacao: "canetta_dose_applications",
  doseNaoAplicada: "canetta_missed_doses",
  sintoma: "canetta_side_effects",
  peso: "canetta_weight_entries",
  rotina: "canetta_routine_entries",
  medida: "canetta_body_measurements",
  nutricao: "canetta_nutrition_entries",
  treino: "canetta_workout_logs",
  pergunta: "canetta_questions"
} as const;

export async function deleteJourneyEntryAction(kind: keyof typeof JOURNEY_TABLES, id: string) {
  const { supabase, user } = await currentSession();
  if (!user || !supabase || !id) return { deleted: false as const, authenticated: false as const };
  const { error } = await supabase.from(JOURNEY_TABLES[kind]).delete().eq("id", id).eq("user_id", user.id);
  return { deleted: !error } as const;
}

export async function saveMissedDoseAction(input: { medication: string; dose: string; reason?: string; note?: string; scheduledFor?: string }) {
  const { supabase, user } = await currentSession();
  if (!user || !supabase) return { synced: false as const };
  const scheduledFor = input.scheduledFor && !Number.isNaN(Date.parse(input.scheduledFor)) ? input.scheduledFor : new Date().toISOString();
  const { data, error } = await supabase.from("canetta_missed_doses").insert({
    user_id: user.id,
    medication: input.medication || null,
    dose: input.dose || null,
    reason: input.reason?.trim() || null,
    note: input.note?.trim() || null,
    scheduled_for: scheduledFor
  }).select("id, scheduled_for, recorded_at").single();
  return error ? { synced: false as const } : { synced: true as const, id: data.id, scheduledFor: data.scheduled_for, recordedAt: data.recorded_at };
}

export async function saveWeightAction(input: { weight: number }) {
  if (!Number.isFinite(input.weight) || input.weight < 20 || input.weight > 400) return { synced: false as const, validation: true as const };
  const { supabase, user } = await currentSession();
  if (!user || !supabase) return { synced: false as const };
  const { data, error } = await supabase.from("canetta_weight_entries").insert({ user_id: user.id, weight: input.weight }).select("id, recorded_at").single();
  return error ? { synced: false as const } : { synced: true as const, id: data.id, recordedAt: data.recorded_at };
}

export async function saveSymptomAction(input: { type?: string; intensity: number; duration?: string; note?: string; applicationId?: string; daysSinceApplication?: number; hydrationOk?: boolean }) {
  const intensity = Math.max(0, Math.min(10, Math.round(input.intensity)));
  const { supabase, user } = await currentSession();
  if (!user || !supabase) return { synced: false as const };
  let applicationId = input.applicationId || null;
  let daysSinceApplication = Number.isFinite(input.daysSinceApplication) ? Math.max(0, Math.min(90, Math.round(input.daysSinceApplication ?? 0))) : null;
  if (!applicationId) {
    const latest = await supabase.from("canetta_dose_applications").select("id, applied_at").eq("user_id", user.id).order("applied_at", { ascending: false }).limit(1).maybeSingle();
    if (latest.data) {
      applicationId = latest.data.id;
      if (daysSinceApplication == null) daysSinceApplication = Math.max(0, Math.min(90, Math.floor((Date.now() - Date.parse(latest.data.applied_at)) / 86400000)));
    }
  }
  const { data, error } = await supabase.from("canetta_side_effects").insert({
    user_id: user.id,
    types: input.type ? [input.type] : [],
    intensity,
    duration: input.duration?.trim() || null,
    note: input.note?.trim() || null,
    application_id: applicationId,
    days_since_application: daysSinceApplication,
    hydration_ok: input.hydrationOk == null ? null : !!input.hydrationOk
  }).select("id, recorded_at").single();
  return error ? { synced: false as const } : { synced: true as const, id: data.id, recordedAt: data.recorded_at };
}

export async function saveBodyMeasurementAction(input: { waistCm?: number; hipCm?: number; note?: string }) {
  const waist = Number.isFinite(input.waistCm) ? input.waistCm : null;
  const hip = Number.isFinite(input.hipCm) ? input.hipCm : null;
  if (waist == null && hip == null) return { synced: false as const, validation: true as const };
  if ([waist, hip].some((v) => v != null && (v < 20 || v > 300))) return { synced: false as const, validation: true as const };
  const { supabase, user } = await currentSession();
  if (!user || !supabase) return { synced: false as const };
  const { data, error } = await supabase.from("canetta_body_measurements").insert({ user_id: user.id, waist_cm: waist, hip_cm: hip, note: input.note?.trim() || null }).select("id, waist_cm, hip_cm, note, recorded_at").single();
  return error ? { synced: false as const } : { synced: true as const, measurement: data };
}

export async function saveNutritionEntryAction(input: { mealLabel?: string; proteinLogged?: boolean; waterCups?: number; note?: string; mealsTolerated?: string; intakeAdequacy?: string; hydrationStatus?: string; weaknessStatus?: string; professionalTarget?: string; proteinTargetGrams?: number; proteinTargetSource?: string }) {
  const water = input.waterCups == null ? null : Math.max(0, Math.min(50, Math.round(input.waterCups)));
  const { supabase, user } = await currentSession();
  if (!user || !supabase) return { synced: false as const };
  const proteinTarget = input.proteinTargetGrams == null ? null : Math.max(0, Math.min(500, Math.round(input.proteinTargetGrams)));
  const { data, error } = await supabase.from("canetta_nutrition_entries").insert({ user_id: user.id, meal_label: input.mealLabel?.trim() || null, protein_logged: input.proteinLogged == null ? null : !!input.proteinLogged, water_cups: water, note: input.note?.trim() || null, meals_tolerated: input.mealsTolerated || null, intake_adequacy: input.intakeAdequacy || null, hydration_status: input.hydrationStatus || null, weakness_status: input.weaknessStatus || null, professional_target: input.professionalTarget || null, protein_target_grams: proteinTarget, protein_target_source: input.proteinTargetSource || null }).select("id, meal_label, protein_logged, water_cups, note, meals_tolerated, intake_adequacy, hydration_status, weakness_status, professional_target, protein_target_grams, protein_target_source, recorded_at").single();
  return error ? { synced: false as const } : { synced: true as const, nutrition: data };
}

export async function savePersonalReportAction(input: { period: "7d" | "30d" | "all"; snapshot: Record<string, unknown> }) {
  const { supabase, user } = await currentSession();
  if (!user || !supabase) return { saved: false as const };
  const end = new Date();
  const start = new Date(end);
  if (input.period === "7d") start.setDate(start.getDate() - 6);
  if (input.period === "30d") start.setDate(start.getDate() - 29);
  const { data, error } = await supabase.from("canetta_personal_reports").insert({ user_id: user.id, period: input.period, range_start: start.toISOString().slice(0, 10), range_end: end.toISOString().slice(0, 10), snapshot: input.snapshot }).select("id, created_at").single();
  return error ? { saved: false as const } : { saved: true as const, report: data };
}

export async function saveRoutineAction(input: { waterCups?: number; movement?: string; sleep?: string; hunger?: string; note?: string; photo?: boolean }) {
  const { supabase, user } = await currentSession();
  if (!user || !supabase) return { synced: false as const };
  const waterCups = Number.isFinite(input.waterCups) ? Math.max(0, Math.round(input.waterCups ?? 0)) : null;
  const { data, error } = await supabase.from("canetta_routine_entries").insert({
    user_id: user.id,
    water_cups: waterCups,
    movement: input.movement || null,
    sleep: input.sleep || null,
    hunger: input.hunger || null,
    note: input.note?.trim() || null,
    photo: !!input.photo
  }).select("id, recorded_at").single();
  return error ? { synced: false as const } : { synced: true as const, id: data.id, recordedAt: data.recorded_at };
}

export async function saveQuestionAction(input: { question: string }) {
  const question = input.question.trim();
  if (!question) return { synced: false as const, validation: true as const };
  const { supabase, user } = await currentSession();
  if (!user || !supabase) return { synced: false as const };
  const { data, error } = await supabase.from("canetta_questions").insert({ user_id: user.id, question }).select("id, recorded_at").single();
  return error ? { synced: false as const } : { synced: true as const, id: data.id, recordedAt: data.recorded_at };
}

export async function saveWorkoutAction(input: {
  exerciseExternalId?: string;
  exerciseName: string;
  bodyPart?: string;
  equipment?: string;
  setsCompleted?: number;
  repsCompleted?: string;
  difficultyFelt?: string;
  note?: string;
}) {
  const exerciseName = input.exerciseName.trim();
  if (!exerciseName) return { synced: false as const, validation: true as const };
  const setsCompleted = Number.isFinite(input.setsCompleted) ? Math.max(0, Math.min(99, Math.round(input.setsCompleted ?? 0))) : null;
  const { supabase, user } = await currentSession();
  if (!user || !supabase) return { synced: false as const };
  const { data, error } = await supabase.from("canetta_workout_logs").insert({
    user_id: user.id,
    exercise_external_id: input.exerciseExternalId || null,
    exercise_name: exerciseName,
    body_part: input.bodyPart || null,
    equipment: input.equipment || null,
    sets_completed: setsCompleted,
    reps_completed: input.repsCompleted?.trim() || null,
    difficulty_felt: input.difficultyFelt || null,
    note: input.note?.trim() || null
  }).select("id, completed_at").single();
  return error ? { synced: false as const } : { synced: true as const, id: data.id, completedAt: data.completed_at };
}

export async function saveSessionCheckinAction(input: {
  sessionDate?: string;
  sessionLabel?: string;
  data: import("@/lib/ai/anamnesis").SessionCheckinData;
  gate: import("@/lib/ai/anamnesis").GateResult | null;
}) {
  const { supabase, user } = await currentSession();
  if (!user || !supabase) return { saved: false as const, authenticated: false as const };
  const { evaluateSessionCheckin } = await import("@/lib/ai/anamnesis");
  const result = evaluateSessionCheckin(input.data, input.gate);
  const sessionDate = input.sessionDate && /^\d{4}-\d{2}-\d{2}$/.test(input.sessionDate) ? input.sessionDate : new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase.from("canetta_session_checkins").upsert({
    user_id: user.id,
    session_date: sessionDate,
    session_label: input.sessionLabel?.trim() || "sessao",
    status: result.status,
    data: input.data
  }, { onConflict: "user_id,session_date,session_label" }).select("id, session_date, session_label, status, data, created_at").single();
  if (error) return { saved: false as const, authenticated: true as const, error: "Não foi possível salvar o check-in da sessão." };
  return { saved: true as const, authenticated: true as const, checkin: data, result };
}

export async function saveWorkoutFeedbackAction(input: {
  workoutLogId?: string;
  completed: boolean;
  rpe?: number;
  symptomsDuring?: string[];
  symptomsAfter?: string[];
  note?: string;
}) {
  const { supabase, user } = await currentSession();
  if (!user || !supabase) return { saved: false as const, authenticated: false as const };
  const rpe = input.rpe == null ? null : Math.max(1, Math.min(10, Math.round(input.rpe)));
  const { data, error } = await supabase.from("canetta_workout_feedback").insert({
    user_id: user.id,
    workout_log_id: input.workoutLogId || null,
    completed: !!input.completed,
    rpe,
    symptoms_during: input.symptomsDuring ?? [],
    symptoms_after: input.symptomsAfter ?? [],
    note: input.note?.trim() || null
  }).select("id, workout_log_id, completed, rpe, symptoms_during, symptoms_after, note, created_at").single();
  if (error) return { saved: false as const, authenticated: true as const, error: "Não foi possível salvar o feedback da sessão." };
  return { saved: true as const, authenticated: true as const, feedback: data };
}

export async function saveTrainingReassessmentAction(input: {
  anchorStrength: string;
  functionLevel: string;
  painLevel: string;
  adherence: string;
  medicationChange: boolean;
  note?: string;
}) {
  const { supabase, user } = await currentSession();
  if (!user || !supabase) return { saved: false as const, authenticated: false as const };
  const values = [input.anchorStrength, input.functionLevel, input.painLevel, input.adherence];
  if (values.some((value) => !value?.trim())) return { saved: false as const, authenticated: true as const, validation: true as const };
  const { data, error } = await supabase.from("canetta_training_reassessments").insert({
    user_id: user.id,
    anchor_strength: input.anchorStrength,
    function_level: input.functionLevel,
    pain_level: input.painLevel,
    adherence: input.adherence,
    medication_change: !!input.medicationChange,
    note: input.note?.trim() || null
  }).select("id, anchor_strength, function_level, pain_level, adherence, medication_change, note, created_at").single();
  if (error) return { saved: false as const, authenticated: true as const, error: "Não foi possível salvar a reavaliação." };
  return { saved: true as const, authenticated: true as const, reassessment: data };
}

export async function saveReminderAction(input: { active: boolean; weekday?: number; time?: string }) {
  const { supabase, user } = await currentSession();
  if (!user || !supabase) return { synced: false as const };
  const { data: existing } = await supabase.from("canetta_reminders").select("id").eq("user_id", user.id).limit(1);
  const id = existing?.[0]?.id;

  if (!input.active) {
    if (!id) return { synced: true as const };
    const { error } = await supabase.from("canetta_reminders").update({ active: false }).eq("id", id).eq("user_id", user.id);
    return { synced: !error };
  }

  const weekday = Number(input.weekday);
  const time = `${input.time ?? ""}`;
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 || !/^\d{2}:\d{2}$/.test(time)) {
    return { synced: false as const, validation: true as const };
  }

  const reminder = { user_id: user.id, weekday, time, active: true };
  const query = id
    ? supabase.from("canetta_reminders").update(reminder).eq("id", id).eq("user_id", user.id)
    : supabase.from("canetta_reminders").insert(reminder);
  const { error } = await query;
  return { synced: !error };
}

type BrowserPushSubscription = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export async function getPushPublicKeyAction() {
  const publicKey = getVapidPublicKey();
  return { available: !!publicKey, publicKey };
}

export async function savePushSubscriptionAction(input: { subscription: BrowserPushSubscription; userAgent?: string }) {
  const { supabase, user } = await currentSession();
  if (!user || !supabase) return { saved: false as const, authenticated: false as const };

  const endpoint = input.subscription.endpoint;
  const p256dh = input.subscription.keys?.p256dh;
  const auth = input.subscription.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return { saved: false as const, authenticated: true as const, validation: true as const };
  }

  const { error } = await supabase.from("canetta_push_subscriptions").upsert({
    user_id: user.id,
    endpoint,
    p256dh,
    auth,
    user_agent: input.userAgent?.slice(0, 300) || null,
    enabled: true,
    updated_at: new Date().toISOString()
  }, { onConflict: "endpoint" });

  return { saved: !error, authenticated: true as const };
}

export async function disablePushSubscriptionAction(endpoint?: string) {
  const { supabase, user } = await currentSession();
  if (!user || !supabase) return { disabled: false as const, authenticated: false as const };
  if (!endpoint) return { disabled: false as const, authenticated: true as const, validation: true as const };

  const { error } = await supabase
    .from("canetta_push_subscriptions")
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  return { disabled: !error, authenticated: true as const };
}

export async function sendTestPushAction(endpoint?: string) {
  const { supabase, user } = await currentSession();
  if (!user || !supabase) return { sent: false as const, authenticated: false as const };

  let query = supabase
    .from("canetta_push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", user.id)
    .eq("enabled", true)
    .limit(1);

  if (endpoint) query = query.eq("endpoint", endpoint);

  const { data, error } = await query;
  const subscription = data?.[0];
  if (error || !subscription) return { sent: false as const, authenticated: true as const };

  try {
    const webpush = configureWebPush();
    await webpush.sendNotification({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      }
    }, JSON.stringify({
      title: "Canetta",
      body: "Push ativado. Vou te lembrar da dose no horário configurado.",
      url: "/journey"
    }));
    return { sent: true as const, authenticated: true as const };
  } catch {
    return { sent: false as const, authenticated: true as const };
  }
}

export async function saveProfileAction(input: {
  name: string;
  medication: string;
  dose: string;
  frequency: string;
}) {
  const { supabase, user } = await currentSession();
  if (!user || !supabase) return { synced: false as const, authenticated: false as const };

  const { error } = await supabase.from("canetta_profiles").upsert({
    user_id: user.id,
    name: input.name.trim() || null,
    medication: input.medication.trim() || null,
    current_dose: input.dose.trim() || null,
    frequency: input.frequency.trim() || null,
    stage: "usa"
  }, { onConflict: "user_id" });

  return { synced: !error, authenticated: true as const };
}

export async function exportMyDataAction() {
  const { supabase, user } = await currentSession();
  if (!user || !supabase) return { authenticated: false as const };

  const tables = [
    "canetta_profiles",
    "canetta_journey_state",
    "canetta_journey_state_log",
    "canetta_dose_applications",
    "canetta_missed_doses",
    "canetta_weight_entries",
    "canetta_daily_checkins",
    "canetta_weekly_checkins",
    "canetta_side_effects",
    "canetta_body_measurements",
    "canetta_nutrition_entries",
    "canetta_personal_reports",
    "canetta_reminders",
    "canetta_push_subscriptions",
    "canetta_workout_logs",
    "canetta_session_checkins",
    "canetta_workout_feedback",
    "canetta_training_reassessments",
    "canetta_ai_workout_plans",
    "canetta_training_profiles",
    "canetta_anamnesis",
    "canetta_routine_entries",
    "canetta_questions"
  ] as const;

  const results = await Promise.all(
    tables.map(async (table) => {
      const { data, error } = await supabase.from(table).select("*").eq("user_id", user.id);
      return { table, data: data ?? [], error };
    })
  );

  if (results.some((result) => result.error)) {
    return { authenticated: true as const, error: "Não foi possível exportar todos os dados agora." };
  }

  return {
    authenticated: true as const,
    exportedAt: new Date().toISOString(),
    userId: user.id,
    data: Object.fromEntries(results.map((result) => [result.table, result.data]))
  };
}

export async function deleteMyAccountAction(confirmation: string) {
  if (confirmation !== "APAGAR") {
    return { deleted: false as const, validation: true as const };
  }

  const { supabase, user } = await currentSession();
  if (!user || !supabase) return { deleted: false as const, authenticated: false as const };

  const { error } = await supabase.rpc("canetta_delete_my_account");
  if (error) {
    return {
      deleted: false as const,
      authenticated: true as const,
      error: "Não foi possível apagar a conta. Tente novamente ou fale com o suporte."
    };
  }

  await supabase.auth.signOut();
  return { deleted: true as const, authenticated: true as const };
}

export type AiWorkoutPlanRow = {
  week_start: string;
  focus: string;
  rationale: string | null;
  risk_level: "low" | "medium" | "high" | null;
  nutrition_advice: string | null;
  warning: string | null;
  workouts: Array<{
    day: string;
    focus: string;
    exercises: Array<{ name: string; name_pt?: string | null; pattern?: string; sets: number; reps: string; why: string; gif_url?: string | null; image_url?: string | null }>;
  }>;
  created_at: string;
};

export type TrainingProfileRow = {
  experience_level: "nunca_treinei" | "retomando" | "treino_regular";
  training_location: "casa_sem_equipamento" | "casa_com_equipamento" | "academia";
  days_per_week: number;
  minutes_per_session: number;
  limitations: string | null;
};

export async function loadAiWorkoutPlanAction() {
  const { supabase, user } = await currentSession();
  if (!user || !supabase) return { authenticated: false as const };

  const [planResult, trainingResult, anamnesisResult] = await Promise.all([
    supabase
      .from("canetta_ai_workout_plans")
      .select("week_start, focus, rationale, risk_level, nutrition_advice, warning, workouts, created_at")
      .eq("user_id", user.id)
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("canetta_training_profiles")
      .select("experience_level, training_location, days_per_week, minutes_per_session, limitations")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("canetta_anamnesis")
      .select("data, consent")
      .eq("user_id", user.id)
      .maybeSingle()
  ]);

  if (planResult.error) {
    return { authenticated: true as const, error: "Não foi possível carregar o plano agora." };
  }

  const { evaluateGate } = await import("@/lib/ai/anamnesis");
  const anamnesisData = (anamnesisResult.data?.data as import("@/lib/ai/anamnesis").AnamnesisData | undefined) ?? null;
  const consent = anamnesisResult.data?.consent === true;
  const gate = evaluateGate(anamnesisData, consent);

  return {
    authenticated: true as const,
    plan: (planResult.data as AiWorkoutPlanRow | null) ?? null,
    trainingProfile: (trainingResult.data as TrainingProfileRow | null) ?? null,
    anamnesis: anamnesisData,
    gate
  };
}

export async function saveAnamnesisAction(data: import("@/lib/ai/anamnesis").AnamnesisData, consent: boolean) {
  const { supabase, user } = await currentSession();
  if (!user || !supabase) return { saved: false as const, authenticated: false as const };

  const { error } = await supabase.from("canetta_anamnesis").upsert(
    { user_id: user.id, data, consent, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );

  if (error) {
    return { saved: false as const, authenticated: true as const, error: "Não foi possível salvar a triagem agora." };
  }

  const { evaluateGate } = await import("@/lib/ai/anamnesis");
  return { saved: true as const, authenticated: true as const, gate: evaluateGate(data, consent) };
}

export async function saveTrainingProfileAction(input: TrainingProfileRow) {
  const { supabase, user } = await currentSession();
  if (!user || !supabase) return { saved: false as const, authenticated: false as const };

  const { error } = await supabase.from("canetta_training_profiles").upsert(
    {
      user_id: user.id,
      experience_level: input.experience_level,
      training_location: input.training_location,
      days_per_week: input.days_per_week,
      minutes_per_session: input.minutes_per_session,
      limitations: input.limitations?.trim() || null,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return { saved: false as const, authenticated: true as const, error: "Não foi possível salvar a anamnese agora." };
  }

  return { saved: true as const, authenticated: true as const };
}

export async function generateAiWorkoutPlanAction() {
  const { supabase, user } = await currentSession();
  if (!user || !supabase) return { authenticated: false as const };

  try {
    const { prescribeWeeklyWorkout, GateBlockedError } = await import("@/lib/ai/prescribe-workout");
    try {
      await prescribeWeeklyWorkout(user.id);
    } catch (err) {
      if (err instanceof GateBlockedError) {
        return { authenticated: true as const, generated: false as const, blockedGate: err.gate };
      }
      throw err;
    }
  } catch (err) {
    console.error("generateAiWorkoutPlanAction failed:", err);
    return {
      authenticated: true as const,
      generated: false as const,
      error: "Não foi possível gerar o plano agora. Tente novamente em instantes."
    };
  }

  return loadAiWorkoutPlanAction();
}
