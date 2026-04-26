import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { reservationUpdateTemplate } from "../_shared/email/templates.ts";
import { sendEmailWithResend } from "../_shared/email/resend.ts";

const BATCH_LIMIT = 30;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getReminderWindowMs(row: any) {
  const durationType = row.details?.durationType;

  if (row.unit_type === "parking_slot") {
    if (durationType === "hours") return 30 * 60 * 1000;
    if (durationType === "days") return 24 * 60 * 60 * 1000;
    if (durationType === "months") return 3 * 24 * 60 * 60 * 1000;
  }

  if (row.unit_type === "function_hall") {
    return 24 * 60 * 60 * 1000;
  }

  if (
    row.unit_type === "rental_space" &&
    row.reservation_type === "flexible_stay"
  ) {
    return 24 * 60 * 60 * 1000;
  }

  return null;
}

function isSupportedUsageLifecycle(row: any) {
  if (row.unit_type === "parking_slot") return true;
  if (row.unit_type === "function_hall") return true;

  return (
    row.unit_type === "rental_space" &&
    row.reservation_type === "flexible_stay"
  );
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return json(405, { error: "Method not allowed." });
    }

    const cronSecret = Deno.env.get("USAGE_LIFECYCLE_CRON_SECRET");
    const authHeader = req.headers.get("Authorization");

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return json(401, { error: "Unauthorized." });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const appUrl =
      Deno.env.get("APP_URL") ||
      Deno.env.get("SITE_URL") ||
      "https://commercialesflores.com";

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase environment variables.");
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const now = new Date();
    const nowIso = now.toISOString();
    const maxReminderLookahead = new Date(
      now.getTime() + 3 * 24 * 60 * 60 * 1000
    ).toISOString();

    const stats = {
      remindersSent: 0,
      endedSent: 0,
      skipped: [] as Array<{ reservationId: string; reason: string }>,
    };

    const { data: reminderRows, error: reminderError } = await admin
      .from("reservations")
      .select(`
        reservation_id,
        public_id,
        user_id,
        unit_type,
        reservation_type,
        status,
        details,
        usage_status,
        usage_ends_at,
        usage_end_reminder_sent_at,
        users!reservations_user_id_fkey (
          email,
          first_name,
          last_name
        )
      `)
      .in("status", ["approved", "confirmed"])
      .eq("usage_status", "active")
      .is("usage_end_reminder_sent_at", null)
      .gt("usage_ends_at", nowIso)
      .lte("usage_ends_at", maxReminderLookahead)
      .limit(BATCH_LIMIT);

    if (reminderError) throw reminderError;

    for (const row of reminderRows ?? []) {
      if (!isSupportedUsageLifecycle(row)) continue;

      const reminderWindowMs = getReminderWindowMs(row);
      if (!reminderWindowMs || !row.usage_ends_at) continue;

      const endsAt = new Date(row.usage_ends_at);
      const msUntilEnd = endsAt.getTime() - now.getTime();

      if (msUntilEnd > reminderWindowMs) continue;

      const customer = Array.isArray(row.users) ? row.users[0] : row.users;
      const email = customer?.email;

      if (!email) {
        stats.skipped.push({
          reservationId: row.reservation_id,
          reason: "missing_customer_email",
        });
        continue;
      }

      const customerName =
        [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
        null;

      const template = reservationUpdateTemplate({
        customerName,
        reservationPublicId: row.public_id,
        action: "usage_ending_soon",
        notes:
          row.unit_type === "parking_slot"
            ? "Your parking reservation is ending soon. Please prepare to vacate your assigned slot."
            : "Your reservation period is ending soon. Please review your reservation details.",
        appUrl,
      });

      await sendEmailWithResend({
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      await admin.from("notifications").insert({
        user_id: row.user_id,
        title: template.subject,
        message: template.message ?? "Your reservation is ending soon.",
        type: "reservation",
        is_read: false,
        date: nowIso,
        related_table: "reservations",
        related_id: row.reservation_id,
        action_url: `/reservations/${row.public_id}`,
      });

      await admin
        .from("reservations")
        .update({
          usage_end_reminder_sent_at: nowIso,
          updated_at: nowIso,
        })
        .eq("reservation_id", row.reservation_id)
        .is("usage_end_reminder_sent_at", null);

      stats.remindersSent += 1;
    }

    const { data: endedRows, error: endedError } = await admin
      .from("reservations")
      .select(`
        reservation_id,
        public_id,
        user_id,
        unit_type,
        reservation_type,
        status,
        details,
        usage_status,
        usage_ends_at,
        usage_end_notified_at,
        users!reservations_user_id_fkey (
          email,
          first_name,
          last_name
        )
      `)
      .in("status", ["approved", "confirmed"])
      .eq("usage_status", "active")
      .is("usage_end_notified_at", null)
      .lte("usage_ends_at", nowIso)
      .limit(BATCH_LIMIT);

    if (endedError) throw endedError;

    for (const row of endedRows ?? []) {
      if (!isSupportedUsageLifecycle(row)) continue;

      const customer = Array.isArray(row.users) ? row.users[0] : row.users;
      const email = customer?.email;

      if (!email) {
        stats.skipped.push({
          reservationId: row.reservation_id,
          reason: "missing_customer_email",
        });
        continue;
      }

      const customerName =
        [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
        null;

      const template = reservationUpdateTemplate({
        customerName,
        reservationPublicId: row.public_id,
        action: "usage_ended",
        notes:
          row.unit_type === "parking_slot"
            ? "Your parking reservation has ended. The assigned slot has now been released."
            : "Your reservation period has ended.",
        appUrl,
      });

      await sendEmailWithResend({
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      await admin.from("notifications").insert({
        user_id: row.user_id,
        title: template.subject,
        message: template.message ?? "Your reservation period has ended.",
        type: "reservation",
        is_read: false,
        date: nowIso,
        related_table: "reservations",
        related_id: row.reservation_id,
        action_url: `/reservations/${row.public_id}`,
      });

      await admin
        .from("reservations")
        .update({
          usage_status: "ended",
          usage_ended_at: nowIso,
          usage_end_notified_at: nowIso,
          updated_at: nowIso,
        })
        .eq("reservation_id", row.reservation_id)
        .eq("usage_status", "active")
        .is("usage_end_notified_at", null);

      stats.endedSent += 1;
    }

    await admin.from("audit_log").insert({
      user_id: null,
      action: "USAGE_LIFECYCLE_REMINDERS_SENT",
      target_table: "reservations",
      target_id: null,
      target_public_id: null,
      changed_fields: ["usage_end_reminder", "usage_end_notification"],
      notes: `Usage lifecycle runner completed. Reminders: ${stats.remindersSent}, ended: ${stats.endedSent}.`,
      timestamp: nowIso,
    });

    return json(200, { success: true, ...stats });
  } catch (error) {
    console.error("send-usage-lifecycle-reminders error:", error);

    return json(500, {
      success: false,
      error: error instanceof Error ? error.message : "Unexpected error.",
    });
  }
});