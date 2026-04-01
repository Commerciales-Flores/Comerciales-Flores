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
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

    if (!siteKey || typeof siteKey !== 'string') {
      console.error('Missing VITE_TURNSTILE_SITE_KEY');
      onToken('');
      return;
    }

    const interval = window.setInterval(() => {
      if (!window.turnstile || !ref.current) return;
      if (widgetIdRef.current !== null) return;

      window.clearInterval(interval);

      widgetIdRef.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: (token: string) => onToken(token),
        'expired-callback': () => onToken(''),
        'error-callback': () => onToken(''),
      });
    }, 200);

    return () => {
      window.clearInterval(interval);

      if (widgetIdRef.current !== null && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [onToken]);

  return <div ref={ref} />;
}