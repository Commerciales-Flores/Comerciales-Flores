import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
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

function mapUserRow(row: any): User {
  return {
    id: row.user_id,
    publicId: row.public_id,
    role: row.role,
    firstName: row.first_name ?? '',
    lastName: row.last_name ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    address: row.address ?? '',
    formattedAddress: row.formatted_address ?? undefined,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    isActive: Boolean(row.is_active),
    profilePictureUrl: row.profile_picture_url ?? undefined,
    lastLogin: row.last_login ?? undefined,
    phoneVerified: Boolean(row.phone_verified),
    phoneVerifiedAt: row.phone_verified_at ?? null,
    addressConfirmed: Boolean(row.address_confirmed),
    addressConfirmedAt: row.address_confirmed_at ?? null,
    createdAt: row.created_at ?? undefined,
  };
}

export function UsersProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);

  const refreshUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from('users')
      .select(`
        user_id,
        public_id,
        role,
        first_name,
        last_name,
        email,
        phone,
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
        created_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading users:', error);
      return;
    }

    setUsers((data ?? []).map(mapUserRow));
  }, []);

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
          `
          user_id,
          public_id,
          role,
          first_name,
          last_name,
          email,
          phone,
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
          created_at
          `,
          { count: 'exact' }
        )
        .eq('role', 'client')
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
        data: (data ?? []).map(mapUserRow),
        count: count ?? 0,
      };
    },
    []
  );

  const getUserById = useCallback(
    (id: string) => users.find((u) => u.id === id),
    [users]
  );

  useEffect(() => {
    void refreshUsers();
  }, [refreshUsers]);

  const value = useMemo<UsersContextType>(
    () => ({
      users,
      getUserById,
      refreshUsers,
      fetchUsersPage,
    }),
    [users, getUserById, refreshUsers, fetchUsersPage]
  );

  return <UsersContext.Provider value={value}>{children}</UsersContext.Provider>;
}

export function useUsers() {
  const context = useContext(UsersContext);
  if (!context) {
    throw new Error('useUsers must be used within UsersProvider');
  }
  return context;
}