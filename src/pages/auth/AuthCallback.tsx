import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import supabase from '../../supabaseClient';

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const hash = window.location.hash || '';
        const search = window.location.search || '';
        const fullUrl = `${window.location.origin}${location.pathname}${search}${hash}`;

        const hasCode = search.includes('code=');
        const hasTokens =
          hash.includes('access_token=') ||
          hash.includes('refresh_token=') ||
          search.includes('access_token=') ||
          search.includes('refresh_token=');

        if (hasCode) {
          const { error } = await supabase.auth.exchangeCodeForSession(fullUrl);
          if (error) {
            console.error('Auth callback exchange failed:', error.message);
          }
        }

        if (hasTokens) {
          const { error } = await supabase.auth.getSession();
          if (error) {
            console.error('Auth callback session load failed:', error.message);
          }
        }
      } catch (error) {
        console.error('Auth callback error:', error);
      } finally {
        navigate('/login', {
          replace: true,
          state: {
            message: 'Email verified successfully. You can now sign in.',
          },
        });
      }
    };

    void handleAuthCallback();
  }, [location.pathname, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">Confirming your email...</h1>
        <p className="mt-2 text-sm text-slate-500">
          Please wait while we complete verification.
        </p>
      </div>
    </div>
  );
}