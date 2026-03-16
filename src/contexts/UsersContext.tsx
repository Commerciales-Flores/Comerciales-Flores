import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from 'react';
import supabase from '../supabaseClient';
import type { User } from '../data/types';

type UsersPageFilters = {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
};

interface UsersContextType {
  users: User[];
  getUserById: (id: string) => User | undefined;
  refreshUsers: () => Promise<void>;
  fetchUsersPage: (filters: UsersPageFilters) => Promise<{
    data: User[];
    count: number;
  }>;
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

  const fetchUsersPage = useCallback(
  async ({
    page = 1,
    pageSize = 25,
    searchTerm = '',
  }: UsersPageFilters): Promise<{
    data: User[];
    count: number;
  }> => {
    let query = supabase
      .from('users')
      .select(
        'user_id, public_id, role, first_name, last_name, email, phone, address, is_active',
        { count: 'exact' }
      )
      .in('role', ['client', 'customer'])
      .order('created_at', { ascending: false });

    const trimmedSearch = searchTerm.trim();
    if (trimmedSearch) {
      query = query.or(
        [
          `public_id.ilike.%${trimmedSearch}%`,
          `first_name.ilike.%${trimmedSearch}%`,
          `last_name.ilike.%${trimmedSearch}%`,
          `email.ilike.%${trimmedSearch}%`,
          `phone.ilike.%${trimmedSearch}%`,
          `address.ilike.%${trimmedSearch}%`,
        ].join(',')
      );
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query.range(from, to);

    if (error) throw error;

    return {
      data: (data ?? []).map((row: any) => ({
        id: row.user_id,
        publicId: row.public_id,
        role: row.role,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        contactNumber: row.phone,
        address: row.address,
        is_active: row.is_active,
      })),
      count: count ?? 0,
    };
  },
  []
);
  

  useEffect(() => {
    refreshUsers();
  }, []);

  const value = useMemo(
    () => ({
      users,
      getUserById: (id: string) => users.find((u) => u.id === id),
      refreshUsers,
      fetchUsersPage,
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