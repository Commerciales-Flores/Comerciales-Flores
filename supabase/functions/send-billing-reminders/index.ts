import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { sendEmailWithResend } from "../_shared/sendEmailWithResend.ts";
import { billingReminderTemplate } from "../_shared/templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

type BillingStage = "upcoming" | "due" | "overdue";
type BillingType = "monthly" | "quarterly" | "full" | null;

type ReservationRow = {
  reservation_id: string;
  user_id: string;
  public_id: string | null;
  start_date: string | null;
  end_date: string | null;
  total_amount: number | null;
  paid_amount: number | null;
  details: {
    paymentCycle?: BillingType;
  } | null;
  last_billing_reminder_at: string | null;
  last_billing_reminder_stage: string | null;
  last_billing_due_date: string | null;
  last_billing_cycle_type: string | null;
};

type UserRow = {
  email: string | null;
  first_name: string | null;
};

function getManilaParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
    dateKey: `${map.year}-${map.month}-${map.day}`,
  };
}

function getManilaDateKey(date = new Date()) {
  return getManilaParts(date).dateKey;
}

function isWithinBusinessHours(date = new Date()) {
  const { hour } = getManilaParts(date);
  return hour >= 8 && hour < 20;
}

function getRemainingBalance(totalAmount: number | null, paidAmount: number | null) {
  return Math.max(Number(totalAmount || 0) - Number(paidAmount || 0), 0);
}

function addMonthsSafe(date: Date, months: number) {
  const result = new Date(date);
  const originalDay = result.getDate();

  result.setMonth(result.getMonth() + months);

  if (result.getDate() < originalDay) {
    result.setDate(0);
  }

  return result;
}

function getBillingType(details: ReservationRow["details"]): BillingType {
  const value = details?.paymentCycle;
  if (value === "monthly" || value === "quarterly" || value === "full") {
    return value;
  }
  return null;
}

function getNextDueDate(
  startDateIso: string,
  billingType: Exclude<BillingType, null | "full">,
  now = new Date()
) {
  const intervalMonths = billingType === "monthly" ? 1 : 3;
  let dueDate = new Date(startDateIso);

  while (dueDate.getTime() < now.getTime()) {
    dueDate = addMonthsSafe(dueDate, intervalMonths);
  }

  return dueDate;
}

function getBillingStage(dueDate: Date, now = new Date()): BillingStage | null {
  const manilaNow = getManilaParts(now);
  const manilaDue = getManilaParts(dueDate);

  const todayUtc = Date.UTC(manilaNow.year, manilaNow.month - 1, manilaNow.day);
  const dueUtc = Date.UTC(manilaDue.year, manilaDue.month - 1, manilaDue.day);
  const diffDays = Math.floor((dueUtc - todayUtc) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "due";
  if (diffDays <= 3) return "upcoming";
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const cronSecret = Deno.env.get("BILLING_REMINDER_SECRET");

    if (!cronSecret) {
      return jsonResponse(
        { success: false, reason: "Missing BILLING_REMINDER_SECRET." },
        500
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return jsonResponse({ success: false, reason: "Unauthorized." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const appUrl =
      Deno.env.get("APP_URL") ||
      Deno.env.get("SITE_URL") ||
      "https://commercialesflores.com";

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        { success: false, reason: "Missing server configuration." },
        500
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const now = new Date();
    const nowIso = now.toISOString();
    const todayKey = getManilaDateKey(now);

    if (!isWithinBusinessHours(now)) {
      return jsonResponse({
        success: true,
        scanned: 0,
        notified: 0,
        emailed: 0,
        skipped: [],
        reason: "outside_business_hours",
      });
    }

    const { data: reservations, error } = await admin
      .from("reservations")
      .select(`
        reservation_id,
        user_id,
        public_id,
        start_date,
        end_date,
        total_amount,
        paid_amount,
        details,
        last_billing_reminder_at,
        last_billing_reminder_stage,
        last_billing_due_date,
        last_billing_cycle_type
      `)
      .eq("status", "confirmed");

    if (error) throw error;

    let scanned = 0;
    let notified = 0;
    let emailed = 0;

    const skipped: Array<{ reservationId: string; reason: string }> = [];

    for (const rawReservation of (reservations ?? []) as ReservationRow[]) {
      scanned += 1;

      const reservationId = rawReservation.reservation_id;
      const publicId = rawReservation.public_id || rawReservation.reservation_id;
      const billingType = getBillingType(rawReservation.details);

      if (!billingType || billingType === "full") {
        skipped.push({ reservationId, reason: "not_recurring" });
        continue;
      }

      if (!rawReservation.start_date) {
        skipped.push({ reservationId, reason: "missing_start_date" });
        continue;
      }

      const remainingBalance = getRemainingBalance(
        rawReservation.total_amount,
        rawReservation.paid_amount
      );

      if (remainingBalance <= 0) {
        skipped.push({ reservationId, reason: "fully_paid" });
        continue;
      }

      const dueDate = getNextDueDate(rawReservation.start_date, billingType, now);
      const stage = getBillingStage(dueDate, now);

      if (!stage) {
        skipped.push({ reservationId, reason: "not_in_window" });
        continue;
      }

      const dueDateIso = dueDate.toISOString();
      const dueDateKey = getManilaDateKey(dueDate);

      const lastReminderManila = rawReservation.last_billing_reminder_at
        ? getManilaDateKey(new Date(rawReservation.last_billing_reminder_at))
        : null;

      const lastDueDateKey = rawReservation.last_billing_due_date
        ? getManilaDateKey(new Date(rawReservation.last_billing_due_date))
        : null;

      if (
        rawReservation.last_billing_reminder_stage === stage &&
        rawReservation.last_billing_cycle_type === billingType &&
        lastReminderManila === todayKey &&
        lastDueDateKey === dueDateKey
      ) {
        skipped.push({
          reservationId,
          reason: `already_sent_${stage}_today`,
        });
        continue;
      }

      const { data: userProfile, error: userError } = await admin
        .from("users")
        .select("email, first_name")
        .eq("user_id", rawReservation.user_id)
        .maybeSingle<UserRow>();

      if (userError) {
        skipped.push({
          reservationId,
          reason: `user_lookup_failed:${userError.message}`,
        });
        continue;
      }

      if (!userProfile?.email) {
        skipped.push({
          reservationId,
          reason: "missing_email",
        });
        continue;
      }

      const reminder = billingReminderTemplate({
        customerName: userProfile.first_name,
        reservationPublicId: publicId,
        billingType,
        stage,
        dueDate,
        remainingBalance,
        appUrl,
      });

      const { error: notificationError } = await admin.from("notifications").insert({
        user_id: rawReservation.user_id,
        title: reminder.subject,
        message: reminder.message,
        type: "billing",
        is_read: false,
        date: nowIso,
      });

      if (notificationError) {
        skipped.push({
          reservationId,
          reason: `notification_insert_failed:${notificationError.message}`,
        });
        continue;
      }

      notified += 1;

      try {
        await sendEmailWithResend({
          to: userProfile.email,
          subject: reminder.subject,
          html: reminder.html,
          text: reminder.text,
        });
        emailed += 1;
      } catch (emailError) {
        console.error(
          `Billing email failed for reservation ${reservationId}:`,
          emailError
        );
      }

      const { error: updateError } = await admin
        .from("reservations")
        .update({
          last_billing_reminder_at: nowIso,
          last_billing_reminder_stage: stage,
          last_billing_due_date: dueDateIso,
          last_billing_cycle_type: billingType,
          updated_at: nowIso,
        })
        .eq("reservation_id", reservationId);

      if (updateError) {
        skipped.push({
          reservationId,
          reason: `billing_tracking_update_failed:${updateError.message}`,
        });
      }
    }

    return jsonResponse({
      success: true,
      scanned,
      notified,
      emailed,
      skipped,
    });
  } catch (err) {
    return jsonResponse(
      {
        success: false,
        reason: err instanceof Error ? err.message : "Unknown error",
      },
      500
    );
  }
});