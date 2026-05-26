import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmailWithResend } from "../_shared/email/resend.ts";

type RequestBody = {
  reservationId: string;
};

const UNIT_LABELS: Record<string, string> = {
  parking_slot: "Parking",
  rental_space: "Rental Space",
  function_hall: "Function Hall",
};

const RESERVATION_TYPE_LABELS: Record<string, string> = {
  flexible_stay: "Flexible Stay",
  monthly_lease: "Monthly Lease",
  function_hall: "Function Hall Booking",
  parking: "Parking Request",
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

function formatDate(value?: string | null) {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Manila",
  });
}

function formatCurrency(amount?: number | null) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return "Not specified";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(amount));
}

function buildReservationReceivedEmail(params: {
  customerName?: string | null;
  reservationPublicId?: string | null;
  unitType?: string | null;
  reservationType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  amount?: number | null;
  appUrl: string;
}) {
  const {
    customerName,
    reservationPublicId,
    unitType,
    reservationType,
    startDate,
    endDate,
    amount,
    appUrl,
  } = params;

  const unitLabel = UNIT_LABELS[unitType ?? ""] ?? unitType ?? "Reservation";
  const typeLabel =
    RESERVATION_TYPE_LABELS[reservationType ?? ""] ??
    reservationType ??
    "Reservation Request";

  const subject = `Reservation Request Received${reservationPublicId ? ` - ${reservationPublicId}` : ""}`;

  const html = `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;padding:28px;">
        <p style="margin:0 0 8px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#2563eb;font-weight:700;">
          Request Received
        </p>

        <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#0f172a;">
          We received your reservation request
        </h1>

        <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569;">
          ${customerName ? `Hi ${customerName},` : "Hello,"} your request has been submitted successfully.
          Please note that this is not yet an approved or confirmed reservation.
          Our admin team will review your request and notify you once it has been approved or rejected.
        </p>

        <div style="border:1px solid #fcd34d;background:#fffbeb;border-radius:16px;padding:16px;margin-bottom:20px;">
          <p style="margin:0;font-size:14px;line-height:1.6;color:#92400e;">
            <strong>Important:</strong> Submission does not guarantee approval.
            Please wait for admin confirmation before making arrangements or sending payment.
          </p>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tbody>
            <tr>
              <td style="padding:10px 0;color:#64748b;">Reference</td>
              <td style="padding:10px 0;text-align:right;font-weight:700;">${reservationPublicId ?? "Not specified"}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#64748b;">Type</td>
              <td style="padding:10px 0;text-align:right;">${unitLabel} · ${typeLabel}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#64748b;">Start Date</td>
              <td style="padding:10px 0;text-align:right;">${formatDate(startDate)}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#64748b;">End Date</td>
              <td style="padding:10px 0;text-align:right;">${formatDate(endDate)}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#64748b;">Estimated Amount</td>
              <td style="padding:10px 0;text-align:right;">${formatCurrency(amount)}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top:28px;">
          <a href="${appUrl}/reservations${reservationPublicId ? `/${reservationPublicId}` : ""}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:12px;">
            View Request
          </a>
        </div>
      </div>
    </div>
  </body>
</html>`;

  const text = [
    subject,
    "",
    customerName ? `Hi ${customerName},` : "Hello,",
    "",
    "We received your reservation request.",
    "This is not yet an approved or confirmed reservation.",
    "Our admin team will review your request and notify you once it has been approved or rejected.",
    "",
    `Reference: ${reservationPublicId ?? "Not specified"}`,
    `Type: ${unitLabel} · ${typeLabel}`,
    `Start Date: ${formatDate(startDate)}`,
    `End Date: ${formatDate(endDate)}`,
    `Estimated Amount: ${formatCurrency(amount)}`,
    "",
    "Please wait for admin confirmation before making arrangements or sending payment.",
  ].join("\n");

  return { subject, html, text };
}

serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    if (req.method !== "POST") {
      return json(origin, 405, { success: false, reason: "Method not allowed." });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const appUrl =
      Deno.env.get("APP_URL") ||
      Deno.env.get("SITE_URL") ||
      "https://commercialesflores.com";
    const secret = Deno.env.get("RESERVATION_RECEIVED_SECRET");

    if (!supabaseUrl || !serviceRoleKey || !secret) {
      return json(origin, 500, {
        success: false,
        reason: "Missing server configuration.",
      });
    }

    const authHeader = req.headers.get("Authorization");

    if (authHeader !== `Bearer ${secret}`) {
      return json(origin, 401, { success: false, reason: "Unauthorized." });
    }

    const body = (await req.json()) as RequestBody;

    if (!body.reservationId) {
      return json(origin, 400, {
        success: false,
        reason: "reservationId is required.",
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

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
      return json(origin, 404, {
        success: false,
        reason: "Reservation not found.",
      });
    }

    const customer = Array.isArray(reservationRow.users)
      ? reservationRow.users[0]
      : reservationRow.users;

    const recipientEmail = customer?.email;

    if (!recipientEmail) {
      return json(origin, 400, {
        success: false,
        reason: "Customer email not found.",
      });
    }

    const customerName =
      [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
      null;

    const amount =
      reservationRow.total_amount ?? reservationRow.amount_due ?? null;

    const template = buildReservationReceivedEmail({
      customerName,
      reservationPublicId: reservationRow.public_id,
      unitType: reservationRow.unit_type,
      reservationType: reservationRow.reservation_type,
      startDate: reservationRow.start_date,
      endDate: reservationRow.end_date,
      amount: amount === null ? null : Number(amount),
      appUrl,
    });

    const emailResult = await sendEmailWithResend({
      to: recipientEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    await adminClient.from("notifications").insert({
      user_id: reservationRow.user_id,
      title: template.subject,
      message:
        "We received your reservation request. Please wait for admin review.",
      type: "reservation",
      is_read: false,
      date: new Date().toISOString(),
      related_table: "reservations",
      related_id: reservationRow.reservation_id,
      action_url: `/reservations/${reservationRow.public_id}`,
    });

    await adminClient.from("audit_log").insert({
      user_id: null,
      action: "RESERVATION_RECEIVED_EMAIL_SENT",
      target_table: "reservations",
      target_id: reservationRow.reservation_id,
      target_public_id: reservationRow.public_id ?? null,
      changed_fields: ["email_notification", "in_app_notification"],
      notes: "Reservation received notification sent to customer.",
      timestamp: new Date().toISOString(),
    });

    return json(origin, 200, {
      success: true,
      reservationId: reservationRow.reservation_id,
      emailResult,
    });
  } catch (error) {
    console.error("send-reservation-received error:", error);

    return json(origin, 500, {
      success: false,
      reason: error instanceof Error ? error.message : "Unexpected error.",
    });
  }
});