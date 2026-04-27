import { useState, useMemo, useEffect, useCallback, type KeyboardEvent } from 'react';
import { useUsers } from '../../contexts/UsersContext';
import { useAuth } from '../../contexts/AuthContext';
import type { UnitType } from '../../data/types';
import supabase from '../../supabaseClient';
import { useNotifications } from '../../contexts/NotificationContext';
import { DataTable, DataCell, ActionCell } from '../../components/common/DataTable';
import TableBadge from '../../components/common/TableBadge';
import { formatDateTime, formatDate, formatTime } from '../../utils/date';
import AddressPicker from '../../components/common/AddressPicker';
import PasswordStrengthIndicator from '../../components/common/PasswordStrengthIndicator';
import FormField from '../../components/common/FormField';
import { isPasswordPolicyValid } from '../../utils/passwordStrength';
import AdminUserForm from '../../components/forms/AdminUserForm';
import SortSelect from '../../components/shared/filters/SortSelect';
import type { CustomerSortOption } from '../../data/sorting';
import { CUSTOMER_SORT_OPTIONS } from '../../utils/sorting/sortingOptions';
import { sortCustomers } from '../../utils/sorting/sortCustomers';
import {
  normalizeName,
  normalizeEmail,
  normalizePHPhone,
} from '../../utils/DataNormalization';
import AdminFilterBar, {
  FILTER_BUTTON_CLASS,
  FILTER_SELECT_CLASS,
} from '../../components/common/AdminFilterBar';
import { AdminFilterGroup } from '../../components/common/AdminFilterGroup';
import {
  Eye,
  Plus,
  X,
  Check,
  UserX,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Building2,
  Hash,
  RotateCcw,
  AlertTriangle,
  Inbox,
  Filter,
  Clock3,
  Briefcase,
  CalendarDays,
  Wallet,
  Download,
  User,
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
  createdAt?: string | null;

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

  validIdStatus?: 'not_submitted' | 'pending' | 'approved' | 'rejected';
validIdFilePath?: string | null;
validIdUploadedAt?: string | null;
validIdReviewedAt?: string | null;
validIdReviewNotes?: string | null;

  initials: string;
  searchableText: string;
};

type NewCustomerForm = {
  first_name: string;
  last_name: string;
  email: string;
  contactNumber: string;
  address: string;
  latitude: string;
  longitude: string;
  password: string;
  confirmPassword: string;
  role: 'client';
  is_active: boolean;
};

const INITIAL_CUSTOMER_FORM: NewCustomerForm = {
  first_name: '',
  last_name: '',
  email: '',
  contactNumber: '',
  address: '',
  latitude: '',
  longitude: '',
  password: '',
  confirmPassword: '',
  role: 'client',
  is_active: true,
};

type DeletionDecisionAction = 'approve' | 'reject';

function useDebouncedValue<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);


  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}



function formatLastLogin(value?: string | null) {
  if (!value) return 'No login yet';
  return formatDateTime(value);
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
        Try adjusting your search or filters by name, email, user ID, account status, or deletion request status.
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
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
      <div className="shrink-0 rounded-lg bg-white p-2 text-blue-500 shadow-sm">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
          {label}
        </p>

        <p className="break-words text-sm font-medium leading-relaxed text-gray-800">
          {value || '—'}
        </p>
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
    createdAt: u.createdAt ?? u.created_at ?? null,

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

    validIdStatus: u.validIdStatus ?? 'not_submitted',
validIdFilePath: u.validIdFilePath ?? null,
validIdUploadedAt: u.validIdUploadedAt ?? null,
validIdReviewedAt: u.validIdReviewedAt ?? null,
validIdReviewNotes: u.validIdReviewNotes ?? null,

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
      u.validIdStatus ?? '',
u.validIdReviewNotes ?? '',
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
  };
}

function StatusBadge({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full px-2 py-1 text-[10px] font-bold leading-none ${className}`}
    >
      {children}
    </span>
  );
}



export default function AdminCustomers() {
  const { fetchUsersPage, updateUserStatus, clearUsersCache, version } = useUsers();
  const { user } = useAuth();
  const { sendDeletionStatusNotification } = useNotifications();

  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);

  const [searchTerm, setSearchTerm] = useState('');
  const [accountFilter, setAccountFilter] = useState<'all' | 'active' | 'inactive'>('all');
const [deletionFilter, setDeletionFilter] = useState<
  'all' | 'pending' | 'approved' | 'rejected' | 'none'
>('all');
const [businessFilter, setBusinessFilter] = useState<
  'all' | 'occupied' | 'upcoming' | 'unpaid'
>('all');
const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(null);
const [newCustomer, setNewCustomer] = useState<NewCustomerForm>(INITIAL_CUSTOMER_FORM);
const [newCustomerErrors, setNewCustomerErrors] = useState<Partial<Record<string, string>>>({});
const [pageInput, setPageInput] = useState('1');

const [sortBy, setSortBy] = useState<CustomerSortOption>('recent_login');

  const [isSubmittingDeletionDecision, setIsSubmittingDeletionDecision] = useState(false);
  const [deletionDecisionState, setDeletionDecisionState] = useState<{
    target: CustomerRow | null;
    action: DeletionDecisionAction | null;
  }>({
    target: null,
    action: null,
  });

  const [restrictionModal, setRestrictionModal] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const debouncedSearchTerm = useDebouncedValue(searchTerm, 250);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));


  const filteredRows = useMemo(() => {
  return sortCustomers(rows, sortBy);
}, [rows, sortBy]);


const confirmTarget = useMemo(
  () =>
    confirmDeactivateId
      ? rows.find((r) => r.id === confirmDeactivateId) ?? null
      : null,
  [rows, confirmDeactivateId]
);
  const hasActiveSearch = debouncedSearchTerm.trim() !== '';
const hasActiveFilters =
  hasActiveSearch ||
  accountFilter !== 'all' ||
  deletionFilter !== 'all' ||
  businessFilter !== 'all' ||
  sortBy !== 'recent_login';

const hasNoCustomers = !loading && !hasActiveSearch && !hasActiveFilters && totalCount === 0;
const hasNoSearchResults =
  !loading && (hasActiveSearch || hasActiveFilters) && rows.length === 0;

  const shouldShowFilters =
  !loading && (!hasNoCustomers || hasActiveSearch || hasActiveFilters);

  const customer = useMemo(
  () =>
    selectedCustomer
      ? rows.find((c) => c.id === selectedCustomer) ?? null
      : null,
  [rows, selectedCustomer]
);


  const openRestrictionModal = useCallback((message: string) => {
    setRestrictionModal({
      title: 'Deactivation Restricted',
      message,
    });
  }, []);

  const canSubmitNewCustomer = useMemo(() => {
    return (
      newCustomer.first_name.trim() !== '' &&
      newCustomer.last_name.trim() !== '' &&
      newCustomer.email.trim() !== '' &&
      newCustomer.password.trim() !== '' &&
      newCustomer.confirmPassword.trim() !== ''
    );
  }, [
    newCustomer.first_name,
    newCustomer.last_name,
    newCustomer.email,
    newCustomer.password,
    newCustomer.confirmPassword,
  ]);

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

  const requestDeactivate = useCallback(
    (target: CustomerRow | null) => {
      if (!target) return;
      if (!(target.is_active ?? true)) return;

      if (target.deactivationBlocked) {
        setConfirmDeactivateId(null);
        openRestrictionModal(getDeactivationReason(target));
        return;
      }

      setConfirmDeactivateId(target.id);
    },
    [openRestrictionModal]
  );

  const closeDeactivateModal = useCallback(() => {
    setConfirmDeactivateId(null);
  }, []);

  const closeCustomerModal = useCallback(() => {
    setSelectedCustomer(null);
    setConfirmDeactivateId(null);
  }, []);

 const closeAddModal = useCallback(() => {
  setShowAddModal(false);
  setNewCustomer(INITIAL_CUSTOMER_FORM);
  setNewCustomerErrors({});
}, []);;

  const updateNewCustomerField = useCallback(
  (field: keyof NewCustomerForm, value: string | number | boolean | null | undefined) => {
    setNewCustomer((prev) => ({
      ...prev,
      [field]: value as NewCustomerForm[keyof NewCustomerForm],
    }));

    setNewCustomerErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  },
  []
);

const validateNewCustomer = useCallback(() => {
  const errors: Partial<Record<string, string>> = {};

  if (!newCustomer.first_name.trim()) {
    errors.first_name = 'First name is required.';
  }

  if (!newCustomer.last_name.trim()) {
    errors.last_name = 'Last name is required.';
  }

  if (!newCustomer.email.trim()) {
    errors.email = 'Email address is required.';
  }

  if (!newCustomer.password.trim()) {
    errors.password = 'Password is required.';
  } else if (!isPasswordPolicyValid(newCustomer.password)) {
    errors.password = 'Password does not meet the required policy.';
  }

  if (!newCustomer.confirmPassword.trim()) {
    errors.confirmPassword = 'Please confirm the password.';
  } else if (newCustomer.password !== newCustomer.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  if (
    newCustomer.address.trim() &&
    (!newCustomer.latitude.trim() || !newCustomer.longitude.trim())
  ) {
    errors.address = 'Please confirm the selected address on the map.';
  }

  setNewCustomerErrors(errors);
  return Object.keys(errors).length === 0;
}, [newCustomer, isPasswordPolicyValid]);

const reloadUsers = useCallback(async () => {
  const result = await fetchUsersPage({
    page,
    pageSize,
    searchTerm: debouncedSearchTerm,
    accountFilter,
    deletionFilter,
    businessFilter,
    useExactCount: false,
  });

  setRows(result.data.map(mapUserToCustomerRow));
  setTotalCount(result.count);
}, [
  fetchUsersPage,
  page,
  pageSize,
  debouncedSearchTerm,
  accountFilter,
  deletionFilter,
  businessFilter,
]);

  const handleAddCustomer = useCallback(async () => {
  if (isCreatingCustomer) return;
  if (!canSubmitNewCustomer) return;

  const isValid = validateNewCustomer();
  if (!isValid) return;

  try {
    setIsCreatingCustomer(true);

    const payload = {
      firstName: normalizeName(newCustomer.first_name),
      lastName: normalizeName(newCustomer.last_name),
      email: normalizeEmail(newCustomer.email),
      password: newCustomer.password,
      contactNumber: normalizePHPhone(newCustomer.contactNumber),
      address: newCustomer.address.trim(),
      latitude: newCustomer.latitude.trim() ? Number(newCustomer.latitude) : null,
      longitude: newCustomer.longitude.trim() ? Number(newCustomer.longitude) : null,
      isActive: Boolean(newCustomer.is_active),
    };

    const { data, error } = await supabase.functions.invoke('create-admin-user', {
      body: payload,
    });

    if (error) {
      throw new Error(error.message || 'Failed to create customer.');
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Failed to create customer.');
    }

    clearUsersCache();
    await reloadUsers();

    setShowAddModal(false);
    setNewCustomer(INITIAL_CUSTOMER_FORM);
    setNewCustomerErrors({});

    setRestrictionModal({
      title: 'Customer Created',
      message: 'The customer account has been created successfully.',
    });
  } catch (error) {
    console.error('Failed to create customer:', error);

    const message =
      error instanceof Error
        ? error.message
        : 'An unexpected error occurred while creating the customer account.';

    setNewCustomerErrors((prev) => ({
      ...prev,
      form: message,
    }));
  } finally {
    setIsCreatingCustomer(false);
  }
}, [
  isCreatingCustomer,
  canSubmitNewCustomer,
  validateNewCustomer,
  newCustomer,
  normalizeName,
  normalizeEmail,
  normalizePHPhone,
  clearUsersCache,
  reloadUsers,
]);



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
        prev.map((row) =>
          row.id === id
            ? {
                ...row,
                is_active: status,
              }
            : row
        )
      );

      setConfirmDeactivateId(null);

      if (!status && selectedCustomer === id) {
        setSelectedCustomer(null);
      }
    } catch (error) {
      console.error('Failed to update user status:', error);
      setConfirmDeactivateId(null);
    }
  },
  [updateUserStatus, rows, confirmTarget, selectedCustomer, openRestrictionModal]
);

  const openDeletionDecisionModal = useCallback(
    (target: CustomerRow | null, action: DeletionDecisionAction) => {
      if (!target || isSubmittingDeletionDecision) return;
      if (target.deletionStatus !== 'pending') return;

      setDeletionDecisionState({
        target,
        action,
      });
    },
    [isSubmittingDeletionDecision]
  );

  const closeDeletionDecisionModal = useCallback(() => {
    if (isSubmittingDeletionDecision) return;

    setDeletionDecisionState({
      target: null,
      action: null,
    });
  }, [isSubmittingDeletionDecision]);

  const handleDeletionDecision = useCallback(async () => {
    const target = deletionDecisionState.target;
    const action = deletionDecisionState.action;

    if (!target || !action || isSubmittingDeletionDecision) return;

    try {
      setIsSubmittingDeletionDecision(true);

      const nextStatus = action === 'approve' ? 'approved' : 'rejected';
      const nextNote =
        action === 'approve'
          ? 'Deletion request was approved after admin review.'
          : 'Deletion request was rejected after admin review.';

      const { data, error } = await supabase
        .from('account_deletion_requests')
        .update({
          status: nextStatus,
          admin_note: nextNote,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id ?? null,
        })
        .eq('user_id', target.id)
        .eq('status', 'pending')
        .select('id')
        .limit(1);

      if (error) {
        console.error(`Failed to ${action} deletion request:`, error);
        setRestrictionModal({
          title: action === 'approve' ? 'Approval Failed' : 'Update Failed',
          message:
            action === 'approve'
              ? 'Failed to approve the deletion request.'
              : 'Failed to reject the deletion request.',
        });
        return;
      }

      if (!data || data.length === 0) {
        await reloadUsers();
        setDeletionDecisionState({
          target: null,
          action: null,
        });
        setRestrictionModal({
          title: 'Already Processed',
          message: 'This account deletion request was already processed.',
        });
        return;
      }

      await sendDeletionStatusNotification({
        userId: target.id,
        status: nextStatus,
      });
      clearUsersCache();
      await reloadUsers();
      setSelectedCustomer(null);
      setDeletionDecisionState({
        target: null,
        action: null,
      });

      setRestrictionModal({
        title: nextStatus === 'approved' ? 'Request Approved' : 'Request Rejected',
        message:
          nextStatus === 'approved'
            ? 'The deletion request has been approved. The user may now proceed with account deletion.'
            : 'The account deletion request has been rejected.',
      });
    } catch (error) {
      console.error(`Failed to ${action} deletion request:`, error);
      setRestrictionModal({
        title: action === 'approve' ? 'Approval Failed' : 'Update Failed',
        message: 'An unexpected error occurred while processing the request.',
      });
    } finally {
      setIsSubmittingDeletionDecision(false);
    }
  }, [
    deletionDecisionState,
    isSubmittingDeletionDecision,
    reloadUsers,
    sendDeletionStatusNotification,
    user?.id,
    clearUsersCache,
  ]);

  const [isSubmittingValidIdReview, setIsSubmittingValidIdReview] = useState(false);

const [validIdReviewState, setValidIdReviewState] = useState<{
  target: CustomerRow | null;
  status: 'approved' | 'rejected' | null;
  notes: string;
}>({
  target: null,
  status: null,
  notes: '',
});

  const openValidIdReviewModal = useCallback(
  (target: CustomerRow | null, status: 'approved' | 'rejected') => {
    if (!target || isSubmittingValidIdReview) return;
    if (!target.validIdFilePath) return;

    setValidIdReviewState({
      target,
      status,
      notes: '',
    });
  },
  [isSubmittingValidIdReview]
);

const closeValidIdReviewModal = useCallback(() => {
  if (isSubmittingValidIdReview) return;

  setValidIdReviewState({
    target: null,
    status: null,
    notes: '',
  });
}, [isSubmittingValidIdReview]);

const handleValidIdReview = useCallback(async () => {
  const target = validIdReviewState.target;
  const status = validIdReviewState.status;

  if (!target || !status || isSubmittingValidIdReview) return;

  try {
    setIsSubmittingValidIdReview(true);

    const { error } = await supabase.rpc('admin_review_valid_id', {
      p_user_id: target.id,
      p_status: status,
      p_notes: validIdReviewState.notes.trim() || null,
    });

    if (error) throw error;

    clearUsersCache();
    await reloadUsers();

    setValidIdReviewState({
      target: null,
      status: null,
      notes: '',
    });

    setRestrictionModal({
      title: status === 'approved' ? 'Valid ID Approved' : 'Valid ID Rejected',
      message:
        status === 'approved'
          ? 'The customer valid ID has been approved.'
          : 'The customer valid ID has been rejected and the user has been notified.',
    });
  } catch (error) {
    console.error('Failed to review valid ID:', error);

    setRestrictionModal({
      title: 'Review Failed',
      message: 'Failed to update the valid ID review status.',
    });
  } finally {
    setIsSubmittingValidIdReview(false);
  }
}, [
  validIdReviewState,
  isSubmittingValidIdReview,
  clearUsersCache,
  reloadUsers,
]);

const openValidIdFile = useCallback(
  async (filePath?: string | null) => {
    if (!filePath) return;

    const { data, error } = await supabase.storage
      .from('valid_ids')
      .createSignedUrl(filePath, 120);

    if (error || !data?.signedUrl) {
      setRestrictionModal({
        title: 'Preview Failed',
        message: 'Failed to open the uploaded valid ID.',
      });
      return;
    }

    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  },
  []
);

  const handleExportCustomer = useCallback(
    async (target: CustomerRow | null) => {
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
    },
    [user?.id]
  );


  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  useEffect(() => {
  setPage((prev) => (prev === 1 ? prev : 1));
}, [debouncedSearchTerm, accountFilter, deletionFilter, businessFilter, sortBy]);

  useEffect(() => {
  let cancelled = false;

  const loadUsers = async () => {
    const startedAt = performance.now();
    setLoading(true);
    console.log('[Customers] ⏱️ Load started');

    try {
      const result = await fetchUsersPage({
        page,
        pageSize,
        searchTerm: debouncedSearchTerm,
        accountFilter,
        deletionFilter,
        businessFilter,
        useExactCount: false,
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
        const endedAt = performance.now();
        console.log(
          `[Customers] ✅ Load complete in ${(endedAt - startedAt).toFixed(2)} ms`
        );
      }
    }
  };

  void loadUsers();

  return () => {
    cancelled = true;
  };
}, [
  fetchUsersPage,
  page,
  pageSize,
  debouncedSearchTerm,
  accountFilter,
  deletionFilter,
  businessFilter,
  version,
]);


  useEffect(() => {
    if (!confirmDeactivateId) return;

    if (!confirmTarget || confirmTarget.deactivationBlocked || !(confirmTarget.is_active ?? true)) {
      setConfirmDeactivateId(null);
    }
  }, [confirmDeactivateId, confirmTarget]);

  useEffect(() => {
    if (!deletionDecisionState.target) return;

    const latestTarget = rows.find((row) => row.id === deletionDecisionState.target?.id) ?? null;

    if (!latestTarget || latestTarget.deletionStatus !== 'pending') {
      setDeletionDecisionState({
        target: null,
        action: null,
      });
    }
  }, [rows, deletionDecisionState.target]);

  return (
    <div className="min-h-screen bg-white">
      <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8">
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
            <Plus className="size-5" />
            <span className="hidden font-medium sm:inline">Add Customer</span>
          </button>
        </div>

        {shouldShowFilters && (
  <AdminFilterBar
    searchTerm={searchTerm}
    onSearchChange={setSearchTerm}
    placeholder="Search by name, email, ID, or business status..."
    showMobileFilters={showMobileFilters}
    onToggleMobileFilters={() => setShowMobileFilters((prev) => !prev)}
    filters={
      <AdminFilterGroup align="between">
        <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
          <select
            value={accountFilter}
            onChange={(e) =>
              setAccountFilter(e.target.value as 'all' | 'active' | 'inactive')
            }
            className={FILTER_SELECT_CLASS}
          >
            <option value="all">All Accounts</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={deletionFilter}
            onChange={(e) =>
              setDeletionFilter(
                e.target.value as 'all' | 'pending' | 'approved' | 'rejected' | 'none'
              )
            }
            className={FILTER_SELECT_CLASS}
          >
            <option value="all">All Requests</option>
            <option value="pending">Pending Deletion</option>
            <option value="approved">Approved Deletion</option>
            <option value="rejected">Rejected Deletion</option>
            <option value="none">No Request</option>
          </select>

          <select
            value={businessFilter}
            onChange={(e) =>
              setBusinessFilter(
                e.target.value as 'all' | 'occupied' | 'upcoming' | 'unpaid'
              )
            }
            className={FILTER_SELECT_CLASS}
          >
            <option value="all">All Business Status</option>
            <option value="occupied">Occupied</option>
            <option value="upcoming">Upcoming</option>
            <option value="unpaid">Unpaid</option>
          </select>

          <SortSelect<CustomerSortOption>
  value={sortBy}
  onChange={setSortBy}
  options={CUSTOMER_SORT_OPTIONS}
  className="w-full"
/>
        </div>

        {hasActiveFilters && (
          <div className="flex w-full justify-end lg:w-auto">
            <button
              type="button" 
              onClick={() => {
                setSearchTerm('');
                setAccountFilter('all');
                setDeletionFilter('all');
                setBusinessFilter('all');
                setShowMobileFilters(false);
                setSortBy('recent_login');
              }}
              className={FILTER_BUTTON_CLASS}
            >
              Clear
            </button>
          </div>
        )}
      </AdminFilterGroup>
    }
  />
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
              description="Fetching customer data, activity, and account status. This may take a few seconds on first load, but will be faster next time."
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
            filteredRows.map((c) => (
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
                    <p className="break-words font-bold leading-tight text-gray-900">
                      {c.firstName} {c.lastName}
                    </p>
                    <p className="mt-0.5 break-words text-[10px] font-mono text-gray-400">
                      {c.publicId ?? c.id}
                    </p>
                    <p className="mt-1 break-words text-xs text-gray-500">{c.email || '—'}</p>
                    <p className="mt-1 break-words text-[11px] text-gray-400">
                      {formatLastLogin(c.lastLogin)}
                    </p>
                  </div>
                </div>

                <div className="ml-2 flex shrink-0 flex-col items-end gap-2">
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge
                      className={
                        c.is_active ?? true
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }
                    >
                      {(c.is_active ?? true) ? 'Active' : 'Inactive'}
                    </StatusBadge>

                    {c.hasActiveOccupancy && (
                      <StatusBadge className="bg-amber-100 text-amber-700">Occupied</StatusBadge>
                    )}

                    {c.hasUpcomingBooking && (
                      <StatusBadge className="bg-blue-100 text-blue-700">Upcoming</StatusBadge>
                    )}

                    {c.hasUnpaidBalance && (
                      <StatusBadge className="bg-rose-100 text-rose-700">Unpaid</StatusBadge>
                    )}

                    {c.deletionStatus === 'pending' && (
                      <StatusBadge className="bg-purple-100 text-purple-700">Pending</StatusBadge>
                    )}
                  </div>

                  <Eye size={20} className="rounded-lg bg-blue-50 p-1 text-blue-500" />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden lg:block">
  {loading ? (
    <EmptyState
      icon={
        <div className="flex items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        </div>
      }
      title="Loading customers..."
      description="Fetching customer data, activity, and account status. This may take a few seconds on first load, but will be faster next time."
    />
  ) : hasNoCustomers ? (
    <EmptyState
      icon={<Inbox className="size-10 text-blue-500" />}
      title="No active customers yet"
      description="Customer accounts will appear here once users register or are added by an administrator."
    />
  ) : hasNoSearchResults ? (
    <div className="rounded-2xl border border-gray-200 bg-white px-6 py-20 shadow-sm">
      <NoCustomerResults />
    </div>
  ) : (
    <DataTable
      headers={[
        <span className="block">Customer</span>,
        <span className="block">User ID</span>,
        <span className="block">Email</span>,
        <span className="block">Contact</span>,
        <span className="block">Last Login</span>,
        <span className="block">Business</span>,
        <span className="block">Account</span>,
        <span className="block">Actions</span>,
      ]}
    >
      {filteredRows.map((c) => (
        <tr key={c.id} className="transition-colors hover:bg-gray-50/70">
          <DataCell
            value={
              <div>
                <p className="break-words font-semibold text-gray-900">
                  {c.firstName} {c.lastName}
                </p>
              </div>
            }
          />

          <DataCell value={c.publicId ?? c.id} mono />
          <DataCell value={c.email} />
          <DataCell value={c.contactNumber} />
          <DataCell
            value={
              c.lastLogin ? (
                <div className="leading-tight">
                  <div className="font-medium text-gray-900">{formatDate(c.lastLogin)}</div>
                  <div className="mt-1 text-xs text-gray-400">{formatTime(c.lastLogin)}</div>
                </div>
              ) : (
                <div className="text-xs text-gray-500">—</div>
              )
            }
          />

          <DataCell
            value={
              <div className="flex flex-wrap gap-2">
                {c.hasActiveOccupancy ? (
                  <TableBadge className="bg-amber-100 text-amber-700">
                    Occupied
                  </TableBadge>
                ) : (
                  <TableBadge className="bg-gray-100 text-gray-600">
                    No occupancy
                  </TableBadge>
                )}

                {c.hasUpcomingBooking && (
                  <TableBadge className="bg-blue-100 text-blue-700">
                    Upcoming
                  </TableBadge>
                )}

                {c.hasUnpaidBalance && (
                  <TableBadge className="bg-rose-100 text-rose-700">
                    Unpaid
                  </TableBadge>
                )}
                {c.validIdStatus === 'pending' && (
                  <TableBadge className="bg-amber-100 text-amber-700">
                    ID Pending
                  </TableBadge>
                )}

                {c.validIdStatus === 'approved' && (
                  <TableBadge className="bg-emerald-100 text-emerald-700">
                    ID Approved
                  </TableBadge>
                )}

                {c.validIdStatus === 'rejected' && (
                  <TableBadge className="bg-rose-100 text-rose-700">
                    ID Rejected
                  </TableBadge>
                )}
              </div>
            }
          />

          <DataCell
            nowrap
            value={
              <div className="flex flex-wrap gap-2">
                <TableBadge
                  className={
                    c.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }
                >
                  {c.is_active ? 'Active' : 'Inactive'}
                </TableBadge>

                {c.deletionStatus === 'pending' && (
                  <TableBadge className="bg-purple-100 text-purple-700">
                    Pending
                  </TableBadge>
                )}

                {c.validIdStatus === 'pending' && (
                  <StatusBadge className="bg-amber-100 text-amber-700">
                    ID Pending
                  </StatusBadge>
                )}

                {c.validIdStatus === 'approved' && (
                  <StatusBadge className="bg-emerald-100 text-emerald-700">
                    ID Approved
                  </StatusBadge>
                )}

                {c.validIdStatus === 'rejected' && (
                  <StatusBadge className="bg-rose-100 text-rose-700">
                    ID Rejected
                  </StatusBadge>
                )}

                {c.deletionStatus === 'approved' && (
                  <TableBadge className="bg-purple-100 text-purple-700">
                    Approved
                  </TableBadge>
                )}

                {c.deletionStatus === 'rejected' && (
                  <TableBadge className="bg-slate-100 text-slate-700">
                    Rejected
                  </TableBadge>
                )}
              </div>
            }
          />

          <ActionCell>
            <button
              onClick={() => setSelectedCustomer(c.id)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-blue-600 hover:bg-blue-100"
              title="View details"
            >
              <Eye size={16} />
            </button>

            {c.validIdFilePath && (
  <button
    onClick={() => void openValidIdFile(c.validIdFilePath)}
    className="flex h-8 w-8 items-center justify-center rounded-md text-blue-600 hover:bg-blue-100"
    title="View valid ID"
  >
    <Eye size={16} />
  </button>
)}

{c.validIdStatus === 'pending' && c.validIdFilePath && (
  <>
    <button
      onClick={() => openValidIdReviewModal(c, 'approved')}
      disabled={isSubmittingValidIdReview}
      className="flex h-8 w-8 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
      title="Approve valid ID"
    >
      <Check size={16} />
    </button>

    <button
      onClick={() => openValidIdReviewModal(c, 'rejected')}
      disabled={isSubmittingValidIdReview}
      className="flex h-8 w-8 items-center justify-center rounded-md text-rose-600 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
      title="Reject valid ID"
    >
      <X size={16} />
    </button>
  </>
)}

            <button
              onClick={() => void handleExportCustomer(c)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-blue-100"
              title="Export customer"
            >
              <Download size={16} />
            </button>

            {c.deletionStatus === 'pending' ? (
              <>
                <button
                  onClick={() => openDeletionDecisionModal(c, 'approve')}
                  disabled={isSubmittingDeletionDecision}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-indigo-600 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Approve deletion"
                >
                  <Check size={16} />
                </button>

                <button
                  onClick={() => openDeletionDecisionModal(c, 'reject')}
                  disabled={isSubmittingDeletionDecision}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Reject deletion"
                >
                  <X size={16} />
                </button>
              </>
            ) : c.deletionStatus === 'approved' ? (
                <span
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-emerald-700"
                  title="Awaiting user deletion"
                >
                  <Check size={16} />
                </span>
              ) : c.is_active ? (
              <button
                onClick={() => requestDeactivate(c)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-red-500 hover:bg-red-50"
                title="Deactivate account"
              >
                <UserX size={16} />
              </button>
            ) : (
              <button
                onClick={() => void toggleStatus(c.id, true)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-green-600 hover:bg-green-50"
                title="Reactivate account"
              >
                <RotateCcw size={16} />
              </button>
            )}
          </ActionCell>
        </tr>
      ))}
    </DataTable>
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
          <div className="fixed inset-0 z-[115] flex items-center justify-center bg-black/40 p-4">
            <div className="animate-in zoom-in-95 fade-in-0 w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl duration-200">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-amber-50 text-amber-500">
                  <AlertTriangle size={32} />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-900">{restrictionModal.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">{restrictionModal.message}</p>
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

        {deletionDecisionState.target && deletionDecisionState.action && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
            <div className="animate-in zoom-in-95 fade-in-0 w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl duration-200">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                  {deletionDecisionState.action === 'approve' ? (
                    <Check size={28} />
                  ) : (
                    <X size={28} />
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {deletionDecisionState.action === 'approve'
                      ? 'Approve Deletion Request'
                      : 'Reject Deletion Request'}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {deletionDecisionState.action === 'approve'
                      ? 'Are you sure you want to approve this account deletion request?'
                      : 'Are you sure you want to reject this account deletion request?'}
                  </p>
                </div>

                <div className="mt-2 flex w-full gap-3">
                  <button
                    onClick={closeDeletionDecisionModal}
                    disabled={isSubmittingDeletionDecision}
                    className="flex-1 rounded-xl bg-gray-100 py-3 font-bold text-gray-600 transition-all hover:bg-gray-200 disabled:opacity-50"
                  >
                    Cancel  
                  </button>

                  <button
                    onClick={() => void handleDeletionDecision()}
                    disabled={isSubmittingDeletionDecision}
                    className={`flex-1 rounded-xl py-3 font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                      deletionDecisionState.action === 'approve'
                        ? 'bg-indigo-600 hover:bg-indigo-700'
                        : 'bg-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {isSubmittingDeletionDecision
                      ? deletionDecisionState.action === 'approve'
                        ? 'Approving...'
                        : 'Rejecting...'
                      : deletionDecisionState.action === 'approve'
                        ? 'Approve'
                        : 'Reject'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {validIdReviewState.target && validIdReviewState.status && (
  <div className="fixed inset-0 z-[125] flex items-center justify-center bg-black/40 p-4">
    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
      <div className="text-center">
        <div
          className={`mx-auto flex size-14 items-center justify-center rounded-full ${
            validIdReviewState.status === 'approved'
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-rose-50 text-rose-600'
          }`}
        >
          {validIdReviewState.status === 'approved' ? (
            <Check size={28} />
          ) : (
            <X size={28} />
          )}
        </div>

        <h3 className="mt-4 text-lg font-bold text-gray-900">
          {validIdReviewState.status === 'approved'
            ? 'Approve Valid ID'
            : 'Reject Valid ID'}
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          {validIdReviewState.status === 'approved'
            ? 'This will mark the customer valid ID as approved.'
            : 'This will reject the customer valid ID and notify them to upload a replacement.'}
        </p>
      </div>

      {validIdReviewState.status === 'rejected' && (
        <textarea
          value={validIdReviewState.notes}
          onChange={(e) =>
            setValidIdReviewState((prev) => ({
              ...prev,
              notes: e.target.value,
            }))
          }
          rows={4}
          maxLength={500}
          placeholder="Optional rejection note..."
          className="mt-5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-50"
        />
      )}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={closeValidIdReviewModal}
          disabled={isSubmittingValidIdReview}
          className="flex-1 rounded-xl bg-gray-100 py-3 font-bold text-gray-600 transition hover:bg-gray-200 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={() => void handleValidIdReview()}
          disabled={isSubmittingValidIdReview}
          className={`flex-1 rounded-xl py-3 font-bold text-white transition disabled:opacity-50 ${
            validIdReviewState.status === 'approved'
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'bg-rose-600 hover:bg-rose-700'
          }`}
        >
          {isSubmittingValidIdReview
            ? 'Saving...'
            : validIdReviewState.status === 'approved'
            ? 'Approve'
            : 'Reject'}
        </button>
      </div>
    </div>
  </div>
)}

        {confirmTarget && !confirmTarget.deactivationBlocked && (confirmTarget.is_active ?? true) && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
            <div className="animate-in zoom-in-95 fade-in-0 w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl duration-200">
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
            <div className="animate-in zoom-in-95 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-xl duration-200">
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
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="break-words text-xl font-semibold text-gray-900">
                      {customer.firstName} {customer.lastName}
                    </h2>
                    <p className="mt-1 flex items-center gap-1.5 break-words text-sm font-mono uppercase text-gray-400">
                      <Hash size={12} /> {customer.publicId ?? customer.id}
                    </p>
                  </div>

                  <div
                    className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-medium ${
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
                    <StatusBadge className="bg-amber-100 text-amber-800">Occupied</StatusBadge>
                  )}

                  {customer.hasUpcomingBooking && (
                    <StatusBadge className="bg-blue-100 text-blue-800">
                      Upcoming Booking
                    </StatusBadge>
                  )}

                  {customer.hasUnpaidBalance && (
                    <StatusBadge className="bg-rose-100 text-rose-800">
                      Unpaid Balance
                    </StatusBadge>
                  )}

                  {customer.deletionStatus === 'pending' && (
                    <StatusBadge className="bg-purple-100 text-purple-800">
                      Deletion Pending
                    </StatusBadge>
                  )}

                  {customer.deletionStatus === 'approved' && (
                    <StatusBadge className="bg-indigo-100 text-indigo-800">Approved</StatusBadge>
                  )}

                  {customer.deletionStatus === 'rejected' && (
                    <StatusBadge className="bg-slate-100 text-slate-700">Rejected</StatusBadge>
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
                  <CustomerDetailItem
                    icon={<CalendarDays size={18} />}
                    label="Joined Date"
                    value={customer.createdAt ? formatDate(customer.createdAt) : '—'}
                  />

                  <CustomerDetailItem
                    icon={<User size={18} />}
                    label="Valid ID Status"
                    value={
                      customer.validIdStatus === 'approved'
                        ? 'Approved'
                        : customer.validIdStatus === 'pending'
                        ? 'Pending Review'
                        : customer.validIdStatus === 'rejected'
                        ? `Rejected${customer.validIdReviewNotes ? ` — ${customer.validIdReviewNotes}` : ''}`
                        : 'Not Submitted'
                    }
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
                      value={formatDate(customer.activeSince)}
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
                    <p className="mt-1 break-words text-sm text-amber-800">
                      {customer.deactivationReason}
                    </p>
                  </div>
                )}

                {customer.validIdFilePath && (
  <div className="mt-6 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
          Uploaded Valid ID
        </p>

        <p className="mt-1 text-sm text-slate-600">
          {customer.validIdStatus === 'approved'
            ? 'This valid ID has been approved.'
            : customer.validIdStatus === 'pending'
            ? 'This valid ID is waiting for admin review.'
            : customer.validIdStatus === 'rejected'
            ? 'This valid ID was rejected.'
            : 'A valid ID file is attached to this account.'}
        </p>

        {customer.validIdUploadedAt && (
          <p className="mt-2 text-xs text-slate-400">
            Uploaded {formatDate(customer.validIdUploadedAt)}
          </p>
        )}
      </div>

      <TableBadge
        className={
          customer.validIdStatus === 'approved'
            ? 'bg-emerald-100 text-emerald-700'
            : customer.validIdStatus === 'pending'
            ? 'bg-amber-100 text-amber-700'
            : customer.validIdStatus === 'rejected'
            ? 'bg-rose-100 text-rose-700'
            : 'bg-slate-100 text-slate-700'
        }
      >
        {customer.validIdStatus === 'approved'
          ? 'Approved'
          : customer.validIdStatus === 'pending'
          ? 'Pending'
          : customer.validIdStatus === 'rejected'
          ? 'Rejected'
          : 'Attached'}
      </TableBadge>
    </div>

    {customer.validIdStatus === 'rejected' &&
      customer.validIdReviewNotes && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
          <p className="text-xs font-semibold text-rose-700">
            Rejection Note
          </p>
          <p className="mt-1 text-sm text-rose-800">
            {customer.validIdReviewNotes}
          </p>
        </div>
      )}

    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
      <button
        type="button"
        onClick={() => void openValidIdFile(customer.validIdFilePath)}
        className="rounded-xl border border-blue-200 bg-blue-50 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
      >
        View ID
      </button>

      {customer.validIdStatus === 'pending' && (
        <>
          <button
            type="button"
            onClick={() =>
              openValidIdReviewModal(customer, 'approved')
            }
            disabled={isSubmittingValidIdReview}
            className="rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            Approve
          </button>

          <button
            type="button"
            onClick={() =>
              openValidIdReviewModal(customer, 'rejected')
            }
            disabled={isSubmittingValidIdReview}
            className="rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
          >
            Reject
          </button>
        </>
      )}
    </div>
  </div>
)}

                <div className="mt-8 flex flex-col gap-3">
  <div className="flex flex-col gap-2 sm:flex-row">
    <button
      onClick={closeCustomerModal}
      className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
    >
      Close details
    </button>

    <button
      type="button"
      onClick={() => void handleExportCustomer(customer)}
      className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
    >
      Export JSON
    </button>

    {customer.deletionStatus === 'approved' ? (
      <div className="flex-1 rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-center text-sm font-medium text-emerald-700">
        Awaiting user deletion
      </div>
    ) : (customer.is_active ?? true) ? (
      <button
        type="button"
        onClick={() => requestDeactivate(customer)}
        className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition ${
          customer.deactivationBlocked
            ? 'border-amber-200 bg-amber-50 text-amber-700'
            : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
        }`}
      >
        {customer.deactivationBlocked ? 'Cannot deactivate' : 'Deactivate'}
      </button>
    ) : (
      <button
        onClick={() => void toggleStatus(customer.id, true)}
        className="flex-1 rounded-xl border border-green-200 bg-green-50 py-2.5 text-sm font-medium text-green-600 hover:bg-green-100"
      >
        Reactivate
      </button>
    )}
  </div>

  {customer.deletionStatus === 'pending' && (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => openDeletionDecisionModal(customer, 'approve')}
        disabled={isSubmittingDeletionDecision}
        className="rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmittingDeletionDecision &&
        deletionDecisionState.target?.id === customer.id &&
        deletionDecisionState.action === 'approve'
          ? 'Approving...'
          : 'Approve deletion'}
      </button>

      <button
        type="button"
        onClick={() => openDeletionDecisionModal(customer, 'reject')}
        disabled={isSubmittingDeletionDecision}
        className="rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmittingDeletionDecision &&
        deletionDecisionState.target?.id === customer.id &&
        deletionDecisionState.action === 'reject'
          ? 'Rejecting...'
          : 'Reject request'}
      </button>
    </div>
  )}

  {customer.deletionStatus === 'approved' && (
    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
      <p className="text-xs font-semibold text-emerald-700">
        Request approved
      </p>
      <p className="mt-1 text-sm text-emerald-800">
        This request has been approved. The user must complete the final account
        deletion from their profile.
      </p>
    </div>
  )}
</div>
              </div>
            </div>
          </div>
        )}

        {showAddModal && (
  <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/60 p-4">
    <div className="flex min-h-full items-center justify-center">
      <div className="w-full sm:max-w-4xl h-[92vh] sm:h-auto sm:max-h-[92vh] rounded-t-[2rem] sm:rounded-[2rem] border border-gray-200 bg-gray-50 shadow-[0_20px_60px_rgba(15,23,42,0.18)] flex flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5 sm:px-8">
          <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-blue-600 p-3 text-white">
                        <Building2 className="size-5" />
                      </div>
          
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
                          Administrator Tools
                        </p>
                        <h2 className="text-lg font-bold tracking-tight text-gray-900 sm:text-xl">
                          Add Customer
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                          Create a customer account from the admin panel.
                        </p>
                      </div>
                    </div>

          <button
            type="button"
            onClick={closeAddModal}
            className="rounded-2xl border border-gray-300 bg-white p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
        <AdminUserForm
          newCustomer={newCustomer}
          newCustomerErrors={newCustomerErrors}
          canSubmitNewCustomer={canSubmitNewCustomer}
          updateNewCustomerField={updateNewCustomerField}
          setNewCustomer={setNewCustomer}
          setNewCustomerErrors={setNewCustomerErrors}
          normalizeName={normalizeName}
          normalizeEmail={normalizeEmail}
          normalizePHPhone={normalizePHPhone}
          isPasswordPolicyValid={isPasswordPolicyValid}
          handleSubmit={handleAddCustomer}
          onCancel={closeAddModal}
          FormField={FormField}
          AddressPicker={AddressPicker}
          PasswordStrengthIndicator={PasswordStrengthIndicator}
          submitLabel="Create Customer"
          submittingLabel="Creating..."
          isSubmitting={isCreatingCustomer}
        />
        </div>
      </div>
    </div>
  </div>
)}
      </div>
    </div>
  );
}