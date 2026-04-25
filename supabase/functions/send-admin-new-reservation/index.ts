import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { sendEmailWithResend } from "../_shared/email/resend.ts";
import { adminNewReservationTemplate } from "../_shared/email/templates.ts";

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

type AdminRow = {
  user_id: string;
  email: string | null;
  first_name: string | null;
};

type Payload = {
  reservationId: string;
  reservationPublicId: string;
  customerName?: string | null;
  unitTitle?: string | null;
  unitType?: string | null;
  reservationType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  amount?: number | null;
};

const RESERVATION_TYPE_LABELS: Record<string, string> = {
  flexible_stay: "Flexible Stay",
  monthly_lease: "Monthly Lease",
  function_hall: "Function Hall Booking",
  parking: "Parking Booking",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const secret = Deno.env.get("ADMIN_NEW_RESERVATION_SECRET");

    if (!secret) {
      return jsonResponse(
        { success: false, reason: "Missing ADMIN_NEW_RESERVATION_SECRET." },
        500
      );
    }

    if (authHeader !== `Bearer ${secret}`) {
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

    const payload = (await req.json()) as Payload;

    if (!payload?.reservationId || !payload?.reservationPublicId) {
      return jsonResponse(
        {
          success: false,
          reason: "reservationId and reservationPublicId are required.",
        },
        400
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const nowIso = new Date().toISOString();

    const reservationTypeLabel =
      RESERVATION_TYPE_LABELS[payload.reservationType ?? ""] ??
      payload.reservationType ??
      "Reservation";

    const { data: admins, error: adminsError } = await admin
      .from("users")
      .select("user_id, email, first_name")
      .eq("role", "admin")
      .eq("is_active", true);

    if (adminsError) throw adminsError;

    let notified = 0;
    let emailed = 0;
    const skipped: Array<{ adminId?: string; reason: string }> = [];

    for (const recipient of (admins ?? []) as AdminRow[]) {
      const emailTemplate = adminNewReservationTemplate({
        adminName: recipient.first_name,
        customerName: payload.customerName,
        reservationPublicId: payload.reservationPublicId,
        unitTitle: payload.unitTitle,
        unitType: payload.unitType
          ? `${payload.unitType} · ${reservationTypeLabel}`
          : reservationTypeLabel,
        startDate: payload.startDate,
        endDate: payload.endDate,
        amount: payload.amount,
        appUrl,
      });

      const { error: notificationError } = await admin
        .from("notifications")
        .insert({
          user_id: recipient.user_id,
          title: emailTemplate.subject,
          message:
            emailTemplate.message ??
            `New ${reservationTypeLabel} request ${payload.reservationPublicId} requires review.`,
          type: "reservation",
          is_read: false,
          date: nowIso,
          related_table: "reservations",
          related_id: payload.reservationId,
          action_url: `/admin/reservations/${payload.reservationPublicId}`,
        });

      if (notificationError) {
        skipped.push({
          adminId: recipient.user_id,
          reason: `notification_insert_failed:${notificationError.message}`,
        });
        continue;
      }

      notified += 1;

      if (!recipient.email) {
        skipped.push({
          adminId: recipient.user_id,
          reason: "missing_email",
        });
        continue;
      }

      try {
        await sendEmailWithResend({
          to: recipient.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text,
        });

        emailed += 1;
      } catch (error) {
        skipped.push({
          adminId: recipient.user_id,
          reason:
            error instanceof Error
              ? `email_send_failed:${error.message}`
              : "email_send_failed",
        });
      }
    }

    await admin.from("audit_log").insert({
      user_id: null,
      action: "ADMIN_NEW_RESERVATION_ALERT_SENT",
      target_table: "reservations",
      target_id: payload.reservationId,
      target_public_id: payload.reservationPublicId,
      changed_fields: ["admin_notification"],
      notes: `New ${reservationTypeLabel} alert sent to ${notified} admins.`,
      timestamp: nowIso,
    });

    return jsonResponse({
      success: true,
      reservationId: payload.reservationId,
      adminsFound: (admins ?? []).length,
      notified,
      emailed,
      skipped,
    });
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        reason: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});