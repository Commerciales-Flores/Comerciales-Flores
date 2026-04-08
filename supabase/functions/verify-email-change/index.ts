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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return jsonResponse({ success: false, error: 'Missing server configuration.' }, 500);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const body = await req.json().catch(() => null);
    const token = String(body?.token ?? '').trim();

    if (!token) {
      return jsonResponse({ success: false, error: 'Verification token is required.' }, 400);
    }

    const { data: requestRow, error: requestError } = await adminClient
      .from('email_change_requests')
      .select('*')
      .eq('verify_token', token)
      .maybeSingle();

    if (requestError) {
      return jsonResponse({ success: false, error: requestError.message }, 500);
    }

    if (!requestRow) {
      return jsonResponse({ success: false, error: 'Email change request not found.' }, 404);
    }

    if (requestRow.status !== 'pending') {
      return jsonResponse(
        { success: false, error: `This email change request is already ${requestRow.status}.` },
        409
      );
    }

    if (new Date(requestRow.expires_at).getTime() < Date.now()) {
      await adminClient
        .from('email_change_requests')
        .update({ status: 'expired' })
        .eq('request_id', requestRow.request_id);

      return jsonResponse({ success: false, error: 'This email change link has expired.' }, 410);
    }

    const nowIso = new Date().toISOString();
    const cooldownUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const oldEmailReuseBlockedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: authUsers, error: listUsersError } = await adminClient.auth.admin.listUsers();

    if (listUsersError) {
      return jsonResponse({ success: false, error: listUsersError.message }, 500);
    }

    const emailAlreadyOwned = authUsers.users.some(
      (u) =>
        (u.email || '').trim().toLowerCase() === String(requestRow.new_email).trim().toLowerCase() &&
        u.id !== requestRow.user_id
    );

    if (emailAlreadyOwned) {
      return jsonResponse(
        { success: false, error: 'That email is already in use by another account.' },
        409
      );
    }

    const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(
      requestRow.user_id,
      {
        email: requestRow.new_email,
        email_confirm: true,
      }
    );

    if (authUpdateError) {
      return jsonResponse(
        { success: false, error: authUpdateError.message || 'Failed to update auth email.' },
        500
      );
    }

    const { error: profileUpdateError } = await adminClient
      .from('users')
      .update({
        email: requestRow.new_email,
        last_email_change_at: nowIso,
        email_change_locked_until: cooldownUntil,
      })
      .eq('user_id', requestRow.user_id);

    if (profileUpdateError) {
      return jsonResponse(
        { success: false, error: profileUpdateError.message || 'Failed to update profile email.' },
        500
      );
    }

    const { error: requestUpdateError } = await adminClient
      .from('email_change_requests')
      .update({
        status: 'completed',
        verified_at: nowIso,
        completed_at: nowIso,
        cooldown_until: cooldownUntil,
      })
      .eq('request_id', requestRow.request_id);

    if (requestUpdateError) {
      return jsonResponse(
        {
          success: false,
          error:
            requestUpdateError.message || 'Email was changed, but request completion update failed.',
        },
        500
      );
    }

    await adminClient.from('email_reuse_blocks').upsert(
      {
        email: requestRow.old_email,
        blocked_until: oldEmailReuseBlockedUntil,
        source_user_id: requestRow.user_id,
        reason: 'Temporary reuse block after completed email change',
      },
      {
        onConflict: 'email',
      }
    );

    const { data: userRow, error: userFetchError } = await adminClient
      .from('users')
      .select('user_id, public_id')
      .eq('user_id', requestRow.user_id)
      .single();

    if (userFetchError) {
      console.error('Failed to fetch user public_id for audit log:', userFetchError);
    }

    if (userRow) {
      await adminClient.from('audit_log').insert({
        user_id: requestRow.user_id,
        action: 'EMAIL_CHANGE_COMPLETED',
        target_table: 'users',
        target_id: userRow.user_id,
        target_public_id: userRow.public_id ?? null, // ✅ FIX
        changed_fields: ['email'],
        notes: `Changed email from ${requestRow.old_email} to ${requestRow.new_email}`,
      });
    }

    return jsonResponse({
      success: true,
      message: `Your email has been updated successfully. Another email change cannot be requested until ${formatDateTime(cooldownUntil)}.`,
      newEmail: requestRow.new_email,
      cooldownUntil,
      oldEmailReuseBlockedUntil,
    });
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error.',
      },
      500
    );
  }
});