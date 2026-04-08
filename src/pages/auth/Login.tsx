import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useIndicator } from '../../contexts/IndicatorContext';
import { formatTime } from '../../utils/date';
import {
  sanitizeEmailInput,
  sanitizePasswordInput,
} from '../../utils/DataNormalization';
import supabase from '../../supabaseClient';
import TurnstileWidget from '../../components/security/TurnstileWidget';  
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
  const [oauthChecked, setOauthChecked] = useState(false);
  const [authNotice, setAuthNotice] = useState<{
  code: string;
  email: string;
  provider: string;
} | null>(null);
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

  const DISABLE_TURNSTILE = import.meta.env.DEV;

  const navigate = useNavigate();
  const location = useLocation();
  const { showIndicator } = useIndicator();

  const [rememberDevice, setRememberDevice] = useState(true);

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loginCooldown, setLoginCooldown] = useState(0);

  const emailRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);
  const cooldownTimerRef = useRef<number | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryStatus, setRecoveryStatus] = useState({ type: '', msg: '' });
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const [turnstileToken, setTurnstileToken] = useState('');

  const OAUTH_PENDING_KEY = 'oauth:pending-provider';
  const OAUTH_LOGIN_REQUEST_KEY = 'oauth:login-request-id';

  const [pendingApproval, setPendingApproval] = useState<{
    loginRequestId: string;
    expiresAt?: string;
  } | null>(null);

  const [approvalMessage, setApprovalMessage] = useState('');

 const registerMessage = useMemo(
  () => (typeof location.state?.message === 'string' ? location.state.message : ''),
  [location.state]
);

const registerEmail = useMemo(
  () => (typeof location.state?.email === 'string' ? location.state.email : ''),
  [location.state]
);

  const normalizedEmail = formData.email.trim().toLowerCase();
  const LOGIN_COOLDOWN_KEY = 'loginCooldownUntil';

  const [previousUser, setPreviousUser] = useState<{
    name: string;
    profilePictureUrl?: string;
  } | null>(null);

  useEffect(() => {
  const handleOAuthDeviceCheck = async () => {
    if (loading || oauthChecked) return;

    const pendingProvider = sessionStorage.getItem(OAUTH_PENDING_KEY);
    if (!pendingProvider) {
      setOauthChecked(true);
      return;
    }

    if (!user) {
      return;
    }

    try {
      const fingerprint = localStorage.getItem('device_fingerprint');

      if (!fingerprint) {
        setError('Device fingerprint not found. Please try signing in again.');
        await supabase.auth.signOut();
        sessionStorage.removeItem(OAUTH_PENDING_KEY);
        setOauthChecked(true);
        return;
      }

      const { data, error } = await supabase.functions.invoke(
        'check-device-and-send-verification',
        {
          body: {
            userId: user.id,
            deviceFingerprint: fingerprint,
            userAgent: navigator.userAgent,
            rememberDevice: true,
          },
        }
      );

      if (error) {
        console.error('OAuth device check failed:', error);
        setError('We could not verify this browser right now. Please try again.');
        await supabase.auth.signOut();
        sessionStorage.removeItem(OAUTH_PENDING_KEY);
        setOauthChecked(true);
        return;
      }

      if (!data?.trusted) {
        if (data?.loginRequestId) {
          sessionStorage.setItem(OAUTH_LOGIN_REQUEST_KEY, data.loginRequestId);
        }

        setPendingApproval({
          loginRequestId: data?.loginRequestId,
          expiresAt: data?.expiresAt,
        });

        setApprovalMessage(
          'This browser is not trusted yet. We sent a device approval email. Approve the sign-in from your email, then return to this browser.'
        );

        showIndicator(`New device approval required for ${user.email}`, 'security');

        await supabase.auth.signOut();

        window.location.replace('/login');

        return;
      }

      sessionStorage.removeItem(OAUTH_PENDING_KEY);
      sessionStorage.removeItem(OAUTH_LOGIN_REQUEST_KEY);
      setOauthChecked(true);
    } catch (err) {
      console.error('OAuth device check error:', err);
      setError('We could not complete OAuth sign-in. Please try again.');
      await supabase.auth.signOut();
      sessionStorage.removeItem(OAUTH_PENDING_KEY);
      setOauthChecked(true);
    }
  };

  void handleOAuthDeviceCheck();
}, [user, loading, oauthChecked, showIndicator]);

useEffect(() => {
  const raw = sessionStorage.getItem('auth:notice');

  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);

    setAuthNotice({
      code: parsed.code,
      email: parsed.email,
      provider: parsed.provider,
    });

    // optional: clear immediately so it doesn't persist forever
    sessionStorage.removeItem('auth:notice');
  } catch {
    sessionStorage.removeItem('auth:notice');
  }
}, []);

  useEffect(() => {
    const raw = sessionStorage.getItem('lastLoginUser');

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
  if (!registerMessage && !registerEmail) return;

  const timer = window.setTimeout(() => {
    navigate(location.pathname, { replace: true, state: null });
  }, 15000);

  return () => window.clearTimeout(timer);
}, [registerMessage, registerEmail, navigate, location.pathname]);



  useEffect(() => {
  if (loading) return;
  if (!user) return;
  if (!oauthChecked) return;

  const pendingProvider = sessionStorage.getItem(OAUTH_PENDING_KEY);
  if (pendingProvider) return;

  navigate(user.role === 'admin' ? '/admin/dashboard' : '/client/dashboard', {
    replace: true,
  });
}, [user, loading, oauthChecked, navigate]);

  useEffect(() => {
  if (!user) {
    setFormData({ email: '', password: '' });
    setShowPassword(false);
    setError('');
  }
}, [user, formKey]);

useEffect(() => {
  if (!pendingApproval?.loginRequestId) return;

  const deviceFingerprint = localStorage.getItem('device_fingerprint');
  if (!deviceFingerprint) return;

  let cancelled = false;

  const completeApprovedLogin = async () => {
    try {
      const { data, error } = await supabase.functions.invoke(
        'complete-device-login',
        {
          body: {
            loginRequestId: pendingApproval.loginRequestId,
            deviceFingerprint,
          },
        }
      );

      if (cancelled) return;

      if (error) {
        console.error('Complete login error:', error);
        return;
      }

      if (data?.approved && data?.completed) {
        setApprovalMessage('Sign-in approved. Finishing login...');
        setPendingApproval(null);

        sessionStorage.removeItem(OAUTH_PENDING_KEY);
        sessionStorage.removeItem(OAUTH_LOGIN_REQUEST_KEY);

        await supabase.auth.refreshSession();

        setOauthChecked(true);
      }
    } catch (err) {
      if (!cancelled) {
        console.error('Complete login failed:', err);
      }
    }
  };

  void completeApprovedLogin();

  const channel = supabase
    .channel(`login-approval-${pendingApproval.loginRequestId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'pending_login_verifications',
        filter: `login_request_id=eq.${pendingApproval.loginRequestId}`,
      },
      async (payload) => {
        const nextRow = payload.new as {
          approved_at?: string | null;
          approval_completed_at?: string | null;
        };

        if (!nextRow?.approved_at || nextRow?.approval_completed_at) return;

        await completeApprovedLogin();
      }
    )
    .subscribe();

  return () => {
    cancelled = true;
    void supabase.removeChannel(channel);
  };
}, [pendingApproval]);

useEffect(() => {
  const raw = sessionStorage.getItem(LOGIN_COOLDOWN_KEY);
  if (!raw) return;

  const until = Number(raw);
  if (!Number.isFinite(until)) {
    sessionStorage.removeItem(LOGIN_COOLDOWN_KEY);
    return;
  }

  const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));

  if (remaining > 0) {
    setLoginCooldown(remaining);
    setError(`Too many sign-in attempts. Please wait ${remaining} seconds before trying again.`);
  } else {
    sessionStorage.removeItem(LOGIN_COOLDOWN_KEY);
  }
}, [formKey]);

useEffect(() => {
  if (loginCooldown <= 0) {
    sessionStorage.removeItem(LOGIN_COOLDOWN_KEY);
    return;
  }

  cooldownTimerRef.current = window.setInterval(() => {
    setLoginCooldown((prev) => {
      if (prev <= 1) {
        if (cooldownTimerRef.current) {
          window.clearInterval(cooldownTimerRef.current);
          cooldownTimerRef.current = null;
        }
        sessionStorage.removeItem(LOGIN_COOLDOWN_KEY);
        return 0;
      }

      return prev - 1;
    });
  }, 1000);

  return () => {
    if (cooldownTimerRef.current) {
      window.clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
  };
}, [loginCooldown]);

useEffect(() => {
  if (loginCooldown === 0 && error.startsWith('Too many sign-in attempts')) {
    setError('');
  }
}, [loginCooldown, error]);

  useEffect(() => {
    const syncAutofill = () => {
      const emailValue = emailRef.current?.value ?? '';
      const passwordValue = passRef.current?.value ?? '';

      setFormData((prev) => {
        if (prev.email === emailValue && prev.password === passwordValue) {
          return prev;
        }

        return {
  email: sanitizeEmailInput(emailValue),
  password: sanitizePasswordInput(passwordValue),
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
  if (authActionPending || loginCooldown > 0) return;

  setError('');

  // if (!turnstileToken) {
  //   setError('Please complete the verification challenge.');
  //   return;
  // }

  if (!DISABLE_TURNSTILE && !turnstileToken) {
    setError('Please complete the verification challenge.');
    return;
  }

  // const result = await login(formData.email.trim(), formData.password, {
  //   rememberDevice,
  //   turnstileToken,
  // });

  const result = await login(formData.email.trim(), formData.password, {
    rememberDevice,
    turnstileToken: DISABLE_TURNSTILE ? undefined : turnstileToken,
  });

  if (!result.success) {
  const shouldResetTurnstile =
    result.error === 'verification_failed' ||
    result.error === 'invalid_login' ||
    result.error === 'locked' ||
    result.error === 'rate_limited' ||
    result.error === 'device_check_failed';

  // if (shouldResetTurnstile) {
  //   setTurnstileToken('');
  //   window.turnstile?.reset?.();
  // }

  if (shouldResetTurnstile) {
  setTurnstileToken('');

  if (!DISABLE_TURNSTILE && window.turnstile?.reset) {
  try {
    window.turnstile.reset();
  } catch {
    // no widget mounted
  }
}
}

  switch (result.error) {
    case 'busy':
      setError('Please wait a moment and try again.');
      break;

    case 'account_inactive':
      setError(
        'Your account has been deactivated. Please contact the administrator for assistance.'
      );
      break;

    case 'locked':
    case 'rate_limited': {
      const retryAfter = result.retryAfterSeconds ?? 60;
      const cooldownUntil = Date.now() + retryAfter * 1000;
      sessionStorage.setItem(LOGIN_COOLDOWN_KEY, String(cooldownUntil));
      setLoginCooldown(retryAfter);
      setError(
        `Too many sign-in attempts. Please wait ${retryAfter} seconds before trying again.`
      );
      break;
    }

    case 'verification_failed':
      setError('Please complete the verification challenge and try again.');
      break;

    case 'invalid_login':
      setError('Invalid email or password.');
      break;
    case 'oauth_email_conflict':
      setError(
        'This email already belongs to an existing account. Sign in with your original method first, then link Google from Account Settings.'
      );
      break;

    case 'unverified_device':
      if ((result as any).loginRequestId) {
        setPendingApproval({
          loginRequestId: (result as any).loginRequestId,
          expiresAt: (result as any).expiresAt,
        });

        setApprovalMessage(
          'This browser is not trusted yet. We sent a device approval email. Approve the sign-in from your email, then return to this browser.'
        );
      }

      showIndicator(
        `New device approval required for ${normalizedEmail} at ${formatTime(new Date())}`,
        'security'
      );

      setError(
        'This browser is not trusted yet. Please check your email to approve this sign-in.'
      );
      break;

    case 'device_check_failed':
      setError('We couldn’t verify your device right now. Please try again.');
      break;

    default:
      setError('Something went wrong. Please try again.');
      break;
  }

  return;
}

  sessionStorage.removeItem(LOGIN_COOLDOWN_KEY);
  setLoginCooldown(0);

  showIndicator(
    `Login successful by ${normalizedEmail} at ${formatTime(new Date())}`,
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

      <h2 className="text-2xl font-bold text-slate-900 mb-3">Next step sent</h2>
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
          Continue to Sign In
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
                      className="size-40 rounded-full object-cover border-4 border-white/10 shadow-lg"
                    />
                  ) : (
                    <User className="size-24 text-blue-400" strokeWidth={1} />
                  )}
                </div>
              ) : (
                <Lock className="size-24 text-blue-400" strokeWidth={1.5} />
              )}

              <div className="mt-3 text-center space-y-2">
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
              {authNotice?.code === 'oauth_same_email_existing_account' && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-bold animate-in fade-in slide-in-from-top-1">
                <div className="flex items-start gap-2">
                  <AlertCircle className="size-4 mt-0.5 shrink-0" />
                  <div className="leading-relaxed">
                    <p>
                      An account with <span className="font-extrabold">{authNotice.email}</span> already exists.
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-amber-700">
                      Please sign in using your email and password, or use the same login method you used before.
                    </p>
                  </div>
                </div>
              </div>
            )}
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
                        maxLength={150}
                        ref={emailRef}
                        autoComplete="email"
                        value={formData.email}
                        onChange={(e) => {
                          const value = sanitizeEmailInput(e.target.value);

                          setFormData((prev) => ({ ...prev, email: value }));
                          setPendingApproval(null);
                          setApprovalMessage('');
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
                        maxLength={100}
                        ref={passRef}
                        autoComplete="current-password"
                        value={formData.password}
                        onChange={(e) => {
                        const value = sanitizePasswordInput(e.target.value);

  setFormData((prev) => ({ ...prev, password: value }));
  setPendingApproval(null);
  setApprovalMessage('');
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

                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={rememberDevice}
                          onChange={(e) => setRememberDevice(e.target.checked)}
                        />
                        Trust this device
                      </label>

                      <button
                        type="button"
                        onClick={openRecoveryModal}
                        className="text-[11px] font-bold text-blue-600 hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  </div>

                  <TurnstileWidget onToken={setTurnstileToken} />

                  {/* {!DISABLE_TURNSTILE && (
                    <TurnstileWidget onToken={setTurnstileToken} />
                  )} */}

                  <button
                    type="submit"
                    disabled={authActionPending || loginCooldown > 0 || !!pendingApproval}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/10 disabled:opacity-50 mt-2 active:scale-[0.98]"
                  >
                    {authActionPending
                      ? 'Signing in...'
                      : loginCooldown > 0
                        ? `Try again in ${loginCooldown}s`
                        : 'Sign In'}
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
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 animate-in fade-in duration-200">
    <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.18)] animate-in zoom-in-95 duration-200">
      <div className="px-8 py-7 bg-slate-900 border-b border-slate-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-200/90">
              Account Security
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
              Password Recovery
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-300">
              Recover access to your account securely through your registered email.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            className="inline-flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-slate-300 transition-all hover:bg-white/15 hover:text-white active:scale-95"
            aria-label="Close recovery modal"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      <div className="px-8 py-8">
        {recoveryStatus.type === 'success' ? (
          <div className="text-center">
            <div className="mx-auto mb-5 flex size-18 items-center justify-center rounded-[1.5rem] bg-emerald-50 text-emerald-600 shadow-sm ring-1 ring-emerald-100">
              <CheckCircle className="size-8" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">Recovery email sent</h3>

            <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-relaxed text-slate-500">
              {recoveryStatus.msg}
            </p>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                Next Step
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Check your inbox and follow the password reset link to continue.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition-all hover:bg-black active:scale-[0.99]"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleRecoverPassword} className="space-y-6">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-4">
              <p className="text-[11px] font-black uppercase tracking-widest text-blue-600">
                Recovery Notice
              </p>
              <p className="mt-1 text-sm font-medium leading-relaxed text-slate-600">
                Enter your email address and we&apos;ll send a secure recovery link if an account is associated with it.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="ml-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                Email Address
              </label>

              <div className="relative">
                <input
                  type="email"
                  required
                  value={recoveryEmail}
                  maxLength={150}
                  onChange={(e) => setRecoveryEmail(sanitizeEmailInput(e.target.value))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              {/* <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={recoveryLoading}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button> */}

              <button
                type="submit"
                disabled={recoveryLoading}
                className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/10 transition-all hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {recoveryLoading ? 'Sending Recovery Link...' : 'Send Recovery Link'}
              </button>
            </div>

            <p className="text-center text-xs font-medium leading-relaxed text-slate-400">
              For security, this recovery link will expire after a short time.
            </p>
          </form>
        )}
      </div>
    </div>
  </div>
)}
    </div>
  );
}
