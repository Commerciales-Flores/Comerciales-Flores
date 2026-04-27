import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ success: false, error: 'Missing Supabase environment variables.' }, 500);
  }

  const authHeader = req.headers.get('Authorization') ?? '';

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }

  const { data: adminProfile, error: adminProfileError } = await admin
    .from('users')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (adminProfileError) {
    return json({ success: false, error: 'Failed to verify admin permissions.' }, 500);
  }

  if (adminProfile?.role !== 'admin') {
    return json({ success: false, error: 'Forbidden' }, 403);
  }

  const payload = await req.json().catch(() => null);

  if (!payload) {
    return json({ success: false, error: 'Invalid request body.' }, 400);
  }

  const {
    firstName,
    lastName,
    email,
    contactNumber,
    address,
    latitude,
    longitude,
    isActive,
  } = payload;

  const cleanedEmail = String(email ?? '').trim().toLowerCase();
  const cleanedFirstName = String(firstName ?? '').trim();
  const cleanedLastName = String(lastName ?? '').trim();
  const cleanedPhone = String(contactNumber ?? '').trim();
  const cleanedAddress = String(address ?? '').trim();

  if (!cleanedFirstName || !cleanedLastName || !cleanedEmail) {
    return json(
      {
        success: false,
        error: 'First name, last name, and email are required.',
      },
      400
    );
  }

  const { data: existingProfile } = await admin
    .from('users')
    .select('user_id')
    .eq('email', cleanedEmail)
    .maybeSingle();

  if (existingProfile) {
    return json(
      {
        success: false,
        error: 'A user profile with this email already exists.',
      },
      409
    );
  }

  const invited = await admin.auth.admin.inviteUserByEmail(cleanedEmail, {
    data: {
      first_name: cleanedFirstName,
      last_name: cleanedLastName,
      phone: cleanedPhone,
      address: cleanedAddress,
      created_by_admin_id: user.id,
      onboarding_source: 'admin_invite',
    },
  });

  if (invited.error || !invited.data.user) {
    return json(
      {
        success: false,
        error: invited.error?.message || 'Failed to send customer invite.',
      },
      400
    );
  }

  const authUser = invited.data.user;

  const hasConfirmedAddress = Boolean(cleanedAddress && latitude && longitude);

  const { error: profileError } = await admin.from('users').insert({
    user_id: authUser.id,
    email: cleanedEmail,
    first_name: cleanedFirstName,
    last_name: cleanedLastName,
    role: 'client',
    phone: cleanedPhone || '',
    address: cleanedAddress || '',
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    is_active: Boolean(isActive),
    address_confirmed: hasConfirmedAddress,
    address_confirmed_at: hasConfirmedAddress ? new Date().toISOString() : null,
    valid_id_status: 'not_submitted',
    has_password: false,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authUser.id);

    return json(
      {
        success: false,
        error: profileError.message || 'Failed to create customer profile.',
      },
      400
    );
  }

  return json({
    success: true,
    userId: authUser.id,
    message: 'Customer invite sent successfully.',
  });
});