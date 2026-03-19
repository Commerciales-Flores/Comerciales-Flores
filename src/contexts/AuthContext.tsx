import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import type { ReactNode } from 'react';
import { useIndicator } from './IndicatorContext';
import supabase from '../supabaseClient';
import { Building2 } from 'lucide-react';

// --- TYPES ---
interface User {
  id: string;
  publicId?: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'client' | 'admin';
  contactNumber: string;
  address: string;
  is_active: boolean;
  profilePictureUrl?: string;
  lastLogin?: string;
}

interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  contactNumber?: string;
  address?: string;
  profileFile?: File | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authActionPending: boolean;
  formKey: number;
  setFormKey: React.Dispatch<React.SetStateAction<number>>;
  showSessionWarning: boolean;
  sessionCountdown: number;
  extendSession: () => void;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  register: (
    userData: RegisterInput
  ) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: (
    message?: string,
    options?: { clearGreeting?: boolean; redirectToLogin?: boolean }
  ) => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<boolean>;
  changePassword: (newPassword: string) => Promise<boolean>;
  recoverPassword: (email: string) => Promise<boolean>;
  uploadProfilePicture: (file: File) => Promise<string | null>;
  deleteAccount: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

if (import.meta.env.DEV) {
  const globalKey = '__APP_AUTH_CONTEXT__';
  const g = globalThis as Record<string, unknown>;

  if (g[globalKey] && g[globalKey] !== AuthContext) {
    console.warn('Different AuthContext instance detected');
  }

  g[globalKey] = AuthContext;
}

const STORAGE_KEY = 'currentUser';
const WAS_LOGGED_IN_KEY = 'wasLoggedIn';
const LAST_LOGIN_USER_KEY = 'lastLoginUser';

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 MB

const CLIENT_INACTIVITY_LIMIT = 30 * 60 * 1000;
const ADMIN_INACTIVITY_LIMIT = 15 * 60 * 1000;
const SESSION_WARNING_TIME = 60 * 1000;

// --- NORMALIZERS ---
const normalizeName = (value: string) => value.trim().replace(/\s+/g, ' ');
const normalizeEmail = (email: string) => email.trim().toLowerCase();
const normalizeAddress = (value: string) => value.trim().replace(/\s+/g, ' ');

const normalizePhone = (value: string) => {
  const raw = value.trim();
  const digits = raw.replace(/\D/g, '');

  if (!digits) return '';

  if (digits.startsWith('09') && digits.length === 11) {
    return `+63${digits.slice(1)}`;
  }

  if (digits.startsWith('639') && digits.length === 12) {
    return `+${digits}`;
  }

  if (digits.startsWith('9') && digits.length === 10) {
    return `+63${digits}`;
  }

  if (raw.startsWith('+') && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return raw;
};

const getFormattedTime = () =>
  new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const mapProfileToUser = (data: any): User => ({
  id: data.user_id,
  publicId: data.public_id ?? undefined,
  email: normalizeEmail(data.email ?? ''),
  firstName: normalizeName(data.first_name ?? ''),
  lastName: normalizeName(data.last_name ?? ''),
  role: data.role,
  contactNumber: normalizePhone(data.phone ?? ''),
  address: normalizeAddress(data.address ?? ''),
  is_active: Boolean(data.is_active),
  profilePictureUrl: data.profile_picture_url ?? undefined,
  lastLogin: data.last_login ?? undefined,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Only for initial app bootstrap
  const [loading, setLoading] = useState(true);

  // For login/register/logout/update actions
  const [authActionPending, setAuthActionPending] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [sessionCountdown, setSessionCountdown] = useState(0);
  const [sessionResetKey, setSessionResetKey] = useState(0);

  const { showIndicator } = useIndicator();

  const isMountedRef = useRef(true);
  const bootstrappedRef = useRef(false);
  const logoutInProgressRef = useRef(false);
  const expiryLogoutRef = useRef(false);
  const oauthAuditPendingRef = useRef<string | null>(null);
  const activeUserIdRef = useRef<string | null>(null);

  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const persistUserSession = useCallback((profile: User) => {
    setUser(profile);
    activeUserIdRef.current = profile.id;

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    sessionStorage.setItem(WAS_LOGGED_IN_KEY, 'true');

    const displayName =
      [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim() || 'User';

    localStorage.setItem(
      LAST_LOGIN_USER_KEY,
      JSON.stringify({
        name: displayName,
        profilePictureUrl: profile.profilePictureUrl || '',
      })
    );
  }, []);

  const clearSessionTimers = useCallback(() => {
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }

    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current);
      logoutTimeoutRef.current = null;
    }

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const clearUserSession = useCallback(
    (options?: { clearGreeting?: boolean }) => {
      activeUserIdRef.current = null;
      setUser(null);

      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(WAS_LOGGED_IN_KEY);

      clearSessionTimers();
      setShowSessionWarning(false);
      setSessionCountdown(0);

      if (options?.clearGreeting) {
        localStorage.removeItem(LAST_LOGIN_USER_KEY);
      }
    },
    [clearSessionTimers]
  );

  const extendSession = useCallback(() => {
    setShowSessionWarning(false);
    setSessionCountdown(0);
    setSessionResetKey((k) => k + 1);
  }, []);

  const getAuthProviderLabel = useCallback((authUser: any): string => {
    const provider =
      authUser?.app_metadata?.provider ||
      authUser?.app_metadata?.providers?.[0] ||
      'unknown';

    if (provider === 'google') return 'Google OAuth';
    if (provider === 'facebook') return 'Facebook OAuth';
    if (provider === 'email') return 'email/password';
    return provider;
  }, []);

  const addAuthAuditLog = useCallback(
    async ({
      userId,
      action,
      notes,
      changedFields,
    }: {
      userId: string;
      action: string;
      notes: string;
      changedFields?: string[];
    }) => {
      try {
        const { error } = await supabase.from('audit_log').insert([
          {
            user_id: userId,
            action,
            target_table: 'users',
            target_id: userId,
            changed_fields: changedFields,
            timestamp: new Date().toISOString(),
            notes,
          },
        ]);

        if (error) {
          console.error('Failed to write auth audit log:', error);
        }
      } catch (error) {
        console.error('Unexpected auth audit log error:', error);
      }
    },
    []
  );

  const touchLastLogin = useCallback(async (userId: string) => {
    try {
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('user_id', userId);
    } catch (error) {
      console.error('Failed to update last_login:', error);
    }
  }, []);

  const fetchOrCreateUserProfile = useCallback(
    async (authUser: any): Promise<User | null> => {
      if (!authUser?.id) return null;

      try {
        let { data, error } = await supabase
          .from('users')
          .select(
            'user_id, public_id, email, first_name, last_name, phone, role, address, is_active, profile_picture_url, last_login'
          )
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (!data) {
          const meta = authUser.user_metadata ?? {};
          const fullName = meta.full_name || meta.name || '';
          const parts = fullName.trim().split(' ').filter(Boolean);

          const firstName = normalizeName(meta.first_name || parts[0] || '');
          const lastName = normalizeName(meta.last_name || parts.slice(1).join(' ') || '');
          const email = normalizeEmail(authUser.email ?? '');
          const phone = normalizePhone(meta.phone || '');
          const address = normalizeAddress(meta.address || '');

          const insertResult = await supabase
            .from('users')
            .insert({
              user_id: authUser.id,
              email,
              first_name: firstName,
              last_name: lastName,
              role: 'client',
              phone,
              address,
              is_active: true,
              profile_picture_url: meta.avatar_url || meta.picture || null,
            })
            .select(
              'user_id, public_id, email, first_name, last_name, phone, role, address, is_active, profile_picture_url, last_login'
            )
            .single();

          data = insertResult.data;
          error = insertResult.error;
        }

        if (error || !data) {
          console.error('Failed to fetch/create user profile:', error);
          return null;
        }

        if (data.is_active === false) {
          return null;
        }

        return mapProfileToUser(data);
      } catch (error) {
        console.error('Unexpected profile bootstrap error:', error);
        return null;
      }
    },
    []
  );

  // --- INITIAL APP BOOTSTRAP ---
  useEffect(() => {
    isMountedRef.current = true;

    const initializeSession = async () => {
      try {
        setLoading(true);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMountedRef.current) return;

        if (!session?.user) {
          clearUserSession();
          return;
        }

        const profile = await fetchOrCreateUserProfile(session.user);

        if (!isMountedRef.current) return;

        if (!profile) {
          await supabase.auth.signOut();
          clearUserSession({ clearGreeting: true });
          return;
        }

        persistUserSession(profile);
      } catch (error) {
        console.error('Session init failed:', error);
        if (isMountedRef.current) {
          clearUserSession();
        }
      } finally {
        if (isMountedRef.current) {
          bootstrappedRef.current = true;
          setLoading(false);
        }
      }
    };

    void initializeSession();

    return () => {
      isMountedRef.current = false;
    };
  }, [clearUserSession, fetchOrCreateUserProfile, persistUserSession]);

  // --- AUTH STATE LISTENER ---
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Ignore listener noise before initial bootstrap finishes
      if (!bootstrappedRef.current) return;

      void (async () => {
        try {
          if (event === 'SIGNED_OUT') {
            const wasLoggedIn = sessionStorage.getItem(WAS_LOGGED_IN_KEY) === 'true';

            if (wasLoggedIn && !logoutInProgressRef.current) {
              showIndicator(`SYSTEM ALERT: Session ended at ${getFormattedTime()}`, 'security');
              clearUserSession({ clearGreeting: true });
              setFormKey((k) => k + 1);
            }

            return;
          }

          if (!session?.user) return;

          // If same user already in memory, skip expensive resync
          if (activeUserIdRef.current === session.user.id) return;

          const profile = await fetchOrCreateUserProfile(session.user);

          if (!profile) {
            await supabase.auth.signOut();
            clearUserSession({ clearGreeting: true });
            setFormKey((k) => k + 1);
            return;
          }

          persistUserSession(profile);

          const providerLabel = getAuthProviderLabel(session.user);
          if (
            oauthAuditPendingRef.current &&
            (oauthAuditPendingRef.current === 'google' ||
              oauthAuditPendingRef.current === 'facebook')
          ) {
            void addAuthAuditLog({
              userId: session.user.id,
              action: 'LOGIN',
              changedFields: ['last_login'],
              notes: `User login via ${providerLabel}`,
            });

            void touchLastLogin(session.user.id);
            oauthAuditPendingRef.current = null;
          }
        } catch (error) {
          console.error('onAuthStateChange error:', error);
        }
      })();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [
    addAuthAuditLog,
    clearUserSession,
    fetchOrCreateUserProfile,
    getAuthProviderLabel,
    persistUserSession,
    showIndicator,
    touchLastLogin,
  ]);

  // --- INACTIVITY TIMER ---
  useEffect(() => {
    if (!user) {
      clearSessionTimers();
      setShowSessionWarning(false);
      setSessionCountdown(0);
      return;
    }

    const inactivityLimit =
      user.role === 'admin' ? ADMIN_INACTIVITY_LIMIT : CLIENT_INACTIVITY_LIMIT;

    const startTimers = () => {
      clearSessionTimers();
      setShowSessionWarning(false);
      setSessionCountdown(0);

      const warningDelay = Math.max(inactivityLimit - SESSION_WARNING_TIME, 0);

      warningTimeoutRef.current = setTimeout(() => {
        setShowSessionWarning(true);
        setSessionCountdown(Math.floor(SESSION_WARNING_TIME / 1000));

        countdownIntervalRef.current = setInterval(() => {
          setSessionCountdown((prev) => {
            if (prev <= 1) {
              if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }, warningDelay);

      logoutTimeoutRef.current = setTimeout(() => {
        expiryLogoutRef.current = true;
        void logout('Session expired due to inactivity', {
          clearGreeting: true,
          redirectToLogin: true,
        });
      }, inactivityLimit);
    };

    const resetTimer = () => {
      startTimers();
    };

    const throttledReset = (() => {
      let ticking = false;

      return () => {
        if (ticking) return;
        ticking = true;

        window.setTimeout(() => {
          resetTimer();
          ticking = false;
        }, 250);
      };
    })();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        resetTimer();
      }
    };

    const events: Array<keyof WindowEventMap> = [
      'mousedown',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    events.forEach((event) =>
      window.addEventListener(event, throttledReset, { passive: true })
    );
    document.addEventListener('visibilitychange', handleVisibilityChange);

    startTimers();

    return () => {
      clearSessionTimers();
      events.forEach((event) => window.removeEventListener(event, throttledReset));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, clearSessionTimers, sessionResetKey]);

  // --- AUTH ACTIONS ---
  const login = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (authActionPending) {
        return { success: false, error: 'busy' };
      }

      setAuthActionPending(true);

      try {
        const normalizedEmail = normalizeEmail(email);

        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error || !data.user) {
          console.error('Login failed:', error?.message);
          return { success: false, error: 'invalid_login' };
        }

        const profile = await fetchOrCreateUserProfile(data.user);

        if (!profile) {
          await supabase.auth.signOut();
          return { success: false, error: 'invalid_login' };
        }

        // Instant UI update
        persistUserSession(profile);

        // Non-blocking writes
        void touchLastLogin(data.user.id);
        void addAuthAuditLog({
          userId: data.user.id,
          action: 'LOGIN',
          changedFields: ['last_login'],
          notes: 'User login via email/password',
        });

        return { success: true };
      } catch (err) {
        console.error('Unexpected login error:', err);
        return { success: false, error: 'invalid_login' };
      } finally {
        setAuthActionPending(false);
      }
    },
    [authActionPending, addAuthAuditLog, fetchOrCreateUserProfile, persistUserSession, touchLastLogin]
  );

  const loginWithGoogle = useCallback(async () => {
    if (authActionPending) return;

    setAuthActionPending(true);
    oauthAuditPendingRef.current = 'google';

    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/login`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
    } catch (err) {
      oauthAuditPendingRef.current = null;
      console.error('Google login failed:', err);
    } finally {
      setAuthActionPending(false);
    }
  }, [authActionPending]);

  const loginWithFacebook = useCallback(async () => {
    if (authActionPending) return;

    setAuthActionPending(true);
    oauthAuditPendingRef.current = 'facebook';

    try {
      await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/login`,
        },
      });
    } catch (err) {
      oauthAuditPendingRef.current = null;
      console.error('Facebook login failed:', err);
    } finally {
      setAuthActionPending(false);
    }
  }, [authActionPending]);

  const register = useCallback(
    async (
      userData: RegisterInput
    ): Promise<{ success: boolean; error?: string; message?: string }> => {
      if (authActionPending) {
        return { success: false, error: 'busy' };
      }

      setAuthActionPending(true);

      try {
        const normalizedFirstName = normalizeName(userData.firstName);
        const normalizedLastName = normalizeName(userData.lastName);
        const normalizedEmail = normalizeEmail(userData.email);
        const normalizedContactNumber = normalizePhone(userData.contactNumber ?? '');
        const normalizedAddress = normalizeAddress(userData.address ?? '');

        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: userData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
            data: {
              first_name: normalizedFirstName,
              last_name: normalizedLastName,
              phone: normalizedContactNumber,
              address: normalizedAddress,
            },
          },
        });

        if (error || !data.user) {
          console.error('Registration failed:', error?.message);
          return { success: false, error: 'registration_failed' };
        }

        return {
          success: true,
          message:
            'Account created. Please check your email and verify your account before signing in.',
        };
      } catch (err) {
        console.error('Unexpected registration error:', err);
        return { success: false, error: 'registration_failed' };
      } finally {
        setAuthActionPending(false);
      }
    },
    [authActionPending]
  );

  const logout = useCallback(
    async (
      message?: string,
      options?: { clearGreeting?: boolean; redirectToLogin?: boolean }
    ) => {
      logoutInProgressRef.current = true;

      const currentUserId = activeUserIdRef.current;
      const currentUserEmail = user?.email;
      const shouldClearGreeting = options?.clearGreeting ?? false;
      const shouldRedirectToLogin = options?.redirectToLogin ?? false;

      const isSessionExpiry = expiryLogoutRef.current || /expired/i.test(message ?? '');
      const action = isSessionExpiry ? 'SESSION_EXPIRED' : 'LOGOUT';
      const note = isSessionExpiry
        ? 'Session expired due to inactivity'
        : 'User logout';

      // Instant local clear first = smoother UX
      clearUserSession({ clearGreeting: shouldClearGreeting });
      setFormKey((k) => k + 1);

      const isSecurity = /expired|security|ended/i.test(message ?? '');

      showIndicator(
        message
          ? `${message} at ${getFormattedTime()}`
          : `Logout${currentUserEmail ? ` by ${currentUserEmail}` : ''} at ${getFormattedTime()}`,
        isSecurity ? 'security' : 'logout'
      );

      try {
        if (currentUserId) {
          void addAuthAuditLog({
            userId: currentUserId,
            action,
            notes: note,
          });
        }

        await supabase.auth.signOut();
      } catch (err) {
        console.error('Logout failed:', err);
      } finally {
        logoutInProgressRef.current = false;
        expiryLogoutRef.current = false;

        if (shouldRedirectToLogin && window.location.pathname !== '/login') {
          // still works even without react-router navigate here
          window.history.replaceState(null, '', '/login');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      }
    },
    [addAuthAuditLog, clearUserSession, showIndicator, user?.email]
  );

  const updateProfile = useCallback(
    async (userData: Partial<User>): Promise<boolean> => {
      if (!user || authActionPending) return false;

      setAuthActionPending(true);

      try {
        const dbPayload: Record<string, unknown> = {};

        if (userData.firstName !== undefined) {
          dbPayload.first_name = normalizeName(userData.firstName);
        }

        if (userData.lastName !== undefined) {
          dbPayload.last_name = normalizeName(userData.lastName);
        }

        if (userData.contactNumber !== undefined) {
          dbPayload.phone = normalizePhone(userData.contactNumber);
        }

        if (userData.address !== undefined) {
          dbPayload.address = normalizeAddress(userData.address);
        }

        if (userData.profilePictureUrl !== undefined) {
          dbPayload.profile_picture_url = userData.profilePictureUrl;
        }

        const { error } = await supabase
          .from('users')
          .update(dbPayload)
          .eq('user_id', user.id);

        if (error) {
          console.error('Profile update failed:', error.message);
          return false;
        }

        const updatedUser: User = {
          ...user,
          ...userData,
          ...(userData.firstName !== undefined
            ? { firstName: normalizeName(userData.firstName) }
            : {}),
          ...(userData.lastName !== undefined
            ? { lastName: normalizeName(userData.lastName) }
            : {}),
          ...(userData.contactNumber !== undefined
            ? { contactNumber: normalizePhone(userData.contactNumber) }
            : {}),
          ...(userData.address !== undefined
            ? { address: normalizeAddress(userData.address) }
            : {}),
        };

        persistUserSession(updatedUser);
        return true;
      } catch (err) {
        console.error('Unexpected profile update error:', err);
        return false;
      } finally {
        setAuthActionPending(false);
      }
    },
    [authActionPending, persistUserSession, user]
  );

  const changePassword = useCallback(
    async (newPassword: string): Promise<boolean> => {
      if (authActionPending) return false;

      setAuthActionPending(true);

      try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });

        if (error) {
          console.error('Password change failed:', error.message);
          return false;
        }

        return true;
      } catch (err) {
        console.error('Unexpected password change error:', err);
        return false;
      } finally {
        setAuthActionPending(false);
      }
    },
    [authActionPending]
  );

  const recoverPassword = useCallback(
    async (email: string): Promise<boolean> => {
      if (authActionPending) return true;

      setAuthActionPending(true);

      try {
        const normalizedEmail = normalizeEmail(email);

        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
          console.error('Password recovery failed:', error.message);
        }

        return true;
      } catch (err) {
        console.error('Unexpected password recovery error:', err);
        return true;
      } finally {
        setAuthActionPending(false);
      }
    },
    [authActionPending]
  );

  const uploadProfilePicture = useCallback(
    async (file: File): Promise<string | null> => {
      if (!user || authActionPending) return null;

      setAuthActionPending(true);

      try {
        if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
          console.error('Invalid avatar type.');
          return null;
        }

        if (file.size > MAX_AVATAR_SIZE) {
          console.error('Avatar exceeds maximum allowed size.');
          return null;
        }

        const mimeToExt: Record<string, string> = {
          'image/jpeg': 'jpg',
          'image/png': 'png',
          'image/webp': 'webp',
        };

        const fileExt = mimeToExt[file.type] ?? 'bin';
        const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

        const { error } = await supabase.storage
          .from('avatars')
          .upload(fileName, file, { upsert: false });

        if (error) {
          console.error('Avatar upload failed:', error.message);
          return null;
        }

        const publicUrl = supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl;
        return publicUrl;
      } catch (err) {
        console.error('Unexpected avatar upload error:', err);
        return null;
      } finally {
        setAuthActionPending(false);
      }
    },
    [authActionPending, user]
  );

  const deleteAccount = useCallback(
    async (userId: string) => {
      if (user?.id === userId) {
        await logout('Account being deleted', {
          clearGreeting: true,
          redirectToLogin: true,
        });
      }
    },
    [logout, user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authActionPending,
        formKey,
        setFormKey,
        showSessionWarning,
        sessionCountdown,
        extendSession,
        login,
        loginWithGoogle,
        loginWithFacebook,
        register,
        logout,
        updateProfile,
        changePassword,
        recoverPassword,
        uploadProfilePicture,
        deleteAccount,
      }}
    >
      {loading ? (
        <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-6 bg-white rounded-3xl overflow-hidden">
          <div className="absolute top-8 left-8 flex items-center gap-3 select-none">
            <div className="bg-blue-600 p-1.5 sm:p-2 rounded-xl shadow-lg shadow-blue-100">
              <Building2 className="size-5 sm:size-6 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 tracking-tight">
              Comerciales Flores
            </span>
          </div>

          <div className="max-w-md w-full text-center">
            <h1 className="text-7xl sm:text-8xl font-black text-gray-100 leading-none select-none italic">
              ...
            </h1>

            <div className="relative -mt-8 mb-8 inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl rotate-12 shadow-xl shadow-blue-100">
              <Building2 className="size-10 text-white -rotate-12 animate-pulse" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Restoring your session
            </h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Please wait while we securely prepare your workspace.
            </p>

            <div className="flex items-center justify-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]" />
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.15s]" />
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-bounce" />
            </div>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (import.meta.env.DEV) {
    console.log('useAuth context:', context);
  }

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};