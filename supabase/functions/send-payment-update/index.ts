import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { paymentUpdateTemplate } from "../_shared/email/templates.ts";
import { sendEmailWithResend } from "../_shared/email/resend.ts";

type RequestBody = {
  paymentId: string;
  action: "verified" | "rejected";
  notes?: string | null;
};

const PAYMENT_CATEGORY_LABELS: Record<string, string> = {
  reservation_payment: "Reservation Payment",
  advance_deposit: "Advance Deposit",
  security_deposit: "Security Deposit",
  monthly_rent: "Monthly Rent",
  late_fee: "Late Fee",
  payment: "Payment",
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

    if (!body.paymentId || !body.action) {
      return json(origin, 400, {
        error: "paymentId and action are required.",
      });
    }

    const { data: paymentRow, error: paymentError } = await adminClient
      .from("payments")
      .select(`
        payment_id,
        public_id,
        amount,
        category,
        billing_snapshot,
        user_id,
        reservation_id,
        users!payments_user_id_fkey (
          email,
          first_name,
          last_name
        ),
        reservations!payments_reservation_id_fkey (
          public_id
        )
      `)
      .eq("payment_id", body.paymentId)
      .maybeSingle();

    if (paymentError) throw paymentError;

    if (!paymentRow) {
      return json(origin, 404, { error: "Payment not found." });
    }

    const customer = Array.isArray(paymentRow.users)
      ? paymentRow.users[0]
      : paymentRow.users;

    const reservation = Array.isArray(paymentRow.reservations)
      ? paymentRow.reservations[0]
      : paymentRow.reservations;

    const recipientEmail = customer?.email;

    if (!recipientEmail) {
      return json(origin, 400, { error: "Customer email not found." });
    }

    const customerName =
      [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
      null;

    const categoryLabel =
      PAYMENT_CATEGORY_LABELS[paymentRow.category ?? "payment"] ?? "Payment";

    const template = paymentUpdateTemplate({
      customerName,
      paymentPublicId: paymentRow.public_id,
      reservationPublicId: reservation?.public_id ?? null,
      amount: Number(paymentRow.amount ?? 0),
      action: body.action,
      notes: body.notes
        ? `${categoryLabel}: ${body.notes}`
        : `${categoryLabel} ${body.action === "verified" ? "approved." : "rejected."}`,
      appUrl,
    });

    const emailResult = await sendEmailWithResend({
      to: recipientEmail,
      subject: template.subject,
      html: template.html,
    });

    await adminClient.from("notifications").insert({
      user_id: paymentRow.user_id,
      title: template.subject,
      message:
        body.action === "verified"
          ? `${categoryLabel} ${paymentRow.public_id} has been approved.`
          : `${categoryLabel} ${paymentRow.public_id} has been rejected.`,
      type: "payment",
      is_read: false,
      date: new Date().toISOString(),
      related_table: "payments",
      related_id: paymentRow.payment_id,
      action_url: `/payments/${paymentRow.public_id}`,
    });

    await adminClient.from("audit_log").insert({
      user_id: user.id,
      action:
        body.action === "verified"
          ? "PAYMENT_UPDATE_EMAIL_SENT"
          : "PAYMENT_REJECTION_EMAIL_SENT",
      target_table: "payments",
      target_id: paymentRow.payment_id,
      target_public_id: paymentRow.public_id ?? null,
      changed_fields: ["email_notification", "in_app_notification"],
      notes: `${categoryLabel} update notification sent to customer.`,
    });

    return json(origin, 200, {
      success: true,
      message: "Payment update email and notification sent.",
      emailResult,
    });
  } catch (error) {
    console.error("send-payment-update error:", error);

    return json(origin, 500, {
      error: error instanceof Error ? error.message : "Unexpected error.",
    });
  }
});