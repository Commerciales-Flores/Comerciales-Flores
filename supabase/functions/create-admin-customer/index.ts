import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const authHeader = req.headers.get('Authorization') ?? '';

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: adminProfile } = await admin
    .from('users')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (adminProfile?.role !== 'admin') {
    return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const {
    firstName,
    lastName,
    email,
    password,
    contactNumber,
    address,
    latitude,
    longitude,
    isActive,
  } = await req.json();

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      phone: contactNumber,
      address,
    },
  });

  if (created.error || !created.data.user) {
    return new Response(
      JSON.stringify({ success: false, error: created.error?.message || 'Failed to create auth user.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const authUser = created.data.user;

  const { error: profileError } = await admin.from('users').insert({
    user_id: authUser.id,
    email,
    first_name: firstName,
    last_name: lastName,
    role: 'client',
    phone: contactNumber || '',
    address: address || '',
    latitude,
    longitude,
    is_active: Boolean(isActive),
    address_confirmed: Boolean(address && latitude && longitude),
    address_confirmed_at:
      address && latitude && longitude ? new Date().toISOString() : null,
  });

  if (profileError) {
    return new Response(
      JSON.stringify({ success: false, error: profileError.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(JSON.stringify({ success: true, userId: authUser.id }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});