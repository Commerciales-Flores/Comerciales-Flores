import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { supportReplyTemplate } from "../_shared/email/templates.ts";
import { sendEmailWithResend } from "../_shared/email/resend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ReplyPayload = {
  ticketId?: string;
  message?: string;
  subject?: string;
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const supportFromEmail =
      Deno.env.get("SUPPORT_FROM_EMAIL") ||
      "Commerciales Flores <noreply@commercialesflores.com>";
    const supportReplyTo =
      Deno.env.get("SUPPORT_REPLY_TO") || "support@commercialesflores.com";

    const signupUrl =
      Deno.env.get("PUBLIC_SIGNUP_URL") ||
      "https://commercialesflores.com/register";

    const loginUrl =
      Deno.env.get("PUBLIC_LOGIN_URL") ||
      "https://commercialesflores.com/login";

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return jsonResponse(500, {
        error: "Missing Supabase environment variables",
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(401, { error: "Missing authorization header" });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return jsonResponse(401, { error: "Unauthorized" });
    }

    const { data: actingUser, error: actingUserError } = await adminClient
      .from("users")
      .select("user_id, first_name, last_name, email, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (actingUserError) {
      return jsonResponse(500, { error: actingUserError.message });
    }

    if (!actingUser || actingUser.role !== "admin") {
      return jsonResponse(403, {
        error: "Only admins can reply to support tickets",
      });
    }

    const payload = (await req.json()) as ReplyPayload;
    const ticketId = payload.ticketId?.trim();
    const message = payload.message?.trim();
    const requestedSubject = payload.subject?.trim();

    if (!ticketId) {
      return jsonResponse(400, { error: "ticketId is required" });
    }

    if (!message) {
      return jsonResponse(400, { error: "message is required" });
    }

    const { data: ticket, error: ticketError } = await adminClient
      .from("support_tickets")
      .select(`
        ticket_id,
        public_id,
        user_id,
        guest_email,
        guest_first_name,
        guest_last_name,
        subject,
        status
      `)
      .eq("ticket_id", ticketId)
      .maybeSingle();

    if (ticketError) {
      return jsonResponse(500, { error: ticketError.message });
    }

    if (!ticket) {
      return jsonResponse(404, { error: "Support ticket not found" });
    }

    if (ticket.user_id) {
      return jsonResponse(400, {
        error:
          "This function is only for guest tickets without linked user accounts",
      });
    }

    if (ticket.status === "resolved") {
      return jsonResponse(400, {
        error: "A response has already been sent for this guest inquiry",
      });
    }

    const guestEmail = ticket.guest_email?.trim().toLowerCase();
    if (!guestEmail) {
      return jsonResponse(400, {
        error: "This ticket does not have a guest email",
      });
    }

    const safeSubject =
      requestedSubject || `Support response — ${ticket.public_id ?? ticket.ticket_id}`;

    const adminDisplayName =
      [actingUser.first_name, actingUser.last_name]
        .filter(Boolean)
        .join(" ")
        .trim() || "Support Team";

    const emailTemplate = supportReplyTemplate({
      guestFirstName: ticket.guest_first_name ?? null,
      ticketPublicId: ticket.public_id ?? null,
      ticketId: ticket.ticket_id,
      ticketSubject: ticket.subject ?? "Support Ticket",
      message,
      signupUrl,
      loginUrl,
    });

    const nowIso = new Date().toISOString();

    const { data: supportMessage, error: supportMessageError } = await adminClient
      .from("support_messages")
      .insert([
        {
          ticket_id: ticket.ticket_id,
          sender_type: "support",
          sender_user_id: actingUser.user_id,
          sender_name: adminDisplayName,
          sender_email: supportReplyTo,
          body: message,
          created_at: nowIso,
          is_internal: false,
        },
      ])
      .select("support_message_id")
      .single();

    if (supportMessageError) {
      return jsonResponse(500, { error: supportMessageError.message });
    }

    try {
      const resendResult = await sendEmailWithResend({
        to: guestEmail,
        from: supportFromEmail,
        replyTo: supportReplyTo,
        subject: requestedSubject?.trim() || emailTemplate.subject,
        text: emailTemplate.text,
        html: emailTemplate.html,
      });

      const resendEmailId = resendResult?.id ?? null;

      const { error: emailLogError } = await adminClient
        .from("support_email_messages")
        .insert([
          {
            ticket_id: ticket.ticket_id,
            support_message_id: supportMessage.support_message_id,
            direction: "outbound",
            recipient_email: guestEmail,
            sender_email: supportReplyTo,
            subject: safeSubject,
            text_body: message,
            html_body: `<p>${message}</p>`,
            resend_email_id: resendEmailId,
            delivery_status: "sent",
            sent_by: actingUser.user_id,
            sent_at: nowIso,
          },
        ]);

      if (emailLogError) {
        return jsonResponse(500, { error: emailLogError.message });
      }

      const { error: updateTicketError } = await adminClient
        .from("support_tickets")
        .update({
          status: "resolved",
          updated_at: nowIso,
          last_message_at: nowIso,
          last_message_by: "support",
          resolved_at: nowIso,
          resolved_by_user: false,
        })
        .eq("ticket_id", ticket.ticket_id);

      if (updateTicketError) {
        return jsonResponse(500, { error: updateTicketError.message });
      }

      return jsonResponse(200, {
        success: true,
        resendEmailId,
        supportMessageId: supportMessage.support_message_id,
      });
    } catch (emailError) {
      const emailErrorMessage =
        emailError instanceof Error ? emailError.message : "Failed to send email";

      await adminClient.from("support_email_messages").insert([
        {
          ticket_id: ticket.ticket_id,
          support_message_id: supportMessage.support_message_id,
          direction: "outbound",
          recipient_email: guestEmail,
          sender_email: supportReplyTo,
          subject: safeSubject,
          text_body: message,
          html_body: `<p>${message}</p>`,
          delivery_status: "failed",
          error_message: emailErrorMessage,
          sent_by: actingUser.user_id,
        },
      ]);

      return jsonResponse(500, {
        error: emailErrorMessage,
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse(500, { error: message });
  }
});