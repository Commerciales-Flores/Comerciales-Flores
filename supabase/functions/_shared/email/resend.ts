import { Resend } from "npm:resend";

export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
};

export async function sendEmailWithResend({
  to,
  subject,
  html,
  text,
  from,
  replyTo,
}: SendEmailParams) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!resendApiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  const resend = new Resend(resendApiKey);

  const fromEmail =
    from ||
    Deno.env.get("RESEND_FROM_EMAIL") ||
    Deno.env.get("SUPPORT_FROM_EMAIL") ||
    "Commerciales Flores <noreply@commercialesflores.com>";

  const replyToEmail =
    replyTo ||
    Deno.env.get("RESEND_REPLY_TO") ||
    Deno.env.get("SUPPORT_REPLY_TO") ||
    undefined;

  const result = await resend.emails.send({
    from: fromEmail,
    to: [to],
    subject,
    html,
    text,
    ...(replyToEmail ? { replyTo: replyToEmail } : {}),
  });

  if (result.error) {
    throw new Error(result.error.message || "Failed to send email via Resend");
  }

  return result.data;
}