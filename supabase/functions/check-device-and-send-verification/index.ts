import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const forwardedFor = req.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor?.split(',')[0]?.trim() ?? null;

    const { data: trustedDevice, error: trustedDeviceError } = await adminClient
      .from('trusted_devices')
      .select('trusted_device_id, is_trusted')
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
      await adminClient
        .from('trusted_devices')
        .update({
          user_agent: userAgent,
          device_name: deviceName,
          last_ip: ipAddress,
          last_seen_at: new Date().toISOString(),
        })
        .eq('trusted_device_id', trustedDevice.trusted_device_id);

      return new Response(
        JSON.stringify({ trusted: true }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = crypto.randomUUID() + crypto.randomUUID().replaceAll('-', '');
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
        token,
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
    from: 'Comerciales Flores <security@commercialesflores.com>' // TEMP SAFE
    to: [user.email],
    subject: 'Verify your login device',
    html: `
  <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
    <h2>Verify your login</h2>
    <p>We detected a sign-in from a new device.</p>
    <p>If this was you, click the button below to verify this device.</p>
    <p>
      <a href="${verifyUrl}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:10px;">
        Verify device
      </a>
    </p>
    <p>This link will expire in 15 minutes.</p>
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