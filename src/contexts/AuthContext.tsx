import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'client' | 'admin';
  contactNumber: string;
  address: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: Omit<User, 'id' | 'role'> & { password: string }) => Promise<boolean>;
  logout: () => void;
  updateProfile: (userData: Partial<User>) => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  recoverPassword: (email: string) => Promise<{ password: string } | null>;
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

  // Check for stored user on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const foundUser = users.find(u => u.email === email && u.password === password);
    
    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
      return true;
    }
    return false;
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
    localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
    
    return true;
  };

  const recoverPassword = async (email: string): Promise<{ password: string } | null> => {
    // Find the user by email in the original mock data
    const foundUser = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (foundUser) {
      // FOR DEMO ONLY: In a real app, you would NEVER return the password.
      return { password: foundUser.password };
    }
    return null;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  const updateProfile = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      
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
