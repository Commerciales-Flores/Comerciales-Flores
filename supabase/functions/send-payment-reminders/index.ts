import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { sendEmailWithResend } from "../_shared/email/resend.ts";
import { paymentReminderTemplate } from "../_shared/email/templates.ts";

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

type ReminderStage = "three_day" | "one_day" | "same_day";

type ReservationRow = {
  reservation_id: string;
  user_id: string;
  public_id: string | null;
  end_date: string;
  total_amount: number | null;
  paid_amount: number | null;
  status: string | null;
  last_payment_reminder_at: string | null;
  last_payment_reminder_stage: string | null;
};

type UserRow = {
  email: string | null;
  first_name: string | null;
};

function getRemainingBalance(totalAmount: number | null, paidAmount: number | null) {
  return Math.max(Number(totalAmount || 0) - Number(paidAmount || 0), 0);
}

function getManilaNowParts(now = new Date()) {
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

  const parts = formatter.formatToParts(now);
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

function isWithinReminderHours(now = new Date()) {
  const { hour } = getManilaNowParts(now);
  return hour >= 8 && hour < 20;
}

function getReminderStage(
  endDateIso: string,
  now = new Date()
): ReminderStage | null {
  const manilaNow = getManilaNowParts(now);
  const manilaEnd = getManilaNowParts(new Date(endDateIso));

  const todayUtc = Date.UTC(manilaNow.year, manilaNow.month - 1, manilaNow.day);
  const endUtc = Date.UTC(manilaEnd.year, manilaEnd.month - 1, manilaEnd.day);

  const diffDays = Math.floor((endUtc - todayUtc) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return null;
  if (diffDays === 0) return "same_day";
  if (diffDays === 1) return "one_day";
  if (diffDays <= 3) return "three_day";

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const cronSecret = Deno.env.get("PAYMENT_REMINDER_SECRET");

    if (!cronSecret) {
      return jsonResponse(
        { success: false, reason: "Missing PAYMENT_REMINDER_SECRET." },
        500
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return jsonResponse(
        { success: false, reason: "Unauthorized request." },
        401
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const appUrl =
      Deno.env.get("APP_URL") ||
      Deno.env.get("SITE_URL") ||
      "https://commercialesflores.com";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return jsonResponse(
        { success: false, reason: "Missing server configuration." },
        500
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    const now = new Date();
    const nowIso = now.toISOString();

    if (!isWithinReminderHours(now)) {
      return jsonResponse({
        success: true,
        scanned: 0,
        notified: 0,
        emailed: 0,
        skipped: [],
        reason: "outside_manila_business_hours",
      });
    }

    const { data: reservations, error: reservationsError } = await supabaseAdmin
      .from("reservations")
      .select(`
        reservation_id,
        user_id,
        public_id,
        end_date,
        total_amount,
        paid_amount,
        status,
        last_payment_reminder_at,
        last_payment_reminder_stage
      `)
      .eq("status", "confirmed")
      .not("end_date", "is", null);

    if (reservationsError) {
      throw reservationsError;
    }

    let scanned = 0;
    let notified = 0;
    let emailed = 0;

    const skipped: Array<{ reservationId: string; reason: string }> = [];

    for (const reservation of (reservations ?? []) as ReservationRow[]) {
      scanned += 1;

      const remainingBalance = getRemainingBalance(
        reservation.total_amount,
        reservation.paid_amount
      );

      if (remainingBalance <= 0) {
        skipped.push({
          reservationId: reservation.reservation_id,
          reason: "fully_paid",
        });
        continue;
      }

      const stage = getReminderStage(reservation.end_date, now);
      if (!stage) {
        skipped.push({
          reservationId: reservation.reservation_id,
          reason: "outside_reminder_window",
        });
        continue;
      }

      const todayManila = getManilaNowParts(now).dateKey;
      const lastReminderManila = reservation.last_payment_reminder_at
        ? getManilaNowParts(new Date(reservation.last_payment_reminder_at)).dateKey
        : null;

      if (
        reservation.last_payment_reminder_stage === stage &&
        lastReminderManila === todayManila
      ) {
        skipped.push({
          reservationId: reservation.reservation_id,
          reason: `already_sent_${stage}_today`,
        });
        continue;
      }

      const publicId = reservation.public_id || reservation.reservation_id;

      const { data: userProfile, error: userError } = await supabaseAdmin
        .from("users")
        .select("email, first_name")
        .eq("user_id", reservation.user_id)
        .maybeSingle<UserRow>();

      if (userError) {
        skipped.push({
          reservationId: reservation.reservation_id,
          reason: `user_lookup_failed:${userError.message}`,
        });
        continue;
      }

      const reminder = paymentReminderTemplate({
        customerName: userProfile?.first_name,
        reservationPublicId: publicId,
        remainingBalance,
        endDate: reservation.end_date,
        stage,
        appUrl,
      });

      const { error: notificationError } = await supabaseAdmin
        .from("notifications")
        .insert({
          user_id: reservation.user_id,
          title: reminder.subject,
          message: reminder.message,
          type: "payment",
          is_read: false,
          date: nowIso,
        });

      if (notificationError) {
        skipped.push({
          reservationId: reservation.reservation_id,
          reason: `notification_insert_failed:${notificationError.message}`,
        });
        continue;
      }

      notified += 1;

      if (!userProfile?.email) {
        skipped.push({
          reservationId: reservation.reservation_id,
          reason: "missing_email",
        });
      } else {
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
            `Payment reminder email failed for reservation ${reservation.reservation_id}:`,
            emailError
          );

          skipped.push({
            reservationId: reservation.reservation_id,
            reason:
              emailError instanceof Error
                ? `email_send_failed:${emailError.message}`
                : "email_send_failed",
          });
        }
      }

      const { error: updateError } = await supabaseAdmin
        .from("reservations")
        .update({
          last_payment_reminder_at: nowIso,
          last_payment_reminder_stage: stage,
          updated_at: nowIso,
        })
        .eq("reservation_id", reservation.reservation_id);

      if (updateError) {
        skipped.push({
          reservationId: reservation.reservation_id,
          reason: `reminder_tracking_update_failed:${updateError.message}`,
        });
        continue;
      }
    }

    return jsonResponse({
      success: true,
      scanned,
      notified,
      emailed,
      skipped,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return jsonResponse({ success: false, reason: message }, 500);
  }
});