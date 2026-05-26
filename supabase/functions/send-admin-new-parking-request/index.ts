import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { sendEmailWithResend } from "../_shared/email/resend.ts";

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
  requestId: string;
  customerName?: string | null;
  email?: string | null;
  phone?: string | null;
  vehicleType?: string | null;
  plateNumber?: string | null;
  duration?: number | null;
  durationType?: "hours" | "days" | "months" | string | null;
  startDate?: string | null;
  appointmentTime?: string | null;
  notes?: string | null;
};

const DURATION_LABELS: Record<string, string> = {
  hours: "Hourly",
  days: "Daily",
  months: "Monthly",
};

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

function formatTime(value?: string | null) {
  if (!value) return null;

  const [hourPart, minutePart] = value.split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return value;
  }

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = ((hour + 11) % 12) + 1;

  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function buildAdminParkingRequestEmail(params: {
  adminName?: string | null;
  payload: Payload;
  appUrl: string;
}) {
  const { adminName, payload, appUrl } = params;

  const durationLabel =
    DURATION_LABELS[payload.durationType ?? ""] ??
    payload.durationType ??
    "Parking";

  const durationText =
    payload.duration && payload.durationType
      ? `${payload.duration} ${payload.durationType}`
      : "Not specified";

  const startDateText = formatDate(payload.startDate);
  const appointmentTimeText = formatTime(payload.appointmentTime);

  const subject = `New Guest Parking Request${payload.customerName ? ` from ${payload.customerName}` : ""}`;

  const message = `New ${durationLabel.toLowerCase()} guest parking request requires admin review.`;

  const actionUrl = `${appUrl}/admin/parking-requests`;

  const html = `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;padding:28px;">
        <p style="margin:0 0 8px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#2563eb;font-weight:700;">
          Guest Parking Request
        </p>

        <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#0f172a;">
          New guest parking request submitted
        </h1>

        <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569;">
          ${adminName ? `Hi ${adminName},` : "Hello,"} a guest submitted a parking request.
          This is not yet an approved reservation. Please review availability, approve or reject the request, and assign a slot only if approved.
        </p>

        <div style="border:1px solid #dbeafe;background:#eff6ff;border-radius:16px;padding:16px;margin-bottom:20px;">
          <p style="margin:0;font-size:14px;line-height:1.6;color:#1d4ed8;">
            <strong>Important:</strong> Submission does not guarantee approval.
            The request may still be rejected if no suitable parking slot is available.
          </p>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tbody>
            <tr>
              <td style="padding:10px 0;color:#64748b;">Guest</td>
              <td style="padding:10px 0;text-align:right;font-weight:700;">${payload.customerName ?? "Not specified"}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#64748b;">Email</td>
              <td style="padding:10px 0;text-align:right;">${payload.email ?? "Not specified"}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#64748b;">Phone</td>
              <td style="padding:10px 0;text-align:right;">${payload.phone ?? "Not specified"}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#64748b;">Vehicle Type</td>
              <td style="padding:10px 0;text-align:right;">${payload.vehicleType ?? "Not specified"}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#64748b;">Plate Number</td>
              <td style="padding:10px 0;text-align:right;font-weight:700;">${payload.plateNumber ?? "Not specified"}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#64748b;">Request Type</td>
              <td style="padding:10px 0;text-align:right;">${durationLabel}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#64748b;">Duration</td>
              <td style="padding:10px 0;text-align:right;">${durationText}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#64748b;">Start Date</td>
              <td style="padding:10px 0;text-align:right;">${startDateText}</td>
            </tr>
            ${
              appointmentTimeText
                ? `<tr>
                    <td style="padding:10px 0;color:#64748b;">Start Time</td>
                    <td style="padding:10px 0;text-align:right;">${appointmentTimeText}</td>
                  </tr>`
                : ""
            }
          </tbody>
        </table>

        ${
          payload.notes
            ? `<div style="margin-top:20px;border-top:1px solid #e2e8f0;padding-top:16px;">
                <p style="margin:0 0 6px;font-size:13px;color:#64748b;font-weight:700;">Guest Notes</p>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#334155;">${payload.notes}</p>
              </div>`
            : ""
        }

        <div style="margin-top:28px;">
          <a href="${actionUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:12px;">
            Review Parking Requests
          </a>
        </div>
      </div>
    </div>
  </body>
</html>`;

  const text = [
    subject,
    "",
    message,
    "",
    "This is not yet an approved reservation.",
    "Admin must review availability and assign a slot only if approved.",
    "",
    `Guest: ${payload.customerName ?? "Not specified"}`,
    `Email: ${payload.email ?? "Not specified"}`,
    `Phone: ${payload.phone ?? "Not specified"}`,
    `Vehicle Type: ${payload.vehicleType ?? "Not specified"}`,
    `Plate Number: ${payload.plateNumber ?? "Not specified"}`,
    `Request Type: ${durationLabel}`,
    `Duration: ${durationText}`,
    `Start Date: ${startDateText}`,
    appointmentTimeText ? `Start Time: ${appointmentTimeText}` : "",
    payload.notes ? `Notes: ${payload.notes}` : "",
    "",
    `Review: ${actionUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject,
    message,
    html,
    text,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const secret = Deno.env.get("ADMIN_NEW_PARKING_REQUEST_SECRET");

    if (!secret) {
      return jsonResponse(
        {
          success: false,
          reason: "Missing ADMIN_NEW_PARKING_REQUEST_SECRET.",
        },
        500,
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
        500,
      );
    }

    const payload = (await req.json()) as Payload;

    if (!payload?.requestId) {
      return jsonResponse(
        {
          success: false,
          reason: "requestId is required.",
        },
        400,
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const nowIso = new Date().toISOString();

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
      const emailTemplate = buildAdminParkingRequestEmail({
        adminName: recipient.first_name,
        payload,
        appUrl,
      });

      const { error: notificationError } = await admin
        .from("notifications")
        .insert({
          user_id: recipient.user_id,
          title: emailTemplate.subject,
          message: emailTemplate.message,
          type: "reservation",
          is_read: false,
          date: nowIso,
          related_table: "guest_parking_requests",
          related_id: payload.requestId,
          action_url: "/admin/parking-requests",
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
      action: "ADMIN_NEW_PARKING_REQUEST_ALERT_SENT",
      target_table: "guest_parking_requests",
      target_id: payload.requestId,
      target_public_id: null,
      changed_fields: ["admin_notification"],
      notes: `New guest parking request alert sent to ${notified} admins.`,
      timestamp: nowIso,
    });

    return jsonResponse({
      success: true,
      requestId: payload.requestId,
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
      500,
    );
  }
});
