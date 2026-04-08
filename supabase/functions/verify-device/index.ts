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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return jsonResponse({ success: false, error: 'Missing server configuration' }, 500);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const body = await req.json().catch(() => ({}));
    const token = String(body?.token ?? '').trim();
    const requestedRememberDevice = Boolean(body?.rememberDevice);

    if (!token) {
      return jsonResponse({ success: false, error: 'Missing token' }, 400);
    }

    const { data: verification, error: verificationError } = await adminClient
      .from('pending_login_verifications')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (verificationError) {
      return jsonResponse({ success: false, error: verificationError.message }, 500);
    }

    if (!verification) {
      return jsonResponse(
        { success: false, error: 'Invalid or already used token' },
        404
      );
    }

    const rememberDevice =
      Boolean(verification.remember_device) || requestedRememberDevice;

    if (new Date(verification.expires_at).getTime() < Date.now()) {
      return jsonResponse(
        { success: false, error: 'Verification link expired' },
        410
      );
    }

    if (verification.approved_at) {
      return jsonResponse({
        success: true,
        approved: true,
        trusted: rememberDevice,
        message: rememberDevice
          ? 'Sign-in already approved and this browser is trusted. Return to your original browser to continue.'
          : 'Sign-in already approved. Return to your original browser to continue.',
      });
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
      return jsonResponse({ success: false, error: markVerifiedError.message }, 500);
    }

    let trustedDeviceRecord:
      | { trusted_device_id: string; public_id: string | null }
      | null = null;

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
        return jsonResponse({ success: false, error: trustError.message }, 500);
      }

      const { data: deviceRow, error: deviceFetchError } = await adminClient
        .from('trusted_devices')
        .select('trusted_device_id, public_id')
        .eq('user_id', verification.user_id)
        .eq('device_fingerprint', verification.device_fingerprint)
        .single();

      if (deviceFetchError) {
        return jsonResponse({ success: false, error: deviceFetchError.message }, 500);
      }

      trustedDeviceRecord = deviceRow;
    }

    const { data: userRow, error: userFetchError } = await adminClient
      .from('users')
      .select('user_id, public_id')
      .eq('user_id', verification.user_id)
      .single();

    if (userFetchError) {
      return jsonResponse({ success: false, error: userFetchError.message }, 500);
    }

    const auditPayload = rememberDevice
      ? {
          user_id: verification.user_id,
          action: 'LOGIN_APPROVED',
          target_table: 'trusted_devices',
          target_id: trustedDeviceRecord?.trusted_device_id ?? null,
          target_public_id: trustedDeviceRecord?.public_id ?? null,
          changed_fields: ['device_fingerprint', 'is_trusted'],
          notes: 'Login approved from verification link and device trusted immediately',
        }
      : {
          user_id: verification.user_id,
          action: 'LOGIN_APPROVED',
          target_table: 'users',
          target_id: userRow.user_id,
          target_public_id: userRow.public_id ?? null,
          changed_fields: ['device_fingerprint'],
          notes: 'Login approved from verification link',
        };

    const { error: auditError } = await adminClient
      .from('audit_log')
      .insert(auditPayload);

    if (auditError) {
      return jsonResponse({ success: false, error: auditError.message }, 500);
    }

    return jsonResponse({
      success: true,
      approved: true,
      trusted: rememberDevice,
      message: rememberDevice
        ? 'Sign-in approved and this browser is now trusted. Return to your original browser to continue.'
        : 'Sign-in approved. Return to your original browser to continue.',
    });
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});