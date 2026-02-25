import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import supabase from '../supabaseClient';

/* 
  In Progress:

  Register:
  - media for profile picture,
  - password hashing
  - role table shenanigans

  Login:
  - forgot password
  - Google and Facebook Sign up
  */
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'client' | 'admin';
  contactNumber: string;
  address: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: Omit<User, 'id'> & { password: string }) => Promise<boolean>;
  logout: () => void;
  updateProfile: (userData: Partial<User>) => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  recoverPassword: (email: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Check for stored user on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Login Authentication
  const login = async (email: string, password: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('users')   
      .select('*')
      .eq('email', email)
      .eq('password_hash', password)  
      .single();

    if (error || !data) return false;

    setUser(data);
    localStorage.setItem('currentUser', JSON.stringify(data));
    return true;
  };

  //Register
   const register = async (userData: Omit<User, 'id'> & { password: string }): Promise<boolean> => {
    // Check if email already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', userData.email)
      .single();

    if (existing) return false;

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
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error || !data) return false;

    const newUser: User = {
      id: data.id,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      role: data.role,
      contactNumber: data.phone,
      address: data.address,
    };

    setUser(newUser);
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    return true;
  };

  const recoverPassword = async (email: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('users')
      .select('id')
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

    const { error } = await supabase
      .from('users')
      .update({
        first_name: userData.firstName,
        last_name: userData.lastName,
        phone: userData.contactNumber,
        address: userData.address,
      })
      .eq('id', user.id);

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
      .select('id')
      .eq('id', user.id)
      .eq('password_hash', oldPassword)
      .single();

    if (error || !data) return false;

    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newPassword })
      .eq('id', user.id);

    return !updateError;
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateProfile, changePassword, recoverPassword }}>
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
