import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const jsonResponse = (body: any, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')

    if (!authHeader) {
      return jsonResponse({ success: false, reason: 'Missing authorization header.' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const admin = createClient(supabaseUrl, supabaseServiceRoleKey)

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser()

    if (authError || !user) {
      return jsonResponse({ success: false, reason: 'Unauthorized request.' }, 401)
    }

    const body = await req.json().catch(() => null)
    const requestedUserId = typeof body?.userId === 'string' ? body.userId.trim() : ''

    if (!requestedUserId) {
      return jsonResponse({ success: false, reason: 'A valid userId is required.' }, 400)
    }

    if (user.id !== requestedUserId) {
      return jsonResponse(
        {
          success: false,
          reason: 'You can only delete your own account.',
        },
        403
      )
    }

    const { data: deletionRequest, error: deletionRequestError } = await admin
      .from('account_deletion_requests')
      .select('*')
      .eq('user_id', requestedUserId)
      .eq('status', 'approved')
      .maybeSingle()

    if (deletionRequestError) {
      return jsonResponse(
        {
          success: false,
          reason: deletionRequestError.message || 'Failed to validate deletion request.',
        },
        500
      )
    }

    if (!deletionRequest) {
      return jsonResponse({
        success: false,
        reason: 'Deletion request is not approved yet.',
      })
    }

    const { data: activeReservation, error: activeReservationError } = await admin
      .from('reservations')
      .select('reservation_id')
      .eq('user_id', requestedUserId)
      .in('status', ['approved', 'confirmed'])
      .limit(1)
      .maybeSingle()

    if (activeReservationError) {
      return jsonResponse(
        {
          success: false,
          reason: activeReservationError.message || 'Failed to validate active reservations.',
        },
        500
      )
    }

    if (activeReservation) {
      return jsonResponse({
        success: false,
        reason: 'Cannot delete account with active reservations or ongoing occupancy.',
      })
    }

    const { data: unpaidPayment, error: unpaidPaymentError } = await admin
      .from('payments')
      .select('payment_id')
      .eq('user_id', requestedUserId)
      .in('status', ['unpaid', 'partial'])
      .limit(1)
      .maybeSingle()

    if (unpaidPaymentError) {
      return jsonResponse(
        {
          success: false,
          reason: unpaidPaymentError.message || 'Failed to validate payment status.',
        },
        500
      )
    }

    if (unpaidPayment) {
      return jsonResponse({
        success: false,
        reason: 'Cannot delete account with unpaid or pending payments.',
      })
    }

    const { data: profile, error: profileError } = await admin
      .from('users')
      .select('*')
      .eq('user_id', requestedUserId)
      .maybeSingle()

    if (profileError) {
      return jsonResponse(
        {
          success: false,
          reason: profileError.message || 'Failed to load user profile.',
        },
        500
      )
    }

    const { data: reservations, error: reservationsError } = await admin
      .from('reservations')
      .select('*')
      .eq('user_id', requestedUserId)
      .order('created_at', { ascending: false })

    if (reservationsError) {
      return jsonResponse(
        {
          success: false,
          reason: reservationsError.message || 'Failed to load reservation history.',
        },
        500
      )
    }

    const { data: payments, error: paymentsError } = await admin
      .from('payments')
      .select('*')
      .eq('user_id', requestedUserId)
      .order('created_at', { ascending: false })

    if (paymentsError) {
      return jsonResponse(
        {
          success: false,
          reason: paymentsError.message || 'Failed to load payment history.',
        },
        500
      )
    }

    const { data: reviews, error: reviewsError } = await admin
      .from('reviews')
      .select('*')
      .eq('user_id', requestedUserId)
      .order('created_at', { ascending: false })

    if (reviewsError) {
      return jsonResponse(
        {
          success: false,
          reason: reviewsError.message || 'Failed to load review history.',
        },
        500
      )
    }

    const deletedAt = new Date().toISOString()

    const deletedUserSnapshot = {
      user_id: requestedUserId,
      public_id: profile?.public_id ?? null,
      first_name: profile?.first_name ?? null,
      last_name: profile?.last_name ?? null,
      email: profile?.email ?? user.email ?? null,
      phone: profile?.phone ?? null,
      address: profile?.address ?? null,
      role: profile?.role ?? null,
      deleted_at: deletedAt,
    }

    const snapshotPayload = {
      original_user_id: requestedUserId,
      original_public_id: profile?.public_id ?? null,
      email: profile?.email ?? user.email ?? null,
      first_name: profile?.first_name ?? null,
      last_name: profile?.last_name ?? null,
      phone: profile?.phone ?? null,
      address: profile?.address ?? null,
      role: profile?.role ?? null,
      created_at: profile?.created_at ?? null,
      last_login: profile?.last_login ?? null,
      deleted_at: deletedAt,
      deleted_by: null,
      deletion_request_id: deletionRequest.id ?? null,
      deletion_reason: deletionRequest.request_reason ?? null,
      admin_note: deletionRequest.admin_note ?? null,
      reservation_count: reservations?.length ?? 0,
      payment_count: payments?.length ?? 0,
      review_count: reviews?.length ?? 0,
      total_verified_payments:
        payments
          ?.filter((payment) => payment.status === 'paid')
          .reduce((sum, payment) => sum + Number(payment.amount || 0), 0) ?? 0,
      profile_snapshot: profile ?? {},
      reservations_snapshot: reservations ?? [],
      payments_snapshot: payments ?? [],
      reviews_snapshot: reviews ?? [],
    }


    const { error: snapshotError } = await admin
      .from('deleted_user_snapshots')
      .insert(snapshotPayload)

    if (snapshotError) {
      return jsonResponse(
        {
          success: false,
          reason: snapshotError.message || 'Failed to create deleted account snapshot.',
        },
        500
      )
    }

    const { error: reservationUpdateError } = await admin
      .from('reservations')
      .update({
        deleted_user: true,
        deleted_user_snapshot: deletedUserSnapshot,
        account_deleted_at: deletedAt,
      })
      .eq('user_id', requestedUserId)

    if (reservationUpdateError) {
      return jsonResponse(
        {
          success: false,
          reason:
            reservationUpdateError.message ||
            'Failed to update reservations for deleted account.',
        },
        500
      )
    }

    const { error: publicDeleteError } = await admin.rpc('delete_user_safe', {
  p_user_id: requestedUserId,
})

if (publicDeleteError) {
  return jsonResponse(
    {
      success: false,
      reason: publicDeleteError.message || 'Failed to delete public user profile.',
    },
    500
  )
}

const { error: deleteAuthError } = await admin.auth.admin.deleteUser(requestedUserId)

if (deleteAuthError) {
  return jsonResponse(
    {
      success: false,
      reason: deleteAuthError.message || 'Failed to delete auth account.',
    },
    500
  )
}

    const { error: requestCompleteError } = await admin
      .from('account_deletion_requests')
      .update({
        status: 'completed',
        admin_note: 'Account deletion completed successfully.',
        reviewed_at: deletionRequest.reviewed_at ?? deletedAt,
      })
      .eq('user_id', requestedUserId)
      .eq('status', 'approved')

    if (requestCompleteError) {
      return jsonResponse(
        {
          success: false,
          reason:
            requestCompleteError.message ||
            'Account was deleted, but failed to mark deletion request as completed.',
        },
        500
      )
    }

    return jsonResponse({
      success: true,
      reason: 'Account deleted successfully.',
    })
  } catch (err) {
    return jsonResponse(
      {
        success: false,
        reason: err instanceof Error ? err.message : 'Unexpected error.',
      },
      500
    )
  }
})