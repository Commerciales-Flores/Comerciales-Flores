import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { paymentUpdateTemplate } from "../_shared/email/templates.ts";
import { sendEmailWithResend } from "../_shared/email/resend.ts";

type RequestBody = {
  paymentId: string;
  action: "verified" | "rejected";
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

serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed." }),
        { status: 405, headers: corsHeaders(origin) }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const appUrl = Deno.env.get("APP_URL");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Missing Supabase environment variables.");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header." }),
        { status: 401, headers: corsHeaders(origin) }
      );
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
      return new Response(
        JSON.stringify({ error: "Unauthorized." }),
        { status: 401, headers: corsHeaders(origin) }
      );
    }

    const { data: adminUser, error: adminUserError } = await adminClient
      .from("users")
      .select("user_id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminUserError) throw adminUserError;

    if (!adminUser || adminUser.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Admin access required." }),
        { status: 403, headers: corsHeaders(origin) }
      );
    }

    const body = (await req.json()) as RequestBody;

    if (!body.paymentId || !body.action) {
      return new Response(
        JSON.stringify({ error: "paymentId and action are required." }),
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const { data: paymentRow, error: paymentError } = await adminClient
      .from("payments")
      .select(`
        payment_id,
        public_id,
        amount,
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
      return new Response(
        JSON.stringify({ error: "Payment not found." }),
        { status: 404, headers: corsHeaders(origin) }
      );
    }

    const customer = Array.isArray(paymentRow.users)
      ? paymentRow.users[0]
      : paymentRow.users;

    const reservation = Array.isArray(paymentRow.reservations)
      ? paymentRow.reservations[0]
      : paymentRow.reservations;

    const recipientEmail = customer?.email;
    if (!recipientEmail) {
      return new Response(
        JSON.stringify({ error: "Customer email not found." }),
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const customerName =
      [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || null;

    const template = paymentUpdateTemplate({
      customerName,
      paymentPublicId: paymentRow.public_id,
      reservationPublicId: reservation?.public_id ?? null,
      amount: Number(paymentRow.amount ?? 0),
      action: body.action,
      notes: body.notes ?? null,
      appUrl,
    });

    const emailResult = await sendEmailWithResend({
      to: recipientEmail,
      subject: template.subject,
      html: template.html,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment update email sent.",
        emailResult,
      }),
      { status: 200, headers: corsHeaders(origin) }
    );
  } catch (error) {
    console.error("send-payment-update error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unexpected error.",
      }),
      { status: 500, headers: corsHeaders(origin) }
    );
  }
});