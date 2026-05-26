import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { reservationUpdateTemplate } from "../_shared/email/templates.ts";
import { sendEmailWithResend } from "../_shared/email/resend.ts";

type RequestBody = {
  reservationId: string;
  action:
    | "approved"
    | "rejected"
    | "completed"
    | "cancelled"
    | "confirmed"
    | "usage_ending_soon"
    | "usage_ended";
  notes?: string | null;
};

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

function json(origin: string | null, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(origin),
  });
}

serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    if (req.method !== "POST") {
      return json(origin, 405, { error: "Method not allowed." });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const appUrl =
      Deno.env.get("APP_URL") ||
      Deno.env.get("SITE_URL") ||
      "https://commercialesflores.com";

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Missing Supabase environment variables.");
    }

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return json(origin, 401, { error: "Missing authorization header." });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return json(origin, 401, { error: "Unauthorized." });
    }

    const { data: adminUser, error: adminUserError } = await adminClient
      .from("users")
      .select("user_id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminUserError) throw adminUserError;

    if (!adminUser || adminUser.role !== "admin") {
      return json(origin, 403, { error: "Admin access required." });
    }

    const body = (await req.json()) as RequestBody;

    if (!body.reservationId || !body.action) {
      return json(origin, 400, {
        error: "reservationId and action are required.",
      });
    }

    const { data: reservationRow, error: reservationError } = await adminClient
      .from("reservations")
      .select(`
        reservation_id,
        public_id,
        user_id,
        reservation_type,
        unit_type,
        status,
        amount_due,
        total_amount,
        start_date,
        parking_access_status,
        parking_access_expires_at,
        assigned_parking_slot_id,
        details,
        end_date,
        users!reservations_user_id_fkey (
          email,
          first_name,
          last_name
        )
      `)
      .eq("reservation_id", body.reservationId)
      .maybeSingle();

    if (reservationError) throw reservationError;

    if (!reservationRow) {
      return json(origin, 404, { error: "Reservation not found." });
    }
    if (
  body.action === "usage_ending_soon" ||
  body.action === "usage_ended"
) {
  const supported =
    reservationRow.unit_type === "parking_slot" ||
    reservationRow.unit_type === "function_hall" ||
    (
      reservationRow.unit_type === "rental_space" &&
      reservationRow.reservation_type === "flexible_stay"
    );

  if (!supported) {
    return json(origin, 400, {
      error:
        "Usage lifecycle notifications are not valid for this reservation type.",
    });
  }
}

    const customer = Array.isArray(reservationRow.users)
      ? reservationRow.users[0]
      : reservationRow.users;

    const recipientEmail = customer?.email;

    if (!recipientEmail) {
      return json(origin, 400, { error: "Customer email not found." });
    }

    const customerName =
      [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
      null;

    const paymentNote =
  body.action === "approved"
    ? reservationRow.unit_type === "parking_slot"
      ? "Your parking request has been approved. Your assigned access is now active for the approved period."
      : "Your reservation has been approved. Please complete the required payment to confirm your booking."
    : body.action === "confirmed"
      ? "Your reservation is now confirmed."
      : body.action === "usage_ending_soon"
        ? reservationRow.unit_type === "parking_slot"
          ? "Your parking reservation is ending soon. Please prepare to vacate your assigned slot."
          : reservationRow.unit_type === "function_hall"
            ? "Your function hall reservation is ending soon."
            : "Your stay reservation is ending soon."
        : body.action === "usage_ended"
          ? reservationRow.unit_type === "parking_slot"
            ? "Your parking reservation has ended. The assigned slot has been released."
            : reservationRow.unit_type === "function_hall"
              ? "Your function hall reservation period has ended."
              : "Your stay reservation period has ended."
          : body.notes ?? null;

    const template = reservationUpdateTemplate({
      customerName,
      reservationPublicId: reservationRow.public_id,
      action: body.action,
      notes: paymentNote,
      appUrl,
    });

    const emailResult = await sendEmailWithResend({
      to: recipientEmail,
      subject: template.subject,
      html: template.html,
    });

    await adminClient.from("notifications").insert({
      user_id: reservationRow.user_id,
      title: template.subject,
      message:
        paymentNote ||
        `Your reservation ${reservationRow.public_id} has been ${body.action}.`,
      type: "reservation",
      is_read: false,
      date: new Date().toISOString(),
      related_table: "reservations",
      related_id: reservationRow.reservation_id,
      action_url: `/reservations/${reservationRow.public_id}`,
    });

    await adminClient.from("audit_log").insert({
      user_id: user.id,
      action: "RESERVATION_UPDATE_EMAIL_SENT",
      target_table: "reservations",
      target_id: reservationRow.reservation_id,
      target_public_id: reservationRow.public_id ?? null,
      changed_fields: ["email_notification", "in_app_notification"],
      notes: `Reservation ${body.action} notification sent to customer.`,
    });

    return json(origin, 200, {
      success: true,
      message: "Reservation update email and notification sent.",
      emailResult,
    });
  } catch (error) {
    console.error("send-reservation-update error:", error);

    return json(origin, 500, {
      error: error instanceof Error ? error.message : "Unexpected error.",
    });
  }
});