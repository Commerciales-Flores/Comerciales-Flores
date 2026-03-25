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

    const body = await req.json();
    const token = String(body?.token ?? '').trim();
    const rememberDevice = Boolean(body?.rememberDevice);

    console.log('VERIFY TOKEN PRESENT:', Boolean(token));
    console.log('REMEMBER DEVICE:', rememberDevice);

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
      .is('verified_at', null)
      .maybeSingle();

    console.log('VERIFICATION ERROR:', verificationError?.message ?? null);
    console.log('VERIFICATION FOUND:', Boolean(verification));
    console.log('VERIFICATION ID:', verification?.verification_id ?? null);

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

    if (new Date(verification.expires_at).getTime() < Date.now()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Verification link expired' }),
        {
          status: 410,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { error: markVerifiedError } = await adminClient
      .from('pending_login_verifications')
      .update({
        verified_at: new Date().toISOString(),
      })
      .eq('verification_id', verification.verification_id);

    console.log('MARK VERIFIED ERROR:', markVerifiedError?.message ?? null);

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
      const forwardedFor = req.headers.get('x-forwarded-for');
      const ipAddress = forwardedFor?.split(',')[0]?.trim() ?? null;

      const { error: trustError } = await adminClient
        .from('trusted_devices')
        .upsert(
          {
            user_id: verification.user_id,
            device_fingerprint: verification.device_fingerprint,
            user_agent: verification.user_agent,
            device_name: verification.device_name,
            is_trusted: true,
            last_ip: ipAddress,
            last_seen_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,device_fingerprint',
          }
        );

      console.log('TRUST UPSERT ERROR:', trustError?.message ?? null);

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

    const { error: auditError } = await adminClient.from('audit_log').insert({
      user_id: verification.user_id,
      action: 'DEVICE_VERIFIED',
      target_table: 'users',
      target_id: verification.user_id,
      changed_fields: ['device_fingerprint'],
      timestamp: new Date().toISOString(),
      notes: rememberDevice
        ? 'New device verified and trusted'
        : 'Device verified (not trusted)',
    });

    console.log('AUDIT ERROR:', auditError?.message ?? null);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Device verified successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.log('VERIFY DEVICE CATCH:', error instanceof Error ? error.message : String(error));

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