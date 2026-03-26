import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function getClientIp(req: Request) {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || null;
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  return null;
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

          <div style="max-width:640px;padding:14px 18px 0 18px;font-size:12px;line-height:1.6;color:#94a3b8;text-align:center;">
            © ${new Date().getFullYear()} Comerciales Flores. All rights reserved.
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}

function buildInfoRow(label: string, value: string) {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;width:150px;font-size:13px;font-weight:700;color:#475569;vertical-align:top;">
        ${escapeHtml(label)}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;">
        ${escapeHtml(value)}
      </td>
    </tr>
  `;
}

async function resolveIpLocation(ip: string | null) {
  if (!ip) {
    return {
      ipAddress: null,
      locationLabel: null,
      city: null,
      region: null,
      country: null,
    };
  }

  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`);

    if (!res.ok) {
      return {
        ipAddress: ip,
        locationLabel: null,
        city: null,
        region: null,
        country: null,
      };
    }

    const geo = await res.json();

    const city = geo.city ?? null;
    const region = geo.region ?? null;
    const country = geo.country_name ?? null;

    return {
      ipAddress: ip,
      locationLabel: [city, region, country].filter(Boolean).join(', ') || null,
      city,
      region,
      country,
    };
  } catch {
    return {
      ipAddress: ip,
      locationLabel: null,
      city: null,
      region: null,
      country: null,
    };
  }
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

function buildApproveSignInEmail(options: {
  deviceName: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  locationLabel: string | null;
  expiresAt: string;
  verifyUrl: string;
  rememberDevice: boolean;
}) {
  const {
    deviceName,
    userAgent,
    ipAddress,
    locationLabel,
    expiresAt,
    verifyUrl,
    rememberDevice,
  } = options;

  return buildEmailShell({
    preheader: 'Approve your sign-in request for Comerciales Flores.',
    title: 'Approve your sign-in',
    subtitle: 'We detected a login attempt that needs your confirmation.',
    bodyHtml: `
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#334155;">
        A sign-in attempt was made for your account. To continue, confirm that this login was really made by you.
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0 24px 0;border-collapse:collapse;">
        ${buildInfoRow('Device', deviceName || 'Desktop browser')}
        ${buildInfoRow('Browser', userAgent || 'Unavailable')}
        ${buildInfoRow('IP Address', ipAddress || 'Unavailable')}
        ${buildInfoRow('Location', locationLabel || 'Unavailable')}
        ${buildInfoRow('Expires', formatDateTime(expiresAt))}
      </table>

      <div style="margin:24px 0 28px 0;text-align:center;">
        <a
          href="${verifyUrl}"
          style="display:inline-block;padding:14px 24px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:12px;font-size:15px;font-weight:700;"
        >
          Approve sign-in
        </a>
      </div>

      <div style="margin:0 0 18px 0;padding:16px 18px;border:1px solid #dbeafe;background:#eff6ff;border-radius:14px;">
        <div style="font-size:13px;font-weight:700;color:#1d4ed8;margin-bottom:6px;">What happens next?</div>
        <div style="font-size:14px;line-height:1.7;color:#334155;">
          Once approved, the original browser can continue signing in.
          ${
            rememberDevice
              ? ' Because “Remember this browser” was selected, this device will also be trusted for future logins.'
              : ' This browser will not be remembered unless you choose that option next time.'
          }
        </div>
      </div>

      <p style="margin:0;font-size:14px;line-height:1.7;color:#475569;">
        If this was not you, you can safely ignore this email. The request will expire automatically after 15 minutes.
      </p>
    `,
  });
}

function buildCountryAlertEmail(options: {
  previousCountry: string | null;
  currentLocationLabel: string | null;
  currentCountry: string | null;
  deviceName: string | null;
  currentIp: string | null;
  nowIso: string;
}) {
  const {
    previousCountry,
    currentLocationLabel,
    currentCountry,
    deviceName,
    currentIp,
    nowIso,
  } = options;

  return buildEmailShell({
    preheader: 'Security alert: sign-in detected from a different country.',
    title: 'Security alert',
    subtitle: 'We noticed activity on your trusted device from a different country.',
    bodyHtml: `
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#334155;">
        Your trusted device was used to sign in from a location that appears to be in a different country from the last recorded login.
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0 24px 0;border-collapse:collapse;">
        ${buildInfoRow('Previous location', previousCountry || 'Unknown')}
        ${buildInfoRow('Current location', currentLocationLabel || currentCountry || 'Unknown')}
        ${buildInfoRow('Device', deviceName || 'Unknown device')}
        ${buildInfoRow('IP Address', currentIp || 'Unavailable')}
        ${buildInfoRow('Time', formatDateTime(nowIso))}
      </table>

      <div style="margin:0 0 18px 0;padding:16px 18px;border:1px solid #fee2e2;background:#fef2f2;border-radius:14px;">
        <div style="font-size:13px;font-weight:700;color:#b91c1c;margin-bottom:6px;">Was this not you?</div>
        <div style="font-size:14px;line-height:1.7;color:#334155;">
          Change your password immediately and review your trusted devices from your account settings.
        </div>
      </div>

      <p style="margin:0;font-size:14px;line-height:1.7;color:#475569;">
        If this sign-in was yours, no action is needed.
      </p>
    `,
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('AUTH HEADER PRESENT:', Boolean(req.headers.get('Authorization')));

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const siteUrl = Deno.env.get('SITE_URL');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !siteUrl) {
      return jsonResponse(
        {
          trusted: false,
          error: 'Server configuration is incomplete',
        },
        500
      );
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization') ?? '',
        },
      },
    });

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    console.log('AUTH USER:', user?.id ?? null, 'ERROR:', userError?.message ?? null);

    if (userError || !user) {
      return jsonResponse({ trusted: false, error: 'Unauthorized' }, 401);
    }

    const body = await req.json().catch(() => ({}));

    const deviceFingerprint = String(body?.deviceFingerprint ?? '').trim();
    const userAgent = String(body?.userAgent ?? '').trim() || null;
    const rememberDevice = Boolean(body?.rememberDevice);
    const deviceName = String(body?.deviceName ?? '').trim() || null;

    console.log('=== CHECK DEVICE DEBUG ===');
    console.log('USER ID:', user.id);
    console.log('INCOMING FINGERPRINT:', deviceFingerprint);
    console.log('USER AGENT:', userAgent);
    console.log('REMEMBER DEVICE:', rememberDevice);

    if (!deviceFingerprint) {
      return jsonResponse(
        { trusted: false, error: 'Missing device fingerprint' },
        400
      );
    }

    const ipAddress = getClientIp(req);
    const location = await resolveIpLocation(ipAddress);

    const { data: trustedDevice, error: trustedDeviceError } = await adminClient
      .from('trusted_devices')
      .select(`
        trusted_device_id,
        is_trusted,
        last_ip,
        location_city,
        location_region,
        location_country,
        country_change_detected,
        city_change_detected,
        suspicious_login,
        last_location_alert_at
      `)
      .eq('user_id', user.id)
      .eq('device_fingerprint', deviceFingerprint)
      .eq('is_trusted', true)
      .maybeSingle();

    console.log('TRUSTED DEVICE ERROR:', trustedDeviceError?.message ?? null);
    console.log('TRUSTED DEVICE FOUND:', Boolean(trustedDevice));
    console.log('TRUSTED DEVICE DATA:', trustedDevice);

    if (trustedDeviceError) {
      return jsonResponse(
        { trusted: false, error: trustedDeviceError.message },
        500
      );
    }

    if (trustedDevice?.is_trusted) {
      const nowIso = new Date().toISOString();

      const previousCountry = trustedDevice.location_country ?? null;
      const previousCity = trustedDevice.location_city ?? null;
      const previousIp = trustedDevice.last_ip ?? null;

      const currentCountry = location.country ?? null;
      const currentCity = location.city ?? null;
      const currentIp = ipAddress ?? null;

      const countryChanged = Boolean(
        previousCountry &&
          currentCountry &&
          previousCountry.toLowerCase() !== currentCountry.toLowerCase()
      );

      const hasValidLocation = Boolean(currentCountry);

      const cityChanged = Boolean(
        hasValidLocation &&
          previousCity &&
          currentCity &&
          previousCity.toLowerCase() !== currentCity.toLowerCase()
      );

      const ipChanged = Boolean(previousIp && currentIp && previousIp !== currentIp);

      let riskScore = 0;
      if (countryChanged) riskScore += 70;
      if (!countryChanged && cityChanged && ipChanged) riskScore += 25;
      if (ipChanged) riskScore += 10;

      const shouldFlagSuspicious = riskScore >= 30;
      const shouldSendCountryAlert = riskScore >= 70;

      const suspiciousReason = shouldSendCountryAlert
        ? `Country changed from ${previousCountry} to ${currentCountry}`
        : shouldFlagSuspicious
          ? `Location pattern changed${cityChanged ? `: ${previousCity} to ${currentCity}` : ''}${ipChanged ? ' with IP change' : ''}`
          : null;

      const lastAlertAt = trustedDevice.last_location_alert_at
        ? new Date(trustedDevice.last_location_alert_at).getTime()
        : null;

      const canSendAnotherCountryAlert =
        !lastAlertAt || Date.now() - lastAlertAt > 6 * 60 * 60 * 1000;

      const willSendCountryAlert =
        shouldSendCountryAlert && Boolean(user.email) && canSendAnotherCountryAlert;

      const updates: Record<string, unknown> = {
        user_agent: userAgent,
        device_name: deviceName,
        last_ip: currentIp,
        last_seen_at: nowIso,
        location_checked_at: nowIso,
        country_change_detected: countryChanged,
        city_change_detected: !countryChanged && cityChanged,
        suspicious_login: shouldFlagSuspicious,
        suspicious_reason: suspiciousReason,
        country_changed_at: countryChanged ? nowIso : null,
        city_changed_at: !countryChanged && cityChanged ? nowIso : null,
        last_location_alert_at: willSendCountryAlert
          ? nowIso
          : trustedDevice.last_location_alert_at,
      };

      if (location.locationLabel) updates.location_label = location.locationLabel;
      if (location.city) updates.location_city = location.city;
      if (location.region) updates.location_region = location.region;
      if (location.country) updates.location_country = location.country;

      const { error: trustedUpdateError } = await adminClient
        .from('trusted_devices')
        .update(updates)
        .eq('trusted_device_id', trustedDevice.trusted_device_id);

      if (trustedUpdateError) {
        return jsonResponse(
          { trusted: false, error: trustedUpdateError.message },
          500
        );
      }

      if (willSendCountryAlert && resendApiKey && user.email) {
        const countryAlertHtml = buildCountryAlertEmail({
          previousCountry,
          currentLocationLabel: location.locationLabel,
          currentCountry,
          deviceName,
          currentIp,
          nowIso,
        });

        const emailResult = await sendEmail({
          resendApiKey,
          to: user.email,
          subject: 'Security alert: sign-in from a different country',
          html: countryAlertHtml,
        });

        console.log('COUNTRY ALERT STATUS:', emailResult.status);
        console.log('COUNTRY ALERT RESPONSE:', emailResult.data);
      }

      if (willSendCountryAlert) {
        await adminClient.from('audit_log').insert({
          user_id: user.id,
          action: 'DEVICE_LOCATION_COUNTRY_CHANGED',
          target_table: 'trusted_devices',
          target_id: trustedDevice.trusted_device_id,
          changed_fields: ['location_country', 'last_location_alert_at'],
          timestamp: nowIso,
          notes: `Trusted device country changed from ${previousCountry} to ${currentCountry}`,
        });
      } else if (shouldFlagSuspicious) {
        await adminClient.from('audit_log').insert({
          user_id: user.id,
          action: 'DEVICE_LOCATION_SUSPICIOUS',
          target_table: 'trusted_devices',
          target_id: trustedDevice.trusted_device_id,
          changed_fields: ['location_city', 'last_ip', 'suspicious_login'],
          timestamp: nowIso,
          notes: suspiciousReason ?? 'Suspicious location pattern detected',
        });
      }

      return jsonResponse({ trusted: true }, 200);
    }

    const token = crypto.randomUUID() + crypto.randomUUID().replaceAll('-', '');
    const loginRequestId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await adminClient
      .from('pending_login_verifications')
      .delete()
      .eq('user_id', user.id)
      .eq('device_fingerprint', deviceFingerprint)
      .is('verified_at', null);

    const { error: insertError } = await adminClient
      .from('pending_login_verifications')
      .insert({
        user_id: user.id,
        device_fingerprint: deviceFingerprint,
        user_agent: userAgent,
        device_name: deviceName,
        ip_address: location.ipAddress,
        location_label: location.locationLabel,
        location_city: location.city,
        location_region: location.region,
        location_country: location.country,
        token,
        login_request_id: loginRequestId,
        remember_device: rememberDevice,
        expires_at: expiresAt,
      });

    if (insertError) {
      return jsonResponse(
        { trusted: false, error: insertError.message },
        500
      );
    }

    if (!resendApiKey) {
      await adminClient
        .from('pending_login_verifications')
        .delete()
        .eq('user_id', user.id)
        .eq('device_fingerprint', deviceFingerprint)
        .eq('token', token);

      return jsonResponse(
        {
          trusted: false,
          error: 'Email service not configured',
        },
        500
      );
    }

    if (!user.email) {
      await adminClient
        .from('pending_login_verifications')
        .delete()
        .eq('user_id', user.id)
        .eq('device_fingerprint', deviceFingerprint)
        .eq('token', token);

      return jsonResponse(
        {
          trusted: false,
          error: 'User email is missing',
        },
        500
      );
    }

    const verifyUrl =
      `${siteUrl}/verify-device?token=${encodeURIComponent(token)}` +
      `&rememberDevice=${rememberDevice ? '1' : '0'}`;

    const approvalHtml = buildApproveSignInEmail({
      deviceName,
      userAgent,
      ipAddress: location.ipAddress,
      locationLabel: location.locationLabel,
      expiresAt,
      verifyUrl,
      rememberDevice,
    });

    const emailResult = await sendEmail({
      resendApiKey,
      to: user.email,
      subject: 'Approve your Comerciales Flores sign-in',
      html: approvalHtml,
    });

    console.log('EMAIL STATUS:', emailResult.status);
    console.log('EMAIL RESPONSE:', emailResult.data);
    console.log('EMAIL TARGET:', user.email);

    if (!emailResult.ok) {
      await adminClient
        .from('pending_login_verifications')
        .delete()
        .eq('user_id', user.id)
        .eq('device_fingerprint', deviceFingerprint)
        .eq('token', token);

      return jsonResponse(
        {
          trusted: false,
          error: emailResult.data?.message || 'Failed to send email',
        },
        500
      );
    }

    await adminClient.from('audit_log').insert({
      user_id: user.id,
      action: 'DEVICE_VERIFICATION',
      target_table: 'users',
      target_id: user.id,
      changed_fields: ['device_fingerprint'],
      timestamp: new Date().toISOString(),
      notes: `Verification sent for untrusted device${deviceName ? ` (${deviceName})` : ''}`,
    });

    return jsonResponse(
      {
        trusted: false,
        verificationRequired: true,
        loginRequestId,
        expiresAt,
      },
      200
    );
  } catch (error) {
    return jsonResponse(
      {
        trusted: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});