import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useAdminData } from '../../contexts/AdminDataContext';
import { useReservations } from '../../contexts/ReservationsContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { DataTable, DataCell, ActionCell } from '../../components/common/DataTable';
import { formatDate } from '../../utils/date';
import { useNavigate } from 'react-router-dom';
import SortSelect from '../../components/shared/filters/SortSelect';
import type { ReservationSortOption } from '../../data/sorting';
import { RESERVATION_SORT_OPTIONS } from '../../utils/sorting/sortingOptions';
import { sortReservations } from '../../utils/sorting/sortReservations';
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  X,
  Plus,
  Calendar,
  CreditCard,
  User,
  Building,
  MapPin,
  Clock,
  Tag,
  FileText,
} from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { getUnitTypeLabel } from '../../utils/propertyHelpers';
import AdminActionModal from '../../components/modals/AdminActionModal';
import { motion } from 'framer-motion';
import EmptyState from '../../components/common/EmptyState';
import { useUsers } from '../../contexts/UsersContext';
import type { ReservationDetails } from '../../data/types';
import AdminFilterBar, {
  FILTER_SELECT_CLASS,
} from '../../components/common/AdminFilterBar';


type ReservationFilterStatus =
  | 'all'
  | 'pending'
  | 'confirmed'
  | 'overdue'
  | 'completed'
  | 'cancelled'
  | 'rejected';

function enrichReservation(reservation: any, user: any, unit?: any) {
  const reservationPublicId = reservation.publicId ?? reservation.id;
  const userPublicId = user?.publicId ?? '';
  const fullName =
    `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() ||
    user?.email ||
    'Unknown User';

  return {
    ...reservation,
    linkedUser: user ?? null,
    linkedUnit: unit ?? null,
    reservationPublicId,
    userPublicId,
    fullName,
    location: reservation.location ?? unit?.location ?? 'Not Specified',
    requestDateMs: new Date(reservation.requestDate).getTime(),
    startDateLabel: formatDate(reservation.startDate),
    endDateLabel: formatDate(reservation.endDate),
    requestDateLabel: formatDate(reservation.requestDate),
    paidPercent:
      reservation.totalAmount > 0
        ? `${((reservation.paidAmount / reservation.totalAmount) * 100).toFixed(0)}% paid`
        : '0% paid',
  };
}

type EnrichedReservation = ReturnType<typeof enrichReservation>;

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  confirmed: 'bg-green-100 text-green-700 border-green-200',
  overdue: 'bg-orange-100 text-orange-700 border-orange-200',
  completed: 'bg-blue-100 text-blue-700 border-blue-200',
  cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
};

function getRemainingBalance(reservation: {
  totalAmount?: number | null;
  paidAmount?: number | null;
}) {
  return Math.max(
    Number(reservation.totalAmount || 0) - Number(reservation.paidAmount || 0),
    0
  );
}

function isFullyPaid(reservation: {
  totalAmount?: number | null;
  paidAmount?: number | null;
}) {
  return getRemainingBalance(reservation) <= 0;
}

function hasRecordedPayment(reservation: {
  paidAmount?: number | null;
}) {
  return Number(reservation.paidAmount || 0) > 0;
}

function isOverdueReservation(reservation: {
  status?: string | null;
  endDate?: string | Date | null;
  totalAmount?: number | null;
  paidAmount?: number | null;
}) {
  if (reservation.status !== 'confirmed') return false;
  if (isFullyPaid(reservation)) return false;
  if (!reservation.endDate) return false;

  const end = new Date(reservation.endDate).getTime();
  if (Number.isNaN(end)) return false;

  return end < Date.now();
}

function getDisplayReservationStatus(reservation: any) {
  return isOverdueReservation(reservation) ? 'overdue' : reservation.status;
}


function getExtensionRequestDetails(reservation: any) {
  const details = reservation?.details ?? {};

  const extensionRequested = details.extensionRequested === true;
  const extensionMonths = Number(details.extensionMonths ?? 0);

  if (!extensionRequested || !Number.isFinite(extensionMonths) || extensionMonths <= 0) {
    return null;
  }

  const currentEndDate = reservation?.endDate ? new Date(reservation.endDate) : null;

  if (!currentEndDate || Number.isNaN(currentEndDate.getTime())) {
    return {
      extensionRequested: true,
      extensionMonths,
      proposedEndDate: null as Date | null,
    };
  }

  const proposedEndDate = new Date(currentEndDate);
  proposedEndDate.setMonth(proposedEndDate.getMonth() + extensionMonths);

  return {
    extensionRequested: true,
    extensionMonths,
    proposedEndDate,
  };
}

function canHandleExtension(reservation: any) {
  //return reservation?.unitType === 'rental_space' || reservation?.unitType === 'parking_slot';
  return reservation?.unitType === 'rental_space';
}

function computeExtensionUpdate(reservation: any, months: number) {
  const currentEnd = new Date(reservation.endDate);

  const newEnd = new Date(currentEnd);
  newEnd.setMonth(newEnd.getMonth() + months);

  const currentDuration = Number(reservation.duration || 0);
  const newDuration = currentDuration + months;

  const monthlyRate =
    currentDuration > 0 ? Number(reservation.totalAmount) / currentDuration : 0;

  const additionalAmount = monthlyRate * months;
  const newTotalAmount = Number(reservation.totalAmount) + additionalAmount;

  return {
    newEndDate: newEnd.toISOString(),
    newDuration,
    newTotalAmount,
    additionalAmount,
  };
}

function rangesOverlap(
  startA?: string | Date | null,
  endA?: string | Date | null,
  startB?: string | Date | null,
  endB?: string | Date | null
) {
  if (!startA || !endA || !startB || !endB) return false;

  const aStart = new Date(startA).getTime();
  const aEnd = new Date(endA).getTime();
  const bStart = new Date(startB).getTime();
  const bEnd = new Date(endB).getTime();

  if (
    Number.isNaN(aStart) ||
    Number.isNaN(aEnd) ||
    Number.isNaN(bStart) ||
    Number.isNaN(bEnd)
  ) {
    return false;
  }

  return aStart <= bEnd && aEnd >= bStart;
}

function useDebouncedValue<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default function AdminReservations() {

  const loadStartRef = useRef<number | null>(null);
const hasMeasuredRef = useRef(false);
const navigate = useNavigate();
  const { updateReservation, getUnitById, loadingUnits } = useAdminData();
  const { users, isLoadingUsers, refreshUsers, getUserById } = useUsers();
  const { fetchReservationsPage, reservationsVersion } = useReservations();
  const {
    sendReservationNotification,
    sendVisitNotification,
    sendOverdueReservationNotification,
  } = useNotifications();

  const [reservations, setReservations] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ReservationFilterStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReservation, setSelectedReservation] = useState<string | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [hasLoadedReservations, setHasLoadedReservations] = useState(false);
  const [isProcessingExtension, setIsProcessingExtension] = useState(false);
  const [extensionError, setExtensionError] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<ReservationSortOption>('newest');

  const debouncedSearch = useDebouncedValue(searchTerm, 250);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const [pageInput, setPageInput] = useState('1');

  const isUsersReady = users.length > 0 || !isLoadingUsers;
  const isUnitsReady = !loadingUnits;
  const isPageReady = hasLoadedReservations && isUsersReady && isUnitsReady;
  const shouldShowLoadingState = loading || !isPageReady;

  const loadReservationsPage = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;

      if (!silent) {
        setLoading(true);
        setHasLoadedReservations(false);
      }

      try {
        const result = await fetchReservationsPage({
          page,
          pageSize,
          status: filterStatus === 'overdue' ? 'all' : filterStatus,
          searchTerm: debouncedSearch,
        });

        setReservations(result.data);
        setTotalCount(result.count);
        setHasLoadedReservations(true);
      } catch (error) {
        console.error('Failed to load reservations page:', error);
        setReservations([]);
        setTotalCount(0);
        setHasLoadedReservations(true);
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [fetchReservationsPage, page, pageSize, filterStatus, debouncedSearch]
  );

  useEffect(() => {
  if (!isPageReady) return;
  if (hasMeasuredRef.current) return;

  const end = performance.now();
  const start = loadStartRef.current ?? end;

  console.log(
    `[Reservations] ✅ Load complete in ${(end - start).toFixed(2)} ms`
  );

  hasMeasuredRef.current = true;
}, [isPageReady]);

  useEffect(() => {
  loadStartRef.current = performance.now();
  hasMeasuredRef.current = false;

  console.log('[Reservations] ⏱️ Load started');
}, []);

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  useEffect(() => {
    if (users.length === 0) {
      void refreshUsers();
    }
  }, [users.length, refreshUsers]);

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
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handlePageJump();
      }
    },
    [handlePageJump]
  );

  useEffect(() => {
  setPage(1);
}, [filterStatus, debouncedSearch, sortBy]);

  useEffect(() => {
    void loadReservationsPage();
  }, [loadReservationsPage]);

  useEffect(() => {
    if (!hasLoadedReservations) return;

    const timer = window.setTimeout(() => {
      void loadReservationsPage({ silent: true });
    }, 50);

    return () => window.clearTimeout(timer);
  }, [reservationsVersion, hasLoadedReservations, loadReservationsPage]);

  const enrichedReservations = useMemo<EnrichedReservation[]>(() => {
    return reservations.map((reservation) => {
      const user = getUserById(reservation.userId);
      const unit = getUnitById(reservation.unitId);
      return enrichReservation(reservation, user, unit);
    });
  }, [reservations, getUserById, getUnitById]);

  const pendingParkingCount = useMemo(() => {
  return reservations.filter(
    (reservation) =>
      reservation.unitType === 'parking_slot' &&
      reservation.status === 'pending'
  ).length;
}, [reservations]);

const filteredReservations = useMemo(() => {
  const term = debouncedSearch.trim().toLowerCase();

  const baseReservations =
    filterStatus === 'overdue'
      ? enrichedReservations.filter((reservation) =>
          isOverdueReservation(reservation)
        )
      : enrichedReservations;

  if (!term) return baseReservations;

  return baseReservations.filter((r) => {
    const fields = [
      r.fullName,
      r.reservationPublicId,
      r.userPublicId,
      r.unitName,
      r.location,
      getDisplayReservationStatus(r),
      r.modeOfVisit,
      r.linkedUser?.email,
      r.linkedUser?.firstName,
      r.linkedUser?.lastName,
    ];

    return fields.some((value) =>
      String(value ?? '').toLowerCase().includes(term)
    );
  });
}, [enrichedReservations, debouncedSearch, filterStatus]);

const sortedReservations = useMemo(() => {
  return sortReservations(
    filteredReservations.map((reservation) => ({
      ...reservation,
      created_at: reservation.requestDate,
      start_date: reservation.startDate,
      total_amount: reservation.totalAmount,
      public_id: reservation.reservationPublicId,
      unitName: reservation.unitName,
      status: reservation.status,
    })),
    sortBy
  );
}, [filteredReservations, sortBy]);

  const selectedReservationData = useMemo(() => {
    return selectedReservation
      ? enrichedReservations.find((reservation) => reservation.id === selectedReservation) ?? null
      : null;
  }, [selectedReservation, enrichedReservations]);

  const selectedReservationExtension = useMemo(() => {
    if (!selectedReservationData) return null;
    return getExtensionRequestDetails(selectedReservationData);
  }, [selectedReservationData]);

  const hasActiveSearch = Boolean(debouncedSearch.trim());
  const hasActiveFilters = filterStatus !== 'all' || hasActiveSearch;

  const hasNoReservations =
  !shouldShowLoadingState && enrichedReservations.length === 0 && !hasActiveFilters;

const hasNoSearchResults =
  !shouldShowLoadingState && sortedReservations.length === 0 && hasActiveFilters;

  const shouldShowFilters =
    !shouldShowLoadingState && (!hasNoReservations || hasActiveFilters);

  const reloadPage = useCallback(async () => {
    const result = await fetchReservationsPage({
  page,
  pageSize,
  status: filterStatus === 'overdue' ? 'all' : filterStatus,
  searchTerm: debouncedSearch,
});
    setReservations(result.data);
    setTotalCount(result.count);
  }, [fetchReservationsPage, page, pageSize, filterStatus, debouncedSearch]);

  const handleConfirmVisit = useCallback(
    async (reservation: EnrichedReservation) => {
      await updateReservation(reservation.id, {
        confirmedVisitDate: reservation.appointmentDate,
        confirmedVisitTime: reservation.appointmentTime,
        visitStatus: 'confirmed',
      });

      await sendVisitNotification({
        userId: reservation.userId,
        reservationPublicId: reservation.reservationPublicId,
        action: 'confirmed',
        confirmedVisitDate: reservation.appointmentDate,
        confirmedVisitTime: reservation.appointmentTime,
      });

      setSelectedReservation(null);
      await reloadPage();
    },
    [updateReservation, sendVisitNotification, reloadPage]
  );

  const handleRequestReschedule = useCallback(
    async (reservation: EnrichedReservation) => {
      await updateReservation(reservation.id, {
        visitStatus: 'reschedule_requested',
      });

      await sendVisitNotification({
        userId: reservation.userId,
        reservationPublicId: reservation.reservationPublicId,
        action: 'reschedule_requested',
      });

      setSelectedReservation(null);
      await reloadPage();
    },
    [updateReservation, sendVisitNotification, reloadPage]
  );

  const handleApprove = useCallback(
    async (reservation: EnrichedReservation) => {
      await updateReservation(reservation.id, { status: 'confirmed' });

      await sendReservationNotification({
        userId: reservation.userId,
        reservationPublicId: reservation.reservationPublicId,
        action: 'approved',
      });

      setSelectedReservation(null);
      await reloadPage();
    },
    [updateReservation, sendReservationNotification, reloadPage]
  );

  const handleReject = useCallback(
    async (reservation: EnrichedReservation) => {
      await updateReservation(reservation.id, { status: 'cancelled' });

      await sendReservationNotification({
        userId: reservation.userId,
        reservationPublicId: reservation.reservationPublicId,
        action: 'rejected',
      });

      setSelectedReservation(null);
      await reloadPage();
    },
    [updateReservation, sendReservationNotification, reloadPage]
  );

  const handleComplete = useCallback(
    async (reservation: EnrichedReservation) => {
      await updateReservation(reservation.id, { status: 'completed' });

      await sendReservationNotification({
        userId: reservation.userId,
        reservationPublicId: reservation.reservationPublicId,
        action: 'completed',
      });

      setSelectedReservation(null);
      await reloadPage();
    },
    [updateReservation, sendReservationNotification, reloadPage]
  );

  const handleSendOverdueNotice = useCallback(
    async (reservation: EnrichedReservation) => {
      await sendOverdueReservationNotification({
        userId: reservation.userId,
        reservationPublicId: reservation.reservationPublicId,
        remainingBalance: getRemainingBalance(reservation),
      });
    },
    [sendOverdueReservationNotification]
  );

  const handleApproveExtension = useCallback(
    async (reservation: EnrichedReservation) => {
      const extension = getExtensionRequestDetails(reservation);

      if (!extension || !canHandleExtension(reservation) || isProcessingExtension) return;

      try {
        setExtensionError(null);
        setIsProcessingExtension(true);

        const { newEndDate, newDuration, newTotalAmount } = computeExtensionUpdate(
          reservation,
          extension.extensionMonths
        );

        const hasConflict = reservations.some((candidate) => {
          if (candidate.id === reservation.id) return false;
          if (candidate.unitId !== reservation.unitId) return false;
          if (!['approved', 'confirmed'].includes(candidate.status)) return false;

          return rangesOverlap(
            reservation.endDate,
            newEndDate,
            candidate.startDate,
            candidate.endDate
          );
        });

        if (hasConflict) {
          setExtensionError(
            'Cannot approve extension because the new date range conflicts with another approved or confirmed reservation.'
          );
          return;
        }

        const nextDetails: ReservationDetails = {
          ...(reservation.details ?? {}),
          extensionRequested: false,
          extensionApprovedAt: new Date().toISOString(),
          extensionApprovedMonths: extension.extensionMonths,
          extensionMonths: undefined,
        };

        await updateReservation(reservation.id, {
          endDate: newEndDate,
          duration: newDuration,
          totalAmount: newTotalAmount,
          details: nextDetails as any,
        });

        await sendReservationNotification({
          userId: reservation.userId,
          reservationPublicId: reservation.reservationPublicId,
          action: 'approved',
        });

        setSelectedReservation(null);
        await reloadPage();
      } finally {
        setIsProcessingExtension(false);
      }
    },
    [isProcessingExtension, reservations, reloadPage, sendReservationNotification, updateReservation]
  );

  const handleRejectExtension = useCallback(
    async (reservation: EnrichedReservation) => {
      const extension = getExtensionRequestDetails(reservation);

      if (!extension || !canHandleExtension(reservation) || isProcessingExtension) return;

      try {
        setExtensionError(null);
        setIsProcessingExtension(true);

        const nextDetails: ReservationDetails = {
          ...(reservation.details ?? {}),
          extensionRequested: false,
          extensionRejectedAt: new Date().toISOString(),
          extensionRejectedMonths: extension.extensionMonths,
          extensionMonths: undefined,
        };

        await updateReservation(reservation.id, {
          details: nextDetails as any,
        });

        await sendReservationNotification({
          userId: reservation.userId,
          reservationPublicId: reservation.reservationPublicId,
          action: 'rejected',
        });

        setSelectedReservation(null);
        await reloadPage();
      } finally {
        setIsProcessingExtension(false);
      }
    },
    [isProcessingExtension, reloadPage, sendReservationNotification, updateReservation]
  );

  const closeDetails = useCallback(() => {
    setSelectedReservation(null);
    setExtensionError(null);
  }, []);

  const openCreateModal = useCallback(() => setIsActionModalOpen(true), []);
  const closeCreateModal = useCallback(() => setIsActionModalOpen(false), []);
  const closeFilterPanel = useCallback(() => setIsFilterPanelOpen(false), []);

  const openParkingRequests = useCallback(() => {
    navigate('/admin/parking');
  }, [navigate]);

  const isParkingReservation = (reservation: any) =>
  reservation.unitType === 'parking_slot';

  return (
    <div className="min-h-screen bg-white">
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <div className="hidden lg:flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reservation Management</h1>
            <p className="text-sm text-gray-500">Manage and audit all Unit bookings</p>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <button
              type="button"
              onClick={openParkingRequests}
              className="relative flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
            >
              <Calendar className="size-5" />

              <span className="hidden font-medium sm:inline">
                Manage Parking Requests
              </span>

              {pendingParkingCount > 0 && (
                <span className="absolute -right-2 -top-2 inline-flex min-w-[22px] items-center justify-center rounded-full bg-rose-500 px-1.5 py-1 text-[10px] font-bold leading-none text-white shadow-md">
                  {pendingParkingCount > 99 ? '99+' : pendingParkingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center justify-center cursor-pointer gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-100 transition-all hover:bg-blue-700 active:scale-95"
            >
              <Plus className="size-5" />
              <span className="hidden font-medium sm:inline">Create Reservation</span>
            </button>
          </div>
        </div>

        {shouldShowFilters && (
  <AdminFilterBar
    searchTerm={searchTerm}
    onSearchChange={setSearchTerm}
    placeholder="Search by reservation ID, user ID, unit, or customer."
    showMobileFilters={isFilterPanelOpen}
    onToggleMobileFilters={() => setIsFilterPanelOpen((prev) => !prev)}
    actions={
      <div className="hidden lg:flex lg:items-center lg:gap-2">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as ReservationFilterStatus)}
          className={FILTER_SELECT_CLASS}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="overdue">Overdue</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="rejected">Rejected</option>
        </select>

        <SortSelect<ReservationSortOption>
      value={sortBy}
      onChange={setSortBy}
      options={RESERVATION_SORT_OPTIONS}
      className="min-w-[230px]"
    />

        {(searchTerm.trim() || filterStatus !== 'all' || sortBy !== 'newest') && (
  <button
    type="button"
    onClick={() => {
      setSearchTerm('');
      setFilterStatus('all');
      setSortBy('newest');
      setIsFilterPanelOpen(false);
    }}
            className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
          >
            Clear
          </button>
        )}
      </div>
    }
    filters={
      <div className="grid grid-cols-1 gap-2 lg:hidden">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as ReservationFilterStatus)}
          className={FILTER_SELECT_CLASS}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="overdue">Overdue</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="rejected">Rejected</option>
        </select>

        <SortSelect<ReservationSortOption>
      value={sortBy}
      onChange={setSortBy}
      options={RESERVATION_SORT_OPTIONS}
      className="w-full"
    />

        {(searchTerm.trim() || filterStatus !== 'all' || sortBy !== 'newest') && (
  <button
    type="button"
    onClick={() => {
      setSearchTerm('');
      setFilterStatus('all');
      setSortBy('newest');
      setIsFilterPanelOpen(false);
    }}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
          >
            Clear Filters
          </button>
        )}
      </div>
    }
  />
)}

        <div className="flex-1">
          {shouldShowLoadingState ? (
            <EmptyState
              icon={
                <div className="flex items-center justify-center">
                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
              }
              title="Loading reservations..."
              description="Please wait while reservation records are being retrieved."
            />
          ) : hasNoReservations ? (
            <EmptyState
              icon={<Calendar className="size-10 text-blue-500" />}
              title="No reservations yet"
              description="Reservations will appear here once customers submit bookings or an administrator creates one."
            />
          ) : hasNoSearchResults ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="bg-gray-50 p-6 rounded-3xl shadow-sm mb-4">
                <Search className="size-12 text-blue-500" />
              </div>

              <h3 className="text-lg font-bold text-gray-900">
                No matching reservations found
              </h3>

              <p className="text-gray-500 max-w-xs text-sm mt-1">
                Try adjusting your search term or status filter.
              </p>
            </motion.div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4">
                {sortedReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4"
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-mono text-[10px] text-gray-400 uppercase tracking-tighter">
                        ID: {reservation.reservationPublicId}
                      </div>

                      <div className="flex flex-wrap justify-end gap-2">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                            statusColors[getDisplayReservationStatus(reservation) as keyof typeof statusColors]
                          }`}
                        >
                          {getDisplayReservationStatus(reservation).toUpperCase()}
                        </span>

                        {getExtensionRequestDetails(reservation) && canHandleExtension(reservation) && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700">
                            EXTENSION REQUESTED
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-bold text-gray-900 leading-tight">
                        {reservation.unitName}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {getUnitTypeLabel(reservation.unitType)} • {reservation.location || 'N/A'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50 text-sm">
                      <div>
                        <span className="block text-[10px] text-gray-400 uppercase font-bold">
                          Progress
                        </span>
                        <span className="font-semibold text-blue-600">
                          {formatCurrency(reservation.paidAmount)}
                        </span>
                      </div>

                      <div>
                        <span className="block text-[10px] text-gray-400 uppercase font-bold">
                          Total
                        </span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(reservation.totalAmount)}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-3">
                      <div className="text-xs text-gray-500">
                        <Calendar className="size-3 inline mr-1 mb-0.5" />
                        {reservation.startDateLabel}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedReservation(reservation.id)}
                          className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"
                        >
                          <Eye className="size-5" />
                        </button>

                        {reservation.status === 'pending' && !isParkingReservation(reservation) && (
  <>
    {reservation.modeOfVisit === 'onsite' && (
      <>
        <button
          onClick={() => handleConfirmVisit(reservation)}
          className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg"
          title="Confirm Visit"
        >
          <Calendar className="size-4" />
        </button>

        <button
          onClick={() => handleRequestReschedule(reservation)}
          className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg"
          title="Request Reschedule"
        >
          <Clock className="size-4" />
        </button>
      </>
    )}

    <button
      onClick={() => handleApprove(reservation)}
      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
      title="Approve"
    >
      <CheckCircle className="size-4" />
    </button>

    <button
      onClick={() => handleReject(reservation)}
      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
      title="Reject"
    >
      <XCircle className="size-4" />
    </button>
  </>
)}

                        {reservation.status === 'confirmed' && (
                          <button
                            onClick={() => {
                              if (!isFullyPaid(reservation)) return;
                              handleComplete(reservation);
                            }}
                            disabled={!isFullyPaid(reservation)}
                            className={`p-2 rounded-lg ${
                              isFullyPaid(reservation)
                                ? 'text-blue-600 hover:bg-blue-50'
                                : 'cursor-not-allowed text-gray-300'
                            }`}
                            title={
                              isFullyPaid(reservation)
                                ? 'Mark as Completed'
                                : `Cannot mark as completed until fully paid. Remaining: ${formatCurrency(
                                    getRemainingBalance(reservation)
                                  )}`
                            }
                          >
                            <CheckCircle className="size-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden lg:block">
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <DataTable
                      headers={[
                        <span className="block">Reservation ID</span>,
                        <span className="block">User ID</span>,
                        <span className="block">Unit</span>,
                        <span className="block">Date Range</span>,
                        <span className="block">Amount</span>,
                        <span className="block">Visit Type</span>,
                        <span className="block">Visit Status</span>,
                        <span className="block">Reservation Status</span>,
                        <span className="block">Actions</span>,
                      ]}
                    >
                  {sortedReservations.map((reservation) => (
                    <tr key={reservation.id} className="transition-colors hover:bg-blue-50/30">
                      <DataCell
                        value={reservation.reservationPublicId}
                        mono
                        className="w-[220px]"
                      />

                      <DataCell
                        value={reservation.userPublicId || (isLoadingUsers ? 'Loading...' : 'Unknown')}
                        mono
                        className="w-[220px]"
                      />

                      <DataCell
                        className="w-[240px]"
                        value={
                          <div>
                            <p className="font-semibold text-gray-900">{reservation.unitName}</p>
                            <p className="mt-0.5 text-xs text-gray-500">
                              {getUnitTypeLabel(reservation.unitType)}
                            </p>
                          </div>
                        }
                      />

                      <DataCell
                        className="w-[200px]"
                        value={
                          <div className="text-xs text-gray-500">
                            <div>{reservation.startDateLabel}</div>
                            <div>to {reservation.endDateLabel}</div>
                          </div>
                        }
                      />

                      <DataCell
                        className="w-[220px]"
                        mono
                        value={
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              Price
                            </p>

                            <p className="mt-1 text-sm font-bold text-slate-700">
                              {formatCurrency(reservation.totalAmount)}
                            </p>

                            <span
                              className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                isFullyPaid(reservation)
                                  ? 'bg-green-100 text-green-700'
                                  : hasRecordedPayment(reservation)
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {isFullyPaid(reservation)
                                ? 'Paid'
                                : hasRecordedPayment(reservation)
                                ? 'Partial'
                                : 'Unpaid'}
                            </span>
                          </div>
                        }
                      />

                      <DataCell
                        className="w-[180px]"
                        value={
                          <div className="space-y-2">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                                reservation.modeOfVisit === 'onsite'
                                  ? 'border-blue-100 bg-blue-50 text-blue-700'
                                  : 'border-green-200 bg-green-400 text-white'
                              }`}
                            >
                              {reservation.modeOfVisit?.replace('_', ' ') || 'online'}
                            </span>

                            {reservation.modeOfVisit === 'onsite' && reservation.appointmentDate ? (
                              <div className="space-y-0.5 text-[11px]">
                                <div className="font-medium text-gray-700">
                                  {formatDate(reservation.appointmentDate)}
                                </div>
                                {reservation.appointmentTime && (
                                  <div className="text-gray-500">{reservation.appointmentTime}</div>
                                )}
                              </div>
                            ) : (
                              <div className="text-[11px] text-gray-400">No schedule needed</div>
                            )}
                          </div>
                        }
                      />

                      <DataCell
                        className="w-[160px]"
                        value={
                          <span className="text-xs font-medium capitalize text-indigo-600">
                            {reservation.modeOfVisit === 'onsite'
                              ? reservation.visitStatus || 'Requested'
                              : 'Not applicable'}
                          </span>
                        }
                      />

                      <DataCell
                        className="w-[180px]"
                        value={
                          <div className="flex flex-wrap gap-1.5">
                            <span
                              className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                                statusColors[getDisplayReservationStatus(reservation) as keyof typeof statusColors]
                              }`}
                            >
                              {getDisplayReservationStatus(reservation).toUpperCase()}
                            </span>

                            {getExtensionRequestDetails(reservation) && canHandleExtension(reservation) && (
                              <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                                Extension requested
                              </span>
                            )}
                          </div>
                        }
                      />

                      <ActionCell className="w-[130px]">
                        <button
                          onClick={() => setSelectedReservation(reservation.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-blue-600 hover:bg-blue-100"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>

                        {reservation.status === 'pending' && !isParkingReservation(reservation) && (
  <>
    {reservation.modeOfVisit === 'onsite' && (
      <>
        <button
          onClick={() => handleConfirmVisit(reservation)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-indigo-600 hover:bg-indigo-100"
          title="Confirm Visit"
        >
          <Calendar size={16} />
        </button>

        <button
          onClick={() => handleRequestReschedule(reservation)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-amber-600 hover:bg-amber-100"
          title="Request Reschedule"
        >
          <Clock size={16} />
        </button>
      </>
    )}

    <button
      onClick={() => handleApprove(reservation)}
      className="flex h-8 w-8 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-100"
      title="Approve"
    >
      <CheckCircle size={16} />
    </button>

    <button
      onClick={() => handleReject(reservation)}
      className="flex h-8 w-8 items-center justify-center rounded-md text-rose-600 hover:bg-rose-100"
      title="Reject"
    >
      <XCircle size={16} />
    </button>
  </>
)}

                        {reservation.status === 'confirmed' && (
                          <button
                            onClick={() => {
                              if (!isFullyPaid(reservation)) return;
                              handleComplete(reservation);
                            }}
                            disabled={!isFullyPaid(reservation)}
                            className={`flex h-8 w-8 items-center justify-center rounded-md ${
                              isFullyPaid(reservation)
                                ? 'text-blue-600 hover:bg-blue-100'
                                : 'cursor-not-allowed text-gray-300'
                            }`}
                            title={
                              isFullyPaid(reservation)
                                ? 'Mark as Completed'
                                : `Cannot mark as completed until fully paid. Remaining: ${formatCurrency(
                                    getRemainingBalance(reservation)
                                  )}`
                            }
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                      </ActionCell>
                    </tr>
                  ))}
                </DataTable>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {!shouldShowLoadingState && !hasNoReservations && totalPages > 1 && (
        <div className="flex flex-col gap-3 bg-white border border-gray-200 rounded-2xl shadow-sm px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages} • {totalCount} total reservations
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-2 text-sm rounded-lg border border-gray-300 disabled:opacity-50"
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
                className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handlePageJump}
                className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Go
              </button>
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-2 text-sm rounded-lg border border-gray-300 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {isFilterPanelOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center lg:hidden">
          <button className="absolute inset-0 bg-gray-900/40" onClick={closeFilterPanel} />
          <div className="relative w-full rounded-t-3xl bg-white p-6 shadow-xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">Filter by Status</h3>
              <button onClick={closeFilterPanel} className="p-2 bg-gray-100 rounded-full">
                <X className="size-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {(['all', 'pending', 'confirmed', 'overdue', 'completed', 'cancelled', 'rejected'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setFilterStatus(status);
                    closeFilterPanel();
                  }}
                  className={`w-full py-4 px-6 rounded-2xl text-left font-semibold border-2 transition-all ${
                    filterStatus === status
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-100 bg-gray-50 text-gray-600'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedReservationData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 transition-all duration-300">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-slate-200/60 bg-white shadow-xl animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-slate-900 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Reservation Dossier
                </h2>
                <p className="text-slate-400 text-xs font-medium mt-1 font-mono">
                  {selectedReservationData.publicId ?? selectedReservationData.id}
                </p>
              </div>

              <button
                onClick={closeDetails}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3 ml-1">
                  Reservation Overview
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  <DetailItem
                    icon={<Building className="size-4" />}
                    label="Unit"
                    value={selectedReservationData.unitName}
                    subValue={getUnitTypeLabel(selectedReservationData.unitType)}
                  />

                  <DetailItem
                    icon={<User className="size-4" />}
                    label="Customer"
                    value={selectedReservationData.fullName || 'Unknown'}
                    subValue={`ID: ${
                      selectedReservationData.userPublicId || (isLoadingUsers ? 'Loading...' : 'Unknown')
                    }`}
                  />

                  <DetailItem
                    icon={<MapPin className="size-4" />}
                    label="Location"
                    value={selectedReservationData.location || 'Not Specified'}
                  />

                  <DetailItem
                    icon={<Calendar className="size-4" />}
                    label="Check-In"
                    value={selectedReservationData.startDateLabel}
                  />

                  <DetailItem
                    icon={<Calendar className="size-4" />}
                    label="Check-Out"
                    value={selectedReservationData.endDateLabel}
                  />

                  <DetailItem
                    icon={<Clock className="size-4" />}
                    label="Duration"
                    value={`${selectedReservationData.duration} ${
                      selectedReservationData.unitType === 'rental_space' ? 'Months' : 'Days'
                    }`}
                  />

                  <DetailItem
                    icon={<CreditCard className="size-4" />}
                    label="Paid To Date"
                    value={formatCurrency(selectedReservationData.paidAmount)}
                    highlight
                  />

                  <DetailItem
                    icon={<Tag className="size-4" />}
                    label="Total Contract"
                    value={formatCurrency(selectedReservationData.totalAmount)}
                  />

                  <DetailItem
                    icon={<Clock className="size-4" />}
                    label="Request Date"
                    value={selectedReservationData.requestDateLabel}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
                  <h4 className="text-[11px] font-semibold text-blue-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <FileText className="size-4" />
                    Technical Details
                  </h4>

                  <div className="space-y-3">
                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-slate-500">Visit Mode</span>
                      <span className="font-semibold text-slate-900 capitalize">
                        {selectedReservationData.modeOfVisit}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-slate-500">On-site Plan</span>
                      <span className="font-semibold text-slate-900">
                        {selectedReservationData.paymentIntent === 'pay_onsite'
                          ? 'Pay On Arrival'
                          : 'Decide Later'}
                      </span>
                    </div>

                    {selectedReservationData.bookingTerm && (
                      <div className="flex justify-between gap-4 text-sm">
                        <span className="text-slate-500">Booking Term</span>
                        <span className="font-semibold text-slate-900 capitalize">
                          {selectedReservationData.bookingTerm}
                        </span>
                      </div>
                    )}

                    {selectedReservationData.paymentMode && (
                      <div className="flex justify-between gap-4 text-sm">
                        <span className="text-slate-500">Billing</span>
                        <span className="font-semibold text-slate-900">
                          {selectedReservationData.paymentMode === 'deposit_plus_first_month'
                            ? 'Deposit + First Month'
                            : 'Full Upfront'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Tag className="size-4" />
                    Categorization
                  </h4>

                  <div className="space-y-3">
                    {selectedReservationData.businessType && (
                      <div className="flex justify-between gap-4 text-sm">
                        <span className="text-slate-500">Business</span>
                        <span className="font-semibold text-slate-900">
                          {selectedReservationData.businessType}
                        </span>
                      </div>
                    )}

                    {selectedReservationData.eventPurpose && (
                      <div className="flex justify-between gap-4 text-sm">
                        <span className="text-slate-500">Event</span>
                        <span className="font-semibold text-slate-900">
                          {selectedReservationData.eventPurpose}
                        </span>
                      </div>
                    )}

                    {selectedReservationData.vehicleType && (
                      <div className="flex justify-between gap-4 text-sm">
                        <span className="text-slate-500">Vehicle</span>
                        <span className="font-semibold text-slate-900">
                          {selectedReservationData.vehicleType}
                        </span>
                      </div>
                    )}

                    {!selectedReservationData.businessType &&
                      !selectedReservationData.eventPurpose &&
                      !selectedReservationData.vehicleType && (
                        <p className="text-sm text-slate-400 italic">
                          No categorization details provided.
                        </p>
                      )}
                  </div>
                </div>
              </div>

              {selectedReservationData.modeOfVisit === 'onsite' && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
                  <h4 className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Calendar className="size-4" />
                    Onsite Visit Request
                  </h4>

                  <div className="space-y-3">
                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-slate-500">Preferred Schedule</span>
                      <span className="font-semibold text-slate-900 text-right">
                        {selectedReservationData.appointmentDate
                          ? formatDate(selectedReservationData.appointmentDate)
                          : 'N/A'}
                        {selectedReservationData.appointmentTime &&
                          ` • ${selectedReservationData.appointmentTime}`}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-slate-500">Visit Status</span>
                      <span className="font-semibold text-indigo-600 text-right uppercase">
                        {selectedReservationData.visitStatus || 'requested'}
                      </span>
                    </div>

                    {selectedReservationData.confirmedVisitDate && (
                      <div className="flex justify-between gap-4 text-sm">
                        <span className="text-slate-500">Confirmed Schedule</span>
                        <span className="font-semibold text-green-600 text-right">
                          {formatDate(selectedReservationData.confirmedVisitDate)}
                          {selectedReservationData.confirmedVisitTime &&
                            ` • ${selectedReservationData.confirmedVisitTime}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedReservationExtension && canHandleExtension(selectedReservationData) && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5">
                  <h4 className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Clock className="size-4" />
                    Extension Request
                  </h4>

                  <div className="space-y-3">
                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-slate-500">Requested Additional Duration</span>
                      <span className="font-semibold text-slate-900">
                        {selectedReservationExtension.extensionMonths} month
                        {selectedReservationExtension.extensionMonths === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-slate-500">Current End Date</span>
                      <span className="font-semibold text-slate-900">
                        {selectedReservationData.endDateLabel}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-slate-500">Proposed New End Date</span>
                      <span className="font-semibold text-indigo-700">
                        {selectedReservationExtension.proposedEndDate
                          ? formatDate(selectedReservationExtension.proposedEndDate)
                          : 'Unable to calculate'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {selectedReservationData.notes && (
                <div>
                  <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3 ml-1">
                    Customer Notes
                  </h3>

                  <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 text-sm text-amber-900 italic leading-relaxed">
                    “{selectedReservationData.notes}”
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 bg-white px-6 py-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500">Current Status</span>
                  <span
                    className={`px-3 py-1 text-[11px] font-bold rounded-full border uppercase tracking-wide ${
                      statusColors[getDisplayReservationStatus(selectedReservationData) as keyof typeof statusColors]
                    }`}
                  >
                    {getDisplayReservationStatus(selectedReservationData)}
                  </span>
                </div>

                {extensionError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {extensionError}
                  </div>
                )}

                {selectedReservationData.status === 'confirmed' && (
                  <div className="flex items-center justify-between gap-4">
                    <div
                      className={`max-w-[70%] rounded-xl px-4 py-3 text-sm ${
                        isFullyPaid(selectedReservationData)
                          ? 'border border-blue-200 bg-blue-50 text-blue-800'
                          : 'border border-amber-200 bg-amber-50 text-amber-800'
                      }`}
                    >
                      {isFullyPaid(selectedReservationData)
                        ? 'This reservation is fully paid and ready to be marked as completed.'
                        : `This reservation still has an outstanding balance of ${formatCurrency(
                            getRemainingBalance(selectedReservationData)
                          )}.`}
                    </div>

                    <button
                      onClick={() => {
                        if (!isFullyPaid(selectedReservationData)) return;
                        handleComplete(selectedReservationData);
                      }}
                      disabled={!isFullyPaid(selectedReservationData)}
                      title={
                        isFullyPaid(selectedReservationData)
                          ? 'Mark as Completed'
                          : `Cannot mark as completed until fully paid. Remaining: ${formatCurrency(
                              getRemainingBalance(selectedReservationData)
                            )}`
                      }
                      className={`shrink-0 px-5 py-2.5 rounded-xl font-semibold transition-all ${
                        isFullyPaid(selectedReservationData)
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'cursor-not-allowed bg-gray-200 text-gray-400'
                      }`}
                    >
                      Mark as Completed
                    </button>
                  </div>
                )}

                {selectedReservationData.status === 'confirmed' &&
                  selectedReservationExtension &&
                  canHandleExtension(selectedReservationData) && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleRejectExtension(selectedReservationData)}
                        disabled={isProcessingExtension}
                        className="px-5 py-2.5 border border-rose-200 text-rose-600 rounded-xl hover:bg-rose-50 font-semibold transition-all disabled:opacity-50"
                      >
                        {isProcessingExtension ? 'Processing...' : 'Reject Extension'}
                      </button>

                      <button
                        onClick={() => handleApproveExtension(selectedReservationData)}
                        disabled={isProcessingExtension}
                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold transition-all disabled:opacity-50"
                      >
                        {isProcessingExtension ? 'Processing...' : 'Approve Extension'}
                      </button>
                    </div>
                  )}

                {((selectedReservationData.status === 'pending' &&
  !isParkingReservation(selectedReservationData)) ||
  getDisplayReservationStatus(selectedReservationData) === 'overdue') && (
  <div className="flex gap-2">
    {selectedReservationData.status === 'pending' &&
      !isParkingReservation(selectedReservationData) && (
        <>
          {selectedReservationData.modeOfVisit === 'onsite' && (
            <>
              <button
                onClick={() => handleConfirmVisit(selectedReservationData)}
                className="px-5 py-2.5 border border-indigo-200 text-indigo-600 rounded-xl hover:bg-indigo-50 font-semibold transition-all"
              >
                Confirm Visit
              </button>

              <button
                onClick={() => handleRequestReschedule(selectedReservationData)}
                className="px-5 py-2.5 border border-amber-200 text-amber-600 rounded-xl hover:bg-amber-50 font-semibold transition-all"
              >
                Request Reschedule
              </button>
            </>
          )}

          <button
            onClick={() => handleReject(selectedReservationData)}
            className="px-5 py-2.5 border border-rose-200 text-rose-600 rounded-xl hover:bg-rose-500 hover:text-white font-semibold transition-all"
          >
            Reject
          </button>

          <button
            onClick={() => handleApprove(selectedReservationData)}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-semibold transition-all"
          >
            Approve
          </button>
        </>
      )}

    {getDisplayReservationStatus(selectedReservationData) === 'overdue' && (
      <button
        onClick={() => handleSendOverdueNotice(selectedReservationData)}
        className="px-5 py-2.5 rounded-xl font-semibold border border-orange-200 text-orange-600 hover:bg-orange-50 transition-all"
      >
        Send Overdue Notice
      </button>
    )}
  </div>
)}
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={openCreateModal}
        className="lg:hidden fixed bottom-6 right-6 size-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 border-4 border-white"
      >
        <Plus className="size-8" />
      </button>

      {isActionModalOpen && (
        <AdminActionModal actionType="reservation" onClose={closeCreateModal} />
      )}
    </div>
  );
}

function DetailItem({
  icon,
  label,
  value,
  subValue,
  highlight = false,
}: any) {
  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-2xl border transition-all ${
        highlight ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-200'
      }`}
    >
      <div
        className={`mt-0.5 p-2 rounded-xl flex items-center justify-center ${
          highlight
            ? 'bg-blue-100 text-blue-600'
            : 'bg-white border border-slate-200 text-slate-500'
        }`}
      >
        {React.cloneElement(icon, { className: 'size-4' })}
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
          {label}
        </p>

        <p
          className={`text-sm font-semibold mt-0.5 break-words ${
            highlight ? 'text-blue-600' : 'text-slate-900'
          }`}
        >
          {value}
        </p>

        {subValue && <p className="text-[11px] text-slate-500 mt-0.5">{subValue}</p>}
      </div>
    </div>
  );
}