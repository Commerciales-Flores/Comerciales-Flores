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
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp?.trim()) return cfConnectingIp.trim();

  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp?.trim()) return realIp.trim();

  const flyClientIp = req.headers.get('fly-client-ip');
  if (flyClientIp?.trim()) return flyClientIp.trim();

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

type ResolvedLocation = {
  ipAddress: string | null;
  locationLabel: string;
  city: string | null;
  region: string | null;
  country: string | null;
  timezone: string | null;
  latitude: number | null;
  longitude: number | null;
  isp: string | null;
  asn: string | null;
  isProxy: boolean;
  isVpn: boolean;
  isHosting: boolean;
  confidence: number;
  source: string;
};

function fallbackLocation(
  ip: string | null,
  source: string,
  confidence: number
): ResolvedLocation {
  return {
    ipAddress: ip,
    locationLabel: 'Unknown location',
    city: null,
    region: null,
    country: null,
    timezone: null,
    latitude: null,
    longitude: null,
    isp: null,
    asn: null,
    isProxy: false,
    isVpn: false,
    isHosting: false,
    confidence,
    source,
  };
}

async function resolveIpLocation(ip: string | null): Promise<ResolvedLocation> {
  if (!ip) {
    return fallbackLocation(null, 'none', 0);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: controller.signal,
    });

    if (!res.ok) {
      return fallbackLocation(ip, 'ipwho.is', 10);
    }

    const geo = await res.json();

    if (!geo?.success) {
      return fallbackLocation(ip, 'ipwho.is', 10);
    }

    const city = geo.city ?? null;
    const region = geo.region ?? null;
    const country = geo.country ?? null;
    const timezone = geo.timezone?.id ?? geo.timezone?.name ?? geo.timezone ?? null;
    const latitude = typeof geo.latitude === 'number' ? geo.latitude : null;
    const longitude = typeof geo.longitude === 'number' ? geo.longitude : null;
    const isp = geo.connection?.isp ?? null;
    const asn = geo.connection?.asn ? String(geo.connection.asn) : null;

    let locationLabel = [city, region, country].filter(Boolean).join(', ');
    if (!locationLabel && country) locationLabel = country;
    if (!locationLabel) locationLabel = 'Unknown location';

    let confidence = 25;
    if (country) confidence += 25;
    if (region) confidence += 20;
    if (city) confidence += 20;
    if (timezone) confidence += 5;
    if (isp) confidence += 5;

    return {
      ipAddress: ip,
      locationLabel,
      city,
      region,
      country,
      timezone,
      latitude,
      longitude,
      isp,
      asn,
      isProxy: Boolean(geo.security?.proxy),
      isVpn: Boolean(geo.security?.vpn),
      isHosting: Boolean(geo.security?.hosting),
      confidence: Math.max(0, Math.min(100, confidence)),
      source: 'ipwho.is',
    };
  } catch {
    return fallbackLocation(ip, 'lookup_failed', 5);
  } finally {
    clearTimeout(timeout);
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
        ${buildInfoRow('Approx. location', locationLabel || 'Unavailable')}
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

async function processTrustedDeviceLogin(params: {
  adminClient: ReturnType<typeof createClient>;
  trustedDevice: any;
  user: any;
  ipAddress: string | null;
  userAgent: string | null;
  deviceName: string | null;
  resendApiKey: string | undefined;
}) {
  const {
    adminClient,
    trustedDevice,
    user,
    ipAddress,
    userAgent,
    deviceName,
    resendApiKey,
  } = params;

  const location = await resolveIpLocation(ipAddress);
  const nowIso = new Date().toISOString();

  const previousCountry = trustedDevice.location_country ?? null;
  const previousCity = trustedDevice.location_city ?? null;
  const previousTimezone = trustedDevice.location_timezone ?? null;
  const previousIp = trustedDevice.last_ip ?? null;
  const previousIsp = trustedDevice.network_isp ?? null;
  const previousAsn = trustedDevice.network_asn ?? null;

  const currentCountry = location.country ?? null;
  const currentCity = location.city ?? null;
  const currentTimezone = location.timezone ?? null;
  const currentIp = ipAddress ?? null;
  const currentIsp = location.isp ?? null;
  const currentAsn = location.asn ?? null;

  const countryChanged = Boolean(
    previousCountry &&
      currentCountry &&
      previousCountry.toLowerCase() !== currentCountry.toLowerCase()
  );

  const cityChanged = Boolean(
    previousCity &&
      currentCity &&
      previousCity.toLowerCase() !== currentCity.toLowerCase()
  );

  const timezoneChanged = Boolean(
    previousTimezone &&
      currentTimezone &&
      previousTimezone.toLowerCase() !== currentTimezone.toLowerCase()
  );

  const ipChanged = Boolean(previousIp && currentIp && previousIp !== currentIp);

  const ispChanged = Boolean(
    previousIsp &&
      currentIsp &&
      previousIsp.toLowerCase() !== currentIsp.toLowerCase()
  );

  const asnChanged = Boolean(
    previousAsn &&
      currentAsn &&
      String(previousAsn).toLowerCase() !== String(currentAsn).toLowerCase()
  );

  let riskScore = 0;
  if (countryChanged) riskScore += 70;
  if (!countryChanged && cityChanged) riskScore += 20;
  if (timezoneChanged) riskScore += 10;
  if (ipChanged) riskScore += 10;
  if (ispChanged) riskScore += 10;
  if (asnChanged) riskScore += 10;
  if (location.isVpn) riskScore += 25;
  if (location.isProxy) riskScore += 25;
  if (location.isHosting) riskScore += 20;

  const shouldSendCountryAlert = riskScore >= 70 && countryChanged;
  const shouldFlagSuspicious = riskScore >= 30;

  const suspiciousParts: string[] = [];
  if (countryChanged) {
    suspiciousParts.push(`country changed from ${previousCountry} to ${currentCountry}`);
  } else if (cityChanged) {
    suspiciousParts.push(`city changed from ${previousCity} to ${currentCity}`);
  }
  if (timezoneChanged) suspiciousParts.push('timezone changed');
  if (ipChanged) suspiciousParts.push('IP changed');
  if (ispChanged) suspiciousParts.push('ISP changed');
  if (asnChanged) suspiciousParts.push('ASN changed');
  if (location.isVpn) suspiciousParts.push('VPN detected');
  if (location.isProxy) suspiciousParts.push('proxy detected');
  if (location.isHosting) suspiciousParts.push('hosting network detected');

  const suspiciousReason = suspiciousParts.length > 0 ? suspiciousParts.join('; ') : null;

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
    is_proxy: location.isProxy,
    is_vpn: location.isVpn,
    is_hosting: location.isHosting,
    location_confidence: location.confidence,
    location_source: location.source,
  };

  if (location.locationLabel) updates.location_label = location.locationLabel;
  if (location.city) updates.location_city = location.city;
  if (location.region) updates.location_region = location.region;
  if (location.country) updates.location_country = location.country;
  if (location.timezone) updates.location_timezone = location.timezone;
  if (location.latitude !== null) updates.location_latitude = location.latitude;
  if (location.longitude !== null) updates.location_longitude = location.longitude;
  if (location.isp) updates.network_isp = location.isp;
  if (location.asn) updates.network_asn = location.asn;

  const { error: trustedUpdateError } = await adminClient
    .from('trusted_devices')
    .update(updates)
    .eq('trusted_device_id', trustedDevice.trusted_device_id);

  if (trustedUpdateError) {
    console.error('Trusted device update failed:', trustedUpdateError.message);
    return;
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
      notes: suspiciousReason ?? 'Trusted device country changed',
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
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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

    if (userError || !user) {
      return jsonResponse({ trusted: false, error: 'Unauthorized' }, 401);
    }

    const body = await req.json().catch(() => ({}));

    const rawFingerprint = String(body?.deviceFingerprint ?? '').trim();
    const [deviceFingerprint] = rawFingerprint.split('.', 2);
    const userAgent = String(body?.userAgent ?? '').trim() || null;
    const rememberDevice = Boolean(body?.rememberDevice);
    const deviceName = String(body?.deviceName ?? '').trim() || null;

    if (!deviceFingerprint) {
      return jsonResponse(
        { trusted: false, error: 'Missing device fingerprint' },
        400
      );
    }

    const ipAddress = getClientIp(req);

    const { data: trustedDevice, error: trustedDeviceError } = await adminClient
      .from('trusted_devices')
      .select(`
        trusted_device_id,
        is_trusted,
        last_ip,
        user_agent,
        device_name,
        location_label,
        location_city,
        location_region,
        location_country,
        location_timezone,
        location_latitude,
        location_longitude,
        network_isp,
        network_asn,
        is_proxy,
        is_vpn,
        is_hosting,
        location_confidence,
        location_source,
        country_change_detected,
        city_change_detected,
        suspicious_login,
        suspicious_reason,
        last_location_alert_at
      `)
      .eq('user_id', user.id)
      .eq('device_fingerprint', deviceFingerprint)
      .eq('is_trusted', true)
      .maybeSingle();

    if (trustedDeviceError) {
      return jsonResponse(
        { trusted: false, error: trustedDeviceError.message },
        500
      );
    }

    if (trustedDevice?.is_trusted) {
      EdgeRuntime.waitUntil(
        processTrustedDeviceLogin({
          adminClient,
          trustedDevice,
          user,
          ipAddress,
          userAgent,
          deviceName,
          resendApiKey,
        }).catch((error) => {
          console.error('Trusted device background task failed:', error);
        })
      );

      return jsonResponse({ trusted: true }, 200);
    }

    const location = await resolveIpLocation(ipAddress);

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
        location_timezone: location.timezone,
        location_latitude: location.latitude,
        location_longitude: location.longitude,
        network_isp: location.isp,
        network_asn: location.asn,
        is_proxy: location.isProxy,
        is_vpn: location.isVpn,
        is_hosting: location.isHosting,
        location_confidence: location.confidence,
        location_source: location.source,
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

    const rawSiteUrl = String(siteUrl ?? '').trim();
    const isLocalhost =
      rawSiteUrl.includes('localhost') || rawSiteUrl.includes('127.0.0.1');

    const baseUrl =
      rawSiteUrl.startsWith('http') && !isLocalhost
        ? rawSiteUrl.replace(/\/$/, '')
        : 'https://commercialesflores.com';

    const verifyUrl =
      `${baseUrl}/verify-device?token=${encodeURIComponent(token)}` +
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