import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: any;
  }
}

export default function TurnstileWidget({
  onToken,
}: {
  onToken: (token: string) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (window.turnstile && ref.current) {
        clearInterval(interval);

        window.turnstile.render(ref.current, {
          sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
          callback: (token: string) => onToken(token),
          'expired-callback': () => onToken(''),
          'error-callback': () => onToken(''),
        });
      }
    }, 200);

    return () => clearInterval(interval);
  }, [onToken]);

  return <div ref={ref} />;
}