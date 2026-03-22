import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useIndicator } from '../../contexts/IndicatorContext';
import {
  Building2,
  AlertCircle,
  CheckCircle,
  X,
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
} from 'lucide-react';

const GoogleLogo = () => (
  <svg className="size-5" viewBox="0 0 24 24">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const FacebookLogo = () => (
  <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
  </svg>
);

export default function Login() {
  const {
    login,
    recoverPassword,
    user,
    loginWithFacebook,
    loginWithGoogle,
    formKey,
    authActionPending,
    loading,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();
  const { showIndicator } = useIndicator();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const emailRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryStatus, setRecoveryStatus] = useState({ type: '', msg: '' });
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const registerMessage =
    typeof location.state?.message === 'string' ? location.state.message : '';

  const registerEmail =
    typeof location.state?.email === 'string' ? location.state.email : '';

  const normalizedEmail = formData.email.trim().toLowerCase();

  const [previousUser, setPreviousUser] = useState<{
    name: string;
    profilePictureUrl?: string;
  } | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('lastLoginUser');

    if (!raw) {
      setPreviousUser(null);
      return;
    }

    try {
      const parsed = JSON.parse(raw);

      setPreviousUser({
        name: parsed?.name || parsed?.email?.split('@')[0] || 'User',
        profilePictureUrl: parsed?.profilePictureUrl || '',
      });
    } catch {
      setPreviousUser(null);
    }
  }, [formKey]);

  useEffect(() => {
    if (loading) return;
    if (!user) return;

    navigate(user.role === 'admin' ? '/admin/dashboard' : '/client/dashboard', {
      replace: true,
    });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) {
      setFormData({ email: '', password: '' });
      setShowPassword(false);
      setError('');
    }
  }, [user, formKey]);

  useEffect(() => {
    const syncAutofill = () => {
      const emailValue = emailRef.current?.value ?? '';
      const passwordValue = passRef.current?.value ?? '';

      setFormData((prev) => {
        if (prev.email === emailValue && prev.password === passwordValue) {
          return prev;
        }

        return {
          email: emailValue,
          password: passwordValue,
        };
      });
    };

    const timer = window.setTimeout(syncAutofill, 150);
    window.addEventListener('pageshow', syncAutofill);
    window.addEventListener('focus', syncAutofill);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pageshow', syncAutofill);
      window.removeEventListener('focus', syncAutofill);
    };
  }, [formKey]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authActionPending) return;

    setError('');

    const result = await login(formData.email.trim(), formData.password);

    if (!result.success) {
      switch (result.error) {
        case 'busy':
          setError('Please wait a moment and try again.');
          break;
        case 'invalid_login':
        default:
          setError('Invalid email or password.');
      }
    }
    showIndicator(
      `Login successful by ${normalizedEmail} at ${new Date().toLocaleTimeString()}`,
      'login'
    );
  };

  const handleRecoverPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recoveryLoading) return;

    setRecoveryStatus({ type: '', msg: '' });
    setRecoveryLoading(true);

    try {
      await recoverPassword(recoveryEmail.trim());

      setRecoveryStatus({
        type: 'success',
        msg: 'If an account exists for that email, a recovery link has been sent.',
      });
    } catch (err) {
      console.error('Recovery flow failed:', err);
      setRecoveryStatus({
        type: 'success',
        msg: 'If an account exists for that email, a recovery link has been sent.',
      });
    } finally {
      setRecoveryLoading(false);
    }
  };

  const openRecoveryModal = () => {
    setRecoveryStatus({ type: '', msg: '' });
    setRecoveryEmail('');
    setIsModalOpen(true);
  };

  const getInboxUrl = (email: string) => {
    const domain = email.split('@')[1]?.toLowerCase();

    switch (domain) {
      case 'gmail.com':
        return 'https://mail.google.com';
      case 'outlook.com':
      case 'hotmail.com':
      case 'live.com':
        return 'https://outlook.live.com/mail/0/';
      case 'yahoo.com':
        return 'https://mail.yahoo.com';
      case 'icloud.com':
        return 'https://www.icloud.com/mail';
      default:
        return domain ? `https://${domain}` : '#';
    }
  };

  const SuccessState = ({
    message,
    email,
  }: {
    message: string;
    email: string;
  }) => (
    <div className="text-center py-8 animate-in fade-in zoom-in duration-500">
      <div className="relative mx-auto size-24 mb-8">
        <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-20" />
        <div className="relative size-24 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
          <Mail className="size-12" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-slate-900 mb-3">Check your email</h2>
      <p className="text-slate-500 mb-8 leading-relaxed max-w-xs mx-auto">
        {message}
      </p>

      <div className="space-y-4">
        {email && (
          <a
            href={getInboxUrl(email)}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg"
          >
            Open Email Inbox
          </a>
        )}

        <button
          onClick={() => navigate('/login', { replace: true })}
          className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
        >
          Back to Login
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 antialiased animate-in fade-in duration-500">
      <div className="w-full max-w-5xl lg:max-w-6xl bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden border border-slate-200/60">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="p-12 bg-slate-900 text-white flex flex-col items-center justify-center relative overflow-hidden hidden lg:flex transition-all duration-500 animate-in fade-in">
            <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-sm">
              {previousUser ? (
                <div className="flex flex-col items-center">
                  {previousUser.profilePictureUrl ? (
                    <img
                      src={previousUser.profilePictureUrl}
                      alt={previousUser.name}
                      className="size-24 rounded-full object-cover border-4 border-white/10 shadow-lg"
                    />
                  ) : (
                    <User className="size-24 text-blue-400" strokeWidth={1} />
                  )}
                </div>
              ) : (
                <Lock className="size-24 text-blue-400" strokeWidth={1.5} />
              )}

              <div className="mt-8 text-center space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-white animate-in slide-in-from-bottom-2 duration-700 delay-150">
                  {previousUser ? `Welcome Back, ${previousUser.name}` : 'Welcome'}
                </h2>
                <p className="text-blue-200/60 font-medium tracking-wide uppercase text-xs animate-in slide-in-from-bottom-2 duration-700 delay-300">
                  {previousUser ? 'Login to your account' : 'Secure Access Portal'}
                </p>
              </div>
            </div>

            <div className="absolute top-0 right-0 size-64 bg-blue-600/10 blur-[100px] rounded-full -mr-32 -mt-32" />
            <div className="absolute bottom-0 left-0 size-64 bg-blue-900/20 blur-[100px] rounded-full -ml-32 -mb-32" />
          </div>

          <main className="p-8 sm:p-10 lg:p-16 flex flex-col justify-center bg-white">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-blue-50 text-blue-600 mb-4 shadow-sm">
                <Building2 className="size-10" />
              </div>
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-[0.2em] mb-1">
                Comerciales Flores
              </h1>
              <p className="text-slate-500 font-medium">Sign in to your account</p>
            </div>

            {registerMessage ? (
              <SuccessState message={registerMessage} email={registerEmail} />
            ) : (
              <>
                {error && (
                  <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-700 text-xs font-bold animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="size-4 shrink-0" />
                    {error}
                  </div>
                )}

                <form
                  onSubmit={handleLogin}
                  className="space-y-5 max-w-md mx-auto w-full"
                  autoComplete="on"
                >
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: '-9999px',
                      width: '1px',
                      height: '1px',
                      overflow: 'hidden',
                    }}
                  >
                    <input
                      type="text"
                      name="username"
                      autoComplete="username"
                      tabIndex={-1}
                    />
                    <input
                      type="password"
                      name="password"
                      autoComplete="current-password"
                      tabIndex={-1}
                    />
                  </div>

                  <div className="space-y-1.5 group">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        name="email"
                        type="email"
                        required
                        ref={emailRef}
                        autoComplete="email"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, email: e.target.value }));
                          if (error) setError('');
                        }}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 group">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        ref={passRef}
                        autoComplete="current-password"
                        value={formData.password}
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, password: e.target.value }));
                          if (error) setError('');
                        }}
                        className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>

                    <div className="text-right">
                      <button
                        type="button"
                        onClick={openRecoveryModal}
                        className="text-[11px] font-bold text-blue-600 hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authActionPending}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/10 disabled:opacity-50 mt-2 active:scale-[0.98]"
                  >
                    {authActionPending ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>
              </>
            )}

            {!registerMessage && (
              <div className="mt-8 max-w-md mx-auto w-full">
                <div className="relative flex items-center justify-center mb-6">
                  <div className="w-full border-t border-slate-100" />
                  <span className="absolute bg-white px-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Or login with
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    disabled={authActionPending}
                    className="flex items-center justify-center gap-3 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all font-bold text-xs text-slate-700 shadow-sm active:scale-95 disabled:opacity-50"
                    onClick={loginWithGoogle}
                  >
                    <GoogleLogo /> Google
                  </button>

                  <button
                    type="button"
                    disabled={authActionPending}
                    className="flex items-center justify-center gap-3 py-3 bg-[#1877F2] text-white rounded-xl hover:bg-[#166fe5] transition-all font-bold text-xs shadow-sm active:scale-95 disabled:opacity-50"
                    onClick={loginWithFacebook}
                  >
                    <FacebookLogo /> Facebook
                  </button>
                </div>
              </div>
            )}

            {!registerMessage && (
              <div className="mt-12 text-center space-y-3">
                <p className="text-slate-500 text-sm font-medium">
                  Don&apos;t have an account?{' '}
                  <Link to="/register" className="text-blue-600 font-bold hover:underline">
                    Sign up
                  </Link>
                </p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 text-xs font-bold transition-all group"
                >
                  <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
                  Back to Home
                </Link>
              </div>
            )}
          </main>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-10 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Recovery
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="size-10 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
              >
                <X className="size-6 text-slate-400" />
              </button>
            </div>

            {recoveryStatus.type === 'success' ? (
              <div className="text-center py-6">
                <div className="size-16 rounded-full bg-green-50 text-green-500 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="size-8" />
                </div>
                <p className="text-slate-600 font-medium mb-8 leading-relaxed">
                  {recoveryStatus.msg}
                </p>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-black transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleRecoverPassword} className="space-y-6">
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  Enter your email and we&apos;ll send instructions to reset your password.
                </p>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none text-sm font-medium"
                    placeholder="you@example.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={recoveryLoading}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/10 transition-all disabled:opacity-50"
                >
                  {recoveryLoading ? 'Processing...' : 'Send Recovery Link'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
