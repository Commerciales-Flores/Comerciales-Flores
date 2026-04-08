import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function escapeHtml(value: string | null | undefined) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDateTime(value: string | number | Date) {
  try {
    return new Intl.DateTimeFormat('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'Asia/Manila',
    }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleString();
  }
}

function buildEmailShell(options: {
  preheader: string;
  title: string;
  subtitle: string;
  bodyHtml: string;
}) {
  const { preheader, title, subtitle, bodyHtml } = options;

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${escapeHtml(preheader)}
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;margin:0;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px;background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);color:#ffffff;">
                <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;opacity:0.85;">
                  Comerciales Flores
                </div>
                <div style="margin-top:10px;font-size:28px;line-height:1.2;font-weight:700;">
                  ${escapeHtml(title)}
                </div>
                <div style="margin-top:8px;font-size:15px;line-height:1.6;color:#cbd5e1;">
                  ${escapeHtml(subtitle)}
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:32px;">
                ${bodyHtml}
              </td>
            </tr>

            <tr>
              <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.6;color:#64748b;">
                This is an automated security email from <strong>Comerciales Flores</strong>.<br />
                Please do not reply to this message.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}

async function sendEmail(params: {
  resendApiKey: string;
  to: string;
  subject: string;
  html: string;
}) {
  const { resendApiKey, to, subject, html } = params;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Comerciales Flores <security@commercialesflores.com>',
      to: [to],
      subject,
      html,
    }),
  });

  const data = await res.json().catch(() => null);

  return {
    ok: res.ok,
    status: res.status,
    data,
  };
}

function buildVerifyNewEmailEmail(params: {
  verifyUrl: string;
  newEmail: string;
  expiresAt: string;
}) {
  const { verifyUrl, newEmail, expiresAt } = params;

  return buildEmailShell({
    preheader: 'Verify your new email address for Comerciales Flores.',
    title: 'Verify your new email',
    subtitle: 'Complete your email change securely.',
    bodyHtml: `
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#334155;">
        We received a request to change your account email to <strong>${escapeHtml(newEmail)}</strong>.
      </p>

      <p style="margin:0 0 20px 0;font-size:14px;line-height:1.7;color:#475569;">
        Your current email will remain active until you verify this new address.
      </p>

      <div style="margin:24px 0 28px 0;text-align:center;">
        <a
          href="${verifyUrl}"
          style="display:inline-block;padding:14px 24px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:12px;font-size:15px;font-weight:700;"
        >
          Verify new email
        </a>
      </div>

      <p style="margin:0;font-size:14px;line-height:1.7;color:#475569;">
        This link expires on ${escapeHtml(formatDateTime(expiresAt))}.
      </p>
    `,
  });
}

function buildOldEmailAlertEmail(params: {
  oldEmail: string;
  newEmail: string;
  requestedAt: string;
}) {
  const { oldEmail, newEmail, requestedAt } = params;

  return buildEmailShell({
    preheader: 'Security alert: an email change was requested.',
    title: 'Email change requested',
    subtitle: 'We noticed a request to update your account email.',
    bodyHtml: `
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#334155;">
        A request was made to change the email on your Comerciales Flores account.
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0 24px 0;border-collapse:collapse;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;width:140px;font-size:13px;font-weight:700;color:#475569;">Current email</td>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;">${escapeHtml(oldEmail)}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;width:140px;font-size:13px;font-weight:700;color:#475569;">Requested new email</td>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;">${escapeHtml(newEmail)}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;width:140px;font-size:13px;font-weight:700;color:#475569;">Requested at</td>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;">${escapeHtml(formatDateTime(requestedAt))}</td>
        </tr>
      </table>

      <div style="margin:0 0 18px 0;padding:16px 18px;border:1px solid #fee2e2;background:#fef2f2;border-radius:14px;">
        <div style="font-size:13px;font-weight:700;color:#b91c1c;margin-bottom:6px;">Was this not you?</div>
        <div style="font-size:14px;line-height:1.7;color:#334155;">
          Your current email will stay active unless the new email is verified. If you did not request this, please change your password immediately and contact support.
        </div>
      </div>
    `,
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const siteUrl = (Deno.env.get('SITE_URL') || 'https://commercialesflores.com').replace(/\/$/, '');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !resendApiKey) {
      return jsonResponse({ success: false, error: 'Missing server configuration.' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ success: false, error: 'Missing authorization header.' }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ success: false, error: 'Unauthorized request.' }, 401);
    }

    const body = await req.json().catch(() => null);
    const newEmail = normalizeEmail(String(body?.newEmail ?? ''));
    const currentPassword = String(body?.currentPassword ?? '').trim();

    if (!newEmail) {
      return jsonResponse({ success: false, error: 'New email is required.' }, 400);
    }

    if (!currentPassword) {
      return jsonResponse({ success: false, error: 'Current password is required.' }, 400);
    }

    const currentEmail = normalizeEmail(user.email ?? '');
    if (!currentEmail) {
      return jsonResponse({ success: false, error: 'Current user email is missing.' }, 400);
    }

    if (newEmail === currentEmail) {
      return jsonResponse({ success: false, error: 'Please use a different email address.' }, 400);
    }

    const { data: profile, error: profileError } = await adminClient
      .from('users')
      .select('user_id, email, email_change_locked_until')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return jsonResponse({ success: false, error: 'Failed to load user profile.' }, 500);
    }

    const lockedUntil = profile.email_change_locked_until
      ? new Date(profile.email_change_locked_until).getTime()
      : null;

    if (lockedUntil && lockedUntil > Date.now()) {
      return jsonResponse(
        {
          success: false,
          error: `Email changes are temporarily locked until ${formatDateTime(profile.email_change_locked_until)}.`,
        },
        429
      );
    }

    const { error: reauthError } = await anonClient.auth.signInWithPassword({
      email: currentEmail,
      password: currentPassword,
    });

    if (reauthError) {
      return jsonResponse({ success: false, error: 'Current password is incorrect.' }, 401);
    }

    const { data: existingUserByEmail } = await adminClient
      .from('users')
      .select('user_id')
      .eq('email', newEmail)
      .maybeSingle();

    if (existingUserByEmail) {
      return jsonResponse({ success: false, error: 'That email is already in use.' }, 409);
    }

    const { data: reuseBlock } = await adminClient
      .from('email_reuse_blocks')
      .select('blocked_until')
      .eq('email', newEmail)
      .maybeSingle();

    if (reuseBlock?.blocked_until && new Date(reuseBlock.blocked_until).getTime() > Date.now()) {
      return jsonResponse(
        {
          success: false,
          error: `That email cannot be used yet. Try again after ${formatDateTime(reuseBlock.blocked_until)}.`,
        },
        409
      );
    }

    await adminClient
      .from('email_change_requests')
      .update({
        status: 'expired',
      })
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString());

    const verifyToken = crypto.randomUUID() + crypto.randomUUID().replaceAll('-', '');
    const cancelToken = crypto.randomUUID() + crypto.randomUUID().replaceAll('-', '');
    const requestedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const { error: insertError } = await adminClient.from('email_change_requests').insert({
      user_id: user.id,
      old_email: currentEmail,
      new_email: newEmail,
      status: 'pending',
      verify_token: verifyToken,
      cancel_token: cancelToken,
      requested_at: requestedAt,
      expires_at: expiresAt,
      requested_from_ip: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || null,
      requested_user_agent: req.headers.get('user-agent') || null,
    });

    if (insertError) {
      return jsonResponse(
        { success: false, error: insertError.message || 'Failed to create email change request.' },
        500
      );
    }

    const verifyUrl = `${siteUrl}/verify-email-change?token=${encodeURIComponent(verifyToken)}`;

    const newEmailHtml = buildVerifyNewEmailEmail({
      verifyUrl,
      newEmail,
      expiresAt,
    });

    const oldEmailHtml = buildOldEmailAlertEmail({
      oldEmail: currentEmail,
      newEmail,
      requestedAt,
    });

    const [verifySend, alertSend] = await Promise.all([
      sendEmail({
        resendApiKey,
        to: newEmail,
        subject: 'Verify your new Comerciales Flores email',
        html: newEmailHtml,
      }),
      sendEmail({
        resendApiKey,
        to: currentEmail,
        subject: 'Security alert: email change requested',
        html: oldEmailHtml,
      }),
    ]);

    if (!verifySend.ok) {
      await adminClient
        .from('email_change_requests')
        .delete()
        .eq('user_id', user.id)
        .eq('verify_token', verifyToken);

      return jsonResponse(
        { success: false, error: verifySend.data?.message || 'Failed to send verification email.' },
        500
      );
    }

    const { data: userRow, error: userFetchError } = await adminClient
      .from('users')
      .select('user_id, public_id')
      .eq('user_id', user.id)
      .single();

    if (userFetchError) {
      console.error('Failed to fetch user public_id for audit log:', userFetchError);
    }

    if (userRow) {
      await adminClient.from('audit_log').insert({
        user_id: user.id,
        action: 'EMAIL_CHANGE_REQUESTED',
        target_table: 'users',
        target_id: userRow.user_id,
        target_public_id: userRow.public_id ?? null, // ✅ FIX
        changed_fields: ['email'],
        notes: `Requested email change from ${currentEmail} to ${newEmail}`,
      });
    }

    return jsonResponse({
      success: true,
      message:
        'We sent a verification link to your new email address. Your current email stays active until the new address is verified.',
      oldEmailAlertSent: alertSend.ok,
      expiresAt,
    });
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error.',
      },
      500
    );
  }
});