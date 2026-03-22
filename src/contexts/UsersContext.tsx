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
  updateUserStatus: (id: string, isActive: boolean) => Promise<boolean>;
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

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

function parseLastLogin(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDeactivationRuleState(params: {
  hasActiveReservation: boolean;
  lastLogin?: string | null;
}) {
  const { hasActiveReservation, lastLogin } = params;

  if (hasActiveReservation) {
    return {
      blocked: true,
      reason:
        'This customer cannot be deactivated because they have an active reservation or ongoing occupancy.',
    };
  }

  const parsedLastLogin = parseLastLogin(lastLogin);
  const isRecentlyActive =
    parsedLastLogin && Date.now() - parsedLastLogin.getTime() < THIRTY_DAYS;

  if (isRecentlyActive) {
    return {
      blocked: true,
      reason:
        'This customer cannot be deactivated because the account has recent login activity.',
    };
  }

  return {
    blocked: false,
    reason: null as string | null,
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

      // Fetch active reservations
      const { data: reservations } = await supabase
        .from('reservations')
        .select(`
          user_id,
          unit_id,
          unit_type,
          start_date,
          status
        `)
        .in('status', ['approved', 'confirmed']);

      // Fetch deletion requests
      const { data: deletionRequests } = await supabase
        .from('account_deletion_requests')
        .select(`
          user_id,
          status,
          request_reason
        `);

      if (error) throw error;

      const usersMapped = (data ?? []).map(mapUserRow);

        const enriched = usersMapped.map((user) => {
        const userReservations =
          reservations?.filter((r) => r.user_id === user.id) ?? [];

        const activeReservation = userReservations.find((r) =>
          ['approved', 'confirmed'].includes(r.status)
        );

        const deletionRequest =
          deletionRequests?.find((d) => d.user_id === user.id) ?? null;

        const deactivationState = getDeactivationRuleState({
          hasActiveReservation: !!activeReservation,
          lastLogin: user.lastLogin ?? null,
        });

        return {
          ...user,
          hasActiveOccupancy: !!activeReservation,
          activeUnitType: activeReservation?.unit_type ?? null,
          activeSince: activeReservation?.start_date ?? null,

          // 🔥 NEW
          deletionRequested: !!deletionRequest,
          deletionStatus: deletionRequest?.status ?? null,
          deletionRequestReason: deletionRequest?.request_reason ?? null,

          deactivationBlocked: deactivationState.blocked,
          deactivationReason: deactivationState.reason,
        };
      });

      return {
        data: enriched,
        count: count ?? 0,
      };
    },
    []
  );

  

const updateUserStatus = useCallback(async (id: string, isActive: boolean) => {
  if (!isActive) {
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('last_login')
      .eq('user_id', id)
      .maybeSingle();

    if (userError) {
      console.error('Error checking user activity:', userError);
      return false;
    }

    const { data: activeReservation, error: reservationError } = await supabase
      .from('reservations')
      .select('reservation_id')
      .eq('user_id', id)
      .in('status', ['approved', 'confirmed'])
      .limit(1)
      .maybeSingle();

    if (reservationError) {
      console.error('Error checking active reservation:', reservationError);
      return false;
    }

    const deactivationState = getDeactivationRuleState({
      hasActiveReservation: !!activeReservation,
      lastLogin: userRow?.last_login ?? null,
    });

    if (deactivationState.blocked) {
      console.warn(
        'Cannot deactivate user:',
        deactivationState.reason ?? 'deactivation rule blocked'
      );
      return false;
    }
  }

  const { error } = await supabase
    .from('users')
    .update({ is_active: isActive })
    .eq('user_id', id);

  if (error) {
    console.error('Error updating user status:', error);
    return false;
  }

  setUsers((prev) =>
    prev.map((u) => (u.id === id ? { ...u, isActive } : u))
  );

  return true;
}, []);

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
      updateUserStatus,
    }),
    [users, getUserById, refreshUsers, fetchUsersPage, updateUserStatus]
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