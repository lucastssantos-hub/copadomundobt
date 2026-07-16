import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { configureWebPush } from "@/lib/push";

export const runtime = "nodejs";

type ReminderRow = {
  user_id: string;
  weekday: number;
  time: string;
  active: boolean;
};

type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  enabled: boolean;
};

function currentSaoPauloTime() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date());
  const weekdayText = parts.find((part) => part.type === "weekday")?.value || "Mon";
  const year = parts.find((part) => part.type === "year")?.value || "1970";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  const day = parts.find((part) => part.type === "day")?.value || "01";
  const hour = parts.find((part) => part.type === "hour")?.value || "00";
  const minute = parts.find((part) => part.type === "minute")?.value || "00";
  const weekday = ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>)[weekdayText] ?? 1;
  return { weekday, hour: Number(hour), minute: Number(minute), date: `${year}-${month}-${day}` };
}

function isReminderDue(time: string, currentHour: number) {
  const hour = Number(`${time}`.slice(0, 2));
  return Number.isInteger(hour) && hour === currentHour;
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const now = currentSaoPauloTime();
  const supabase = createSupabaseAdminClient();
  const webpush = configureWebPush();

  const { data, error } = await supabase
    .from("canetta_reminders")
    .select("user_id, weekday, time, active")
    .eq("active", true)
    .eq("weekday", now.weekday);

  if (error) {
    return NextResponse.json({ ok: false, error: "query_failed" }, { status: 500 });
  }

  const rows = (data ?? []) as ReminderRow[];
  const dueRows = rows.filter((row) => isReminderDue(row.time, now.hour));
  const userIds = Array.from(new Set(dueRows.map((row) => row.user_id)));
  const subscriptionsByUser = new Map<string, PushSubscriptionRow[]>();

  if (userIds.length) {
    const { data: subscriptionsData } = await supabase
      .from("canetta_push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth, enabled")
      .eq("enabled", true)
      .in("user_id", userIds);

    for (const subscription of (subscriptionsData ?? []) as PushSubscriptionRow[]) {
      const list = subscriptionsByUser.get(subscription.user_id) ?? [];
      list.push(subscription);
      subscriptionsByUser.set(subscription.user_id, list);
    }
  }

  let sent = 0;
  let disabled = 0;

  for (const row of dueRows) {
    const { error: logError } = await supabase.from("canetta_push_delivery_log").insert({
      user_id: row.user_id,
      delivery_date: now.date,
      delivery_hour: now.hour,
      kind: "dose_reminder"
    });
    if (logError) continue;

    const subscriptions = subscriptionsByUser.get(row.user_id) ?? [];
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
          }
        }, JSON.stringify({
          title: "Canetta",
          body: now.minute < 10 ? "Hora da sua dose. Registre quando aplicar." : "Lembrete da sua dose. Registre para manter o histórico em dia.",
          url: "/journey",
          tag: `canetta-dose-${row.user_id}`
        }));
        sent += 1;
      } catch (sendError) {
        const statusCode = typeof sendError === "object" && sendError && "statusCode" in sendError ? Number(sendError.statusCode) : 0;
        if ([404, 410].includes(statusCode)) {
          await supabase.from("canetta_push_subscriptions").update({
            enabled: false,
            updated_at: new Date().toISOString()
          }).eq("id", subscription.id);
          disabled += 1;
        }
      }
    }
  }

  return NextResponse.json({ ok: true, checked: rows.length, due: dueRows.length, sent, disabled });
}
