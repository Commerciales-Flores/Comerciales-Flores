import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const body = await req.json().catch(() => ({}));
    const token = String(body?.token ?? '').trim();
    const requestedRememberDevice = Boolean(body?.rememberDevice);

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing token' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: verification, error: verificationError } = await adminClient
      .from('pending_login_verifications')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (verificationError) {
      return new Response(
        JSON.stringify({ success: false, error: verificationError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!verification) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or already used token' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const rememberDevice =
      Boolean(verification.remember_device) || requestedRememberDevice;

    if (new Date(verification.expires_at).getTime() < Date.now()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Verification link expired' }),
        {
          status: 410,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (verification.approved_at) {
      return new Response(
        JSON.stringify({
          success: true,
          approved: true,
          trusted: rememberDevice,
          message: rememberDevice
            ? 'Sign-in already approved and this browser is trusted. Return to your original browser to continue.'
            : 'Sign-in already approved. Return to your original browser to continue.',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const nowIso = new Date().toISOString();

    const { error: markVerifiedError } = await adminClient
      .from('pending_login_verifications')
      .update({
        verified_at: nowIso,
        approved_at: nowIso,
      })
      .eq('verification_id', verification.verification_id)
      .is('approved_at', null);

    if (markVerifiedError) {
      return new Response(
        JSON.stringify({ success: false, error: markVerifiedError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (rememberDevice) {
      const { error: trustError } = await adminClient
        .from('trusted_devices')
        .upsert(
          {
            user_id: verification.user_id,
            device_fingerprint: verification.device_fingerprint,
            user_agent: verification.user_agent ?? null,
            device_name: verification.device_name ?? null,
            is_trusted: true,
            last_seen_at: nowIso,
            created_at: nowIso,
            last_ip: verification.ip_address ?? null,
            location_label: verification.location_label ?? null,
            location_city: verification.location_city ?? null,
            location_region: verification.location_region ?? null,
            location_country: verification.location_country ?? null,
            location_timezone: verification.location_timezone ?? null,
            location_latitude: verification.location_latitude ?? null,
            location_longitude: verification.location_longitude ?? null,
            network_isp: verification.network_isp ?? null,
            network_asn: verification.network_asn ?? null,
            is_proxy: Boolean(verification.is_proxy),
            is_vpn: Boolean(verification.is_vpn),
            is_hosting: Boolean(verification.is_hosting),
            location_confidence: verification.location_confidence ?? null,
            location_source: verification.location_source ?? null,
            location_checked_at: nowIso,
            country_change_detected: false,
            city_change_detected: false,
            suspicious_login: false,
            suspicious_reason: null,
            last_location_alert_at: null,
            country_changed_at: null,
            city_changed_at: null,
          },
          {
            onConflict: 'user_id,device_fingerprint',
          }
        );

      if (trustError) {
        return new Response(
          JSON.stringify({ success: false, error: trustError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    const deviceLabel =
      verification.device_name?.trim() ||
      (verification.user_agent?.toLowerCase().includes('chrome') ? 'Chrome browser' : '') ||
      'Trusted device';

    const { error: auditError } = await adminClient.from('audit_log').insert({
      user_id: verification.user_id,
      action: 'LOGIN_APPROVED',
      target_table: rememberDevice ? 'trusted_devices' : 'users',
      target_id: rememberDevice ? verification.device_fingerprint : verification.user_id,
      target_public_id: rememberDevice ? deviceLabel : null,
      changed_fields: rememberDevice
        ? ['device_fingerprint', 'is_trusted']
        : ['device_fingerprint'],
      timestamp: nowIso,
      notes: rememberDevice
        ? 'Login approved from verification link and device trusted immediately'
        : 'Login approved from verification link',
    });


    return new Response(
      JSON.stringify({
        success: true,
        approved: true,
        trusted: rememberDevice,
        message: rememberDevice
          ? 'Sign-in approved and this browser is now trusted. Return to your original browser to continue.'
          : 'Sign-in approved. Return to your original browser to continue.',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});