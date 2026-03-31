import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  try {
    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'missing_token' }),
        { status: 400 }
      );
    }

    const formData = new URLSearchParams();
    formData.append('secret', Deno.env.get('TURNSTILE_SECRET_KEY') ?? '');
    formData.append('response', token);

    const cfRes = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await cfRes.json();

    if (!data.success) {
      return new Response(
        JSON.stringify({ success: false }),
        { status: 403 }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false }),
      { status: 500 }
    );
  }
});