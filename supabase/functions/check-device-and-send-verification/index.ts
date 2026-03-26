import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getClientIp(req: Request) {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || null;
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return null;
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
}

Deno.serve(async (req) => {
    console.log('AUTH HEADER PRESENT:', Boolean(req.headers.get('Authorization')));
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
      return new Response(
        JSON.stringify({ trusted: false, error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body = await req.json();
    const deviceFingerprint = String(body?.deviceFingerprint ?? '').trim();
    const userAgent = String(body?.userAgent ?? '').trim() || null;
    const rememberDevice = Boolean(body?.rememberDevice);
    const deviceName = String(body?.deviceName ?? '').trim() || null;

    if (!deviceFingerprint) {
      return new Response(
        JSON.stringify({ trusted: false, error: 'Missing device fingerprint' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
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
      .maybeSingle();

    if (trustedDeviceError) {
      return new Response(
        JSON.stringify({ trusted: false, error: trustedDeviceError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
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
    location_label: location.locationLabel,
    location_city: location.city,
    location_region: location.region,
    location_country: location.country,
    location_checked_at: nowIso,
    country_change_detected: countryChanged,
    city_change_detected: !countryChanged && cityChanged,
    suspicious_login: shouldFlagSuspicious,
    suspicious_reason: suspiciousReason,
    country_changed_at: countryChanged ? nowIso : null,
    city_changed_at: !countryChanged && cityChanged ? nowIso : null,
    last_location_alert_at: willSendCountryAlert ? nowIso : trustedDevice.last_location_alert_at,
  };

  const { error: trustedUpdateError } = await adminClient
    .from('trusted_devices')
    .update(updates)
    .eq('trusted_device_id', trustedDevice.trusted_device_id);

  if (trustedUpdateError) {
    return new Response(
      JSON.stringify({ trusted: false, error: trustedUpdateError.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  if (willSendCountryAlert) {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (resendApiKey) {
      const countryAlertHtml = `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
          <h2>Security alert</h2>
          <p>We noticed a sign-in from your trusted device in a different country.</p>
          <p><strong>Previous location:</strong> ${previousCountry ?? 'Unknown'}</p>
          <p><strong>Current location:</strong> ${location.locationLabel ?? currentCountry ?? 'Unknown'}</p>
          <p><strong>Device:</strong> ${deviceName || 'Unknown device'}</p>
          <p><strong>IP address:</strong> ${currentIp ?? 'Unavailable'}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <p>If this was you, no action is needed.</p>
          <p>If this was not you, we recommend changing your password and reviewing your trusted devices immediately.</p>
        </div>
      `;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Comerciales Flores <security@commercialesflores.com>',
          to: [user.email],
          subject: 'Security alert: sign-in from a different country',
          html: countryAlertHtml,
        }),
      });
    }

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

  return new Response(JSON.stringify({ trusted: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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
      return new Response(
        JSON.stringify({ trusted: false, error: insertError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const siteUrl = Deno.env.get('SITE_URL')!;
    const verifyUrl = `${siteUrl}/verify-device?token=${encodeURIComponent(token)}&rememberDevice=${rememberDevice ? '1' : '0'}`;

    // Replace this block with your real email sender
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

if (!resendApiKey) {
  return new Response(
    JSON.stringify({
      trusted: false,
      error: 'Email service not configured',
    }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

const emailRes = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${resendApiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: 'Comerciales Flores <security@commercialesflores.com>', // TEMP SAFE
    to: [user.email],
    subject: 'Approve your sign-in',
html: `
  <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
    <h2>Approve your sign-in</h2>
    <p>We detected a sign-in attempt from your desktop browser.</p>
    <p>You can approve this sign-in from your phone or any device where you opened this email.</p>
    <p>
      <a href="${verifyUrl}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:10px;">
        Approve sign-in
      </a>
    </p>
    <p>This link will expire in 15 minutes.</p>
    <p>If “Remember this browser” was selected, the original browser will also be remembered for future sign-ins.</p>
    <p>If this was not you, you can ignore this email.</p>
  </div>
`,
  }),
});

const emailData = await emailRes.json().catch(() => null);
console.log('EMAIL STATUS:', emailRes.status);
console.log('EMAIL RESPONSE:', emailData);
console.log('EMAIL TARGET:', user.email);

if (!emailRes.ok) {
    await adminClient
    .from('pending_login_verifications')
    .delete()
    .eq('user_id', user.id)
    .eq('device_fingerprint', deviceFingerprint)
    .eq('token', token);
  return new Response(
    JSON.stringify({
      trusted: false,
      error: emailData?.message || 'Failed to send email',
    }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

    await adminClient.from('audit_log').insert({
      user_id: user.id,
      action: 'DEVICE_VERIFICATION_SENT',
      target_table: 'users',
      target_id: user.id,
      changed_fields: ['device_fingerprint'],
      timestamp: new Date().toISOString(),
      notes: `Verification sent for untrusted device${deviceName ? ` (${deviceName})` : ''}`,
    });

    return new Response(
    JSON.stringify({
      trusted: false,
      verificationRequired: true,
      loginRequestId,
      expiresAt,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
  } catch (error) {
    return new Response(
      JSON.stringify({
        trusted: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});