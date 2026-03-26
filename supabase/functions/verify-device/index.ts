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

    const rememberDevice = Boolean(verification.remember_device);

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
          message: 'Sign-in already approved. Return to your original browser to continue.',
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


    const { error: auditError } = await adminClient.from('audit_log').insert({
      user_id: verification.user_id,
      action: 'LOGIN_APPROVED',
      target_table: 'users',
      target_id: verification.user_id,
      changed_fields: ['device_fingerprint'],
      timestamp: new Date().toISOString(),
      notes: rememberDevice
        ? 'Login approved from verification link; original browser may be trusted after completion'
        : 'Login approved from verification link',
    });

    console.log('AUDIT ERROR:', auditError?.message ?? null);

    return new Response(
      JSON.stringify({
        success: true,
        approved: true,
        message: 'Sign-in approved. Return to your original browser to continue.',
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