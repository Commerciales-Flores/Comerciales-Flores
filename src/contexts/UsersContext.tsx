import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import supabase from '../supabaseClient';
import type { User } from '../data/types';
import {
  normalizeName,
  normalizeEmail,
  normalizePHPhone,
  normalizeAddress,
} from '../utils/DataNormalization';

type UsersPageFilters = {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  accountFilter?: 'all' | 'active' | 'inactive';
  deletionFilter?: 'all' | 'pending' | 'approved' | 'rejected' | 'none';
  businessFilter?: 'all' | 'occupied' | 'upcoming' | 'unpaid';
  useExactCount?: boolean;
};

interface UsersContextType {
  users: User[];
  isLoadingUsers: boolean;
  version: number;
  specialUserRequestsCount: number;
  getUserById: (id: string) => User | undefined;
  refreshUsers: (force?: boolean) => Promise<void>;
  fetchUsersPage: (filters: UsersPageFilters) => Promise<{
    data: User[];
    count: number;
  }>;
  updateUserStatus: (id: string, isActive: boolean) => Promise<boolean>;
  clearUsersCache: () => void;
}

const UsersContext = createContext<UsersContextType | undefined>(undefined);

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

function mapUserRow(row: any): User {
  return {
    id: row.user_id,
    publicId: row.public_id,
    role: row.role,
    firstName: normalizeName(row.first_name ?? ''),
    lastName: normalizeName(row.last_name ?? ''),
    email: row.email ? normalizeEmail(row.email) : '',
    phone: normalizePHPhone(row.phone ?? ''),
    address: normalizeAddress(row.address ?? ''),
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

function sortUsersByCreatedAt(items: User[]) {
  return [...items].sort(
    (a, b) =>
      new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
  );
}

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

function buildLatestDeletionRequestMap(rows: any[] | null | undefined) {
  const map = new Map<string, any>();

  for (const row of rows ?? []) {
    if (!map.has(row.user_id)) {
      map.set(row.user_id, row);
    }
  }

  return map;
}

function enrichUserWithDeletionState(user: User, deletionRequest: any | null) {
  return {
    ...user,
    deletionRequested: deletionRequest?.status === 'pending',
    deletionStatus: deletionRequest?.status ?? null,
    deletionRequestReason: deletionRequest?.request_reason ?? null,
  };
}

export function UsersProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [version, setVersion] = useState(0);

  const refreshUsersPromiseRef = useRef<Promise<void> | null>(null);
  const hasLoadedUsersRef = useRef(false);

  const usersPageCacheRef = useRef<Map<string, { data: User[]; count: number }>>(
    new Map()
  );

  const realtimeBumpTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearUsersPageCache = useCallback(() => {
    usersPageCacheRef.current.clear();
  }, []);

  const clearUsersCache = useCallback(() => {
    hasLoadedUsersRef.current = false;
    clearUsersPageCache();
  }, [clearUsersPageCache]);

  const specialUserRequestsCount = useMemo(() => {
    return users.filter((user: any) => user?.deletionStatus === 'pending').length;
  }, [users]);

  const refreshDeletionStateForUser = useCallback(
    async (userId: string) => {
      const { data: deletionRequest, error } = await supabase
        .from('account_deletion_requests')
        .select(`
          user_id,
          status,
          request_reason,
          requested_at
        `)
        .eq('user_id', userId)
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error loading deletion request for user:', error);
        return;
      }

      setUsers((prev) =>
        sortUsersByCreatedAt(
          prev.map((user) =>
            user.id !== userId
              ? user
              : enrichUserWithDeletionState(user, deletionRequest ?? null)
          )
        )
      );

      clearUsersPageCache();
      setVersion((v) => v + 1);
    },
    [clearUsersPageCache]
  );

  const refreshUsers = useCallback(
    async (force = false): Promise<void> => {
      if (!force && hasLoadedUsersRef.current && users.length > 0) {
        return;
      }

      if (refreshUsersPromiseRef.current) {
        return refreshUsersPromiseRef.current;
      }

      const promise = (async () => {
        setIsLoadingUsers(true);

        try {
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
            .eq('role', 'client')
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error loading users:', error);
            setUsers([]);
            hasLoadedUsersRef.current = false;
            return;
          }

          const rows = data ?? [];
          const userIds = rows.map((row) => row.user_id);

          const { data: deletionRequests, error: deletionError } = userIds.length
            ? await supabase
                .from('account_deletion_requests')
                .select(`
                  user_id,
                  status,
                  request_reason,
                  requested_at
                `)
                .in('user_id', userIds)
                .order('requested_at', { ascending: false })
            : { data: [], error: null };

          if (deletionError) {
            console.error('Error loading deletion requests:', deletionError);
          }

          const deletionRequestMap = buildLatestDeletionRequestMap(deletionRequests);

          const nextUsers = rows.map((row) => {
            const mapped = mapUserRow(row);
            const deletionRequest = deletionRequestMap.get(row.user_id) ?? null;
            return enrichUserWithDeletionState(mapped, deletionRequest);
          });

          setUsers(sortUsersByCreatedAt(nextUsers));
          hasLoadedUsersRef.current = true;
        } finally {
          setIsLoadingUsers(false);
          refreshUsersPromiseRef.current = null;
        }
      })();

      refreshUsersPromiseRef.current = promise;
      return promise;
    },
    [users.length]
  );

  const bumpVersionDebounced = useCallback(() => {
    if (realtimeBumpTimeoutRef.current) {
      clearTimeout(realtimeBumpTimeoutRef.current);
    }

    realtimeBumpTimeoutRef.current = setTimeout(() => {
      clearUsersCache();
      setVersion((v) => v + 1);
      realtimeBumpTimeoutRef.current = null;
    }, 200);
  }, [clearUsersCache]);

  const fetchUsersPage = useCallback(
  async ({
    page = 1,
    pageSize = 25,
    searchTerm = '',
    accountFilter = 'all',
    deletionFilter = 'all',
    businessFilter = 'all',
    useExactCount = false,
  }: UsersPageFilters) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const cacheKey = JSON.stringify({
      page,
      pageSize,
      search: normalizedSearch,
      accountFilter,
      deletionFilter,
      businessFilter,
      useExactCount,
    });

    const cached = usersPageCacheRef.current.get(cacheKey);
    if (cached) {
      return cached;
    }

    let query = supabase
      .from('admin_customer_overview')
      .select(
        '*',
        useExactCount ? { count: 'exact' } : { count: 'planned' }
      )
      .order('created_at', { ascending: false });

    if (normalizedSearch) {
      query = query.or(
        [
          `public_id.ilike.%${normalizedSearch}%`,
          `first_name.ilike.%${normalizedSearch}%`,
          `last_name.ilike.%${normalizedSearch}%`,
          `email.ilike.%${normalizedSearch}%`,
          `phone.ilike.%${normalizedSearch}%`,
          `address.ilike.%${normalizedSearch}%`,
        ].join(',')
      );
    }

    if (accountFilter === 'active') {
      query = query.eq('is_active', true);
    } else if (accountFilter === 'inactive') {
      query = query.eq('is_active', false);
    }

    if (deletionFilter === 'pending') {
      query = query.eq('deletion_status', 'pending');
    } else if (deletionFilter === 'approved') {
      query = query.eq('deletion_status', 'approved');
    } else if (deletionFilter === 'rejected') {
      query = query.eq('deletion_status', 'rejected');
    } else if (deletionFilter === 'none') {
      query = query.is('deletion_status', null);
    }

    if (businessFilter === 'occupied') {
      query = query.eq('has_active_occupancy', true);
    } else if (businessFilter === 'upcoming') {
      query = query.eq('has_upcoming_reservation', true);
    } else if (businessFilter === 'unpaid') {
      query = query.eq('has_unpaid_balance', true);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query.range(from, to);

    if (error) throw error;

    const mapped = (data ?? []).map((row) => ({
      ...mapUserRow(row),
      hasActiveOccupancy: row.has_active_occupancy,
      activeUnitName: row.active_unit_name ?? null,
      activeUnitType: row.active_unit_type,
      activeSince: row.active_since,
      hasUpcomingReservation: row.has_upcoming_reservation ?? false,
      hasUnpaidBalance: row.has_unpaid_balance ?? false,
      deletionStatus: row.deletion_status,
      deletionRequestReason: row.deletion_request_reason,
      deletionRequested: row.deletion_status === 'pending',
      deactivationBlocked: false,
      deactivationReason: null,
    }));

    const result = {
      data: mapped,
      count: count ?? 0,
    };

    if (!usersPageCacheRef.current.has(cacheKey) && usersPageCacheRef.current.size >= 50) {
      const oldestKey = usersPageCacheRef.current.keys().next().value;
      if (oldestKey) {
        usersPageCacheRef.current.delete(oldestKey);
      }
    }

    usersPageCacheRef.current.set(cacheKey, result);
    return result;
  },
  []
);

  const updateUserStatus = useCallback(
    async (id: string, isActive: boolean) => {
      if (!isActive) {
        const [{ data: userRow, error: userError }, { data: activeReservation, error: reservationError }] =
          await Promise.all([
            supabase
              .from('users')
              .select('last_login')
              .eq('user_id', id)
              .maybeSingle(),
            supabase
              .from('reservations')
              .select('reservation_id')
              .eq('user_id', id)
              .in('status', ['approved', 'confirmed'])
              .limit(1)
              .maybeSingle(),
          ]);

        if (userError) {
          console.error('Error checking user activity:', userError);
          return false;
        }

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
        prev.map((user) => (user.id === id ? { ...user, isActive } : user))
      );

      hasLoadedUsersRef.current = false;
      clearUsersPageCache();

      return true;
    },
    [clearUsersPageCache]
  );

  const getUserById = useCallback(
    (id: string) => users.find((user) => user.id === id),
    [users]
  );

  useEffect(() => {
    const channel = supabase
      .channel('admin-users-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
        },
        () => {
          bumpVersionDebounced();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
        },
        (payload) => {
          const nextRow = payload.new as any;
          const oldRow = payload.old as any;

          const nextStatus = nextRow?.status;
          const oldStatus = oldRow?.status;
          const nextUserId = nextRow?.user_id;
          const oldUserId = oldRow?.user_id;

          if (
            payload.eventType === 'INSERT' ||
            payload.eventType === 'DELETE' ||
            nextStatus !== oldStatus ||
            nextUserId !== oldUserId
          ) {
            bumpVersionDebounced();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'account_deletion_requests',
        },
        async (payload) => {
          const nextRow = payload.new as { user_id?: string } | null;
          const oldRow = payload.old as { user_id?: string } | null;
          const userId = nextRow?.user_id ?? oldRow?.user_id;

          if (!userId) return;

          await refreshDeletionStateForUser(userId);
        }
      )
      .subscribe((status) => {
        if (import.meta.env.DEV) {
          console.log('admin-users-realtime:', status);
        }
      });

    return () => {
      if (realtimeBumpTimeoutRef.current) {
        clearTimeout(realtimeBumpTimeoutRef.current);
        realtimeBumpTimeoutRef.current = null;
      }

      void supabase.removeChannel(channel);
    };
  }, [bumpVersionDebounced, refreshDeletionStateForUser]);

  const value = useMemo<UsersContextType>(
    () => ({
      users,
      isLoadingUsers,
      version,
      specialUserRequestsCount,
      getUserById,
      refreshUsers,
      fetchUsersPage,
      updateUserStatus,
      clearUsersCache,
    }),
    [
      users,
      isLoadingUsers,
      version,
      specialUserRequestsCount,
      getUserById,
      refreshUsers,
      fetchUsersPage,
      updateUserStatus,
      clearUsersCache,
    ]
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