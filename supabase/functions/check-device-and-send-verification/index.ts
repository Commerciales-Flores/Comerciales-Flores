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
  <body style="margin:0;padding:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${escapeHtml(preheader)}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0;padding:32px 16px;background:#eef2f7;">
      <tr>
        <td align="center">

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;margin:0 auto;">
            <tr>
              <td style="padding:0;">

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:22px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,0.08);">
                  
                  <tr>
                    <td style="padding:0;background:#ffffff;border-bottom:1px solid #e2e8f0;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        
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
                              ${escapeHtml(title)}
                            </div>

                            <div style="
                              font-size:14px;
                              color:#64748b;
                              line-height:1.7;
                              max-width:420px;
                              margin:0 auto;
                            ">
                              ${escapeHtml(subtitle)}
                            </div>
                          </td>
                        </tr>

                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:34px 32px;background:#ffffff;">
                      ${bodyHtml}
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:22px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                      <div style="font-size:12px;line-height:1.8;color:#64748b;text-align:center;">
                        This is an automated security email from Comerciales Flores. Please do not reply.
                      </div>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="padding:22px 32px;background:#2563eb;border-radius:0 0 22px 22px;">
                      <div style="font-size:13px;font-weight:600;color:#ffffff;margin-bottom:6px;">
                        Commerciales Flores
                      </div>
                      <div style="font-size:12px;line-height:1.6;color:#dbeafe;">
                        © ${new Date().getFullYear()} Commerciales Flores. All rights reserved.
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
      from: 'Commerciales Flores <security@commercialesflores.com>',
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
    preheader: 'Approve your sign-in request for Commerciales Flores.',
    title: 'Confirm it’s really you',
    subtitle: 'Reauthentication is required before we allow this sign-in.',
    bodyHtml: `
      <div style="font-size:16px;line-height:1.8;color:#334155;margin:0 0 18px 0;">
        We detected a sign-in attempt for your account. To continue, please confirm that this login was really made by you.
      </div>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;border-collapse:separate;padding:0 20px;">
        ${buildInfoRow('Device', deviceName || 'Desktop browser')}
        ${buildInfoRow('Browser', userAgent || 'Unavailable')}
        ${buildInfoRow('IP Address', ipAddress || 'Unavailable')}
        ${buildInfoRow('Approx. location', locationLabel || 'Unavailable')}
        ${buildInfoRow('Expires', formatDateTime(expiresAt))}
      </table>

      <div style="margin:0 0 18px 0;padding:18px 20px;border:1px solid #dbeafe;border-radius:16px;background:#f8fbff;">
        <div style="font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#1d4ed8;margin-bottom:8px;">
          What happens next?
        </div>
        <div style="font-size:14px;line-height:1.8;color:#475569;">
          Once approved, the original browser can continue signing in.
          ${
            rememberDevice
              ? ' Because “Remember this browser” was selected, this device will also be trusted for future logins.'
              : ' This browser will not be remembered unless you choose that option next time.'
          }
        </div>
      </div>

      <div style="text-align:center;padding:8px 0 16px 0;">
        <a
          href="${verifyUrl}"
          style="display:inline-block;background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;line-height:1;padding:16px 30px;border-radius:12px;box-shadow:0 10px 24px rgba(37,99,235,0.28);"
        >
          Approve Sign-In
        </a>
      </div>

      <div style="font-size:13px;line-height:1.8;color:#64748b;text-align:center;">
        If the button does not work, copy and paste this link into your browser:
      </div>
      <div style="padding-top:10px;font-size:12px;line-height:1.7;color:#2563eb;text-align:center;word-break:break-all;">
        ${verifyUrl}
      </div>

      <div style="padding:28px 0 0 0;">
        <div style="height:1px;line-height:1px;font-size:1px;background:#e2e8f0;">&nbsp;</div>
      </div>

      <div style="padding-top:24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #fecaca;border-radius:16px;background:#fff5f5;">
          <tr>
            <td style="padding:18px 20px;">
              <div style="font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#dc2626;margin-bottom:8px;">
                Security notice
              </div>
              <div style="font-size:14px;line-height:1.8;color:#7f1d1d;">
                If this was not you, you can safely ignore this email. The request will expire automatically after 15 minutes.
              </div>
            </td>
          </tr>
        </table>
      </div>
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
      <div style="font-size:16px;line-height:1.8;color:#334155;margin:0 0 18px 0;">
        Your trusted device was used to sign in from a location that appears to be in a different country from the last recorded login.
      </div>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;border-collapse:separate;padding:0 20px;">
        ${buildInfoRow('Previous location', previousCountry || 'Unknown')}
        ${buildInfoRow('Current location', currentLocationLabel || currentCountry || 'Unknown')}
        ${buildInfoRow('Device', deviceName || 'Unknown device')}
        ${buildInfoRow('IP Address', currentIp || 'Unavailable')}
        ${buildInfoRow('Time', formatDateTime(nowIso))}
      </table>

      <div style="margin:0 0 18px 0;padding:18px 20px;border:1px solid #fecaca;border-radius:16px;background:#fff5f5;">
        <div style="font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#dc2626;margin-bottom:8px;">
          Security notice
        </div>
        <div style="font-size:14px;line-height:1.8;color:#7f1d1d;">
          Change your password immediately and review your trusted devices from your account settings if this was not you.
        </div>
      </div>

      <div style="font-size:14px;line-height:1.8;color:#475569;">
        If this sign-in was yours, no action is needed.
      </div>
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
  }

  if (willSendCountryAlert) {
    await adminClient.from('audit_log').insert({
      user_id: user.id,
      action: 'DEVICE_LOCATION_COUNTRY_CHANGED',
      target_table: 'trusted_devices',
      target_id: trustedDevice.trusted_device_id,
      target_public_id: trustedDevice.public_id,
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
      target_public_id: trustedDevice.public_id,
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
        public_id,
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
      subject: 'Approve your Commerciales Flores sign-in',
      html: approvalHtml,
    });


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