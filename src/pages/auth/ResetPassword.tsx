import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PasswordStrengthIndicator from '../../components/common/PasswordStrengthIndicator';
import { isPasswordPolicyValid } from '../../utils/passwordStrength';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  KeyRound,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import supabase from '../../supabaseClient';

type SubmitState = 'idle' | 'success' | 'error';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitState('idle');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setSubmitState('error');
      return;
    }

    if (!isPasswordPolicyValid(password)) {
      setError(
        'Password must be at least 8 characters and include an uppercase letter, a number, and a special character.'
      );
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      setSubmitState('error');
      return;
    }

    setMessage('Password updated successfully. You can now sign in.');
    setSubmitState('success');

    // setTimeout(() => {
    //   navigate('/login', { replace: true });
    // }, 1500);
  };

  const isSuccess = submitState === 'success';
  const isError = submitState === 'error';
  const isIdle = submitState === 'idle';

  return (
    <div className="relative h-[calc(100vh-120px)] w-full rounded-3xl bg-white p-6">
      <div className="absolute left-8 top-8 flex select-none items-center gap-3">
        <div className="rounded-xl bg-blue-600 p-1.5 sm:p-2">
          <Building2 className="size-5 text-white sm:size-6" />
        </div>
        <span className="text-lg font-bold tracking-tight text-gray-900">
          Comerciales Flores
        </span>
      </div>

      <div className="flex h-full w-full flex-col items-center justify-center">
        <div className="w-full max-w-md text-center">
          <h1 className="select-none text-7xl font-black italic leading-none text-gray-100 sm:text-8xl">
            Reset
          </h1>

          <div className="relative -mt-8 mb-8 inline-flex h-20 w-20 rotate-12 items-center justify-center rounded-2xl bg-blue-600 shadow-xl">
            {loading ? (
              <Loader2 className="size-10 -rotate-12 animate-spin text-white" />
            ) : isSuccess ? (
              <CheckCircle2 className="size-10 -rotate-12 text-white" />
            ) : isError ? (
              <AlertCircle className="size-10 -rotate-12 text-white" />
            ) : (
              <KeyRound className="size-10 -rotate-12 text-white" />
            )}
          </div>

          <h2 className="mb-2 text-2xl font-bold text-gray-900">
            {loading
              ? 'Updating your password'
              : isSuccess
                ? 'Password updated'
                : 'Reset your password'}
          </h2>

          <p className="mb-8 leading-relaxed text-gray-500">
            {loading
              ? 'Please wait while we secure your account.'
              : isSuccess
                ? message
                : 'Enter your new password below to regain secure access to your account.'}
          </p>

          {!isSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  New password
                </label>
                <div className="group flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition-all focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-100">
                  <LockKeyhole className="size-5 text-gray-400 transition-colors group-focus-within:text-blue-600" />
                  <input
                    type="password"
                    maxLength={100}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border-none bg-transparent text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400"
                  />
                </div>

                <PasswordStrengthIndicator
                  password={password}
                  confirmPassword={confirmPassword}
                  showChecklist
                  showMatchStatus={false}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Confirm new password
                </label>
                <div className="group flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition-all focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-100">
                  <ShieldCheck className="size-5 text-gray-400 transition-colors group-focus-within:text-blue-600" />
                  <input
                    type="password"
                    maxLength={100}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full border-none bg-transparent text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400"
                  />
                </div>

                <PasswordStrengthIndicator
                  password={password}
                  confirmPassword={confirmPassword}
                  showChecklist={false}
                  showMatchStatus
                  compact
                />
              </div>

              {(error || message) && (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
                    error
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {error || message}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  loading ||
                  !isPasswordPolicyValid(password) ||
                  !confirmPassword ||
                  password !== confirmPassword
                }
                className={`group mx-auto mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-bold transition-all shadow-xl ${
                  loading
                    ? 'cursor-not-allowed bg-gray-200 text-gray-400 shadow-none'
                    : 'bg-gray-900 text-white shadow-gray-200 hover:bg-black active:scale-[0.98]'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="size-4" />
                    Update Password
                  </>
                )}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="group mx-auto flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-10 py-3.5 font-bold text-white shadow-xl shadow-gray-200 transition-all hover:bg-black active:scale-[0.98]"
            >
              <ShieldCheck className="size-4" />
              Go to Login
            </button>
          )}

          {isError && !loading && (
            <p className="mt-4 text-xs text-gray-400">
              Please review your password and try again.
            </p>
          )}

          {isIdle && !loading && (
            <p className="mt-4 text-xs text-gray-400">
              This page is only used for secure password reset requests.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}