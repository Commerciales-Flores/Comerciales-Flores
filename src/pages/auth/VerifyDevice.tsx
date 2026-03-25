import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Building2, ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import supabase from '../../supabaseClient';

type Status = 'loading' | 'success' | 'error';

export default function VerifyDevice() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('Verifying your device...');

  useEffect(() => {
    const run = async () => {
      const token = searchParams.get('token');
      const rememberDevice = searchParams.get('rememberDevice') === '1';

      if (!token) {
        setStatus('error');
        setMessage('Missing verification token.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('verify-device', {
        body: { token, rememberDevice },
      });

      if (error || !data?.success) {
        setStatus('error');
        setMessage(data?.error || error?.message || 'Device verification failed.');
        return;
      }

      setStatus('success');
      setMessage('Device verified successfully. You can now log in.');
    };

    void run();
  }, [searchParams]);

  const isLoading = status === 'loading';
  const isSuccess = status === 'success';
  const isError = status === 'error';

  return (
    <div className="relative h-[calc(100vh-120px)] w-full flex flex-col items-center justify-center p-6 bg-white rounded-3xl">
      
      {/* Branding (same as NotFound) */}
      <div className="absolute top-8 left-8 flex items-center gap-3 select-none">
        <div className="bg-blue-600 p-1.5 sm:p-2 rounded-xl">
          <Building2 className="size-5 sm:size-6 text-white" />
        </div>
        <span className="text-lg font-bold text-gray-900 tracking-tight">
          Comerciales Flores
        </span>
      </div>

      <div className="max-w-md w-full text-center">
        
        {/* Big background text (like 404 style) */}
        <h1 className="text-7xl sm:text-8xl font-black text-gray-100 leading-none select-none italic">
          ...
        </h1>

        {/* Icon block (same pattern as NotFound) */}
        <div className="relative -mt-8 mb-8 inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl rotate-12 shadow-xl">
          {isLoading ? (
            <Loader2 className="size-10 text-white -rotate-12 animate-spin" />
          ) : isSuccess ? (
            <CheckCircle2 className="size-10 text-white -rotate-12" />
          ) : (
            <AlertCircle className="size-10 text-white -rotate-12" />
          )}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isLoading
            ? 'Verifying your device'
            : isSuccess
              ? 'Device verified'
              : 'Verification failed'}
        </h2>

        {/* Message */}
        <p className="text-gray-500 mb-8 leading-relaxed">
          {message}
        </p>

        {/* Action button */}
        <Link
          to="/login"
          className="group flex items-center justify-center gap-2 mx-auto px-10 py-3.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all active:scale-[0.98] shadow-xl shadow-gray-200"
        >
          <ShieldCheck className="size-4" />
          Back to Login
        </Link>

        {/* Extra helper text */}
        {isError && (
          <p className="mt-4 text-xs text-gray-400">
            The link may be expired or already used.
          </p>
        )}
      </div>
    </div>
  );
}