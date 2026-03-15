import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import supabase from '../supabaseClient';
import type { User } from '../data/types';

interface UsersContextType {
  users: User[];
  getUserById: (id: string) => User | undefined;
  refreshUsers: () => Promise<void>;
}

const UsersContext = createContext<UsersContextType | undefined>(undefined);

export function UsersProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);

  const refreshUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('user_id, public_id, role, first_name, last_name, email, phone, address, is_active');

    if (!error && data) {
      setUsers(
        data.map((row: any) => ({
          id: row.user_id,
          publicId: row.public_id,
          role: row.role,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          contactNumber: row.phone,
          address: row.address,
          is_active: row.is_active,
        }))
      );
    }
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  const value = useMemo(
    () => ({
      users,
      getUserById: (id: string) => users.find((u) => u.id === id),
      refreshUsers,
    }),
    [users]
  );

  return <UsersContext.Provider value={value}>{children}</UsersContext.Provider>;
}

export function useUsers() {
  const context = useContext(UsersContext);
  if (!context) throw new Error('useUsers must be used within UsersProvider');
  return context;
}