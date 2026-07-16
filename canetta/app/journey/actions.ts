"use server";

import { createSupabaseServerClient } from "@/lib/supabase";
import { configureWebPush, getVapidPublicKey } from "@/lib/push";
import type { OnboardingPayload } from "@/app/onboarding/flow/actions";

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

  const [profileResult, applicationsResult, missedDosesResult, weightsResult, symptomsResult, routinesResult, questionsResult, remindersResult] = await Promise.all([
    supabase.from("canetta_profiles").select("name, medication, current_dose, frequency, biggest_difficulty").eq("user_id", user.id).maybeSingle(),
    supabase.from("canetta_dose_applications").select("id, medication, dose, site, note, applied_at").eq("user_id", user.id).order("applied_at", { ascending: true }),
    supabase.from("canetta_missed_doses").select("id, medication, dose, reason, note, scheduled_for, recorded_at").eq("user_id", user.id).order("scheduled_for", { ascending: true }),
    supabase.from("canetta_weight_entries").select("id, weight, recorded_at").eq("user_id", user.id).order("recorded_at", { ascending: true }),
    supabase.from("canetta_side_effects").select("id, types, intensity, duration, note, recorded_at").eq("user_id", user.id).order("recorded_at", { ascending: true }),
    supabase.from("canetta_routine_entries").select("id, water_cups, movement, sleep, hunger, note, photo, recorded_at").eq("user_id", user.id).order("recorded_at", { ascending: true }),
    supabase.from("canetta_questions").select("id, question, recorded_at").eq("user_id", user.id).order("recorded_at", { ascending: true }),
    supabase.from("canetta_reminders").select("id, weekday, time, active").eq("user_id", user.id).limit(1)
  ]);

  const error = profileResult.error || applicationsResult.error || missedDosesResult.error || weightsResult.error || symptomsResult.error || routinesResult.error || questionsResult.error || remindersResult.error;
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
    reminder: remindersResult.data?.[0] ?? null
  };
}

export async function saveApplicationAction(input: { medication: string; dose: string; site?: string; note?: string; appliedAt?: string }) {
  const { supabase, user } = await currentSession();
  if (!user || !supabase) return { synced: false as const };
  const appliedAt = input.appliedAt && !Number.isNaN(Date.parse(input.appliedAt)) ? input.appliedAt : new Date().toISOString();
  const { data, error } = await supabase.from("canetta_dose_applications").insert({
    user_id: user.id,
    medication: input.medication || null,
    dose: input.dose || null,
    site: applicationSite(input.site),
    note: input.note?.trim() || null,
    applied_at: appliedAt
  }).select("id, applied_at").single();
  return error ? { synced: false as const } : { synced: true as const, id: data.id, appliedAt: data.applied_at };
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

export async function saveSymptomAction(input: { type?: string; intensity: number; duration?: string; note?: string }) {
  const intensity = Math.max(0, Math.min(10, Math.round(input.intensity)));
  const { supabase, user } = await currentSession();
  if (!user || !supabase) return { synced: false as const };
  const { data, error } = await supabase.from("canetta_side_effects").insert({
    user_id: user.id,
    types: input.type ? [input.type] : [],
    intensity,
    duration: input.duration?.trim() || null,
    note: input.note?.trim() || null
  }).select("id, recorded_at").single();
  return error ? { synced: false as const } : { synced: true as const, id: data.id, recordedAt: data.recorded_at };
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
    "canetta_reminders",
    "canetta_push_subscriptions",
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
