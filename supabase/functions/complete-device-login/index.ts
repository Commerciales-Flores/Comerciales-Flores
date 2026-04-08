import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authHeader = req.headers.get('Authorization');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return jsonResponse(
        { success: false, error: 'Missing Supabase environment configuration.' },
        500
      );
    }

    if (!authHeader) {
      return jsonResponse(
        { success: false, error: 'Missing authorization header.' },
        401
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return jsonResponse(
        { success: false, error: 'Unauthorized request.' },
        401
      );
    }

    const body = await req.json().catch(() => null);
    const loginRequestId = String(body?.loginRequestId ?? '').trim();
    const deviceFingerprint = String(body?.deviceFingerprint ?? '').trim();

    if (!loginRequestId || !deviceFingerprint) {
      return jsonResponse(
        { success: false, error: 'Missing login request data.' },
        400
      );
    }

    const { data: verification, error: verificationError } = await adminClient
      .from('pending_login_verifications')
      .select('*')
      .eq('login_request_id', loginRequestId)
      .eq('device_fingerprint', deviceFingerprint)
      .maybeSingle();

    if (verificationError) {
      return jsonResponse(
        {
          success: false,
          error: verificationError.message || 'Failed to load login request.',
        },
        500
      );
    }

    if (!verification) {
      return jsonResponse(
        { success: false, error: 'Login request not found.' },
        404
      );
    }

    if (verification.user_id !== user.id) {
      return jsonResponse(
        { success: false, error: 'Login request does not match the signed-in user.' },
        403
      );
    }

    if (new Date(verification.expires_at).getTime() < Date.now()) {
      return jsonResponse(
        { success: false, error: 'Verification request expired.' },
        410
      );
    }

    if (!verification.approved_at) {
      return jsonResponse({
        success: true,
        approved: false,
        completed: false,
      });
    }

    if (verification.approval_completed_at) {
      return jsonResponse({
        success: true,
        approved: true,
        completed: true,
        alreadyCompleted: true,
      });
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
      return jsonResponse(
        {
          success: false,
          error: completeError.message || 'Failed to complete approved login.',
        },
        500
      );
    }

    const { data: userRow, error: userFetchError } = await adminClient
      .from('users')
      .select('user_id, public_id')
      .eq('user_id', verification.user_id)
      .single();

    if (userFetchError) {
      console.error('Failed to fetch user public_id for audit log:', userFetchError);
    } else {
      const { error: auditError } = await adminClient.from('audit_log').insert({
        user_id: verification.user_id,
        action: 'DEVICE_LOGIN_APPROVAL_COMPLETED',
        target_table: 'users',
        target_id: userRow.user_id,
        target_public_id: userRow.public_id ?? null,
        changed_fields: ['device_fingerprint'],
        notes: verification.remember_device
          ? 'Approved login completed on original browser; device was already trusted during email approval'
          : 'Approved login completed on original browser',
      });

      if (auditError) {
        console.error('Audit log insert failed:', auditError);
      }
    }

    return jsonResponse({
      success: true,
      approved: true,
      completed: true,
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