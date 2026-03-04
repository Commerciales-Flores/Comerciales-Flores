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
  loading: boolean
  updateProfile: (userData: Partial<User>) => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  recoverPassword: (email: string) => Promise<{ password: string } | null>;
  deleteAccount: (userId: string) => void; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


// Mock users for demo
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

useEffect(() => {
  const onPageShow = (event: PageTransitionEvent) => {
    // 1. Check if the page was restored from the "frozen" cache
    if (event.persisted) {
      console.log("BFCache detected. Forcing a refresh to sync security state...");
      // 2. Force a reload to ensure all React effects (and your alert/logs) run
      window.location.reload();
    }
  };

  window.addEventListener('pageshow', onPageShow);
  return () => window.removeEventListener('pageshow', onPageShow);
}, []);

useEffect(() => {
  const syncSession = () => {
    const storedUser = sessionStorage.getItem('currentUser');
    // Check if the user was actually logged in before this check
    const wasLoggedIn = sessionStorage.getItem('wasLoggedIn') === 'true';
    
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (!storedUser) {
      setUser(null);
      
      // ONLY trigger the system alert if they were logged in and didn't manually logout
      if (wasLoggedIn) {
        // Remove the flag so it doesn't loop or re-fire
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
  };

  syncSession();

  const handlePageShow = (event: PageTransitionEvent) => {
    if (event.persisted) syncSession(); 
  };

  window.addEventListener('pageshow', handlePageShow);
  return () => window.removeEventListener('pageshow', handlePageShow);
}, [showIndicator]);

  // // --- 2. DEPARTURE CLEANUP ---
  // useEffect(() => {
  //   const handleUnload = () => sessionStorage.removeItem('currentUser');
  //   window.addEventListener('pagehide', handleUnload);
  //   return () => window.removeEventListener('pagehide', handleUnload);
  // }, []);

  // --- 3. THE LOGOUT FUNCTION (MEMOIZED) ---
  // Memoizing this prevents the inactivity useEffect from re-running constantly
  const logout = useCallback((message?: string) => {
  setUser((prevUser) => {
    if (prevUser) {
      const email = prevUser.email;
      
      // 1. CLEAR EVERYTHING FIRST
      sessionStorage.removeItem('currentUser');
      sessionStorage.removeItem('wasLoggedIn'); // Critical: prevents syncSession alert
      
      const now = new Date();
      const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const msg = message?.toLowerCase() || "";
      const isSecurity = msg.includes("security") || 
                        msg.includes("expired") || 
                        msg.includes("ended");
      
      showIndicator(
        message ? `${message} at ${time}` : `Logout by ${email} at ${time}`,
        isSecurity ? 'security' : 'logout'
      );
    }
    return null;
  });
}, [showIndicator]);

  // --- 4. INACTIVITY TIMER ---
useEffect(() => {
  // If no user is logged in, don't even start the listeners
  if (!user) return;

  const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes
  let timeoutId: any; // Use any for compatibility

  const resetTimer = () => {
    if (timeoutId) clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
      // Check the ACTUAL storage right before logging out
      const sessionExists = sessionStorage.getItem('currentUser');
      if (sessionExists) {
        logout("Session expired due to inactivity");
      }
    }, INACTIVITY_LIMIT);
  };

  const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
  
  // Start the timer immediately
  resetTimer();

  // Add listeners
  activityEvents.forEach(e => window.addEventListener(e, resetTimer));

  return () => {
    if (timeoutId) clearTimeout(timeoutId);
    activityEvents.forEach(e => window.removeEventListener(e, resetTimer));
  };
  // We include user.id to ensure that if a NEW user logs in, 
  // the effect completely resets.
}, [user?.id, logout]);

  // --- 5. CONDITIONAL RENDER (MUST BE AFTER ALL HOOKS) ---
  if (loading) return null;

  // --- 6. AUTH ACTIONS ---
  const login = async (email: string, password: string) => {
    const foundUser = users.find(u => u.email === email && u.password === password);
    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      sessionStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
      sessionStorage.setItem('wasLoggedIn', 'true'); 
      return true;
    }
    return false;
  };

  const deleteAccount = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    if (user?.id === userId) logout();
  };



  const register = async (userData: Omit<User, 'id' | 'role'> & { password: string }): Promise<boolean> => {
    // Check if email already exists
    if (users.find(u => u.email === userData.email)) {
      return false;
    }

    const newUser = {
      id: Date.now().toString(),
      ...userData,
      role: 'client' as const
    };

    setUsers([...users, newUser]);
    
    const { password: _, ...userWithoutPassword } = newUser;
    setUser(userWithoutPassword);
    sessionStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
    
    return true;
  };

  const recoverPassword = async (email: string): Promise<{ password: string } | null> => {
    // Find the user by email in the original mock data
    const foundUser = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (foundUser) {
      // FOR DEMO ONLY: In a real app, you would NEVER return the password.
      //return { password: foundUser.password };
      return { password: "A reset link has been sent." };
    }
    return null;
  };


  const updateProfile = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
      
      // Update in users array
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

  return (
    <AuthContext.Provider value={{ user, login, register, loading, logout, updateProfile, changePassword, recoverPassword, deleteAccount }}>
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
