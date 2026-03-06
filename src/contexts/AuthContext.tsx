import { createContext, useContext, useState, type ReactNode, useEffect } from 'react';
import supabase from '../supabaseClient';

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
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<void>; 
  loginWithFacebook: () => Promise<void>; // ✅ Added Facebook Login
  register: (userData: Omit<User, 'id' | 'is_active' | 'profilePictureUrl'> & { password: string, profileFile?: File | null }) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  recoverPassword: (email: string) => Promise<boolean>;
  uploadProfilePicture: (file: File) => Promise<string | null>; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchAndSetUserProfile(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchAndSetUserProfile(session.user);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchAndSetUserProfile = async (authUser: any) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', authUser.id)
      .single();

    if (data && !error) {
      setUser({
        id: data.user_id,
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        role: data.role,
        contactNumber: data.phone,
        address: data.address,
        is_active: data.is_active, 
        profilePictureUrl: data.profile_picture_url, 
        lastLogin: data.last_login,
      });
    } else if (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error("Login failed:", error.message);
      return false;
    }

    if (data.user) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('user_id', data.user.id);

      if (updateError) {
        console.error("Failed to update last_login timestamp:", updateError.message);
      }
    }

    return true;
  };

  // ✅ Google OAuth
  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/login`, 
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error("Google Auth failed:", error.message);
    }
  };

  // ✅ Facebook OAuth
  const loginWithFacebook = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `${window.location.origin}/login`, 
      },
    });

    if (error) {
      console.error("Facebook Auth failed:", error.message);
    }
  };

  const register = async (userData: Omit<User, 'id' | 'is_active' | 'profilePictureUrl'> & { password: string, profileFile?: File | null }): Promise<boolean> => {
    let avatarUrl: string | null = null;

    if (userData.profileFile) {
      try {
        const fileExt = userData.profileFile.name.split('.').pop();
        const fileName = `new-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, userData.profileFile);

        if (!uploadError) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
          avatarUrl = data.publicUrl;
        }
      } catch (err) {
        console.error("Avatar upload failed:", err);
      }
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName,
        }
      }
    });

    if (authError || !authData.user) {
      console.error("Auth registration failed:", authError?.message);
      return false;
    }

    const dbPayload: any = {};
    if (userData.contactNumber) dbPayload.phone = userData.contactNumber;
    if (userData.address) dbPayload.address = userData.address;
    if (avatarUrl) dbPayload.profile_picture_url = avatarUrl;

    if (Object.keys(dbPayload).length > 0) {
      const { error: updateError } = await supabase
        .from('users')
        .update(dbPayload)
        .eq('user_id', authData.user.id);

      if (updateError) {
        console.error("Failed to append extra profile details:", updateError.message);
      }
    }

    return true;
  };

  const recoverPassword = async (email: string): Promise<boolean> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) {
      console.error("Password recovery failed:", error.message);
      return false;
    }
    return true;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Logout error:", error.message);
    setUser(null);
  };

  const updateProfile = async (userData: Partial<User>) => {
    if (!user) return;

    const dbPayload: any = {};
    if (userData.firstName !== undefined) dbPayload.first_name = userData.firstName;
    if (userData.lastName !== undefined) dbPayload.last_name = userData.lastName;
    if (userData.contactNumber !== undefined) dbPayload.phone = userData.contactNumber;
    if (userData.address !== undefined) dbPayload.address = userData.address;
    if (userData.profilePictureUrl !== undefined) dbPayload.profile_picture_url = userData.profilePictureUrl;

    const { error } = await supabase
      .from('users')
      .update(dbPayload)
      .eq('user_id', user.id); 

    if (!error) {
      setUser({ ...user, ...userData });
    } else {
      console.error("Failed to update profile:", error.message);
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    if (!user) return false;
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return false;
    return true;
  };

  const uploadProfilePicture = async (file: File): Promise<string | null> => {
    if (!user) return null;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ 
        user, 
        login, 
        loginWithGoogle,
        loginWithFacebook,
        register, 
        logout, 
        updateProfile, 
        changePassword, 
        recoverPassword,
        uploadProfilePicture
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}