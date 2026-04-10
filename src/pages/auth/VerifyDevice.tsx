import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import supabase from '../../supabaseClient';

type Status = 'loading' | 'success' | 'error';

export default function VerifyDevice() {
  const navigate = useNavigate();
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
    <div className="relative h-[calc(100vh-120px)] w-full flex flex-col items-center justify-center rounded-3xl bg-white p-6">
      <div className="absolute left-8 top-8 flex items-center gap-3 select-none">
        <div className="rounded-xl bg-blue-600 p-1.5 sm:p-2">
          <Building2 className="size-5 text-white sm:size-6" />
        </div>
        <span className="text-lg font-bold tracking-tight text-gray-900">
          Commerciales Flores
        </span>
      </div>

      <div className="w-full max-w-md text-center">
        <h1 className="select-none text-7xl font-black italic leading-none text-gray-100 sm:text-8xl">
          ...
        </h1>

        <div className="relative -mt-8 mb-8 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600 shadow-xl rotate-12">
          {isLoading ? (
            <Loader2 className="size-10 -rotate-12 animate-spin text-white" />
          ) : isSuccess ? (
            <CheckCircle2 className="size-10 -rotate-12 text-white" />
          ) : (
            <AlertCircle className="size-10 -rotate-12 text-white" />
          )}
        </div>

        <h2 className="mb-2 text-2xl font-bold text-gray-900">
          {isLoading
            ? 'Verifying your device'
            : isSuccess
              ? 'Device verified'
              : 'Verification failed'}
        </h2>

        <p className="mb-8 leading-relaxed text-gray-500">{message}</p>

        <button
          type="button"
          disabled={isLoading}
          onClick={() => navigate('/login', { replace: true })}
          className={`group mx-auto flex items-center justify-center gap-2 rounded-xl px-10 py-3.5 font-bold transition-all shadow-xl ${
            isLoading
              ? 'cursor-not-allowed bg-gray-200 text-gray-400 shadow-none'
              : 'bg-gray-900 text-white shadow-gray-200 hover:bg-black active:scale-[0.98]'
          }`}
        >
          <ShieldCheck className="size-4" />
          {isLoading
            ? 'Please wait...'
            : isSuccess
              ? 'Go to Login'
              : 'Back to Login'}
        </button>

        {isError && (
          <p className="mt-4 text-xs text-gray-400">
            The link may be expired or already used.
          </p>
        )}
      </div>
    </div>
  );
}