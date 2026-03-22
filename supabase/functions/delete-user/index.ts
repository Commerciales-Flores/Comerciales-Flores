import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, reason: 'Missing authorization header.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ success: false, reason: 'Missing server configuration.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    const {
      data: { user },
      error: authError,
    } = await supabaseUserClient.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, reason: 'Unauthorized request.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const body = await req.json().catch(() => null)
    const requestedUserId = body?.userId

    if (!requestedUserId || typeof requestedUserId !== 'string') {
      return new Response(
        JSON.stringify({ success: false, reason: 'A valid userId is required.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Allow admin override OR self-delete
    const isAdmin = user?.app_metadata?.role === 'admin';

    if (!isAdmin && user.id !== requestedUserId) {
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'You are not authorized to delete this account.',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check public user row
    const { data: userRow, error: userRowError } = await supabaseAdmin
      .from('users')
      .select('user_id, last_login, is_active')
      .eq('user_id', requestedUserId)
      .maybeSingle()

    if (userRowError) {
      return new Response(
        JSON.stringify({ success: false, reason: 'Failed to validate account.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!userRow) {
      return new Response(
        JSON.stringify({ success: false, reason: 'Account record not found.' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Business-rule blocker: active reservation
    const { data: activeReservation, error: reservationError } = await supabaseAdmin
      .from('reservations')
      .select('reservation_id')
      .eq('user_id', requestedUserId)
      .in('status', ['approved', 'confirmed'])
      .limit(1)
      .maybeSingle()

    if (reservationError) {
      return new Response(
        JSON.stringify({ success: false, reason: 'Failed to validate reservation status.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (activeReservation) {
      return new Response(
        JSON.stringify({
          success: false,
          reason:
            'Account cannot be deleted because there is an active reservation or ongoing occupancy.',
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Optional consistency rule: recent login within 30 days
    if (userRow.last_login) {
      const lastLogin = new Date(userRow.last_login)
      const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

      if (!Number.isNaN(lastLogin.getTime()) && Date.now() - lastLogin.getTime() < THIRTY_DAYS) {
        return new Response(
          JSON.stringify({
            success: false,
            reason: 'Account cannot be deleted because it has recent login activity.',
          }),
          {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // Optional cleanup: remove avatar objects owned by the user
    // Note: Supabase docs warn that users owning Storage objects cannot be deleted
    const { data: avatarFiles } = await supabaseAdmin.storage
      .from('avatars')
      .list(requestedUserId, { limit: 100 })

    if (avatarFiles && avatarFiles.length > 0) {
      const avatarPaths = avatarFiles.map((file) => `${requestedUserId}/${file.name}`)
      const { error: storageError } = await supabaseAdmin.storage
        .from('avatars')
        .remove(avatarPaths)

      if (storageError) {
        return new Response(
          JSON.stringify({
            success: false,
            reason: 'Failed to remove account files before deletion.',
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // =============================
// SNAPSHOT BEFORE DELETION
// =============================

// Fetch full user profile
const { data: fullUser } = await supabaseAdmin
  .from('users')
  .select('*')
  .eq('user_id', requestedUserId)
  .maybeSingle()

// Fetch reservations
const { data: userReservations } = await supabaseAdmin
  .from('reservations')
  .select('*')
  .eq('user_id', requestedUserId)

// Fetch payments
const { data: userPayments } = await supabaseAdmin
  .from('payments')
  .select('*')
  .eq('user_id', requestedUserId)

// Fetch reviews (if table exists)
const { data: userReviews } = await supabaseAdmin
  .from('reviews')
  .select('*')
  .eq('user_id', requestedUserId)

// Compute summary stats
const reservationCount = userReservations?.length ?? 0
const paymentCount = userPayments?.length ?? 0
const reviewCount = userReviews?.length ?? 0

const totalVerifiedPayments =
  userPayments
    ?.filter((p) => p.status === 'verified')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0) ?? 0

// Insert snapshot
const { error: snapshotError } = await supabaseAdmin
  .from('deleted_user_snapshots')
  .insert({
    original_user_id: requestedUserId,
    original_public_id: fullUser?.public_id ?? null,
    email: fullUser?.email ?? null,
    first_name: fullUser?.first_name ?? null,
    last_name: fullUser?.last_name ?? null,
    phone: fullUser?.phone ?? null,
    address: fullUser?.address ?? null,
    role: fullUser?.role ?? null,
    created_at: fullUser?.created_at ?? null,
    last_login: fullUser?.last_login ?? null,
    deleted_by: user.id,

    reservation_count: reservationCount,
    payment_count: paymentCount,
    review_count: reviewCount,
    total_verified_payments: totalVerifiedPayments,

    profile_snapshot: fullUser ?? {},
    reservations_snapshot: userReservations ?? [],
    payments_snapshot: userPayments ?? [],
    reviews_snapshot: userReviews ?? [],
  })

if (snapshotError) {
  return new Response(
    JSON.stringify({
      success: false,
      reason: 'Failed to archive user data before deletion.',
    }),
    {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(requestedUserId)

    if (deleteError) {
      return new Response(
        JSON.stringify({
          success: false,
          reason: deleteError.message || 'Failed to delete account.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.'
    return new Response(JSON.stringify({ success: false, reason: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})