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
      "Thank you for reaching out to Commerciales Flores.",
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
  <div style="margin:0;padding:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0;padding:32px 16px;background:#eef2f7;">
      <tr>
        <td align="center">

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;margin:0 auto;">
            <tr>
              <td style="padding:0;">

                <!-- Card -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:22px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,0.08);">
                  
                  <!-- Standardized white + blue header -->
                  <tr>
                    <td style="padding:0;background:#ffffff;border-bottom:1px solid #e2e8f0;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        
                        <!-- Logo Row -->
                        <tr>
                          <td style="padding:26px 32px 0 32px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td style="padding-right:10px;">
                                  <div style="
                                    background:#2563eb;
                                    padding:8px;
                                    border-radius:10px;
                                    box-shadow:0 6px 16px rgba(37,99,235,0.15);
                                    display:inline-block;
                                  ">
                                    <img 
                                      src="https://nlermulroebcmfwvyhmo.supabase.co/storage/v1/object/public/property_media/public/logos/building-2.png"
                                      width="18"
                                      height="18"
                                      alt="Comerciales Flores"
                                      style="display:block;filter:brightness(0) invert(1);"
                                    />
                                  </div>
                                </td>

                                <td>
                                  <div style="
                                    font-size:16px;
                                    font-weight:700;
                                    color:#111827;
                                    letter-spacing:-0.01em;
                                  ">
                                    Commerciales Flores
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <!-- Hero -->
                        <tr>
                          <td align="center" style="padding:24px 32px 28px 32px;">
                            
                            <div style="
                              font-size:64px;
                              font-weight:900;
                              color:#f1f5f9;
                              font-style:italic;
                              line-height:1;
                              user-select:none;
                            ">
                              CF
                            </div>

                            <div style="
                              margin:-18px auto 18px auto;
                              width:64px;
                              height:64px;
                              background:#2563eb;
                              border-radius:14px;
                              transform:rotate(8deg);
                              box-shadow:0 12px 28px rgba(37,99,235,0.20);
                              display:flex;
                              align-items:center;
                              justify-content:center;
                            ">
                              <img 
                                src="https://nlermulroebcmfwvyhmo.supabase.co/storage/v1/object/public/property_media/public/logos/building-2.png"
                                width="28"
                                height="28"
                                alt="Comerciales Flores"
                                style="display:block;transform:rotate(-8deg);filter:brightness(0) invert(1);"
                              />
                            </div>

                            <div style="
                              font-size:22px;
                              font-weight:700;
                              color:#111827;
                              margin-bottom:6px;
                            ">
                              We’d love to help you move forward
                            </div>

                            <div style="
                              font-size:14px;
                              color:#64748b;
                              line-height:1.7;
                              max-width:420px;
                              margin:0 auto;
                            ">
                              Our support team has replied to your inquiry, and your next step is just one click away.
                            </div>

                          </td>
                        </tr>

                      </table>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding:0;background:#ffffff;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        
                        <!-- Intro -->
                        <tr>
                          <td style="padding:34px 32px 18px 32px;">
                            <div style="font-size:16px;line-height:1.8;color:#334155;">
                              Hello${ticket.guest_first_name ? ` <strong>${escapeHtml(ticket.guest_first_name)}</strong>` : ""},
                            </div>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:0 32px 18px 32px;">
                            <div style="font-size:16px;line-height:1.8;color:#334155;">
                              Thank you for reaching out to <strong style="color:#111827;">Commerciales Flores</strong>. We’ve responded to your inquiry below.
                            </div>
                          </td>
                        </tr>

                        <!-- Support reply -->
                        <tr>
                          <td style="padding:0 32px 10px 32px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #dbeafe;border-radius:16px;background:#f8fbff;">
                              <tr>
                                <td style="padding:18px 20px;">
                                  <div style="font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#1d4ed8;margin-bottom:8px;">
                                    Support reply
                                  </div>
                                  <div style="white-space:pre-wrap;font-size:14px;line-height:1.8;color:#475569;">
                                    ${escapeHtml(message)}
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <!-- Continue with us -->
                        <tr>
                          <td style="padding:18px 32px 10px 32px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc;">
                              <tr>
                                <td style="padding:20px;">
                                  <div style="font-size:18px;font-weight:700;line-height:1.4;color:#111827;margin-bottom:8px;">
                                    Ready to continue with us?
                                  </div>
                                  <div style="font-size:14px;line-height:1.8;color:#475569;margin-bottom:18px;">
                                    Create an account to continue your inquiry, manage reservations, and stay updated with your requests more easily.
                                  </div>

                                  <a
                                    href="${signupUrl}"
                                    style="display:inline-block;background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;line-height:1;padding:16px 26px;border-radius:12px;box-shadow:0 10px 24px rgba(37,99,235,0.28);"
                                  >
                                    Create Your Account
                                  </a>

                                  <div style="margin-top:14px;font-size:13px;line-height:1.8;color:#64748b;">
                                    Already have an account?
                                    <a href="${loginUrl}" style="color:#2563eb;text-decoration:none;font-weight:700;">
                                      Sign in here
                                    </a>.
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <!-- Ticket details -->
                        <tr>
                          <td style="padding:18px 32px 0 32px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;">
                              <tr>
                                <td style="padding:18px 20px;">
                                  <div style="font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#64748b;margin-bottom:10px;">
                                    Ticket details
                                  </div>
                                  <div style="font-size:14px;line-height:1.8;color:#475569;">
                                    <div><strong style="color:#334155;">Ticket:</strong> ${escapeHtml(ticket.public_id ?? ticket.ticket_id)}</div>
                                    <div><strong style="color:#334155;">Subject:</strong> ${escapeHtml(ticket.subject ?? "Support Ticket")}</div>
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <!-- Closing -->
                        <tr>
                          <td style="padding:24px 32px 32px 32px;">
                            <div style="font-size:15px;line-height:1.8;color:#475569;">
                              Regards,<br />
                              <strong style="color:#111827;">Commerciales Flores Support Team</strong>
                            </div>
                          </td>
                        </tr>

                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding:22px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                      <div style="font-size:12px;line-height:1.8;color:#64748b;text-align:center;">
                        This email was sent in response to your support inquiry with Commerciales Flores.
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- Blue Footer -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td 
                      align="center" 
                      style="
                        padding:22px 32px;
                        background:#2563eb;
                        border-radius:0 0 22px 22px;
                      "
                    >
                      <div style="
                        font-size:13px;
                        font-weight:600;
                        color:#ffffff;
                        margin-bottom:6px;
                      ">
                        Commerciales Flores
                      </div>

                      <div style="
                        font-size:12px;
                        line-height:1.6;
                        color:#dbeafe;
                      ">
                        © 2026 Commerciales Flores. All rights reserved.
                      </div>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>
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