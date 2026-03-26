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

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body = await req.json();
    const loginRequestId = String(body?.loginRequestId ?? '').trim();
    const deviceFingerprint = String(body?.deviceFingerprint ?? '').trim();

    if (!loginRequestId || !deviceFingerprint) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing login request data' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: verification, error: verificationError } = await adminClient
      .from('pending_login_verifications')
      .select('*')
      .eq('login_request_id', loginRequestId)
      .eq('user_id', user.id)
      .eq('device_fingerprint', deviceFingerprint)
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
        JSON.stringify({ success: false, error: 'Login request not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (new Date(verification.expires_at).getTime() < Date.now()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Verification request expired' }),
        {
          status: 410,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!verification.approved_at) {
      return new Response(
        JSON.stringify({
          success: true,
          approved: false,
          completed: false,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (verification.approval_completed_at) {
      return new Response(
        JSON.stringify({
          success: true,
          approved: true,
          completed: true,
          alreadyCompleted: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (verification.remember_device) {
      const { error: trustError } = await adminClient
        .from('trusted_devices')
        .upsert(
          {
            user_id: verification.user_id,
            device_fingerprint: verification.device_fingerprint,
            user_agent: verification.user_agent,
            device_name: verification.device_name,
            is_trusted: true,
            last_ip: verification.ip_address ?? null,
            last_seen_at: new Date().toISOString(),
            location_label: verification.location_label ?? null,
            location_city: verification.location_city ?? null,
            location_region: verification.location_region ?? null,
            location_country: verification.location_country ?? null,
            location_checked_at: new Date().toISOString(),
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

    const nowIso = new Date().toISOString();

    const { error: completeError } = await adminClient
  .from('pending_login_verifications')
  .update({
    approval_completed_at: nowIso,
  })
  .eq('verification_id', verification.verification_id)
  .is('approval_completed_at', null);

    if (completeError) {
      return new Response(
        JSON.stringify({ success: false, error: completeError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    await adminClient.from('audit_log').insert({
      user_id: verification.user_id,
      action: 'DEVICE_LOGIN_APPROVAL_COMPLETED',
      target_table: 'users',
      target_id: verification.user_id,
      changed_fields: ['device_fingerprint'],
      timestamp: nowIso,
      notes: verification.remember_device
        ? 'Approved login completed on original browser and browser trusted'
        : 'Approved login completed on original browser',
    });

    return new Response(
      JSON.stringify({
        success: true,
        approved: true,
        completed: true,
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