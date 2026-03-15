import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useIndicator } from './IndicatorContext';
import supabase from '../supabaseClient';

// --- TYPES ---
interface User {
  id: string;
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

interface AuthContextType {
  user: User | null;
  loading: boolean;
  formKey: number;
  setFormKey: React.Dispatch<React.SetStateAction<number>>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  register: (
    userData: Omit<User, 'id' | 'is_active' | 'profilePictureUrl' | 'role'> & {
      password: string;
      profileFile?: File | null;
    }
  ) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: (message?: string) => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  changePassword: (newPassword: string) => Promise<boolean>;
  recoverPassword: (email: string) => Promise<boolean>;
  uploadProfilePicture: (file: File) => Promise<string | null>;
  deleteAccount: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const STORAGE_KEY = 'currentUser';
const LAST_LOGIN_USER_KEY = 'lastLoginUser';


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [formKey, setFormKey] = useState(0);
  const { showIndicator } = useIndicator();

const fetchAndSetUserProfile = useCallback(async (authUser: any) => {
  let { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', authUser.id)
    .maybeSingle();

  if (!data) {
    const meta = authUser.user_metadata ?? {};

    const fullName = meta.full_name || meta.name || '';
    const parts = fullName.trim().split(' ').filter(Boolean);

    const firstName = meta.first_name || parts[0] || '';
    const lastName = meta.last_name || parts.slice(1).join(' ') || '';

    const { data: insertedUser, error: insertError } = await supabase
      .from('users')
      .insert({
        user_id: authUser.id,
        email: authUser.email,
        first_name: firstName,
        last_name: lastName,
        role: 'client',
        contact_number: meta.phone || '',
        address: meta.address || '',
        is_active: true,
        profile_picture_url: meta.avatar_url || meta.picture || null,
      })
      .select()
      .single();

    data = insertedUser;
    error = insertError;
  }

  if (error || !data) {
    console.error('User profile not found or could not be created:', error?.message);
    await supabase.auth.signOut();
    setUser(null);
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem('wasLoggedIn');
    setLoading(false);
    return;
  }

  if (data.is_active === false) {
    await supabase.auth.signOut();
    setUser(null);
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem('wasLoggedIn');
    setLoading(false);
    return;
  }

  const profile: User = {
    id: data.user_id,
    email: data.email,
    firstName: data.first_name ?? '',
    lastName: data.last_name ?? '',
    role: data.role,
    contactNumber: data.contact_number ?? '',
    address: data.address ?? '',
    is_active: data.is_active,
    profilePictureUrl: data.profile_picture_url ?? undefined,
    lastLogin: data.last_login ?? undefined,
  };

  setUser(profile);
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  sessionStorage.setItem('wasLoggedIn', 'true');

  localStorage.setItem(
    LAST_LOGIN_USER_KEY,
    JSON.stringify({
      name: [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim(),
      email: profile.email,
      profilePictureUrl: profile.profilePictureUrl || '',
    })
  );

  setLoading(false);
}, []);

  

  // --- 2. AUTH STATE LISTENER & SESSION SYNC ---
  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchAndSetUserProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        fetchAndSetUserProfile(session.user);
      } else {
        // Handle unexpected session loss (e.g. manual cookie clear)
        const wasLoggedIn = sessionStorage.getItem('wasLoggedIn') === 'true';
        if (wasLoggedIn && event === 'SIGNED_OUT') {
           const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
           showIndicator(`SYSTEM ALERT: Session ended at ${time}`, 'security');
        }
        setUser(null);
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem('wasLoggedIn');
        setLoading(false);
      }
    });

    // Cross-tab & BFCache Protection
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && !e.newValue) setUser(null);
    };
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [fetchAndSetUserProfile, showIndicator]);

  // --- 3. LOGOUT ---
  const logout = useCallback(async (message?: string) => {
    const email = user?.email;
    await supabase.auth.signOut();
    
    setUser(null);
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem('wasLoggedIn');
    setFormKey((k) => k + 1);

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isSecurity = message?.match(/expired|security|ended/i);
    
    showIndicator(
      message ? `${message} at ${time}` : `Logout by ${email} at ${time}`,
      isSecurity ? 'security' : 'logout'
    );
  }, [user, showIndicator]);

  // --- 4. INACTIVITY TIMER ---
  useEffect(() => {
    if (!user) return;
    const INACTIVITY_LIMIT = 30 * 60 * 1000;
    let timeoutId: any;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => logout("Session expired due to inactivity"), INACTIVITY_LIMIT);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [user, logout]);

  // --- 5. AUTH ACTIONS ---

  const login = async (
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> => {

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Login error:', error.message);

    if (error.message.includes('Invalid login credentials')) {
      return { success: false, error: 'invalid_credentials' };
    }

    if (error.message.includes('Email not confirmed')) {
      return { success: false, error: 'email_not_verified' };
    }

    return { success: false, error: 'auth_error' };
  }

  if (!data.user) {
    return { success: false, error: 'no_user' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', data.user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return { success: false, error: 'account_not_found' };
  }

  if (profile.is_active === false) {
    await supabase.auth.signOut();
    return { success: false, error: 'account_disabled' };
  }

  await supabase
    .from('users')
    .update({ last_login: new Date().toISOString() })
    .eq('user_id', data.user.id);

  return { success: true };
};

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/login`, queryParams: { access_type: 'offline', prompt: 'consent' } }
    });
  };

  const loginWithFacebook = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: { redirectTo: `${window.location.origin}/login` }
    });
  };

 const register = async (
  userData: Omit<User, 'id' | 'is_active' | 'profilePictureUrl' | 'role'> & {
    password: string;
    profileFile?: File | null;
  }
): Promise<{ success: boolean; error?: string; message?: string }> => {
  const normalizedEmail = userData.email.trim().toLowerCase();

  let avatarUrl: string | null = null;

  if (userData.profileFile) {
    try {
      const fileExt = userData.profileFile.name.split('.').pop();
      const fileName = `new-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, userData.profileFile);

      if (uploadError) {
        console.error('Avatar upload failed:', uploadError.message);
      } else {
        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
        avatarUrl = data.publicUrl;
      }
    } catch (err) {
      console.error('Avatar upload failed:', err);
    }
  }

  const { data: existingProfile } = await supabase
    .from('users')
    .select('user_id, email')
    .ilike('email', normalizedEmail)
    .maybeSingle();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: userData.password,
    options: {
      emailRedirectTo: `${window.location.origin}/login`,
      data: {
        first_name: userData.firstName,
        last_name: userData.lastName,
        phone: userData.contactNumber,
        address: userData.address,
        profile_picture_url: avatarUrl,
      },
    },
  });

  console.log('signUp user:', authData?.user);
  console.log('signUp session:', authData?.session);

  if (authError) {
    console.error('Auth registration failed:', authError.message);

    if (authError.message.includes('User already registered')) {
      return { success: false, error: 'email_already_exists' };
    }

    return { success: false, error: 'auth_error' };
  }

  if (!authData.user) {
    return { success: false, error: 'auth_error' };
  }

  if (existingProfile) {
    return {
      success: true,
      message:
        'This email already has an account. If you have not verified it yet, check your inbox for the confirmation email. Otherwise, sign in instead.',
    };
  }

  return {
    success: true,
    message:
      'Account created. Please check your email and verify your account before signing in.',
  };
};

  const updateProfile = async (userData: Partial<User>) => {
    if (!user) return;
    const dbPayload: any = {};
    if (userData.firstName !== undefined) dbPayload.first_name = userData.firstName;
    if (userData.lastName !== undefined) dbPayload.last_name = userData.lastName;
    if (userData.contactNumber !== undefined) dbPayload.phone = userData.contactNumber;
    if (userData.address !== undefined) dbPayload.address = userData.address;
    if (userData.profilePictureUrl !== undefined) dbPayload.profile_picture_url = userData.profilePictureUrl;

    const { error } = await supabase.from('users').update(dbPayload).eq('user_id', user.id);
    if (!error) setUser({ ...user, ...userData });
  };

  const changePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return !error;
  };

  const recoverPassword = async (email: string): Promise<boolean> => {
  const normalizedEmail = email.trim().toLowerCase();

  const { data: existingUser, error: lookupError } = await supabase
    .from('users')
    .select('user_id, email, is_active')
    .ilike('email', normalizedEmail)
    .single();

  if (lookupError || !existingUser) {
    console.error('No user found for recovery:', lookupError?.message);
    return false;
  }

  if (existingUser.is_active === false) {
    console.error('Inactive user cannot recover password.');
    return false;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) {
    console.error('Password recovery failed:', error.message);
    return false;
  }

  return true;
};

  const uploadProfilePicture = async (file: File) => {
    if (!user) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
    return error ? null : supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl;
  };

  const deleteAccount = async (userId: string) => {
    // In Supabase, deleting a user usually requires a Service Role via Edge Function 
    // This logic assumes you handle the DB-side cleanup.
    if (user?.id === userId) await logout("Account being deleted");
  };

  return (
    <AuthContext.Provider value={{ 
      user, loading, login, loginWithGoogle, loginWithFacebook, register, 
      logout, updateProfile, changePassword, recoverPassword, 
      uploadProfilePicture, deleteAccount, formKey, setFormKey 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};