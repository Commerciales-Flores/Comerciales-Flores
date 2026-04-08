import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        }
      ) => string | number;
      remove?: (widgetId: string | number) => void;
      reset?: (widgetId?: string | number) => void;
    };
  }
}

export default function TurnstileWidget({ 
  onToken,
}: {
  onToken: (token: string) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | number | null>(null);

  useEffect(() => {
  if (import.meta.env.DEV) {
    console.log('[Turnstile] skipped in DEV mode');
    onToken('dev-bypass-token');
    return;
  }

  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  if (!siteKey || typeof siteKey !== 'string') {
    console.error('[Turnstile] Missing VITE_TURNSTILE_SITE_KEY');
    onToken('');
    return;
  }

  let cancelled = false;
  let interval: number | null = null;

  const renderWidget = () => {
    if (cancelled || !ref.current || !window.turnstile) return;
    if (widgetIdRef.current !== null) return;

    console.log('[Turnstile] rendering widget');

    widgetIdRef.current = window.turnstile.render(ref.current, {
      sitekey: siteKey,
      callback: (token: string) => {
        console.log('[Turnstile] success');
        onToken(token);
      },
      'expired-callback': () => {
        console.warn('[Turnstile] expired');
        onToken('');
      },
      'error-callback': () => {
        console.error('[Turnstile] error');
        onToken('');
      },
    });
  };

  const existingScript = document.querySelector(
    'script[src*="challenges.cloudflare.com/turnstile"]'
  ) as HTMLScriptElement | null;

  if (!existingScript) {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('[Turnstile] script loaded');
      renderWidget();
    };
    script.onerror = () => {
      console.error('[Turnstile] script failed to load');
      onToken('');
    };
    document.head.appendChild(script);
  } else if (window.turnstile) {
    renderWidget();
  } else {
    interval = window.setInterval(() => {
      if (window.turnstile) {
        if (interval) window.clearInterval(interval);
        renderWidget();
      }
    }, 200);
  }

  return () => {
    cancelled = true;

    if (interval) {
      window.clearInterval(interval);
    }

    if (widgetIdRef.current !== null && window.turnstile?.remove) {
      window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    }
  };
}, [onToken]);

  return <div ref={ref} />;
}