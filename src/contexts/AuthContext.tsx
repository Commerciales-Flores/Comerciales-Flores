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
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  // ✅ FIX: Updated register signature to accept profileFile and omit profilePictureUrl
  register: (userData: Omit<User, 'id' | 'is_active' | 'profilePictureUrl'> & { password: string, profileFile?: File | null }) => Promise<boolean>;
  logout: () => void;
  updateProfile: (userData: Partial<User>) => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  recoverPassword: (email: string) => Promise<boolean>;
  uploadProfilePicture: (file: File) => Promise<string | null>; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('users')   
      .select('*')
      .eq('email', email)
      .eq('password_hash', password)  
      .single();

    if (error || !data) return false;

    const loggedInUser: User = {
      id: data.user_id, 
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      role: data.role,
      contactNumber: data.phone,
      address: data.address,
      is_active: data.is_active, 
      profilePictureUrl: data.profile_picture_url, 
    };

    setUser(loggedInUser);
    localStorage.setItem('currentUser', JSON.stringify(loggedInUser));
    return true;
  };

  // ✅ FIX: Register now handles the file upload internally
  const register = async (userData: Omit<User, 'id' | 'is_active' | 'profilePictureUrl'> & { password: string, profileFile?: File | null }): Promise<boolean> => {
    const { data: existing } = await supabase
      .from('users')
      .select('user_id') 
      .eq('email', userData.email)
      .single();

    if (existing) return false;

    let avatarUrl: string | null = null;

    // 1. If a file was provided, upload it first
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
            } else {
                console.error("Avatar upload failed during registration:", uploadError);
            }
        } catch (err) {
            console.error("Avatar upload failed:", err);
        }
    }

    // 2. Insert the new user with the generated avatar URL
    const { data, error } = await supabase
      .from('users')
      .insert([{
        first_name: userData.firstName,
        last_name: userData.lastName,
        email: userData.email,
        password_hash: userData.password,
        role: 'client',
        phone: userData.contactNumber,
        address: userData.address,
        is_active: true,
        profile_picture_url: avatarUrl, // Will be string or null
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error || !data) return false;

    const newUser: User = {
      id: data.user_id, 
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      role: data.role,
      contactNumber: data.phone,
      address: data.address,
      is_active: data.is_active, 
      profilePictureUrl: data.profile_picture_url, 
    };

    setUser(newUser);
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    return true;
  };

  const recoverPassword = async (email: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('users')
      .select('user_id') 
      .eq('email', email)
      .single();

    return !error && !!data;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
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
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    if (!user) return false;

    const { data, error } = await supabase
      .from('users')
      .select('user_id') 
      .eq('user_id', user.id) 
      .eq('password_hash', oldPassword)
      .single();

    if (error || !data) return false;

    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newPassword })
      .eq('user_id', user.id); 

    return !updateError;
  };

  const uploadProfilePicture = async (file: File): Promise<string | null> => {
    if (!user) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

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