import { useState, useMemo, useEffect, useCallback, type KeyboardEvent } from 'react';
import { useUsers } from '../../contexts/UsersContext';
import { useAuth } from '../../contexts/AuthContext';
import type { UnitType } from '../../data/types';
import supabase from '../../supabaseClient';
import { useNotifications } from '../../contexts/NotificationContext';
import {
  Search,
  Eye,
  Plus,
  X,
  UserX,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Hash,
  RotateCcw,
  AlertTriangle,
  EyeOff,
  Inbox,
  Filter,
  Clock3,
  Briefcase,
  CalendarDays,
  Wallet,
  Download,
} from 'lucide-react';
import { motion } from 'framer-motion';
import EmptyState from '../../components/common/EmptyState';

type CustomerRow = {
  id: string;
  publicId?: string;
  firstName: string;
  lastName: string;
  email: string;
  contactNumber?: string;
  address?: string;
  is_active?: boolean;
  lastLogin?: string | null;

  hasActiveOccupancy?: boolean;
  activeUnitName?: string | null;
  activeUnitType?: UnitType | null;
  activeSince?: string | null;

  hasUpcomingBooking?: boolean;
  hasUnpaidBalance?: boolean;

  deactivationBlocked?: boolean;
  deactivationReason?: string | null;

  deletionRequested?: boolean;
  deletionStatus?: 'pending' | 'approved' | 'rejected' | null;
  deletionRequestReason?: string | null;

  initials: string;
  searchableText: string;
};

type NewCustomerForm = {
  first_name: string;
  last_name: string;
  email: string;
  contactNumber: string;
  address: string;
  password: string;
  role: 'client';
  is_active: boolean;
};

const INITIAL_CUSTOMER_FORM: NewCustomerForm = {
  first_name: '',
  last_name: '',
  email: '',
  contactNumber: '',
  address: '',
  password: '',
  role: 'client',
  is_active: true,
};

function useDebouncedValue<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function getPasswordScore(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

function getPasswordStrengthLabel(score: number) {
  switch (score) {
    case 0:
    case 1:
      return 'Very Weak';
    case 2:
      return 'Weak';
    case 3:
      return 'Medium';
    case 4:
      return 'Strong';
    default:
      return '';
  }
}

function formatLastLogin(value?: string | null) {
  if (!value) return 'No login yet';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No login yet';

  return date.toLocaleString();
}

function formatUnitTypeLabel(value?: UnitType | null) {
  switch (value) {
    case 'rental_space':
      return 'Rental Space';
    case 'function_hall':
      return 'Function Hall';
    case 'parking_slot':
      return 'Parking Slot';
    default:
      return 'Unknown';
  }
}

function getDeactivationReason(target?: Pick<CustomerRow, 'deactivationReason'> | null) {
  return (
    target?.deactivationReason ??
    'This customer cannot be deactivated due to current business status or recent account activity.'
  );
}

function NoCustomerResults() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center justify-center text-center"
    >
      <div className="mb-4 rounded-3xl bg-gray-50 p-5 shadow-sm">
        <Filter className="size-10 text-gray-400" />
      </div>
      <h3 className="text-lg font-bold text-gray-900">No matching customers found</h3>
      <p className="mt-1 max-w-sm text-sm text-gray-500">
        Try adjusting your search by name, email, user ID, or activity status.
      </p>
    </motion.div>
  );
}

function CustomerDetailItem({
  icon,
  label,
  value,
}: {
  icon: JSX.Element;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl bg-gray-50 p-4">
      <div className="rounded-lg bg-white p-2 text-blue-600 shadow-sm">{icon}</div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
        <p className="text-sm font-bold leading-relaxed text-gray-800">{value || '—'}</p>
      </div>
    </div>
  );
}

function mapUserToCustomerRow(u: any): CustomerRow {
  const first = u.firstName ?? '';
  const last = u.lastName ?? '';
  const publicId = u.publicId ?? u.id;
  const contact = u.phone ?? '';
  const address = u.address ?? '';
  const email = u.email ?? '';

  return {
    id: u.id,
    publicId: u.publicId,
    firstName: first,
    lastName: last,
    email,
    contactNumber: contact,
    address,
    is_active: u.isActive,
    lastLogin: u.lastLogin ?? null,

    hasActiveOccupancy: u.hasActiveOccupancy ?? false,
    activeUnitName: u.activeUnitName ?? null,
    activeUnitType: u.activeUnitType ?? null,
    activeSince: u.activeSince ?? null,

    hasUpcomingBooking: u.hasUpcomingReservation ?? false,
    hasUnpaidBalance: u.hasUnpaidBalance ?? false,

    deactivationBlocked: u.deactivationBlocked ?? false,
    deactivationReason: u.deactivationReason ?? null,

    deletionRequested: u.deletionRequested ?? false,
    deletionStatus: u.deletionStatus ?? null,
    deletionRequestReason: u.deletionRequestReason ?? null,

    initials: `${first[0] ?? ''}${last[0] ?? ''}`,
    searchableText: [
      first,
      last,
      email,
      publicId,
      contact,
      address,
      u.activeUnitName ?? '',
      u.activeUnitType ?? '',
      u.deletionStatus ?? '',
      u.deletionRequestReason ?? '',
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
  };
}

export default function AdminCustomers() {
  const { fetchUsersPage, updateUserStatus } = useUsers();
  const { user } = useAuth();

  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [newCustomer, setNewCustomer] = useState<NewCustomerForm>(INITIAL_CUSTOMER_FORM);

  const debouncedSearchTerm = useDebouncedValue(searchTerm, 250);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const [pageInput, setPageInput] = useState('1');

  const { sendDeletionStatusNotification } = useNotifications();

  const customer = useMemo(
    () => (selectedCustomer ? rows.find((c) => c.id === selectedCustomer) ?? null : null),
    [rows, selectedCustomer]
  );

  const confirmTarget = useMemo(
    () => (confirmDeactivateId ? rows.find((r) => r.id === confirmDeactivateId) ?? null : null),
    [rows, confirmDeactivateId]
  );

  const hasNoCustomers = !loading && totalCount === 0;
  const hasNoSearchResults = !loading && totalCount > 0 && rows.length === 0;

  const passwordScore = useMemo(
    () => getPasswordScore(newCustomer.password),
    [newCustomer.password]
  );

  const passwordStrength = useMemo(
    () => getPasswordStrengthLabel(passwordScore),
    [passwordScore]
  );

  const [restrictionModal, setRestrictionModal] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const openRestrictionModal = useCallback((message: string) => {
    setRestrictionModal({
      title: 'Deactivation Restricted',
      message,
    });
  }, []);

  const canSubmitNewCustomer = useMemo(() => {
    return (
      newCustomer.first_name.trim() !== '' &&
      newCustomer.email.trim() !== '' &&
      newCustomer.password.trim() !== ''
    );
  }, [newCustomer.first_name, newCustomer.email, newCustomer.password]);

  const handlePageJump = useCallback(() => {
    const parsed = parseInt(pageInput, 10);

    if (Number.isNaN(parsed)) {
      setPageInput(String(page));
      return;
    }

    const nextPage = Math.min(Math.max(parsed, 1), totalPages);
    setPage(nextPage);
    setPageInput(String(nextPage));
  }, [pageInput, page, totalPages]);

  const handlePageInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handlePageJump();
      }
    },
    [handlePageJump]
  );

  const requestDeactivate = useCallback((target: CustomerRow | null) => {
    if (!target) return;
    if (!(target.is_active ?? true)) return;

    if (target.deactivationBlocked) {
      setConfirmDeactivateId(null);
      openRestrictionModal(getDeactivationReason(target));
      return;
    }

    setConfirmDeactivateId(target.id);
  }, []);

  const closeDeactivateModal = useCallback(() => {
    setConfirmDeactivateId(null);
  }, []);

  const closeCustomerModal = useCallback(() => {
    setSelectedCustomer(null);
    setConfirmDeactivateId(null);
  }, []);

  const closeAddModal = useCallback(() => {
    setShowAddModal(false);
    setShowPassword(false);
  }, []);

  const updateNewCustomerField = useCallback(
    <K extends keyof NewCustomerForm>(key: K, value: NewCustomerForm[K]) => {
      setNewCustomer((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleAddCustomer = useCallback(async () => {
    if (!canSubmitNewCustomer) return;

    setShowAddModal(false);
    setNewCustomer(INITIAL_CUSTOMER_FORM);
    setShowPassword(false);
  }, [canSubmitNewCustomer]);

  const reloadUsers = useCallback(async () => {
    const result = await fetchUsersPage({
      page,
      pageSize,
      searchTerm: debouncedSearchTerm,
    });

    setRows(result.data.map(mapUserToCustomerRow));
    setTotalCount(result.count);
  }, [fetchUsersPage, page, pageSize, debouncedSearchTerm]);

  const toggleStatus = useCallback(
    async (id: string, status: boolean) => {
      try {
        const success = await updateUserStatus(id, status);

        if (!success) {
          const target = rows.find((row) => row.id === id) ?? confirmTarget ?? null;
          setConfirmDeactivateId(null);
          openRestrictionModal(getDeactivationReason(target));
          return;
        }

        setRows((prev) =>
          prev.map((row) => (row.id === id ? { ...row, is_active: status } : row))
        );

        await reloadUsers();
        setConfirmDeactivateId(null);

        if (!status && selectedCustomer === id) {
          setSelectedCustomer(null);
        }
      } catch (error) {
        console.error('Failed to update user status:', error);
        setConfirmDeactivateId(null);
      }
    },
    [updateUserStatus, rows, confirmTarget, reloadUsers, selectedCustomer]
  );

  const handleApproveDeletion = useCallback(async (target: CustomerRow | null) => {
  if (!target) return;

  try {
    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: { userId: target.id },
    });

    if (error || !data?.success) {
      setRestrictionModal({
        title: 'Deletion Failed',
        message: data?.reason || 'Failed to permanently delete this customer account.',
      });
      return;
    }

    await sendDeletionStatusNotification({
      userId: target.id,
      status: 'approved',
    });

    await reloadUsers();
    setSelectedCustomer(null);
    setRestrictionModal({
      title: 'Deletion Completed',
      message: 'The customer account has been permanently deleted.',
    });
  } catch (error) {
    console.error('Failed to approve deletion:', error);
    setRestrictionModal({
      title: 'Deletion Failed',
      message: 'An unexpected error occurred while deleting this account.',
    });
  }
}, [reloadUsers]);

const handleRejectDeletion = useCallback(async (target: CustomerRow | null) => {
  if (!target) return;

  try {
    const { error } = await supabase
      .from('account_deletion_requests')
      .update({
        status: 'rejected',
        admin_note: 'Deletion request was rejected after admin review.',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id ?? null,
      })
      .eq('user_id', target.id)
      .eq('status', 'pending');

    if (error) {
      console.error('Failed to reject deletion request:', error);
      setRestrictionModal({
        title: 'Update Failed',
        message: 'Failed to reject the deletion request.',
      });
      return;
    }

    await sendDeletionStatusNotification({
      userId: target.id,
      status: 'rejected',
    });

    await reloadUsers();
    setRestrictionModal({
      title: 'Request Rejected',
      message: 'The account deletion request has been rejected.',
    });
  } catch (error) {
    console.error('Failed to reject deletion request:', error);
    setRestrictionModal({
      title: 'Update Failed',
      message: 'An unexpected error occurred while rejecting the request.',
    });
  }
}, [reloadUsers]);

const handleExportCustomer = useCallback(async (target: CustomerRow | null) => {
  if (!target) return;

  try {
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', target.id)
      .maybeSingle();

    if (profileError) {
      console.error('Failed to fetch customer profile for export:', profileError);
      setRestrictionModal({
        title: 'Export Failed',
        message: 'Failed to load customer profile for export.',
      });
      return;
    }

    const { data: reservations, error: reservationsError } = await supabase
      .from('reservations')
      .select('*')
      .eq('user_id', target.id)
      .order('created_at', { ascending: false });

    if (reservationsError) {
      console.error('Failed to fetch reservations for export:', reservationsError);
      setRestrictionModal({
        title: 'Export Failed',
        message: 'Failed to load reservation history for export.',
      });
      return;
    }

    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', target.id)
      .order('date', { ascending: false });

    if (paymentsError) {
      console.error('Failed to fetch payments for export:', paymentsError);
      setRestrictionModal({
        title: 'Export Failed',
        message: 'Failed to load payment history for export.',
      });
      return;
    }

    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_id', target.id)
      .order('date', { ascending: false });

    if (reviewsError) {
      console.error('Failed to fetch reviews for export:', reviewsError);
    }

    const exportPayload = {
      exported_at: new Date().toISOString(),
      exported_by_admin_id: user?.id ?? null,
      customer: {
        id: target.id,
        publicId: target.publicId ?? null,
        firstName: target.firstName,
        lastName: target.lastName,
        email: target.email,
        contactNumber: target.contactNumber ?? null,
        address: target.address ?? null,
        isActive: target.is_active ?? true,
        lastLogin: target.lastLogin ?? null,
        deletionStatus: target.deletionStatus ?? null,
        deletionRequestReason: target.deletionRequestReason ?? null,
      },
      profile,
      reservations: reservations ?? [],
      payments: payments ?? [],
      reviews: reviews ?? [],
      summary: {
        reservationCount: reservations?.length ?? 0,
        paymentCount: payments?.length ?? 0,
        reviewCount: reviews?.length ?? 0,
        verifiedPaymentTotal:
          payments
            ?.filter((payment) => payment.status === 'verified')
            .reduce((sum, payment) => sum + Number(payment.amount || 0), 0) ?? 0,
      },
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = `${target.firstName}_${target.lastName}`.replace(/\s+/g, '_');
    const safePublicId = (target.publicId ?? target.id).replace(/[^a-zA-Z0-9_-]/g, '_');

    link.href = url;
    link.download = `customer_export_${safeName}_${safePublicId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setRestrictionModal({
      title: 'Export Ready',
      message: 'Customer record has been downloaded as JSON.',
    });
  } catch (error) {
    console.error('Failed to export customer data:', error);
    setRestrictionModal({
      title: 'Export Failed',
      message: 'An unexpected error occurred while exporting customer data.',
    });
  }
}, [user?.id]);

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    let cancelled = false;

    const loadUsers = async () => {
      setLoading(true);

      try {
        const result = await fetchUsersPage({
          page,
          pageSize,
          searchTerm: debouncedSearchTerm,
        });

        if (cancelled) return;

        setRows(result.data.map(mapUserToCustomerRow));
        setTotalCount(result.count);
      } catch (error) {
        console.error('Failed to load users page:', error);

        if (!cancelled) {
          setRows([]);
          setTotalCount(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [fetchUsersPage, page, pageSize, debouncedSearchTerm]);

  useEffect(() => {
    if (!confirmDeactivateId) return;

    if (!confirmTarget || confirmTarget.deactivationBlocked || !(confirmTarget.is_active ?? true)) {
      setConfirmDeactivateId(null);
    }
  }, [confirmDeactivateId, confirmTarget]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Customer Management
            </h1>
            <p className="text-sm text-gray-500">
              Monitor account status, recent activity, and business engagement.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="hidden cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-100 transition-all active:scale-95 hover:bg-blue-700 lg:flex"
          >
            <Plus className="size-5" /> Add Customer
          </button>
        </div>

        {!loading && !hasNoCustomers && (
          <div className="sticky top-0 z-20 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, ID, or business status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border-none bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:hidden">
          {loading ? (
            <EmptyState
              icon={
                <div className="flex items-center justify-center">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                </div>
              }
              title="Loading customers..."
              description="Please wait while customer records are being retrieved."
            />
          ) : hasNoCustomers ? (
            <EmptyState
              icon={<Inbox className="size-10 text-blue-500" />}
              title="No active customers yet"
              description="Customer accounts will appear here once users register or are added by an administrator."
            />
          ) : hasNoSearchResults ? (
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 shadow-sm">
              <NoCustomerResults />
            </div>
          ) : (
            rows.map((c) => (
              <div
                key={c.id}
                className="flex cursor-pointer items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-colors active:bg-gray-50"
                onClick={() => setSelectedCustomer(c.id)}
              >
                <div className="min-w-0 flex items-center gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-lg font-bold text-blue-700">
                    {c.initials}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-bold leading-tight text-gray-900">
                      {c.firstName} {c.lastName}
                    </p>
                    <p className="mt-0.5 text-[10px] font-mono text-gray-400">
                      {c.publicId ?? c.id}
                    </p>
                    <p className="mt-1 truncate text-xs text-gray-500">{c.email || '—'}</p>
                    <p className="mt-1 text-[11px] text-gray-400">
                      {formatLastLogin(c.lastLogin)}
                    </p>
                  </div>
                </div>

                <div className="ml-2 flex shrink-0 flex-col items-end gap-2">
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        c.is_active ?? true
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {(c.is_active ?? true) ? 'Active' : 'Inactive'}
                    </span>

                    {c.hasActiveOccupancy && (
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700">
                        Occupied
                      </span>
                    )}

                    {c.hasUpcomingBooking && (
                      <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-700">
                        Upcoming
                      </span>
                    )}

                    {c.hasUnpaidBalance && (
                      <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-700">
                        Unpaid
                      </span>
                    )}
                  </div>

                  <Eye size={20} className="rounded-lg bg-blue-50 p-1 text-blue-500" />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:block">
          {loading ? (
            <EmptyState
              icon={
                <div className="flex items-center justify-center">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                </div>
              }
              title="Loading customers..."
              description="Please wait while customer records are being retrieved."
            />
          ) : hasNoCustomers ? (
            <EmptyState
              icon={<Inbox className="size-10 text-blue-500" />}
              title="No active customers yet"
              description="Customer accounts will appear here once users register or are added by an administrator."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    {[
                      'Name',
                      'User ID',
                      'Email',
                      'Contact',
                      'Last Login',
                      'Business Status',
                      'Account Status',
                      'Actions',
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {hasNoSearchResults ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-20 text-center">
                        <NoCustomerResults />
                      </td>
                    </tr>
                  ) : (
                    rows.map((c) => (
                      <tr key={c.id} className="transition-colors hover:bg-blue-50/30">
                        <td className="w-[220px] px-6 py-4 text-sm font-semibold text-gray-900">
                          {c.firstName} {c.lastName}
                        </td>

                        <td className="w-[180px] px-6 py-4 text-sm font-semibold text-gray-900">
                          {c.publicId ?? c.id}
                        </td>

                        <td className="w-[220px] px-6 py-4 text-sm text-gray-600">
                          {c.email || '—'}
                        </td>

                        <td className="w-[160px] px-6 py-4 text-sm text-gray-600">
                          {c.contactNumber || '—'}
                        </td>

                        <td className="w-[180px] px-6 py-4 text-sm text-gray-500">
                          {formatLastLogin(c.lastLogin)}
                        </td>

                        <td className="w-[240px] px-6 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            {c.hasActiveOccupancy ? (
                              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800">
                                Occupied
                              </span>
                            ) : (
                              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-600">
                                No active occupancy
                              </span>
                            )}

                            {c.hasUpcomingBooking && (
                              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold text-blue-800">
                                Upcoming
                              </span>
                            )}

                            {c.hasUnpaidBalance && (
                              <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-bold text-rose-800">
                                Unpaid
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="w-[180px] px-6 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                c.is_active ?? true
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {(c.is_active ?? true) ? 'Active' : 'Inactive'}
                            </span>

                            {c.deletionStatus === 'pending' && (
                              <span className="rounded-full bg-purple-100 px-2.5 py-1 text-[10px] font-bold text-purple-800">
                                Deletion Pending
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="w-[220px] px-6 py-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setSelectedCustomer(c.id)}
                              className="rounded-lg p-2 text-blue-600 hover:bg-blue-100"
                              title="View customer"
                            >
                              <Eye size={18} />
                            </button>

                            <button
                              type="button"
                              onClick={() => void handleExportCustomer(c)}
                              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                              title="Download customer data"
                            >
                              <Download size={18} />
                            </button>

                            {(c.is_active ?? true) ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  requestDeactivate(c);
                                }}
                                title={
                                  c.deactivationBlocked
                                    ? getDeactivationReason(c)
                                    : 'Deactivate customer'
                                }
                                className={`rounded-lg p-2 ${
                                  c.deactivationBlocked
                                    ? 'text-amber-500 hover:bg-amber-50'
                                    : 'text-red-500 hover:bg-red-50'
                                }`}
                              >
                                <UserX size={18} />
                              </button>
                            ) : (
                              <button
                                onClick={() => void toggleStatus(c.id, true)}
                                className="rounded-lg p-2 text-green-600 hover:bg-green-50"
                                title="Reactivate customer"
                              >
                                <RotateCcw size={18} />
                              </button>
                            )}

                            {c.deletionStatus === 'pending' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void handleApproveDeletion(c)}
                                  className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-100"
                                  title="Approve and permanently delete account"
                                >
                                  ✓
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void handleRejectDeletion(c)}
                                  className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                                  title="Reject deletion request"
                                >
                                  ✕
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && !hasNoCustomers && totalPages > 1 && (
          <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages} • {totalCount} total customers
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
              >
                Previous
              </button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Go to</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  onKeyDown={handlePageInputKeyDown}
                  className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handlePageJump}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                >
                  Go
                </button>
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-6 right-6 z-50 flex size-16 items-center justify-center rounded-full border-4 border-white bg-blue-600 text-white shadow-2xl transition-all hover:scale-110 active:scale-95 lg:hidden"
        >
          <Plus size={32} strokeWidth={3} />
        </button>

        {restrictionModal && (
          <div className="fixed inset-0 z-[115] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="animate-in zoom-in-95 fade-in-0 w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl duration-200">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-amber-50 text-amber-500">
                  <AlertTriangle size={32} />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {restrictionModal.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {restrictionModal.message}
                  </p>
                </div>

                <div className="mt-2 flex w-full">
                  <button
                    onClick={() => setRestrictionModal(null)}
                    className="w-full rounded-xl bg-amber-500 py-3 font-bold text-white shadow-lg shadow-amber-200 transition-all hover:bg-amber-600"
                  >
                    Understood
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {confirmTarget && !confirmTarget.deactivationBlocked && (confirmTarget.is_active ?? true) && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="animate-in zoom-in-95 fade-in-0 w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl duration-200">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-red-50 text-red-500">
                  <AlertTriangle size={32} />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-900">Confirm Deactivation</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Are you sure you want to deactivate this user? They will no longer be able to
                    log in.
                  </p>
                </div>

                <div className="mt-2 flex w-full gap-3">
                  <button
                    onClick={closeDeactivateModal}
                    className="flex-1 rounded-xl bg-gray-100 py-3 font-bold text-gray-600 transition-all hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => void toggleStatus(confirmTarget.id, false)}
                    className="flex-1 rounded-xl bg-red-600 py-3 font-bold text-white shadow-lg shadow-red-200 transition-all hover:bg-red-700"
                  >
                    Deactivate
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {customer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
            <div className="animate-in zoom-in-95 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl duration-200">
              <div className="relative flex h-28 shrink-0 items-end bg-gradient-to-br from-blue-600 to-blue-800 px-8 pb-4">
                <button
                  onClick={closeCustomerModal}
                  className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white transition-all hover:bg-white/20"
                >
                  <X size={20} />
                </button>

                <div className="absolute -bottom-12 left-8 size-28 rounded-[2rem] bg-white p-2 shadow-xl">
                  <div className="flex h-full w-full items-center justify-center rounded-[1.5rem] bg-blue-50 text-4xl font-bold text-blue-600">
                    {customer.initials}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-8 pb-8 pt-16">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                      {customer.firstName} {customer.lastName}
                    </h2>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-mono uppercase text-gray-400">
                      <Hash size={12} /> {customer.publicId ?? customer.id}
                    </p>
                  </div>

                  <div
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
                      customer.is_active ?? true
                        ? 'bg-green-50 text-green-600'
                        : 'bg-red-50 text-red-600'
                    }`}
                  >
                    {(customer.is_active ?? true) ? (
                      <ShieldCheck size={14} />
                    ) : (
                      <ShieldAlert size={14} />
                    )}
                    {(customer.is_active ?? true) ? 'Active' : 'Inactive'}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {customer.hasActiveOccupancy && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800">
                      Occupied
                    </span>
                  )}

                  {customer.hasUpcomingBooking && (
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold text-blue-800">
                      Upcoming Booking
                    </span>
                  )}

                  {customer.hasUnpaidBalance && (
                    <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-bold text-rose-800">
                      Unpaid Balance
                    </span>
                  )}

                  {customer.deletionStatus === 'pending' && (
                    <span className="rounded-full bg-purple-100 px-2.5 py-1 text-[10px] font-bold text-purple-800">
                      Deletion Pending
                    </span>
                  )}

                  {customer.deletionStatus === 'approved' && (
                    <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[10px] font-bold text-indigo-800">
                      Approved
                    </span>
                  )}

                  {customer.deletionStatus === 'rejected' && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700">
                      Rejected
                    </span>
                  )}
                </div>

                <div className="mt-8 space-y-5">
                  <CustomerDetailItem
                    icon={<Mail size={18} />}
                    label="Email Address"
                    value={customer.email || '—'}
                  />
                  <CustomerDetailItem
                    icon={<Phone size={18} />}
                    label="Contact Number"
                    value={customer.contactNumber || '—'}
                  />
                  <CustomerDetailItem
                    icon={<MapPin size={18} />}
                    label="Physical Address"
                    value={customer.address || '—'}
                  />
                  <CustomerDetailItem
                    icon={<Clock3 size={18} />}
                    label="Last Login"
                    value={formatLastLogin(customer.lastLogin)}
                  />

                  {customer.hasActiveOccupancy && (
                    <CustomerDetailItem
                      icon={<Briefcase size={18} />}
                      label="Active Occupancy"
                      value={
                        customer.activeUnitName
                          ? `${customer.activeUnitName}${
                              customer.activeUnitType
                                ? ` (${formatUnitTypeLabel(customer.activeUnitType)})`
                                : ''
                            }`
                          : customer.activeUnitType
                            ? formatUnitTypeLabel(customer.activeUnitType)
                            : 'Yes'
                      }
                    />
                  )}

                  {customer.activeSince && (
                    <CustomerDetailItem
                      icon={<CalendarDays size={18} />}
                      label="Occupancy Since"
                      value={new Date(customer.activeSince).toLocaleDateString()}
                    />
                  )}

                  {customer.hasUnpaidBalance && (
                    <CustomerDetailItem
                      icon={<Wallet size={18} />}
                      label="Payment Status"
                      value="This customer has unpaid balance records."
                    />
                  )}
                </div>

                {customer.deactivationBlocked && customer.deactivationReason && (
                  <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700">
                      Deactivation Restricted
                    </p>
                    <p className="mt-1 text-sm text-amber-800">{customer.deactivationReason}</p>
                  </div>
                )}

                <div className="mt-10 flex flex-col gap-3">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={closeCustomerModal}
                      className="flex-1 rounded-2xl bg-gray-100 py-4 text-xs font-bold uppercase tracking-widest"
                    >
                      Close Detail
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleExportCustomer(customer)}
                      className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 py-4 text-xs font-bold uppercase tracking-widest text-slate-700 transition-all hover:bg-slate-100"
                    >
                      Export JSON
                    </button>

                    {(customer.is_active ?? true) ? (
                      <button
                        type="button"
                        onClick={() => requestDeactivate(customer)}
                        className={`flex-1 rounded-2xl border py-4 text-xs font-bold uppercase tracking-widest ${
                          customer.deactivationBlocked
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-red-100 bg-red-50 text-red-600'
                        }`}
                      >
                        {customer.deactivationBlocked ? 'Cannot Deactivate' : 'Deactivate'}
                      </button>
                    ) : (
                      <button
                        onClick={() => void toggleStatus(customer.id, true)}
                        className="flex-1 rounded-2xl border border-green-100 bg-green-50 py-4 text-xs font-bold uppercase tracking-widest text-green-600"
                      >
                        Reactivate
                      </button>
                    )}
                  </div>

                  {customer.deletionStatus === 'pending' && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => void handleApproveDeletion(customer)}
                        className="rounded-2xl bg-indigo-600 py-4 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700"
                      >
                        Approve Deletion
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleRejectDeletion(customer)}
                        className="rounded-2xl border border-slate-200 bg-slate-50 py-4 text-xs font-bold uppercase tracking-widest text-slate-700 transition-all hover:bg-slate-100"
                      >
                        Reject Request
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm transition-all duration-300">
            <div className="animate-in zoom-in-95 fade-in-0 w-full max-w-lg overflow-hidden rounded-[2rem] border border-slate-200/60 bg-white shadow-2xl duration-300">
              <div className="flex items-center justify-between bg-slate-900 p-6">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white">
                    Add New Customer
                  </h2>
                  <p className="mt-1 text-xs font-medium text-slate-400">
                    Create a new client profile for Comerciales Flores
                  </p>
                </div>

                <button
                  onClick={closeAddModal}
                  className="rounded-xl bg-white/5 p-2 text-slate-400 transition-all hover:bg-white/10"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6 p-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      First Name
                    </label>
                    <input
                      type="text"
                      placeholder="John"
                      value={newCustomer.first_name}
                      onChange={(e) => updateNewCustomerField('first_name', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Last Name
                    </label>
                    <input
                      type="text"
                      placeholder="Doe"
                      value={newCustomer.last_name}
                      onChange={(e) => updateNewCustomerField('last_name', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    />
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Email Address
                    </label>
                    <input
                      type="email"
                      autoComplete="off"
                      placeholder="customer@example.com"
                      value={newCustomer.email}
                      onChange={(e) => updateNewCustomerField('email', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    />
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      placeholder="+63 9xx..."
                      value={newCustomer.contactNumber}
                      onChange={(e) => updateNewCustomerField('contactNumber', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    />
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Complete Address
                    </label>
                    <textarea
                      placeholder="House No., Street, City"
                      value={newCustomer.address}
                      onChange={(e) => updateNewCustomerField('address', e.target.value)}
                      className="h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    />
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Set Password
                    </label>

                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        value={newCustomer.password}
                        onChange={(e) => updateNewCustomerField('password', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 transition-colors hover:text-blue-600"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {newCustomer.password && (
                      <div className="mt-2 space-y-1.5 px-1">
                        <div className="flex h-1 gap-1">
                          {[1, 2, 3, 4].map((step) => (
                            <div
                              key={step}
                              className={`h-full flex-1 rounded-full transition-all duration-500 ${
                                passwordScore >= step
                                  ? passwordScore <= 2
                                    ? 'bg-rose-500'
                                    : passwordScore === 3
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  : 'bg-slate-200'
                              }`}
                            />
                          ))}
                        </div>

                        <p className="text-[10px] italic text-slate-400">{passwordStrength}</p>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleAddCustomer}
                  disabled={!canSubmitNewCustomer}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-xs font-bold uppercase tracking-widest text-white shadow-xl shadow-blue-600/20 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Register Customer Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}