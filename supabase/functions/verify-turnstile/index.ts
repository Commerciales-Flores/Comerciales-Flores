import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

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

function getClientIp(req: Request) {
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp?.trim()) return cfConnectingIp.trim();

  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp?.trim()) return realIp.trim();

  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token } = await req.json().catch(() => ({}));

    if (!token || typeof token !== 'string') {
      return jsonResponse({ success: false, error: 'missing_token' }, 400);
    }

    const secret = Deno.env.get('TURNSTILE_SECRET_KEY') ?? '';

    if (!secret) {
      return jsonResponse({ success: false, error: 'missing_secret_key' }, 500);
    }

    const formData = new URLSearchParams();
    formData.append('secret', secret);
    formData.append('response', token);

    const clientIp = getClientIp(req);
    if (clientIp) {
      formData.append('remoteip', clientIp);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    let cfRes: Response;

    try {
      cfRes = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        }
      );
    } catch (error) {
      const isAbort = error instanceof Error && error.name === 'AbortError';

      return jsonResponse(
        {
          success: false,
          error: isAbort ? 'turnstile_timeout' : 'turnstile_request_failed',
        },
        504
      );
    } finally {
      clearTimeout(timeout);
    }

    const data = await cfRes.json().catch(() => null);

    if (!cfRes.ok || !data?.success) {
      return jsonResponse(
        {
          success: false,
          error: 'invalid_turnstile',
        },
        403
      );
    }

    return jsonResponse({ success: true }, 200);
  } catch (err) {
    return jsonResponse(
      {
        success: false,
        error: 'server_error',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      500
    );
  }
});