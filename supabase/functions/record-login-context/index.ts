import { createClient } from 'jsr:@supabase/supabase-js@2';

type GeoResponse = {
  country?: string | null;
  region?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

function getClientIp(req: Request): string | null {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || null;
  }

  return req.headers.get('x-real-ip') || null;
}

function getUserAgent(req: Request): string | null {
  return req.headers.get('user-agent');
}

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function getGeoFromIp(ip: string | null): Promise<GeoResponse> {
  if (!ip) {
    return {};
  }

  try {
    // Replace this with your preferred IP geolocation provider later.
    // This public endpoint is only a simple starting point.
    const response = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}`);
    if (!response.ok) {
      return {};
    }

    const data = await response.json();

    return {
      country: data.country ?? null,
      region: data.regionName ?? null,
      city: data.city ?? null,
      latitude:
        typeof data.lat === 'number' ? data.lat : null,
      longitude:
        typeof data.lon === 'number' ? data.lon : null,
    };
  } catch {
    return {};
  }
}

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing environment configuration.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unable to resolve authenticated user.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile, error: profileError } = await adminClient
      .from('users')
      .select('user_id, email, latitude, longitude')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ipAddress = getClientIp(req);
    const userAgent = getUserAgent(req);
    const geo = await getGeoFromIp(ipAddress);

    const { data: previousLogin } = await adminClient
      .from('login_history')
      .select(
        'ip_address, user_agent, country, region, city, latitude, longitude, created_at'
      )
      .eq('user_id', profile.user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const suspiciousReasons: string[] = [];

    if (previousLogin) {
      if (
        previousLogin.ip_address &&
        ipAddress &&
        previousLogin.ip_address !== ipAddress
      ) {
        suspiciousReasons.push('new_ip');
      }

      if (
        previousLogin.user_agent &&
        userAgent &&
        previousLogin.user_agent !== userAgent
      ) {
        suspiciousReasons.push('new_user_agent');
      }

      if (
        previousLogin.country &&
        geo.country &&
        previousLogin.country !== geo.country
      ) {
        suspiciousReasons.push('country_changed');
      }

      if (
        previousLogin.region &&
        geo.region &&
        previousLogin.region !== geo.region
      ) {
        suspiciousReasons.push('region_changed');
      }

      if (
        typeof previousLogin.latitude === 'number' &&
        typeof previousLogin.longitude === 'number' &&
        typeof geo.latitude === 'number' &&
        typeof geo.longitude === 'number'
      ) {
        const kmFromPrevious = distanceKm(
          previousLogin.latitude,
          previousLogin.longitude,
          geo.latitude,
          geo.longitude
        );

        if (kmFromPrevious > 500) {
          suspiciousReasons.push('far_from_previous_login');
        }
      }
    }

    if (
      typeof profile.latitude === 'number' &&
      typeof profile.longitude === 'number' &&
      typeof geo.latitude === 'number' &&
      typeof geo.longitude === 'number'
    ) {
      const kmFromSavedAddress = distanceKm(
        profile.latitude,
        profile.longitude,
        geo.latitude,
        geo.longitude
      );

      if (kmFromSavedAddress > 500) {
        suspiciousReasons.push('far_from_saved_address');
      }
    }

    const isSuspicious = suspiciousReasons.length > 0;

    const { error: insertLoginError } = await adminClient
      .from('login_history')
      .insert({
        user_id: profile.user_id,
        email: profile.email,
        ip_address: ipAddress,
        user_agent: userAgent,
        country: geo.country ?? null,
        region: geo.region ?? null,
        city: geo.city ?? null,
        latitude: geo.latitude ?? null,
        longitude: geo.longitude ?? null,
        is_suspicious: isSuspicious,
        suspicious_reasons: suspiciousReasons,
      });

    if (insertLoginError) {
      return new Response(
        JSON.stringify({ error: 'Failed to write login history.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (isSuspicious) {
      await adminClient.from('audit_log').insert({
        user_id: profile.user_id,
        action: 'LOGIN_SUSPICIOUS',
        target_table: 'users',
        target_id: profile.user_id,
        changed_fields: ['ip_address', 'user_agent', 'country', 'region', 'city'],
        timestamp: new Date().toISOString(),
        notes: `Suspicious login detected for ${profile.email}. Reasons: ${suspiciousReasons.join(', ')}`,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        isSuspicious,
        suspiciousReasons,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Unexpected error while recording login context.',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});