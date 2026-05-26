import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { sendEmailWithResend } from "../_shared/email/resend.ts";

const BUSINESS_TIME_ZONE = "Asia/Manila";

const ACTIVE_GUEST_REQUEST_STATUSES = ["pending", "approved", "confirmed"];

const PARKING_DURATION_LIMITS = {
  hours: { min: 1, max: 24 },
  days: { min: 1, max: 30 },
  months: { min: 1, max: 12 },
} as const;

type ParkingDurationType = keyof typeof PARKING_DURATION_LIMITS;

type SubmitGuestParkingRequestBody = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  vehicleType?: string;
  plateNumber?: string;
  durationType?: ParkingDurationType;
  durationValue?: number;
  startDate?: string;
  startTime?: string | null;
  notes?: string | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getBusinessNow() {
  return new Date(
    new Date().toLocaleString("en-US", {
      timeZone: BUSINESS_TIME_ZONE,
    }),
  );
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayInputValue() {
  const today = getBusinessNow();
  today.setHours(0, 0, 0, 0);
  return toDateInputValue(today);
}

function isValidDateInput(value?: string | null) {
  if (!value) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTimeHHMM(value?: string | null) {
  return !!value && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function getMinimumStartDateValue(durationType: ParkingDurationType) {
  const date = getBusinessNow();
  date.setHours(0, 0, 0, 0);

  if (durationType === "hours") {
    return toDateInputValue(date);
  }

  /**
   * Daily/monthly need admin review and slot assignment first.
   * Before 5 PM: earliest is tomorrow.
   * After 5 PM: earliest is day after tomorrow.
   */
  const now = getBusinessNow();
  const businessEnd = getBusinessNow();
  businessEnd.setHours(17, 0, 0, 0);

  const leadDays = now <= businessEnd ? 1 : 2;

  date.setDate(date.getDate() + leadDays);
  return toDateInputValue(date);
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function normalizeEmail(value: unknown) {
  return sanitizeText(value, 150).toLowerCase();
}

function isAllowedDurationType(value: unknown): value is ParkingDurationType {
  return value === "hours" || value === "days" || value === "months";
}

function validateDuration(durationType: ParkingDurationType, duration: number) {
  const bounds = PARKING_DURATION_LIMITS[durationType];

  if (!Number.isFinite(duration) || !Number.isInteger(duration)) {
    return "Please enter a valid parking duration.";
  }

  if (duration < bounds.min || duration > bounds.max) {
    if (durationType === "hours") {
      return "Hourly parking allows 1 to 24 hours only.";
    }

    if (durationType === "days") {
      return "Daily parking allows 1 to 30 days only.";
    }

    return "Monthly parking allows 1 to 12 months only.";
  }

  return "";
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
    timeZone: BUSINESS_TIME_ZONE,
  });
}

function formatTime(value?: string | null) {
  if (!value) return "Not specified";

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

function buildGuestParkingReceivedEmail(params: {
  customerName?: string | null;
  duration?: number | null;
  durationType?: string | null;
  startDate?: string | null;
  appointmentTime?: string | null;
  vehicleType?: string | null;
  plateNumber?: string | null;
}) {
  const {
    customerName,
    duration,
    durationType,
    startDate,
    appointmentTime,
    vehicleType,
    plateNumber,
  } = params;

  const typeLabel =
    durationType === "hours"
      ? "Hourly"
      : durationType === "days"
        ? "Daily"
        : durationType === "months"
          ? "Monthly"
          : "Parking";

  const durationText =
    duration && durationType
      ? `${duration} ${durationType}`
      : "Not specified";

  const subject = "Guest Parking Request Received";

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
          We received your guest parking request
        </h1>

        <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569;">
          ${customerName ? `Hi ${customerName},` : "Hello,"} your guest parking request has been submitted successfully.
          This is not yet an approved reservation. Our admin team will review slot availability and your request details first.
        </p>

        <div style="border:1px solid #fcd34d;background:#fffbeb;border-radius:16px;padding:16px;margin-bottom:20px;">
          <p style="margin:0;font-size:14px;line-height:1.6;color:#92400e;">
            <strong>Important:</strong> No parking slot has been reserved yet.
            Please do not send payment until your request has been approved.
            Your request may still be rejected depending on slot availability.
          </p>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tbody>
            <tr>
              <td style="padding:10px 0;color:#64748b;">Parking Type</td>
              <td style="padding:10px 0;text-align:right;">${typeLabel}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#64748b;">Duration</td>
              <td style="padding:10px 0;text-align:right;">${durationText}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#64748b;">Start Date</td>
              <td style="padding:10px 0;text-align:right;">${formatDate(startDate)}</td>
            </tr>
            ${
              appointmentTime
                ? `<tr>
                    <td style="padding:10px 0;color:#64748b;">Start Time</td>
                    <td style="padding:10px 0;text-align:right;">${formatTime(appointmentTime)}</td>
                  </tr>`
                : ""
            }
            <tr>
              <td style="padding:10px 0;color:#64748b;">Vehicle</td>
              <td style="padding:10px 0;text-align:right;">${vehicleType ?? "Not specified"}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#64748b;">Plate Number</td>
              <td style="padding:10px 0;text-align:right;font-weight:700;">${plateNumber ?? "Not specified"}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </body>
</html>`;

  const text = [
    subject,
    "",
    customerName ? `Hi ${customerName},` : "Hello,",
    "",
    "We received your guest parking request.",
    "This is not yet an approved reservation.",
    "No parking slot has been reserved yet.",
    "Please do not send payment until your request has been approved.",
    "Your request may still be rejected depending on slot availability.",
    "",
    `Parking Type: ${typeLabel}`,
    `Duration: ${durationText}`,
    `Start Date: ${formatDate(startDate)}`,
    appointmentTime ? `Start Time: ${formatTime(appointmentTime)}` : "",
    `Vehicle: ${vehicleType ?? "Not specified"}`,
    `Plate Number: ${plateNumber ?? "Not specified"}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse(
        { success: false, reason: "Method not allowed." },
        405,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const adminParkingSecret = Deno.env.get("ADMIN_NEW_PARKING_REQUEST_SECRET");

    if (!supabaseUrl || !serviceRoleKey || !adminParkingSecret) {
      return jsonResponse(
        { success: false, reason: "Missing server configuration." },
        500,
      );
    }

    const body = (await req.json()) as SubmitGuestParkingRequestBody;

    const firstName = sanitizeText(body.firstName, 100);
    const lastName = sanitizeText(body.lastName, 100);
    const email = normalizeEmail(body.email);
    const phone = sanitizeText(body.phone, 20);
    const vehicleType = sanitizeText(body.vehicleType, 50);
    const plateNumber = sanitizeText(body.plateNumber, 20).toUpperCase();
    const durationType = body.durationType;
    const durationValue = Number(body.durationValue || 0);
    const startDate = sanitizeText(body.startDate, 10);
    const startTime = body.startTime ? sanitizeText(body.startTime, 5) : "";
    const notes = sanitizeText(body.notes, 1000);

    if (
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !vehicleType ||
      !plateNumber ||
      !durationType ||
      !startDate ||
      !durationValue
    ) {
      return jsonResponse(
        {
          success: false,
          reason: "Please complete all required parking request details.",
        },
        400,
      );
    }

    if (!isAllowedDurationType(durationType)) {
      return jsonResponse(
        {
          success: false,
          reason: "Please select a valid parking request type.",
        },
        400,
      );
    }

    if (!isValidDateInput(startDate)) {
      return jsonResponse(
        {
          success: false,
          reason: "Please choose a valid parking start date.",
        },
        400,
      );
    }

    const durationError = validateDuration(durationType, durationValue);

    if (durationError) {
      return jsonResponse({ success: false, reason: durationError }, 400);
    }

    const minimumStartDate = getMinimumStartDateValue(durationType);

    if (startDate < minimumStartDate) {
      return jsonResponse(
        {
          success: false,
          reason:
            durationType === "hours"
              ? "Please choose a valid hourly parking start date."
              : `Daily and monthly parking requests must start no earlier than ${minimumStartDate} to allow admin review and slot assignment.`,
        },
        400,
      );
    }

    if (durationType === "hours" && !isValidTimeHHMM(startTime)) {
      return jsonResponse(
        {
          success: false,
          reason: "Please select a valid preferred start time.",
        },
        400,
      );
    }

    if (durationType !== "hours" && startDate < getTodayInputValue()) {
      return jsonResponse(
        {
          success: false,
          reason: "Please choose a valid parking start date.",
        },
        400,
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: existingRequests, error: existingError } = await admin
      .from("guest_parking_requests")
      .select("request_id")
      .or(`email.eq.${email},phone.eq.${phone}`)
      .in("status", ACTIVE_GUEST_REQUEST_STATUSES)
      .limit(1);

    if (existingError) {
      throw existingError;
    }

    if (existingRequests && existingRequests.length > 0) {
      return jsonResponse(
        {
          success: false,
          reason:
            "You already have an active guest parking request. Please wait until it is resolved before submitting another.",
        },
        409,
      );
    }

    const fullName = `${firstName} ${lastName}`.trim();

    const payload = {
      full_name: fullName,
      email,
      phone,
      vehicle_type: vehicleType,
      plate_number: plateNumber,
      duration: durationValue,
      duration_type: durationType,
      start_date: `${startDate}T00:00:00`,
      appointment_time: durationType === "hours" ? `${startTime}:00` : null,
      notes: notes || null,
      status: "pending",
      unit_type: "parking_slot",
    };

    const { data: insertedRequest, error: insertError } = await admin
      .from("guest_parking_requests")
      .insert([payload])
      .select(
        "request_id, full_name, email, phone, vehicle_type, plate_number, duration, duration_type, start_date, appointment_time, notes",
      )
      .single();

    if (insertError) {
      throw insertError;
    }

    let guestEmailSent = false;
    let guestEmailError: string | null = null;

    try {
      const guestTemplate = buildGuestParkingReceivedEmail({
        customerName: insertedRequest.full_name,
        duration: insertedRequest.duration,
        durationType: insertedRequest.duration_type,
        startDate: insertedRequest.start_date,
        appointmentTime: insertedRequest.appointment_time,
        vehicleType: insertedRequest.vehicle_type,
        plateNumber: insertedRequest.plate_number,
      });

      await sendEmailWithResend({
        to: insertedRequest.email,
        subject: guestTemplate.subject,
        html: guestTemplate.html,
        text: guestTemplate.text,
      });

      guestEmailSent = true;
    } catch (error) {
      guestEmailError =
        error instanceof Error ? error.message : "Guest email failed.";
    }

    let adminNotificationSent = false;
    let adminNotificationError: string | null = null;

    try {
      const notifyResponse = await fetch(
        `${supabaseUrl}/functions/v1/send-admin-new-parking-request`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${adminParkingSecret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requestId: insertedRequest.request_id,
            customerName: insertedRequest.full_name,
            email: insertedRequest.email,
            phone: insertedRequest.phone,
            vehicleType: insertedRequest.vehicle_type,
            plateNumber: insertedRequest.plate_number,
            duration: insertedRequest.duration,
            durationType: insertedRequest.duration_type,
            startDate: insertedRequest.start_date,
            appointmentTime: insertedRequest.appointment_time,
            notes: insertedRequest.notes,
          }),
        },
      );

      adminNotificationSent = notifyResponse.ok;

      if (!notifyResponse.ok) {
        const notifyBody = await notifyResponse.text();
        adminNotificationError = notifyBody || "Admin notification failed.";
      }
    } catch (error) {
      adminNotificationError =
        error instanceof Error ? error.message : "Admin notification failed.";
    }

    return jsonResponse({
      success: true,
      requestId: insertedRequest.request_id,
      guestEmailSent,
      guestEmailError,
      adminNotificationSent,
      adminNotificationError,
      message:
        "Parking request submitted. Please wait for admin review and confirmation.",
    });
  } catch (error) {
    console.error("submit-guest-parking-request error:", error);

    return jsonResponse(
      {
        success: false,
        reason: error instanceof Error ? error.message : "Unexpected error.",
      },
      500,
    );
  }
});