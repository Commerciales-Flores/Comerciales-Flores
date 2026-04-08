import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supportFromEmail =
      Deno.env.get("SUPPORT_FROM_EMAIL") ||
      "Commerciales Flores <noreply@commercialesflores.com>";
    const supportReplyTo = Deno.env.get("SUPPORT_REPLY_TO") || "support@commercialesflores.com";

    const signupUrl =
      Deno.env.get("PUBLIC_SIGNUP_URL") ||
      "https://commercialesflores.com/register";

    const loginUrl =
      Deno.env.get("PUBLIC_LOGIN_URL") ||
      "https://commercialesflores.com/login";

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return jsonResponse(500, { error: "Missing Supabase environment variables" });
    }

    if (!resendApiKey) {
      return jsonResponse(500, { error: "Missing RESEND_API_KEY" });
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
    const resend = new Resend(resendApiKey);

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
      return jsonResponse(403, { error: "Only admins can reply to support tickets" });
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
        error: "This function is only for guest tickets without linked user accounts",
      });
    }

    if (ticket.status === "resolved") {
      return jsonResponse(400, {
        error: "A response has already been sent for this guest inquiry",
      });
    }

    const guestEmail = ticket.guest_email?.trim().toLowerCase();
    if (!guestEmail) {
      return jsonResponse(400, { error: "This ticket does not have a guest email" });
    }

    const safeSubject =
  requestedSubject || `Support response — ${ticket.public_id ?? ticket.ticket_id}`;
    const adminDisplayName =
      [actingUser.first_name, actingUser.last_name].filter(Boolean).join(" ").trim() || "Support Team";

    const textBody = [
      `Hello${ticket.guest_first_name ? ` ${ticket.guest_first_name}` : ""},`,
      "",
      "Thank you for reaching out to Comerciales Flores.",
      "Our support team has responded to your inquiry:",
      "",
      message,
      "",
      "Want to continue your inquiry with us?",
      "Create an account to continue your inquiry, manage reservations, and receive updates more easily.",
      "",
      `Create your account: ${signupUrl}`,
      "",
      `Ticket: ${ticket.public_id ?? ticket.ticket_id}`,
      `Subject: ${ticket.subject ?? "Support Ticket"}`,
      "",
      "Regards,",
      "Commerciales Flores Support Team",
    ].join("\n");

    const htmlBody = `
  <div style="margin:0; padding:32px 16px; background:#f8fafc; font-family:Inter,Arial,sans-serif; color:#0f172a;">
    <div style="max-width:640px; margin:0 auto; overflow:hidden; border:1px solid #e2e8f0; border-radius:24px; background:#ffffff; box-shadow:0 10px 30px rgba(15,23,42,0.06);">

      <div style="padding:28px 28px 24px; background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color:#ffffff;">
        <div style="font-size:12px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; opacity:0.9;">
          Comerciales Flores
        </div>
        <h1 style="margin:10px 0 0; font-size:26px; line-height:1.2; font-weight:800;">
          We’d love to help you move forward
        </h1>
        <p style="margin:10px 0 0; font-size:14px; line-height:1.7; color:rgba(255,255,255,0.92);">
          Our support team has replied to your inquiry, and your next step is just one click away.
        </p>
      </div>

      <div style="padding:28px;">
        <p style="margin:0 0 16px; font-size:15px; color:#334155;">
          Hello${ticket.guest_first_name ? ` <strong>${escapeHtml(ticket.guest_first_name)}</strong>` : ""},
        </p>

        <p style="margin:0 0 18px; font-size:15px; line-height:1.7; color:#475569;">
          Thank you for reaching out to <strong style="color:#0f172a;">Comerciales Flores</strong>.
          We’ve responded to your inquiry below.
        </p>

        <div style="margin:24px 0; border:1px solid #dbeafe; border-radius:20px; background:#eff6ff; padding:20px 22px;">
          <div style="margin-bottom:10px; font-size:11px; font-weight:800; letter-spacing:0.12em; text-transform:uppercase; color:#2563eb;">
            Support Reply
          </div>
          <div style="white-space:pre-wrap; font-size:15px; line-height:1.75; color:#0f172a;">
            ${escapeHtml(message)}
          </div>
        </div>

        <div style="margin:28px 0; border:1px solid #e2e8f0; border-radius:20px; background:#f8fafc; padding:22px;">
          <h2 style="margin:0 0 10px; font-size:18px; line-height:1.3; color:#0f172a;">
            Ready to continue with us?
          </h2>
          <p style="margin:0 0 18px; font-size:14px; line-height:1.7; color:#475569;">
            Create an account to continue your inquiry, manage reservations, and stay updated with your requests more easily.
          </p>

          <a
            href="${signupUrl}"
            style="display:inline-block; padding:12px 20px; border-radius:14px; background:#2563eb; color:#ffffff; text-decoration:none; font-size:14px; font-weight:700;"
          >
            Create Your Account
          </a>

          <p style="margin:14px 0 0; font-size:12px; line-height:1.7; color:#64748b;">
            Already have an account?
            <a href="${loginUrl}" style="color:#2563eb; text-decoration:none; font-weight:700;">
              Sign in here
            </a>.
          </p>
        </div>

        <div style="margin:24px 0 0; border-top:1px solid #e2e8f0; padding-top:20px;">
          <div style="font-size:13px; line-height:1.7; color:#64748b;">
            <div><strong style="color:#334155;">Ticket:</strong> ${escapeHtml(ticket.public_id ?? ticket.ticket_id)}</div>
            <div><strong style="color:#334155;">Subject:</strong> ${escapeHtml(ticket.subject ?? "Support Ticket")}</div>
          </div>
        </div>

        <p style="margin:24px 0 0; font-size:15px; color:#475569;">
          Regards,<br />
          <strong style="color:#0f172a;">Commerciales Flores Support Team</strong>
        </p>
      </div>

      <div style="padding:18px 28px; border-top:1px solid #e2e8f0; background:#f8fafc; font-size:12px; line-height:1.7; color:#64748b;">
        This email was sent in response to your support inquiry with Comerciales Flores.
      </div>
    </div>
  </div>
`;

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

    const resendResult = await resend.emails.send({
  from: supportFromEmail,
  to: [guestEmail],
  subject: safeSubject,
  text: textBody,
  html: htmlBody,
});

    if (resendResult.error) {
      await adminClient.from("support_email_messages").insert([
        {
          ticket_id: ticket.ticket_id,
          support_message_id: supportMessage.support_message_id,
          direction: "outbound",
          recipient_email: guestEmail,
          sender_email: supportReplyTo,
          subject: safeSubject,
          text_body: textBody,
          html_body: htmlBody,
          delivery_status: "failed",
          error_message: resendResult.error.message,
          sent_by: actingUser.user_id,
        },
      ]);

      return jsonResponse(500, {
        error: resendResult.error.message || "Failed to send email",
      });
    }

    const resendEmailId = resendResult.data?.id ?? null;

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
          text_body: textBody,
          html_body: htmlBody,
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse(500, { error: message });
  }
});