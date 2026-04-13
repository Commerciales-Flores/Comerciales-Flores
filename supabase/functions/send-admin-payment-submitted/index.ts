import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { sendEmailWithResend } from "../_shared/email/resend.ts";
import { adminPaymentSubmittedTemplate } from "../_shared/email/templates.ts";

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
  paymentId: string;
  paymentPublicId: string;
  customerName?: string | null;
  reservationPublicId?: string | null;
  amount: number;
  paymentCategory?: string | null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const secret = Deno.env.get("ADMIN_PAYMENT_SUBMITTED_SECRET");

    if (!secret) {
      return jsonResponse(
        { success: false, reason: "Missing ADMIN_PAYMENT_SUBMITTED_SECRET." },
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

    if (!payload?.paymentId || !payload?.paymentPublicId) {
      return jsonResponse(
        {
          success: false,
          reason: "paymentId and paymentPublicId are required.",
        },
        400
      );
    }

    if (typeof payload.amount !== "number" || payload.amount <= 0) {
      return jsonResponse(
        {
          success: false,
          reason: "amount must be a number greater than zero.",
        },
        400
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
      const emailTemplate = adminPaymentSubmittedTemplate({
        adminName: recipient.first_name,
        customerName: payload.customerName,
        reservationPublicId: payload.reservationPublicId,
        paymentPublicId: payload.paymentPublicId,
        amount: payload.amount,
        paymentCategory: payload.paymentCategory,
        appUrl,
      });

      const { error: notificationError } = await admin.from("notifications").insert({
        user_id: recipient.user_id,
        title: emailTemplate.subject,
        message: emailTemplate.message,
        type: "payment",
        is_read: false,
        date: nowIso,
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

    return jsonResponse({
      success: true,
      paymentId: payload.paymentId,
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