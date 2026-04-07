import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import type { ReactNode } from 'react';
import { useIndicator } from './IndicatorContext';
import supabase from '../supabaseClient';
import { Building2 } from 'lucide-react';
import { formatTime } from '../utils/date';

import {
  normalizeName,
  normalizeEmail,
  normalizeAddress,
  normalizePHPhone,
} from '../utils/DataNormalization';


// --- TYPES ---
interface User {
  id: string;
  publicId?: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'client' | 'admin';
  phone: string;
  address: string;
  formattedAddress?: string;
  latitude?: number | null;
  longitude?: number | null;
  isActive: boolean;
  profilePictureUrl?: string;
  lastLogin?: string;
  phoneVerified: boolean;
  phoneVerifiedAt?: string | null;
  addressConfirmed: boolean;
  addressConfirmedAt?: string | null;
  createdAt?: string;
  activeSessionId?: string | null;
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
  deleteProfilePicture: () => Promise<boolean>;
  showSessionWarning: boolean;
  sessionCountdown: number;
  extendSession: () => void;
login: (
  email: string,
  password: string,
  options?: {
    rememberDevice?: boolean;
    turnstileToken?: string;
  }
) => Promise<{
  success: boolean;
  error?:
    | 'busy'
    | 'invalid_login'
    | 'account_inactive'
    | 'rate_limited'
    | 'locked'
    | 'unverified_device'
    | 'device_check_failed'
    | 'verification_failed';
  retryAfterSeconds?: number;
}>;
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
  deleteAccount: (userId: string) => Promise<{
    success: boolean;
    reason?: string;
  }>;
  changeEmail: (params: {
    newEmail: string;
    currentPassword: string;
  }) => Promise<{ success: boolean; message?: string }>;
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
const LOGOUT_GREETING_ACTIVE_KEY = 'logoutGreetingActive';
const RESET_PASSWORD_PATH = '/reset-password';
const ACTIVE_SESSION_ID_KEY = 'auth:active-session-id';
const ACTIVITY_BROADCAST_KEY = 'auth:activity';
const LAST_ACTIVITY_AT_KEY = 'auth:last-activity-at';
const ACTIVITY_SYNC_TICK_MS = 1000;

const AUTH_NOTICE_KEY = 'auth:notice';

type AuthNotice = {
  code: 'oauth_same_email_existing_account';
  email: string;
  provider: string;
  createdAt: string;
};


const getAuthRedirectUrl = (path: string) =>
  `${window.location.origin}${path}`;

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 MB

const CLIENT_INACTIVITY_LIMIT = 30 * 60 * 1000;
const ADMIN_INACTIVITY_LIMIT = 15 * 60 * 1000;
const SESSION_WARNING_TIME = 60 * 1000;



const getFormattedTime = () => formatTime(new Date());

const getDeviceFingerprint = (): string => {
  const storageKey = 'device_fingerprint';
  const signatureKey = 'device_signature_v1';

  let fingerprint = localStorage.getItem(storageKey);
  let signature = localStorage.getItem(signatureKey);

  const buildSignature = () => {
    const parts = [
      navigator.userAgent || '',
      navigator.language || '',
      String(window.screen?.width || ''),
      String(window.screen?.height || ''),
      Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      navigator.platform || '',
    ];

    return btoa(parts.join('|')).slice(0, 120);
  };

  if (!fingerprint) {
    fingerprint = crypto.randomUUID();
    localStorage.setItem(storageKey, fingerprint);
  }

  if (!signature) {
    signature = buildSignature();
    localStorage.setItem(signatureKey, signature);
  }

  return `${fingerprint}.${signature}`;
};

const mapProfileToUser = (data: any): User => ({
  id: data.user_id,
  publicId: data.public_id ?? undefined,
  email: normalizeEmail(data.email ?? ''),
  firstName: normalizeName(data.first_name ?? ''),
  lastName: normalizeName(data.last_name ?? ''),
  role: data.role,
  phone: normalizePHPhone(data.phone ?? ''),
  address: normalizeAddress(data.address ?? ''),
  formattedAddress: data.formatted_address ?? undefined,
  latitude: data.latitude ?? null,
  longitude: data.longitude ?? null,
  isActive: Boolean(data.is_active),
  profilePictureUrl: data.profile_picture_url ?? undefined,
  lastLogin: data.last_login ?? undefined,
  phoneVerified: Boolean(data.phone_verified),
  phoneVerifiedAt: data.phone_verified_at ?? null,
  addressConfirmed: Boolean(data.address_confirmed),
  addressConfirmedAt: data.address_confirmed_at ?? null,
  createdAt: data.created_at ?? undefined,
  activeSessionId: data.active_session_id ?? null,
});

const USER_SELECT = `
    user_id,
    public_id,
    email,
    first_name,
    last_name,
    phone,
    role,
    address,
    formatted_address,
    latitude,
    longitude,
    is_active,
    profile_picture_url,
    last_login,
    phone_verified,
    phone_verified_at,
    address_confirmed,
    address_confirmed_at,
    created_at,
    active_session_id
  `;

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

    const getInactivityLimit = useCallback((role?: User['role']) => {
    return role === 'admin' ? ADMIN_INACTIVITY_LIMIT : CLIENT_INACTIVITY_LIMIT;
  }, []);

  const shouldEnforceSingleSession = useCallback((_role?: User['role']) => {
  return false;
}, []);

    const getLocalActiveSessionId = useCallback(() => {
  return sessionStorage.getItem(ACTIVE_SESSION_ID_KEY);
}, []);

const setLocalActiveSessionId = useCallback((sessionId: string) => {
  sessionStorage.setItem(ACTIVE_SESSION_ID_KEY, sessionId);
}, []);

const clearLocalActiveSessionId = useCallback(() => {
  sessionStorage.removeItem(ACTIVE_SESSION_ID_KEY);
}, []);

const clearLogoutGreeting = useCallback(() => {
  sessionStorage.removeItem(LAST_LOGIN_USER_KEY);
  sessionStorage.removeItem(LOGOUT_GREETING_ACTIVE_KEY);
}, []);

    
  const getStoredLastActivityAt = useCallback(() => {
    const raw = localStorage.getItem(LAST_ACTIVITY_AT_KEY);
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : Date.now();
  }, []);

  const writeSharedActivity = useCallback((timestamp = Date.now()) => {
    localStorage.setItem(LAST_ACTIVITY_AT_KEY, String(timestamp));
    localStorage.setItem(
      ACTIVITY_BROADCAST_KEY,
      JSON.stringify({ at: timestamp })
    );
  }, []);

  const { showIndicator } = useIndicator();
  const setAuthNotice = useCallback((notice: AuthNotice) => {
    sessionStorage.setItem(AUTH_NOTICE_KEY, JSON.stringify(notice));
  }, []);
  

  const clearAuthNotice = useCallback(() => {
    sessionStorage.removeItem(AUTH_NOTICE_KEY);
  }, []);

  const isMountedRef = useRef(true);
  const bootstrappedRef = useRef(false);
  const logoutInProgressRef = useRef(false);
  const expiryLogoutRef = useRef(false);
  const oauthAuditPendingRef = useRef<string | null>(null);
  const activeUserIdRef = useRef<string | null>(null);
  const pendingDeviceVerificationRef = useRef(false); 
  const userRef = useRef<User | null>(null);

  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  


  const OAUTH_PENDING_KEY = 'oauth:pending-provider';
  const OAUTH_LOGIN_REQUEST_KEY = 'oauth:login-request-id';

  const isOAuthFlowPending = () => {
    return sessionStorage.getItem(OAUTH_PENDING_KEY) !== null;
  };

  const setOAuthFlowPending = (provider: 'google' | 'facebook') => {
    sessionStorage.setItem(OAUTH_PENDING_KEY, provider);
  };

  const clearOAuthFlowPending = () => {
    sessionStorage.removeItem(OAUTH_PENDING_KEY);
    sessionStorage.removeItem(OAUTH_LOGIN_REQUEST_KEY);
  };
  

  const persistUserSession = useCallback((profile: User) => {
    setUser(profile);
    activeUserIdRef.current = profile.id;

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    sessionStorage.setItem(WAS_LOGGED_IN_KEY, 'true');

    const displayName =
      [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim() || 'User';

    sessionStorage.setItem(
      LAST_LOGIN_USER_KEY,
      JSON.stringify({
        name: displayName,
        profilePictureUrl: profile.profilePictureUrl || '',
      })
    );
  }, []);

  const AVATAR_BUCKET = 'avatars';

const getStoragePathFromAvatarUrl = useCallback((url?: string | null) => {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;

    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return null;

    return decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}, []);

const deleteProfilePicture = useCallback(async (): Promise<boolean> => {
  if (!user || authActionPending) return false;

  setAuthActionPending(true);

  try {
    const oldPath = getStoragePathFromAvatarUrl(user.profilePictureUrl);

    if (oldPath) {
      const { error: storageError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .remove([oldPath]);

      if (storageError) {
        console.error('Avatar delete failed:', storageError.message);
        return false;
      }
    }

    const { error: profileError } = await supabase
      .from('users')
      .update({ profile_picture_url: null })
      .eq('user_id', user.id);

    if (profileError) {
      console.error('Failed to clear avatar URL:', profileError.message);
      return false;
    }

    persistUserSession({
      ...user,
      profilePictureUrl: undefined,
    });

    return true;
  } catch (err) {
    console.error('Unexpected avatar delete error:', err);
    return false;
  } finally {
    setAuthActionPending(false);
  }
}, [authActionPending, getStoragePathFromAvatarUrl, persistUserSession, user]);

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
        sessionStorage.removeItem(LAST_LOGIN_USER_KEY);
      }
    },
    [clearSessionTimers]
  );


const handleForeignSession = useCallback(
  async (message: string) => {
    clearUserSession({ clearGreeting: true });
    clearLocalActiveSessionId();
    pendingDeviceVerificationRef.current = false;
    activeUserIdRef.current = null;

    if (window.location.pathname !== '/login') {
      window.history.replaceState(null, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }

    showIndicator(message, 'security');

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Foreign session sign-out failed:', error);
    }
  },
  [clearLocalActiveSessionId, clearUserSession, showIndicator]
);

const claimBrowserSession = useCallback(
  async (userId: string, profile: User): Promise<User | null> => {
    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from('users')
      .update({
        last_login: nowIso,
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to refresh login:', error);
      return null;
    }

    clearLocalActiveSessionId();

    return {
      ...profile,
      activeSessionId: null,
      lastLogin: nowIso,
    };
  },
  [clearLocalActiveSessionId]
);

    const extendSession = useCallback(() => {
    writeSharedActivity(Date.now());
    setShowSessionWarning(false);
    setSessionCountdown(0);
    setSessionResetKey((k) => k + 1);
  }, [writeSharedActivity]);

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

        if (import.meta.env.DEV && error) {
          console.warn('Failed to write auth audit log:', error);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('Unexpected auth audit log error:', error);
        }
      }
    },
    []
  );


  const fetchOrCreateUserProfile = useCallback(
  async (authUser: any): Promise<User | null> => {
    if (!authUser?.id) return null;

    try {
      let { data, error } = await supabase
        .from('users')
        .select(USER_SELECT)
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (!data) {
        const meta = authUser.user_metadata ?? {};
        const fullName = meta.full_name || meta.name || '';
        const parts = fullName.trim().split(' ').filter(Boolean);

        const firstName = normalizeName(meta.first_name || parts[0] || '');
        const lastName = normalizeName(meta.last_name || parts.slice(1).join(' ') || '');
        const email = normalizeEmail(authUser.email ?? '');
        const phone = normalizePHPhone(meta.phone || '');
        const address = normalizeAddress(meta.address || '');

        // Check whether a profile already exists for this email
        const { data: existingByEmail, error: existingByEmailError } = await supabase
          .from('users')
          .select(USER_SELECT)
          .eq('email', email)
          .maybeSingle();

        if (existingByEmailError) {
          console.error('Failed to check existing profile by email:', existingByEmailError);
          return null;
        }

        if (existingByEmail) {
          // If Supabase auto-linked identities correctly, authUser.id should now be the same user.
          // But if the public profile still points to an old auth user_id, reattach it safely.
          if (existingByEmail.user_id !== authUser.id) {
            const { data: migratedRow, error: migrateError } = await supabase
              .from('users')
              .update({
                user_id: authUser.id,
                email,
                first_name: firstName || existingByEmail.first_name,
                last_name: lastName || existingByEmail.last_name,
                phone: phone || existingByEmail.phone,
                address: address || existingByEmail.address,
                profile_picture_url:
                  meta.avatar_url || meta.picture || existingByEmail.profile_picture_url || null,
              })
              .eq('user_id', existingByEmail.user_id)
              .select(USER_SELECT)
              .single();

            if (migrateError || !migratedRow) {
              console.error('Failed to reattach existing profile to linked auth user:', migrateError);
              return null;
            }

            data = migratedRow;
          } else {
            data = existingByEmail;
          }
        } else {
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
            .select(USER_SELECT)
            .single();

          data = insertResult.data;
          error = insertResult.error;
        }
      }

      if (error || !data) {
        console.error('Failed to fetch/create user profile:', error);
        return null;
      }

      if (data.is_active === false) {
        return null;
      }

      clearAuthNotice();
      return mapProfileToUser(data);
    } catch (error) {
      console.error('Unexpected profile bootstrap error:', error);
      return null;
    }
  },
  [clearAuthNotice]
);

const verifyCurrentSessionDevice = useCallback(
  async (
    accessToken: string,
    options?: { rememberDevice?: boolean }
  ): Promise<
    | { ok: true }
    | {
        ok: false;
        error: 'device_check_failed' | 'unverified_device';
        loginRequestId?: string;
        expiresAt?: string;
      }
  > => {
    try {
      const fingerprint = getDeviceFingerprint();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-device-and-send-verification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            deviceFingerprint: fingerprint,
            userAgent: navigator.userAgent,
            rememberDevice: Boolean(options?.rememberDevice),
          }),
        }
      );

      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      console.log('Device verify payload:', payload);

      if (!response.ok) {
        return { ok: false, error: 'device_check_failed' };
      }

      if (!payload?.trusted) {
        return {
          ok: false,
          error: 'unverified_device',
          loginRequestId: payload?.loginRequestId,
          expiresAt: payload?.expiresAt,
        };
      }

      return { ok: true };
    } catch (error) {
      console.error('Device verification failed:', error);
      return { ok: false, error: 'device_check_failed' };
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
        clearLocalActiveSessionId();
        pendingDeviceVerificationRef.current = false;
        clearOAuthFlowPending();
        activeUserIdRef.current = null;
        return;
      }

      const profile = await fetchOrCreateUserProfile(session.user);
const localActiveSessionId = getLocalActiveSessionId();
const cachedRaw = sessionStorage.getItem(STORAGE_KEY);
const cachedUser = cachedRaw ? (JSON.parse(cachedRaw) as User) : null;

if (!isMountedRef.current) return;

if (!profile) {
  await supabase.auth.signOut();
  clearUserSession({ clearGreeting: true });
  clearLocalActiveSessionId();
  clearOAuthFlowPending();
  return;
}

// hard guard: browser auth changed to a different account
if (cachedUser && cachedUser.id !== profile.id) {
  await handleForeignSession(
    'SYSTEM ALERT: This browser was signed in as a different account. Please sign in again.'
  );
  clearOAuthFlowPending();
  return;
}

// same account, but another browser/device owns it now
if (
  shouldEnforceSingleSession(profile.role) &&
  profile.activeSessionId &&
  localActiveSessionId &&
  profile.activeSessionId !== localActiveSessionId
) {
  await handleForeignSession(
    'SYSTEM ALERT: Your session was ended because your account was opened in another browser or device.'
  );
  clearOAuthFlowPending();
  return;
}

pendingDeviceVerificationRef.current = false;

let nextProfile = profile;

const provider =
  session.user?.app_metadata?.provider ||
  session.user?.app_metadata?.providers?.[0] ||
  'unknown';

const isOAuthProvider = provider === 'google' || provider === 'facebook';

if (isOAuthProvider) {
  const accessToken = session.access_token;

  if (!accessToken) {
    await supabase.auth.signOut();
    clearUserSession({ clearGreeting: true });
    clearLocalActiveSessionId();
    clearOAuthFlowPending();
    return;
  }

  const deviceResult = await verifyCurrentSessionDevice(accessToken, {
    rememberDevice: true,
  });

  if (!deviceResult.ok) {
    await supabase.auth.signOut();
    clearUserSession({ clearGreeting: true });
    clearLocalActiveSessionId();

    showIndicator(
      deviceResult.error === 'unverified_device'
        ? 'Please verify this device from your email before signing in.'
        : 'Unable to complete sign-in securely. Please try again.',
      'security'
    );

    clearOAuthFlowPending();
    return;
  }

  const claimedProfile = await claimBrowserSession(session.user.id, profile);

  if (!claimedProfile) {
    await supabase.auth.signOut();
    clearUserSession({ clearGreeting: true });
    clearLocalActiveSessionId();
    clearOAuthFlowPending();
    return;
  }

  nextProfile = claimedProfile;

  void addAuthAuditLog({
    userId: session.user.id,
    action: 'LOGIN',
    changedFields: ['last_login', 'active_session_id'],
    notes: `User login via ${getAuthProviderLabel(session.user)}`,
  });

  clearOAuthFlowPending();
}

      persistUserSession(nextProfile);
      writeSharedActivity(Date.now());
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
}, [
  addAuthAuditLog,
  claimBrowserSession,
  clearLocalActiveSessionId,
  clearUserSession,
  fetchOrCreateUserProfile,
  getAuthProviderLabel,
  getLocalActiveSessionId,
  handleForeignSession,
  persistUserSession,
  verifyCurrentSessionDevice,
  writeSharedActivity,
]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);


  // --- AUTH STATE LISTENER ---
useEffect(() => {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    if (!bootstrappedRef.current) return;

    void (async () => {
      try {
        if (event === 'SIGNED_OUT') {
  if (logoutInProgressRef.current) {
    return;
  }

  const wasLoggedIn = sessionStorage.getItem(WAS_LOGGED_IN_KEY) === 'true';

  if (wasLoggedIn) {
    clearUserSession({ clearGreeting: true });
    clearLocalActiveSessionId();
    setFormKey((k) => k + 1);

    if (window.location.pathname !== '/login') {
      window.history.replaceState(null, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }

    showIndicator(`Logged out at ${getFormattedTime()}`, 'logout');
  }

  return;
  }

        if (!session?.user) return;

        const oauthPending = isOAuthFlowPending();

        if (pendingDeviceVerificationRef.current && !oauthPending) {
          return;
        }

        const currentUser = userRef.current;
        const localActiveSessionId = getLocalActiveSessionId();

        // hard guard: browser auth changed to another account
        if (currentUser && currentUser.id !== session.user.id) {
          await handleForeignSession(
            'SYSTEM ALERT: This browser was signed in as a different account. Please sign in again.'
          );
          clearOAuthFlowPending();
          oauthAuditPendingRef.current = null;
          return;
        }

        if (activeUserIdRef.current === session.user.id && currentUser) return;

        const profile = await fetchOrCreateUserProfile(session.user);

        if (!profile) {
          await supabase.auth.signOut();
          clearUserSession({ clearGreeting: true });
          clearLocalActiveSessionId();
          setFormKey((k) => k + 1);
          showIndicator(
            'Your account is no longer active. Please contact the administrator.',
            'security'
          );
          return;
        }

        // same account, but another browser/device now owns the session
        if (
  shouldEnforceSingleSession(profile.role) &&
  profile.activeSessionId &&
  localActiveSessionId &&
  profile.activeSessionId !== localActiveSessionId
) {
  await handleForeignSession(
    'SYSTEM ALERT: Your session was ended because your account was opened elsewhere.'
  );
  clearOAuthFlowPending();
  oauthAuditPendingRef.current = null;
  return;
}

        //persistUserSession(profile);

        pendingDeviceVerificationRef.current = false;

        let nextProfile = profile;
        const providerLabel = getAuthProviderLabel(session.user);

        const provider =
          session.user?.app_metadata?.provider ||
          session.user?.app_metadata?.providers?.[0] ||
          'unknown';

        const isOAuthProvider = provider === 'google' || provider === 'facebook';

        if (
          isOAuthProvider ||
          oauthPending ||
          oauthAuditPendingRef.current === 'google' ||
          oauthAuditPendingRef.current === 'facebook'
        ) {
  const accessToken = session.access_token;

  if (!accessToken) {
    await supabase.auth.signOut();
    clearUserSession({ clearGreeting: true });
    clearLocalActiveSessionId();
    setFormKey((k) => k + 1);
    showIndicator(
      'Unable to complete sign-in securely. Please try again.',
      'security'
    );
    oauthAuditPendingRef.current = null;
    clearOAuthFlowPending();
    return;
  }
  

  const deviceResult = await verifyCurrentSessionDevice(accessToken, {
    rememberDevice: true,
  });

  if (!deviceResult.ok) {
    await supabase.auth.signOut();
    clearUserSession({ clearGreeting: true });
    clearLocalActiveSessionId();
    setFormKey((k) => k + 1);

    showIndicator(
      deviceResult.error === 'unverified_device'
        ? 'Please verify this device from your email before signing in.'
        : 'Unable to complete sign-in securely. Please try again.',
      'security'
    );

    oauthAuditPendingRef.current = null;
    clearOAuthFlowPending();
    return;
  }

  const claimedProfile = await claimBrowserSession(session.user.id, profile);

          if (!claimedProfile) {
            await supabase.auth.signOut();
            clearUserSession({ clearGreeting: true });
            clearLocalActiveSessionId();
            setFormKey((k) => k + 1);
            showIndicator(
              'Unable to complete sign-in securely. Please try again.',
              'security'
            );
            oauthAuditPendingRef.current = null;
            clearOAuthFlowPending();
            return;
          }

          nextProfile = claimedProfile;

          void addAuthAuditLog({
            userId: session.user.id,
            action: 'LOGIN',
            changedFields: ['last_login', 'active_session_id'],
            notes: `User login via ${providerLabel}`,
          });

          oauthAuditPendingRef.current = null;
          clearOAuthFlowPending();
        }

        persistUserSession(nextProfile);
        writeSharedActivity(Date.now());
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
  claimBrowserSession,
  clearLocalActiveSessionId,
  clearUserSession,
  fetchOrCreateUserProfile,
  getAuthProviderLabel,
  getLocalActiveSessionId,
  handleForeignSession,
  persistUserSession,
  showIndicator,
  verifyCurrentSessionDevice,
  writeSharedActivity,
]);





  const verifyTurnstileToken = useCallback(
  async (token?: string): Promise<boolean> => {
    // ✅ DEV MODE BYPASS
    if (import.meta.env.DEV) {
      return true;
    }

    if (!token) return false;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 2500);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-turnstile`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ token }),
          signal: controller.signal,
        }
      );

      if (!response.ok) return false;

      const data = await response.json().catch(() => null);
      return Boolean(data?.success);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Turnstile verification failed:', error);
      }
      return false;
    } finally {
      clearTimeout(timeout);
    }
  },
  []
);

type LoginResult = {
  success: boolean;
  error?:
    | 'busy'
    | 'invalid_login'
    | 'account_inactive'
    | 'rate_limited'
    | 'locked'
    | 'unverified_device'
    | 'device_check_failed'
    | 'verification_failed';
  retryAfterSeconds?: number;
  loginRequestId?: string;
  expiresAt?: string;
};

  const login = useCallback(
  async (
    email: string,
    password: string,
    options?: {
      rememberDevice?: boolean;
      turnstileToken?: string;
    }
  ): Promise<LoginResult> => {
    if (authActionPending) {
      return { success: false, error: 'busy' };
    }

    setAuthActionPending(true);

    try {
      clearAuthNotice();
      const normalizedEmail = normalizeEmail(email);

      const turnstilePromise = verifyTurnstileToken(options?.turnstileToken);
      const lockPromise = supabase.rpc('check_login_lock', {
        p_email: normalizedEmail,
      });

      const [isTurnstileValid, lockResult] = await Promise.all([
        turnstilePromise,
        lockPromise,
      ]);

      if (!isTurnstileValid) {
        return { success: false, error: 'verification_failed' };
      }

      const lockData = lockResult.data;

      if (Array.isArray(lockData) && lockData[0]?.is_locked) {
        return {
          success: false,
          error: 'locked',
          retryAfterSeconds: lockData[0]?.retry_after_seconds ?? 60,
        };
      }

      pendingDeviceVerificationRef.current = true;

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error || !data.user) {
        pendingDeviceVerificationRef.current = false;

        await supabase.rpc('record_login_failure', {
          p_email: normalizedEmail,
          p_reason: 'invalid_credentials',
        });

        return { success: false, error: 'invalid_login' };
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        pendingDeviceVerificationRef.current = false;
        await supabase.auth.signOut();
        return { success: false, error: 'device_check_failed' };
      }

      // const fingerprint = getDeviceFingerprint();

      // const deviceCheckPromise = fetch(
      //   `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-device-and-send-verification`,
      //   {
      //     method: 'POST',
      //     headers: {
      //       'Content-Type': 'application/json',
      //       apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      //       Authorization: `Bearer ${accessToken}`,
      //     },
      //     body: JSON.stringify({
      //       deviceFingerprint: fingerprint,
      //       userAgent: navigator.userAgent,
      //       rememberDevice: Boolean(options?.rememberDevice),
      //     }),
      //   }
      // ).then(async (response) => {
      //   let payload: any = null;

      //   try {
      //     payload = await response.json();
      //   } catch {
      //     payload = null;
      //   }

      //   return {
      //     ok: response.ok,
      //     payload,
      //   };
      // });

      // const profilePromise = fetchOrCreateUserProfile(data.user);

      // const [{ ok, payload: deviceCheck }, profile] = await Promise.all([
      //   deviceCheckPromise,
      //   profilePromise,
      // ]);

      const deviceResult = await verifyCurrentSessionDevice(accessToken, {
  rememberDevice: Boolean(options?.rememberDevice),
});

if (!deviceResult.ok) {
  pendingDeviceVerificationRef.current = false;
  await supabase.auth.signOut();

  if (deviceResult.error === 'unverified_device') {
    return {
      success: false,
      error: 'unverified_device',
      loginRequestId: deviceResult.loginRequestId,
      expiresAt: deviceResult.expiresAt,
    };
  }

  return { success: false, error: 'device_check_failed' };
}

const profile = await fetchOrCreateUserProfile(data.user);

      // if (!ok) {
      //   pendingDeviceVerificationRef.current = false;
      //   await supabase.auth.signOut();
      //   return { success: false, error: 'device_check_failed' };
      // }

      // if (!deviceCheck?.trusted) {
      //   pendingDeviceVerificationRef.current = false;
      //   await supabase.auth.signOut();

      //   return {
      //     success: false,
      //     error: 'unverified_device',
      //     loginRequestId: deviceCheck?.loginRequestId,
      //     expiresAt: deviceCheck?.expiresAt,
      //   };
      // }

      if (!profile) {
        pendingDeviceVerificationRef.current = false;
        await supabase.auth.signOut();

        return {
          success: false,
          error: 'account_inactive',
        };
      }

      const nowIso = new Date().toISOString();

clearLocalActiveSessionId();

const { error: loginUpdateError } = await supabase
  .from('users')
  .update({
    last_login: nowIso,
  })
  .eq('user_id', data.user.id);

if (loginUpdateError) {
  pendingDeviceVerificationRef.current = false;
  await supabase.auth.signOut();
  return { success: false, error: 'device_check_failed' };
}

const nextProfile: User = {
  ...profile,
  activeSessionId: null,
  lastLogin: nowIso,
};

      pendingDeviceVerificationRef.current = false;
      persistUserSession(nextProfile);
      writeSharedActivity(Date.now());

      void addAuthAuditLog({
        userId: data.user.id,
        action: 'LOGIN',
        changedFields: ['last_login', 'active_session_id'],
        notes: 'User login via email/password',
      });

      void supabase.functions.invoke('record-login-context', {
        body: { email: normalizedEmail },
      });

      return { success: true };
    } catch (err) {
      pendingDeviceVerificationRef.current = false;
      return { success: false, error: 'invalid_login' };
    } finally {
      setAuthActionPending(false);
    }
  },
  [
    authActionPending,
    addAuthAuditLog,
    clearAuthNotice,
    fetchOrCreateUserProfile,
    getLocalActiveSessionId,
    persistUserSession,
    setLocalActiveSessionId,
    verifyCurrentSessionDevice,
    verifyTurnstileToken,
    writeSharedActivity,
    clearLocalActiveSessionId,
    shouldEnforceSingleSession,
  ]
);
  const loginWithGoogle = useCallback(async () => {
  if (authActionPending) return;

  setAuthActionPending(true);
  clearAuthNotice();
  oauthAuditPendingRef.current = 'google';
  setOAuthFlowPending('google');

  try {
    showIndicator('Redirecting to Google sign-in...', 'login');
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/login`,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account consent',
        },
      },
    });
  } catch (err) {
    oauthAuditPendingRef.current = null;
    pendingDeviceVerificationRef.current = false;
    clearOAuthFlowPending();
    console.error('Google login failed:', err);
  } finally {
    setAuthActionPending(false);
  }
}, [authActionPending, clearAuthNotice]);

  const loginWithFacebook = useCallback(async () => {
  if (authActionPending) return;

  setAuthActionPending(true);
  clearAuthNotice();
  oauthAuditPendingRef.current = 'facebook';
  setOAuthFlowPending('facebook');

  try {

    showIndicator('Redirecting to Facebook sign-in...', 'login');
    await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `${window.location.origin}/login`,
      },
    });
  } catch (err) {
    oauthAuditPendingRef.current = null;
    pendingDeviceVerificationRef.current = false;
    clearOAuthFlowPending();
    console.error('Facebook login failed:', err);
  } finally {
    setAuthActionPending(false);
  }
}, [authActionPending, clearAuthNotice]);

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
        const normalizedContactNumber = normalizePHPhone(userData.contactNumber ?? '');
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
            'Check your email for the next step. You can return here to continue once completed.',
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
    if (logoutInProgressRef.current) return;
    logoutInProgressRef.current = true;

    const currentUser = userRef.current;
    const currentUserId = activeUserIdRef.current;
    const currentUserEmail = currentUser?.email;

    const shouldClearGreeting = options?.clearGreeting ?? false;
    const shouldRedirectToLogin = options?.redirectToLogin ?? true;

    const isSessionExpiry = expiryLogoutRef.current || /expired/i.test(message ?? '');
    const action = isSessionExpiry ? 'SESSION_EXPIRED' : 'LOGOUT';
    const note = isSessionExpiry
      ? 'Session expired due to inactivity'
      : 'User logout';

    const isSecurity = /expired|security|ended/i.test(message ?? '');

    clearUserSession({ clearGreeting: shouldClearGreeting });

    if (!shouldClearGreeting) {
      sessionStorage.setItem(LOGOUT_GREETING_ACTIVE_KEY, 'true');
    } else {
      clearLogoutGreeting();
    }
    setFormKey((k) => k + 1);
    localStorage.removeItem(LAST_ACTIVITY_AT_KEY);

    showIndicator(
      message
        ? `${message} at ${getFormattedTime()}`
        : `Logout${currentUserEmail ? ` by ${currentUserEmail}` : ''} at ${getFormattedTime()}`,
      isSecurity ? 'security' : 'logout'
    );

    if (shouldRedirectToLogin && window.location.pathname !== '/login') {
      window.history.replaceState(null, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }

    try {
      if (currentUserId) {
        void addAuthAuditLog({
          userId: currentUserId,
          action,
          notes: note,
        });
      }

      clearLocalActiveSessionId();
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      logoutInProgressRef.current = false;
      expiryLogoutRef.current = false;
    }
  },
  [
    addAuthAuditLog,
    clearLocalActiveSessionId,
    clearUserSession,
    getLocalActiveSessionId,
    showIndicator,
    shouldEnforceSingleSession,
  ]
);

useEffect(() => {
  const clearIfTransientGreeting = () => {
    if (sessionStorage.getItem(LOGOUT_GREETING_ACTIVE_KEY) === 'true') {
      clearLogoutGreeting();
    }
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      clearIfTransientGreeting();
    }
  };

  const handleBeforeUnload = () => {
    clearIfTransientGreeting();
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('beforeunload', handleBeforeUnload);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}, [clearLogoutGreeting]);

          // --- SHARED INACTIVITY TIMER ACROSS TABS ---
  useEffect(() => {
    if (!user) {
      clearSessionTimers();
      setShowSessionWarning(false);
      setSessionCountdown(0);
      return;
    }

    const inactivityLimit = getInactivityLimit(user.role);

    // ensure a shared baseline exists when session starts
    if (!localStorage.getItem(LAST_ACTIVITY_AT_KEY)) {
      writeSharedActivity(Date.now());
    }

    const evaluateSessionState = () => {
      const lastActivityAt = getStoredLastActivityAt();
      const now = Date.now();
      const idleFor = now - lastActivityAt;
      const timeRemaining = inactivityLimit - idleFor;

      if (timeRemaining <= 0) {
        if (!logoutInProgressRef.current) {
          expiryLogoutRef.current = true;
          void logout('Session expired due to inactivity', {
            clearGreeting: true,
            redirectToLogin: true,
          });
        }
        return;
      }

      if (timeRemaining <= SESSION_WARNING_TIME) {
        setShowSessionWarning(true);
        setSessionCountdown(Math.ceil(timeRemaining / 1000));
      } else {
        setShowSessionWarning(false);
        setSessionCountdown(0);
      }
    };

    const resetSharedActivity = () => {
      writeSharedActivity(Date.now());
      evaluateSessionState();
    };

    const throttledReset = (() => {
      let ticking = false;

      return () => {
        if (ticking) return;
        ticking = true;

        window.setTimeout(() => {
          resetSharedActivity();
          ticking = false;
        }, 250);
      };
    })();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        evaluateSessionState();
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === LAST_ACTIVITY_AT_KEY ||
        event.key === ACTIVITY_BROADCAST_KEY
      ) {
        evaluateSessionState();
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
    window.addEventListener('storage', handleStorage);

    const intervalId = window.setInterval(
      evaluateSessionState,
      ACTIVITY_SYNC_TICK_MS
    );

    evaluateSessionState();

    return () => {
      clearSessionTimers();
      window.clearInterval(intervalId);
      events.forEach((event) =>
        window.removeEventListener(event, throttledReset)
      );
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, [
    user,
    clearSessionTimers,
    getInactivityLimit,
    getStoredLastActivityAt,
    logout,
    writeSharedActivity,
    sessionResetKey,
  ]);


    useEffect(() => {
  if (!user?.id) return;

  let isHandlingForcedLogout = false;

  const channel = supabase
    .channel(`users-self-${user.id}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'users',
        filter: `user_id=eq.${user.id}`,
      },
      async (payload) => {
        const nextRow =
          payload.eventType === 'DELETE'
            ? null
            : (payload.new as Record<string, any> | null);

        if (!nextRow) {
          if (!isHandlingForcedLogout) {
            isHandlingForcedLogout = true;
            await logout('Your account is no longer available.', {
              clearGreeting: true,
              redirectToLogin: true,
            });
          }
          return;
        }

        const nextUser = mapProfileToUser(nextRow);
        const localActiveSessionId = getLocalActiveSessionId();

        if (
  shouldEnforceSingleSession(nextUser.role) &&
  nextUser.activeSessionId &&
  localActiveSessionId &&
  nextUser.activeSessionId !== localActiveSessionId
) {
  if (!isHandlingForcedLogout) {
    isHandlingForcedLogout = true;
    await logout('Your session was ended because your account was opened elsewhere.', {
      clearGreeting: true,
      redirectToLogin: true,
    });
  }
  return;
}

        persistUserSession(nextUser);

        if (nextUser.isActive === false) {
          if (!isHandlingForcedLogout) {
            isHandlingForcedLogout = true;
            await logout('Your account has been deactivated.', {
              clearGreeting: true,
              redirectToLogin: true,
            });
          }
          return;
        }

        if (user.role !== nextUser.role) {
          const nextPath =
            nextUser.role === 'admin' ? '/admin/dashboard' : '/client/dashboard';

          if (window.location.pathname !== nextPath) {
            window.history.replaceState(null, '', nextPath);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        }
      }
    )
    .subscribe((status) => {
      if (import.meta.env.DEV) {
        console.log(`Realtime self-user channel [${user.id}]:`, status);
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}, [getLocalActiveSessionId, user?.id, user?.role, logout, persistUserSession]);

  const updateProfile = useCallback(
  async (userData: Partial<User>): Promise<boolean> => {
    const currentUser = userRef.current;
    if (!currentUser || authActionPending) return false;

    setAuthActionPending(true);

    try {
      const dbPayload: Record<string, unknown> = {};

      if (userData.firstName !== undefined) {
        dbPayload.first_name = normalizeName(userData.firstName);
      }

      if (userData.lastName !== undefined) {
        dbPayload.last_name = normalizeName(userData.lastName);
      }

      if (userData.phone !== undefined) {
        dbPayload.phone = normalizePHPhone(userData.phone);
      }

      if (userData.address !== undefined) {
        dbPayload.address = normalizeAddress(userData.address);
      }

      if (userData.profilePictureUrl !== undefined) {
        dbPayload.profile_picture_url = userData.profilePictureUrl;
      }

      if (Object.keys(dbPayload).length > 0) {
        const { error: profileError } = await supabase
          .from('users')
          .update(dbPayload)
          .eq('user_id', currentUser.id);

        if (profileError) {
          console.error('Profile update failed:', profileError.message);
          return false;
        }
      }

      const updatedUser: User = {
        ...currentUser,
        ...(userData.firstName !== undefined
          ? { firstName: normalizeName(userData.firstName) }
          : {}),
        ...(userData.lastName !== undefined
          ? { lastName: normalizeName(userData.lastName) }
          : {}),
        ...(userData.phone !== undefined
          ? { phone: normalizePHPhone(userData.phone) }
          : {}),
        ...(userData.address !== undefined
          ? { address: normalizeAddress(userData.address) }
          : {}),
        ...(userData.profilePictureUrl !== undefined
          ? { profilePictureUrl: userData.profilePictureUrl }
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
  [authActionPending, persistUserSession]
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

  const changeEmail = useCallback(
  async ({
    newEmail,
    currentPassword,
  }: {
    newEmail: string;
    currentPassword: string;
  }): Promise<{ success: boolean; message?: string }> => {
    if (!user || authActionPending) {
      return { success: false, message: 'Action in progress.' };
    }

    setAuthActionPending(true);

    try {
      const normalizedEmail = normalizeEmail(newEmail);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      if (sessionError || !accessToken) {
        return {
          success: false,
          message: 'Your session is no longer valid. Please sign in again.',
        };
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/request-email-change`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            newEmail: normalizedEmail,
            currentPassword,
          }),
        }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        return {
          success: false,
          message:
            payload?.error ||
            payload?.message ||
            'Unable to process email change request.',
        };
      }

      showIndicator(
        payload?.message ||
          'We sent a verification link to your new email address.',
        'security'
      );

      return {
        success: true,
        message: payload?.message,
      };
    } catch (err) {
      console.error('Email change error:', err);

      return {
        success: false,
        message: 'Unable to process email change request.',
      };
    } finally {
      setAuthActionPending(false);
    }
  },
  [authActionPending, showIndicator, user]
);

  const recoverPassword = useCallback(
  async (email: string): Promise<boolean> => {
    if (authActionPending) return false;

    setAuthActionPending(true);

    try {
      const normalizedEmail = normalizeEmail(email);

      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: getAuthRedirectUrl(RESET_PASSWORD_PATH),
      });

      if (error) {
        return false;
      }

      return true;
    } catch {
      return false;
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
      const newPath = `${user.id}/avatar.${fileExt}`;

      // remove old avatar first if it exists and is different
      const oldPath = getStoragePathFromAvatarUrl(user.profilePictureUrl);
      if (oldPath && oldPath !== newPath) {
        const { error: removeOldError } = await supabase.storage
          .from(AVATAR_BUCKET)
          .remove([oldPath]);

        if (removeOldError) {
          console.error('Old avatar cleanup failed:', removeOldError.message);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(newPath, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('Avatar upload failed:', uploadError.message);
        return null;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(newPath);

      const { error: profileError } = await supabase
        .from('users')
        .update({ profile_picture_url: publicUrl })
        .eq('user_id', user.id);

      if (profileError) {
        console.error('Failed to save avatar URL:', profileError.message);

        // rollback uploaded file if DB update fails
        await supabase.storage.from(AVATAR_BUCKET).remove([newPath]);
        return null;
      }

      persistUserSession({
        ...user,
        profilePictureUrl: publicUrl,
      });

      return publicUrl;
    } catch (err) {
      console.error('Unexpected avatar upload error:', err);
      return null;
    } finally {
      setAuthActionPending(false);
    }
  },
  [
    authActionPending,
    getStoragePathFromAvatarUrl,
    persistUserSession,
    user,
  ]
);

  const deleteAccount = useCallback(
  async (userId: string): Promise<{ success: boolean; reason?: string }> => {
    const currentUser = userRef.current;

    if (authActionPending) {
      return {
        success: false,
        reason: 'Another authentication action is already in progress.',
      };
    }

    try {
      if (!currentUser?.id || currentUser.id !== userId) {
        return {
          success: false,
          reason: 'You are not authorized to delete this account.',
        };
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      if (sessionError || !accessToken) {
        return {
          success: false,
          reason: 'Your session is no longer valid. Please sign in again and retry.',
        };
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ userId }),
        }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        return {
          success: false,
          reason: payload?.reason || 'Failed to permanently delete your account.',
        };
      }

      await supabase.auth.signOut();

      return {
        success: true,
        reason: payload?.reason || 'Account deleted successfully.',
      };
    } catch (error) {
      console.error('Delete account error:', error);
      return {
        success: false,
        reason: 'Unexpected error occurred while deleting the account.',
      };
    }
  },
  [authActionPending]
);

const authValue = useMemo(
  () => ({
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
    deleteProfilePicture,
    register,
    logout,
    updateProfile,
    changePassword,
    changeEmail,
    recoverPassword,
    uploadProfilePicture,
    deleteAccount,
  }),
  [
    user,
    loading,
    authActionPending,
    formKey,
    showSessionWarning,
    sessionCountdown,
    extendSession,
    login,
    loginWithGoogle,
    loginWithFacebook,
    deleteProfilePicture,
    register,
    logout,
    updateProfile,
    changePassword,
    changeEmail,
    recoverPassword,
    uploadProfilePicture,
    deleteAccount,
  ]
);

  return (
    <AuthContext.Provider value={authValue}>
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

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};