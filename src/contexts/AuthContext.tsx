import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useIndicator } from './IndicatorContext';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'client' | 'admin';
  contactNumber: string;
  address: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: Omit<User, 'id' | 'role'> & { password: string }) => Promise<boolean>;
  logout: (message?: string) => void;
  loading: boolean;
  updateProfile: (userData: Partial<User>) => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  recoverPassword: (email: string) => Promise<{ password: string } | null>;
  deleteAccount: (userId: string) => void; 
  formKey: number; // <-- Add formKey to context
  setFormKey: React.Dispatch<React.SetStateAction<number>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'currentUser';
const MOCK_USERS = [
  {
    id: '1',
    email: 'admin@flores.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin' as const,
    contactNumber: '+63 917 123 4567',
    address: 'Manila, Philippines'
  },
  {
    id: '2',
    email: 'client@example.com',
    password: 'client123',
    name: 'John Doe',
    role: 'client' as const,
    contactNumber: '+63 918 765 4321',
    address: 'Quezon City, Philippines'
  }
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState(MOCK_USERS);
  const [loading, setLoading] = useState(true);
  const { showIndicator } = useIndicator();
  const [formKey, setFormKey] = useState(0);

  // --- 1. SESSION SYNC & SECURITY LOGIC ---
  const syncSession = useCallback(() => {
    const storedUser = sessionStorage.getItem(STORAGE_KEY);
    const wasLoggedIn = sessionStorage.getItem('wasLoggedIn') === 'true';
    
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (!storedUser) {
      setUser(null);
      // Only alert if the session disappeared unexpectedly (e.g. storage cleared)
      if (wasLoggedIn) {
        sessionStorage.removeItem('wasLoggedIn');
        setTimeout(() => {
          showIndicator(`SYSTEM ALERT: Session ended at ${time}`, 'security');
        }, 500);
      }
    } else {
      setUser(JSON.parse(storedUser));
      sessionStorage.setItem('wasLoggedIn', 'true');
    }
    setLoading(false);
  }, [showIndicator]);

  useEffect(() => {
    syncSession();

    // Cross-tab sync: If user logs out in another tab, logout here too
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && !event.newValue) {
        setUser(null);
        sessionStorage.removeItem('wasLoggedIn');
      }
    };

    // BFCache Protection: Force reload if page is restored from "frozen" state
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload();
      } else {
        syncSession();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('pageshow', handlePageShow);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [syncSession]);

  // --- 2. LOGOUT FUNCTION ---
  const logout = useCallback((message?: string) => {
    setUser((prevUser) => {
      if (prevUser) {
        const email = prevUser.email;
        
        // Clear storage immediately to prevent syncSession collisions
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem('wasLoggedIn');
        
        const now = new Date();
        const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const msg = message?.toLowerCase() || "";
        const isSecurity = msg.includes("security") || msg.includes("expired") || msg.includes("ended");
        
        showIndicator(
          message ? `${message} at ${time}` : `Logout by ${email} at ${time}`,
          isSecurity ? 'security' : 'logout'
        );
      }
      setFormKey((k) => k + 1);
      return null;
    });
  }, [showIndicator]);

  // --- 3. INACTIVITY TIMER ---
  useEffect(() => {
    if (!user) return;

    const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes
    let timeoutId: any;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (sessionStorage.getItem(STORAGE_KEY)) {
          logout("Session expired due to inactivity");
        }
      }, INACTIVITY_LIMIT);
    };

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    resetTimer();
    activityEvents.forEach(e => window.addEventListener(e, resetTimer));

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [user?.id, logout]);

  // --- 4. AUTH ACTIONS ---
  const login = async (email: string, password: string) => {
    const foundUser = users.find(u => u.email === email && u.password === password);
    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(userWithoutPassword));
      sessionStorage.setItem('wasLoggedIn', 'true'); 
      return true;
    }
    return false;
  };

  const register = async (userData: Omit<User, 'id' | 'role'> & { password: string }): Promise<boolean> => {
    if (users.find(u => u.email === userData.email)) return false;

    const newUser = {
      id: Date.now().toString(),
      ...userData,
      role: 'client' as const
    };

    setUsers(prev => [...prev, newUser]);
    const { password: _, ...userWithoutPassword } = newUser;
    setUser(userWithoutPassword);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(userWithoutPassword));
    sessionStorage.setItem('wasLoggedIn', 'true');
    return true;
  };

  const updateProfile = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
      setUsers(users.map(u => u.id === updatedUser.id ? { ...u, ...userData } : u));
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    if (!user) return false;
    const foundUser = users.find(u => u.id === user.id && u.password === oldPassword);
    if (foundUser) {
      setUsers(users.map(u => u.id === user.id ? { ...u, password: newPassword } : u));
      return true;
    }
    return false;
  };

  const recoverPassword = async (email: string): Promise<{ password: string } | null> => {
    const foundUser = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    return foundUser ? { password: "A reset link has been sent." } : null;
  };

  const deleteAccount = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    if (user?.id === userId) logout();
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, login, register, setFormKey, formKey, loading, logout, updateProfile, changePassword, recoverPassword, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}