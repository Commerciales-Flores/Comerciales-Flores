import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

type GeoResponse = {
  country?: string | null;
  region?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

function getClientIp(req: Request): string | null {
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp?.trim()) {
    return cfConnectingIp.trim();
  }

  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || null;
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp?.trim()) {
    return realIp.trim();
  }

  return null;
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  try {
    const response = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      return {};
    }

    const data = await response.json();

    return {
      country: data.country ?? null,
      region: data.regionName ?? null,
      city: data.city ?? null,
      latitude: typeof data.lat === 'number' ? data.lat : null,
      longitude: typeof data.lon === 'number' ? data.lon : null,
    };
  } catch {
    return {};
  } finally {
    clearTimeout(timeout);
  }
}

async function processLoginContext(params: {
  req: Request;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
}) {
  const { req, supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } = params;

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Missing authorization header.');
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
    throw new Error('Unable to resolve authenticated user.');
  }

  const { data: profile, error: profileError } = await adminClient
    .from('users')
    .select('user_id, email, latitude, longitude')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('User profile not found.');
  }

  const ipAddress = getClientIp(req);
  const userAgent = getUserAgent(req);

  const [geo, previousLoginResult] = await Promise.all([
    getGeoFromIp(ipAddress),
    adminClient
      .from('login_history')
      .select(
        'ip_address, user_agent, country, region, city, latitude, longitude, created_at'
      )
      .eq('user_id', profile.user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const previousLogin = previousLoginResult.data;
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
    throw new Error('Failed to write login history.');
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
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return jsonResponse({ error: 'Missing environment configuration.' }, 500);
    }

    EdgeRuntime.waitUntil(
      processLoginContext({
        req,
        supabaseUrl,
        supabaseAnonKey,
        supabaseServiceRoleKey,
      }).catch((error) => {
        console.error('record-login-context background task failed:', error);
      })
    );

    return jsonResponse({ success: true, accepted: true }, 202);
  } catch (error) {
    return jsonResponse(
      {
        error: 'Unexpected error while recording login context.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});