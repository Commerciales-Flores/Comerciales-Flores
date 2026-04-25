import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useClientData } from '../../contexts/ClientDataContext';
import { useReservations } from '../../contexts/ReservationsContext';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDate } from '../../utils/date';
import SortSelect from '../../components/shared/filters/SortSelect';
import type { ReservationSortOption } from '../../data/sorting';
import { RESERVATION_SORT_OPTIONS } from '../../utils/sorting/sortingOptions';
import { sortReservations } from '../../utils/sorting/sortReservations';

import {
  Clock,
  MapPin,
  CreditCard,
  FileText,
  X,
  Filter,
  ChevronDown,
  Notebook,
  User,
  Calendar,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { getUnitTypeLabel } from '../../utils/propertyHelpers';
import { uiTypography } from '../../styles/uiTypography';
import EmptyState from '../../components/common/EmptyState';
import type { ReservationDetails } from '../../data/types';
import { normalizeLowercaseText } from "../../utils/DataNormalization";
import UnitTaxonomyBadges from '../../components/common/UnitTaxonomyBadges';

type FilterStatus = 'all' | 'pending' | 'confirmed' | 'cancelled';
type ReservationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'overdue';

const FILTER_OPTIONS: FilterStatus[] = ['all', 'pending', 'confirmed', 'cancelled'];

const STATUS_COLORS: Record<ReservationStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  confirmed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  completed: 'bg-blue-100 text-blue-800 border-blue-200',
  overdue: 'bg-orange-100 text-orange-800 border-orange-200',
};

const STATUS_ICONS: Record<ReservationStatus, string> = {
  pending: '⏳',
  approved: '✓',
  rejected: '✗',
  confirmed: '✓',
  cancelled: '✗',
  completed: '✓',
  overdue: '!',
};

function formatReservationDuration(
  duration: number,
  durationType?: 'hours' | 'days' | 'months' | 'years'
) {
  if (!duration || duration <= 0) return '—';

  switch (durationType) {
    case 'hours':
      return `${duration} hr${duration === 1 ? '' : 's'}`;
    case 'days':
      return `${duration} day${duration === 1 ? '' : 's'}`;
    case 'months':
      return `${duration} month${duration === 1 ? '' : 's'}`;
    case 'years':
      return `${duration} year${duration === 1 ? '' : 's'}`;
    default:
      return `${duration}`;
  }
}

function canRequestExtension(reservation: any) {
  if (!reservation) return false;
  if (!['approved', 'confirmed'].includes(reservation.status)) return false;
  return reservation.unitType === 'rental_space' || reservation.unitType === 'parking_slot';
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

function canCancelReservation(reservation: {
  status: ReservationStatus;
  paidAmount?: number;
  startDate?: string;
}) {
  if (
    ['cancelled', 'completed', 'rejected', 'overdue'].includes(reservation.status)
  ) {
    return false;
  }

  const hasStarted =
    !!reservation.startDate &&
    new Date(reservation.startDate).getTime() <= Date.now();

  if (hasStarted) {
    return false;
  }

  const hasPayment = Number(reservation.paidAmount || 0) > 0;

  if (reservation.status === 'pending') return true;

  if (
    ['approved', 'confirmed'].includes(reservation.status) &&
    !hasPayment
  ) {
    return true;
  }

  return false;
}

function canRequestCancellation(reservation: {
  status: ReservationStatus;
  paidAmount?: number;
  startDate?: string;
  unitType?: string;
  bookingTerm?: string;
  details?: ReservationDetails | null;
}) {
  if (['cancelled', 'completed', 'rejected', 'overdue'].includes(reservation.status)) {
    return false;
  }

  const hasStarted =
    !!reservation.startDate &&
    new Date(reservation.startDate).getTime() <= Date.now();

  if (hasStarted) return false;

  const hasPayment = Number(reservation.paidAmount || 0) > 0;
  const alreadyRequested = reservation.details?.cancellationRequested === true;

  const isMonthlyRental =
    reservation.unitType === 'rental_space' &&
    reservation.bookingTerm === 'monthly';

  return (
    isMonthlyRental &&
    ['approved', 'confirmed'].includes(reservation.status) &&
    hasPayment &&
    !alreadyRequested
  );
}
function getCancellationRequestDetails(reservation: any) {
  const details = reservation?.details ?? {};

  if (details.cancellationRequested !== true) return null;

  return {
    requestedAt: details.cancellationRequestedAt ?? null,
    reason: details.cancellationReason ?? '',
  };
}

type ReservationFilterTabsProps = {
  filter: FilterStatus;
  counts: Record<FilterStatus, number>;
  onChange: (status: FilterStatus) => void;
};

function ReservationFilterTabs({
  filter,
  counts,
  onChange,
}: ReservationFilterTabsProps) {
  return (
    <div className="hidden w-fit gap-1 rounded-xl bg-gray-100/80 p-1 md:flex">
      {FILTER_OPTIONS.map((status) => (
        <button
          key={status}
          onClick={() => onChange(status)}
          className={`rounded-lg px-5 py-2 text-sm font-medium capitalize transition-all ${
            filter === status
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <span>{status}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                filter === status
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-white text-gray-500'
              }`}
            >
              {counts[status]}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

type ReservationFilterBottomSheetProps = {
  isOpen: boolean;
  filter: FilterStatus;
  counts: Record<FilterStatus, number>;
  onClose: () => void;
  onSelect: (status: FilterStatus) => void;
};

function ReservationFilterBottomSheet({
  isOpen,
  filter,
  counts,
  onClose,
  onSelect,
}: ReservationFilterBottomSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] md:hidden"
          >
            <button
              type="button"
              aria-label="Close reservation filters"
              className="absolute inset-0 bg-gray-900/40"
              onClick={onClose}
            />
          </motion.div>

          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-x-0 bottom-0 z-[70] md:hidden"
          >
            <div className="relative w-full rounded-t-3xl bg-white px-4 pb-4 pt-5 shadow-xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Filter reservations
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Choose which reservation status to show.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full bg-gray-100 p-2 transition hover:bg-gray-200"
                >
                  <X className="size-5 text-gray-600" />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {FILTER_OPTIONS.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => onSelect(status)}
                    className={`flex min-h-[44px] items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold capitalize transition ${
                      filter === status
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'border border-gray-200 bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span>{status}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        filter === status
                          ? 'bg-white/20 text-white'
                          : 'bg-white text-gray-500'
                      }`}
                    >
                      {counts[status]}
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="mt-4 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function ClientReservations() {
  const { user } = useAuth();
  const { units } = useClientData();
  const { getReservationsByUserId, updateReservation } = useReservations();

  const [expandedDetailsId, setExpandedDetailsId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<ReservationSortOption>('newest');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  const ITEMS_PER_PAGE = 5;

  const [currentPage, setCurrentPage] = useState(1);
  const [expandedSummaryId, setExpandedSummaryId] = useState<string | null>(null);

  const [reservationToCancel, setReservationToCancel] = useState<{
  id: string;
  unitName: string;
  status: ReservationStatus;
  paidAmount: number;
  startDate?: string;
} | null>(null);

const [reservationToRequestCancel, setReservationToRequestCancel] = useState<{
  id: string;
  unitName: string;
  paidAmount: number;
} | null>(null);

const [cancellationReason, setCancellationReason] = useState('');
const [isRequestingCancellation, setIsRequestingCancellation] = useState(false);

const [isCancellingReservation, setIsCancellingReservation] = useState(false);

  const [extensionModalReservationId, setExtensionModalReservationId] = useState<string | null>(null);
  const [extensionMonths, setExtensionMonths] = useState('1');
  const [isSubmittingExtension, setIsSubmittingExtension] = useState(false);
  const [extensionError, setExtensionError] = useState<string | null>(null);

  const userReservations = useMemo(() => {
    return getReservationsByUserId(user?.id || '');
  }, [getReservationsByUserId, user?.id]);

  const reservationUnitMap = useMemo(() => {
    return new Map(units.map((unit) => [unit.id, unit]));
  }, [units]);

  const filterCounts = useMemo(() => {
    return {
      all: userReservations.length,
      pending: userReservations.filter((r) => r.status === 'pending').length,
      confirmed: userReservations.filter((r) =>
        ['approved', 'confirmed', 'completed'].includes(r.status)
      ).length,
      cancelled: userReservations.filter((r) =>
        ['cancelled', 'rejected'].includes(r.status)
      ).length,
    };
  }, [userReservations]);

  const filteredReservations = useMemo(() => {
  const search = normalizeLowercaseText(searchTerm);

  return userReservations.filter((reservation) => {
    const matchesFilter =
      filterStatus === 'all'
        ? true
        : filterStatus === 'confirmed'
          ? ['approved', 'confirmed', 'completed'].includes(reservation.status)
          : filterStatus === 'cancelled'
            ? ['cancelled', 'rejected'].includes(reservation.status)
            : reservation.status === filterStatus;

    if (!matchesFilter) return false;

    if (!search) return true;

    const unit = reservationUnitMap.get(reservation.unitId);

    const searchableText = [
      reservation.unitName,
      reservation.publicId,
      reservation.id,
      reservation.status,
      reservation.unitType,
      reservation.paymentMethod,
      reservation.modeOfVisit,
      reservation.businessType,
      reservation.eventPurpose,
      reservation.vehicleType,
      reservation.plateNumber,
      reservation.notes,
      unit?.location,
      getUnitTypeLabel(reservation.unitType),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchableText.includes(search);
  });
}, [filterStatus, searchTerm, userReservations, reservationUnitMap]);

  const sortedReservations = useMemo(() => {
  return sortReservations(filteredReservations, sortBy);
}, [filteredReservations, sortBy]);

  const totalPages = useMemo(() => {
  return Math.max(1, Math.ceil(sortedReservations.length / ITEMS_PER_PAGE));
}, [sortedReservations.length, ITEMS_PER_PAGE]);

const paginatedReservations = useMemo(() => {
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  return sortedReservations.slice(startIndex, startIndex + ITEMS_PER_PAGE);
}, [sortedReservations, currentPage, ITEMS_PER_PAGE]);

  const extensionModalReservation = useMemo(() => {
    if (!extensionModalReservationId) return null;
    return userReservations.find((reservation) => reservation.id === extensionModalReservationId) ?? null;
  }, [extensionModalReservationId, userReservations]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchTerm, sortBy]);

useEffect(() => {
  if (currentPage > totalPages) {
    setCurrentPage(totalPages);
  }
}, [currentPage, totalPages]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      if (!mobile) {
        setExpandedId(null);
        setExpandedDetailsId(null);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleDetails = useCallback((id: string) => {
    setExpandedDetailsId((prev) => (prev === id ? null : id));
  }, []);

  const toggleSummary = useCallback((id: string) => {
  setExpandedSummaryId((prev) => (prev === id ? null : id));
}, []);

  const handleCancelReservation = useCallback(
  (
    reservationId: string,
    unitName: string,
    status: ReservationStatus,
    paidAmount: number,
    startDate?: string
  ) => {
    setReservationToCancel({
      id: reservationId,
      unitName,
      status,
      paidAmount,
      startDate,
    });
  },
  []
);

const confirmCancelReservation = useCallback(async () => {
  if (!reservationToCancel || isCancellingReservation) return;

  try {
    setIsCancellingReservation(true);

    await updateReservation(reservationToCancel.id, {
      status: 'cancelled',
    });

    setReservationToCancel(null);
  } catch (error) {
    console.error('Failed to cancel reservation:', error);
  } finally {
    setIsCancellingReservation(false);
  }
}, [reservationToCancel, isCancellingReservation, updateReservation]);

const confirmRequestCancellation = useCallback(async () => {
  if (!reservationToRequestCancel || isRequestingCancellation) return;

  if (!cancellationReason.trim()) {
    return;
  }

  const reservation = userReservations.find(
    (item) => item.id === reservationToRequestCancel.id
  );

  try {
    setIsRequestingCancellation(true);

    const nextDetails: ReservationDetails = {
      ...(reservation?.details ?? {}),
      cancellationRequested: true,
      cancellationRequestedAt: new Date().toISOString(),
      cancellationReason: cancellationReason.trim(),
    };

    await updateReservation(reservationToRequestCancel.id, {
      details: nextDetails as any,
    });

    setReservationToRequestCancel(null);
    setCancellationReason('');
  } catch (error) {
    console.error('Failed to request cancellation:', error);
  } finally {
    setIsRequestingCancellation(false);
  }
}, [
  reservationToRequestCancel,
  isRequestingCancellation,
  cancellationReason,
  userReservations,
  updateReservation,
]);

  const toggleExpand = useCallback(
    (id: string) => {
      if (!isMobile) return;
      setExpandedId((prev) => (prev === id ? null : id));
    },
    [isMobile]
  );

  const handleFilterChange = useCallback((status: FilterStatus) => {
    setFilterStatus(status);
  }, []);

  const handleFilterSelectFromSheet = useCallback((status: FilterStatus) => {
    setFilterStatus(status);
    setShowFilterMenu(false);
  }, []);

  const openExtensionModal = useCallback((reservationId: string) => {
    setExtensionModalReservationId(reservationId);
    setExtensionMonths('1');
    setExtensionError(null);
  }, []);

  const closeExtensionModal = useCallback(() => {
    if (isSubmittingExtension) return;
    setExtensionModalReservationId(null);
    setExtensionMonths('1');
    setExtensionError(null);
  }, [isSubmittingExtension]);

  const handleSubmitExtensionRequest = useCallback(async () => {
    if (!extensionModalReservation || isSubmittingExtension) return;

    const parsedMonths = Number(extensionMonths);

    if (!Number.isFinite(parsedMonths) || parsedMonths <= 0) {
      setExtensionError('Please enter a valid number of months.');
      return;
    }

    try {
      setIsSubmittingExtension(true);
      setExtensionError(null);

      const nextDetails: ReservationDetails = {
        ...(extensionModalReservation.details ?? {}),
        extensionRequested: true,
        extensionMonths: parsedMonths,
        extensionRequestedAt: new Date().toISOString(),
      };

      await updateReservation(extensionModalReservation.id, {
        details: nextDetails as any,
      });

      closeExtensionModal();
    } catch (error) {
      console.error('Failed to request extension:', error);
      setExtensionError('Unable to submit extension request. Please try again.');
    } finally {
      setIsSubmittingExtension(false);
    }
  }, [extensionModalReservation, extensionMonths, isSubmittingExtension, updateReservation, closeExtensionModal]);

  return (
    <div className="bg-white min-h-screen">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 p-4 sm:gap-6 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-3 sm:gap-4">
  <header>
    <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
      My Reservations
    </h1>
    <p className="mt-1 text-sm text-gray-500">
      View and manage your reservation requests
    </p>
  </header>

  {userReservations.length > 0 && (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
      <div className="flex items-center gap-2 flex-1">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(normalizeLowercaseText(e.target.value))}
            placeholder="Search reservations"
            className="h-10 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowFilterMenu(true)}
          aria-label="Open reservation filters"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-white transition hover:bg-gray-50 md:hidden"
        >
          <Filter className="size-5 text-gray-600" />
        </button>
      </div>

      <SortSelect
        value={sortBy}
        onChange={setSortBy}
        options={RESERVATION_SORT_OPTIONS}
        className="h-10 min-w-[230px]"
      />
    </div>
  )}
</div>

        {userReservations.length > 0 && (
          <ReservationFilterTabs
            filter={filterStatus}
            counts={filterCounts}
            onChange={handleFilterChange}
          />
        )}

        <div className="space-y-4">
          {sortedReservations.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <EmptyState
                icon={<Notebook className="size-10 text-blue-500" />}
                title="No reservations found"
                description={
  searchTerm.trim()
    ? `No reservations matched "${searchTerm.trim()}".`
    : filterStatus === 'all'
      ? "You haven't made any reservations yet."
      : `No ${filterStatus} reservations found.`
}
              />
            </motion.div>
          ) : (
  <>
    <div className="grid gap-4">
      {paginatedReservations.map((reservation) => {
                const unit = reservationUnitMap.get(reservation.unitId);
                const balance = Math.max(
                  Number(reservation.totalAmount || 0) - Number(reservation.paidAmount || 0),
                  0
                );

                const paymentProgress =
                  reservation.totalAmount > 0
                    ? Math.min(
                        100,
                        Math.max(
                          0,
                          (Number(reservation.paidAmount || 0) / Number(reservation.totalAmount || 0)) * 100
                        )
                      )
                    : 0;

                const isDetailsExpanded = expandedDetailsId === reservation.id;
                const isCardExpanded = !isMobile || expandedId === reservation.id;
                const isSummaryExpanded = expandedSummaryId === reservation.id;
                const status =
                  (reservation.status as ReservationStatus) in STATUS_COLORS
                    ? (reservation.status as ReservationStatus)
                    : 'pending';

                const formattedDuration = formatReservationDuration(
                  reservation.duration,
                  reservation.durationType
                );

                const hasEnded =
                  !!reservation.endDate &&
                  new Date(reservation.endDate).getTime() <= Date.now();

                const isFullyPaid =
                  Number(reservation.paidAmount || 0) >= Number(reservation.totalAmount || 0);

                const isEligibleReviewStatus = ['approved', 'confirmed', 'completed'].includes(
                  reservation.status
                );

                const canReview = isEligibleReviewStatus && hasEnded && isFullyPaid;

                const extensionDetails = getExtensionRequestDetails(reservation);
                const eligibleForExtension = canRequestExtension(reservation);

                const canCancel = canCancelReservation({
                  status,
                  paidAmount: Number(reservation.paidAmount || 0),
                  startDate: reservation.startDate,
                });

                const cancellationDetails = getCancellationRequestDetails(reservation);

const canRequestCancel = canRequestCancellation({
  status,
  paidAmount: Number(reservation.paidAmount || 0),
  startDate: reservation.startDate,
  unitType: reservation.unitType,
  bookingTerm: reservation.bookingTerm,
  details: reservation.details,
});

                return (
                  <motion.div
                    layout
                    key={reservation.id}
                    className="relative mb-4 overflow-visible rounded-2xl border border-gray-100 bg-white shadow-sm sm:rounded-[22px]"
                  >
                   <div
                      className={`relative px-3.5 py-3.5 sm:p-5 ${isMobile ? 'cursor-pointer pb-10' : ''}`}
                      onClick={() => toggleExpand(reservation.id)}
                    >
                      <div className="mb-2 flex items-start justify-between">
                      <div className="min-w-0 flex-1">
  <div className="mb-2 flex items-start justify-between gap-3">
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold text-blue-600 md:text-[13px]">
        {getUnitTypeLabel(reservation.unitType)}
      </span>

      <UnitTaxonomyBadges
        category={unit?.category}
        subtype={unit?.subtype}
        size="sm"
      />

      <p
        className={`${uiTypography.helperText} truncate text-[11px] text-gray-400 md:text-sm`}
      >
        ID: {reservation.publicId || reservation.id}
      </p>
    </div>

    <div className="flex flex-wrap justify-end gap-1.5">
      <span
        className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] md:text-xs ${uiTypography.buttonTextBold} shadow-sm ${STATUS_COLORS[status]}`}
      >
        {STATUS_ICONS[status]} {status.toUpperCase()}
      </span>

      {extensionDetails && (
        <span className="shrink-0 rounded-full border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[9px] md:text-xs font-bold text-indigo-700 shadow-sm">
          EXTENSION REQUESTED
        </span>
      )}
      {cancellationDetails && (
  <span className="shrink-0 rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-[9px] font-bold text-red-700 shadow-sm md:text-xs">
    CANCELLATION REQUESTED
  </span>
)}
    </div>
  </div>

  <h3
    className={`${uiTypography.cardTitle} truncate text-[15px] leading-tight text-gray-900 md:text-lg`}
  >
    {reservation.unitName}
  </h3>

  <div className="mt-1.5 flex items-center gap-1.5 text-gray-500">
    <MapPin className="size-3.5 md:size-4 text-red-600" />
    <span
      className={`${uiTypography.bodyText} truncate text-[12px] md:text-sm`}
    >
      {unit?.location || 'N/A'}
    </span>
  </div>
</div>
</div>

                      <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-gray-100 bg-gray-50/80 p-2 sm:gap-2 sm:p-2.5">
  <div className="min-w-0">
    <p
      className={`${uiTypography.miniStatLabel} mb-0.5 text-[10px] text-gray-500 sm:text-xs`}
    >
      Start
    </p>
    <p
      className={`${uiTypography.miniStatValue} truncate text-[11px] text-gray-900 sm:text-sm`}
    >
      {formatDate(reservation.startDate)}
    </p>
  </div>

  <div className="min-w-0 border-x border-gray-200 px-1.5 sm:px-2">
    <p
      className={`${uiTypography.miniStatLabel} mb-0.5 text-[10px] text-gray-500 sm:text-xs`}
    >
      End
    </p>
    <p
      className={`${uiTypography.miniStatValue} truncate text-[11px] text-gray-900 sm:text-sm`}
    >
      {formatDate(reservation.endDate)}
    </p>
  </div>

  <div className="min-w-0 pl-0.5 sm:pl-1">
    <p
      className={`${uiTypography.miniStatLabel} mb-0.5 text-[10px] text-gray-500 sm:text-xs`}
    >
      Duration
    </p>
    <p
      className={`${uiTypography.miniStatValue} truncate text-[11px] text-gray-900 sm:text-sm`}
    >
      {formattedDuration}
    </p>
  </div>
</div>
                      {isMobile && (
                        <div className="pointer-events-none absolute inset-x-0 -bottom-5 flex justify-center">
                          <motion.div
                            animate={{ rotate: isCardExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex size-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md"
                          >
                            <ChevronDown className="size-4 text-gray-500" />
                          </motion.div>
                        </div>
                      )}
                    </div>

                    <AnimatePresence>
                      {isCardExpanded && (
                        <motion.div
                          initial={isMobile ? { height: 0, opacity: 0 } : false}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="space-y-2 px-4 pb-4 sm:px-5 sm:pb-5">
                            <div className="border-t border-gray-100 pt-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleDetails(reservation.id);
                                }}
                                className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-left transition hover:bg-gray-100"
                              >
                                <div>
                                  <p className={`${uiTypography.miniStatLabel} text-gray-500`}>
                                    Reservation Details
                                  </p>
                                  <p
                                    className={`${uiTypography.helperText} mt-0.5 text-xs sm:text-sm text-gray-400`}
                                  >
                                    View visit mode, payment method, purpose, notes, and more
                                  </p>
                                </div>

                                {!isMobile && (
                                <motion.div
                                  animate={{ rotate: isDetailsExpanded ? 180 : 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="rounded-lg bg-white p-1 shadow-sm"
                                >
                                  <ChevronDown className="size-4 text-gray-500" />
                                </motion.div>
                              )}
                              </button>

                              <AnimatePresence initial={false}>
                                {isDetailsExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="space-y-1.5 pt-3">
                                      <div className="space-y-1 text-[13px] sm:text-sm">
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="flex items-center gap-2 text-gray-500">
                                            <Clock className="size-4 text-blue-600" />
                                            <span className={uiTypography.miniStatLabel}>Mode</span>
                                          </div>
                                          <span
                                            className={`${uiTypography.infoBlockValue} capitalize text-gray-900 text-right`}
                                          >
                                            {reservation.modeOfVisit?.replace('_', ' ') || 'N/A'}
                                          </span>
                                        </div>

                                        <div className="flex items-center justify-between gap-3">
                                          <div className="flex items-center gap-2 text-gray-500">
                                            <CreditCard className="size-4 text-emerald-600" />
                                            <span className={uiTypography.miniStatLabel}>Payment</span>
                                          </div>
                                          <span
                                            className={`${uiTypography.infoBlockValue} capitalize text-gray-900 text-right`}
                                          >
                                            {reservation.paymentMethod?.replace('_', ' ') || 'N/A'}
                                          </span>
                                        </div>

                                        {reservation.bookingTerm && (
                                          <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2 text-gray-500">
                                              <Clock className="size-4 text-amber-600" />
                                              <span className={uiTypography.miniStatLabel}>Booking Term</span>
                                            </div>

                                            <span
                                              className={`${uiTypography.infoBlockValue} capitalize text-gray-900 text-right`}
                                            >
                                              {reservation.bookingTerm}
                                            </span>
                                          </div>
                                        )}

                                        {reservation.paymentMode && (
                                          <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2 text-gray-500">
                                              <CreditCard className="size-4 text-emerald-600" />
                                              <span className={uiTypography.miniStatLabel}>Billing</span>
                                            </div>

                                            <span
                                              className={`${uiTypography.infoBlockValue} text-gray-900 text-right`}
                                            >
                                              {reservation.paymentMode === 'deposit_plus_first_month'
                                                ? 'Deposit + First Month'
                                                : 'Full Upfront'}
                                            </span>
                                          </div>
                                        )}

                                        {reservation.businessType && (
                                          <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2 text-gray-500">
                                              <Notebook className="size-4 text-violet-600" />
                                              <span className={uiTypography.miniStatLabel}>Business</span>
                                            </div>
                                            <span
                                              className={`${uiTypography.infoBlockValue} text-gray-900 text-right`}
                                            >
                                              {reservation.businessType}
                                            </span>
                                          </div>
                                        )}

                                        {reservation.eventPurpose && (
                                          <>
                                            <div className="flex items-center justify-between gap-3">
                                              <div className="flex items-center gap-2 text-gray-500">
                                                <FileText className="size-4 text-pink-600" />
                                                <span className={uiTypography.miniStatLabel}>Purpose</span>
                                              </div>
                                              <span
                                                className={`${uiTypography.infoBlockValue} text-gray-900 text-right`}
                                              >
                                                {reservation.eventPurpose}
                                              </span>
                                            </div>

                                            {reservation.attendees && (
                                              <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2 text-gray-500">
                                                  <User className="size-4 text-violet-600" />
                                                  <span className={uiTypography.miniStatLabel}>Attendees</span>
                                                </div>
                                                <span
                                                  className={`${uiTypography.infoBlockValue} text-gray-900 text-right`}
                                                >
                                                  {reservation.attendees}
                                                </span>
                                              </div>
                                            )}
                                          </>
                                        )}

                                        {reservation.vehicleType && (
                                          <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2 text-gray-500">
                                              <MapPin className="size-4 text-slate-600" />
                                              <span className={uiTypography.miniStatLabel}>Vehicle</span>
                                            </div>
                                            <span
                                              className={`${uiTypography.infoBlockValue} text-gray-900 text-right`}
                                            >
                                              {reservation.vehicleType}
                                              {reservation.plateNumber ? ` - ${reservation.plateNumber}` : ''}
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      {reservation.notes && (
                                        <div className="border-t border-gray-100 pt-2">
                                          <div className="flex items-start gap-2">
                                            <Notebook className="size-4 text-blue-600 mt-0.5" />
                                            <div>
                                              <p
                                                className={`${uiTypography.miniStatLabel} text-blue-700 text-xs`}
                                              >
                                                Notes
                                              </p>
                                              <p
                                                className={`${uiTypography.bodyText} text-[13px] sm:text-sm text-gray-700`}
                                              >
                                                {reservation.notes}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {reservation.modeOfVisit === 'onsite' && (
                                        <>
                                          <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2 text-gray-500">
                                              <Clock className="size-4 text-blue-600" />
                                              <span className={uiTypography.miniStatLabel}>Preferred Visit</span>
                                            </div>
                                            <span className={`${uiTypography.infoBlockValue} text-gray-900 text-right`}>
                                              {reservation.appointmentDate
                                                ? formatDate(reservation.appointmentDate)
                                                : 'N/A'}
                                              {reservation.appointmentTime && ` • ${reservation.appointmentTime}`}
                                            </span>
                                          </div>

                                          <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2 text-gray-500">
                                              <Notebook className="size-4 text-indigo-600" />
                                              <span className={uiTypography.miniStatLabel}>Visit Status</span>
                                            </div>
                                            <span className={`${uiTypography.infoBlockValue} uppercase text-indigo-600 text-right`}>
                                              {reservation.visitStatus || 'requested'}
                                            </span>
                                          </div>

                                          {reservation.confirmedVisitDate && (
                                            <div className="flex items-center justify-between gap-3">
                                              <div className="flex items-center gap-2 text-gray-500">
                                                <Clock className="size-4 text-green-600" />
                                                <span className={uiTypography.miniStatLabel}>Confirmed Visit</span>
                                              </div>
                                              <span className={`${uiTypography.infoBlockValue} text-green-600 text-right`}>
                                                {formatDate(reservation.confirmedVisitDate)}
                                                {reservation.confirmedVisitTime && ` • ${reservation.confirmedVisitTime}`}
                                              </span>
                                            </div>
                                          )}
                                        </>
                                      )}

                                      {extensionDetails && (
                                        <div className="border-t border-gray-100 pt-2">
                                          <div className="flex items-start gap-2">
                                            <Calendar className="size-4 text-indigo-600 mt-0.5" />
                                            <div>
                                              <p
                                                className={`${uiTypography.miniStatLabel} text-indigo-700 text-xs`}
                                              >
                                                Extension Request
                                              </p>
                                              <p
                                                className={`${uiTypography.bodyText} text-[13px] sm:text-sm text-gray-700`}
                                              >
                                                Requested additional {extensionDetails.extensionMonths} month
                                                {extensionDetails.extensionMonths === 1 ? '' : 's'}
                                                {extensionDetails.proposedEndDate
                                                  ? ` • Proposed end: ${formatDate(extensionDetails.proposedEndDate)}`
                                                  : ''}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {cancellationDetails && (
  <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
      Cancellation Under Review
    </p>
    <p className="mt-1 text-[13px] text-red-700 sm:text-sm">
      Your cancellation request has been submitted for admin review.
      {cancellationDetails.requestedAt
        ? ` Requested on ${formatDate(cancellationDetails.requestedAt)}.`
        : ''}
    </p>
  </div>
)}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            {reservation.status === 'pending' && (
                              <div
                                className={`rounded-2xl border border-yellow-200 bg-yellow-50 p-4 ${uiTypography.bodyText} text-[13px] sm:text-sm text-yellow-800`}
                              >
                                Pending admin approval. You will be notified once reviewed.
                              </div>
                            )}

                            <div className="border-t border-gray-100 pt-2">
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      toggleSummary(reservation.id);
    }}
    className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-left transition hover:bg-gray-100"
  >
    <div>
      <p className={`${uiTypography.miniStatLabel} text-gray-500`}>
        Payment & Status Summary
      </p>
      <p className={`${uiTypography.helperText} mt-0.5 text-xs sm:text-sm text-gray-400`}>
        View totals, balance, progress, notices, and extension options
      </p>
    </div>

    <motion.div
      animate={{ rotate: isSummaryExpanded ? 180 : 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-lg bg-white p-1 shadow-sm"
    >
      <ChevronDown className="size-4 text-gray-500" />
    </motion.div>
  </button>

  <AnimatePresence initial={false}>
    {isSummaryExpanded && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <div className="space-y-3 pt-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center sm:text-left">
              <p className={`${uiTypography.miniStatLabel} mb-0.5 text-gray-500 text-xs`}>
                Total
              </p>
              <p className={`${uiTypography.miniStatValue} text-gray-900 text-[13px] sm:text-sm`}>
                {formatCurrency(reservation.totalAmount)}
              </p>
            </div>

            <div className="text-center sm:text-left">
              <p className={`${uiTypography.miniStatLabel} mb-0.5 text-gray-500 text-xs`}>
                Paid
              </p>
              <p className={`${uiTypography.miniStatValue} text-green-600 text-[13px] sm:text-sm`}>
                {formatCurrency(reservation.paidAmount)}
              </p>
            </div>

            <div className="text-center sm:text-left">
              <p className={`${uiTypography.miniStatLabel} mb-0.5 text-gray-500 text-xs`}>
                Balance
              </p>
              <p
                className={`${uiTypography.miniStatValue} text-[13px] sm:text-sm ${
                  balance > 0 ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {formatCurrency(balance)}
              </p>
            </div>
          </div>

          {['approved', 'confirmed', 'completed'].includes(reservation.status) && (
            <div className="pt-1">
              <div className={`${uiTypography.helperText} mb-2 flex justify-between text-xs text-gray-500 sm:text-sm`}>
                <span>Payment Progress</span>
                <span>{paymentProgress.toFixed(0)}%</span>
              </div>

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 md:h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${paymentProgress}%` }}
                  className={`h-full transition-all ${
                    paymentProgress === 100 ? 'bg-green-600' : 'bg-blue-600'
                  }`}
                />
              </div>
            </div>
          )}

          {reservation.status === 'pending' && (
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-[13px] text-yellow-800 sm:text-sm">
              Pending admin approval. You will be notified once reviewed.
            </div>
          )}

          {['approved', 'confirmed', 'completed'].includes(reservation.status) && balance > 0 && (
            <div className="flex items-start gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-800">
              <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" />
              <p className="text-[13px] font-medium sm:text-sm">
                Approved! Please go to Payments to complete your transaction. Minimum payment rules will be shown there before submission.
              </p>
            </div>
          )}

          {isEligibleReviewStatus && !hasEnded && (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800">
              <Clock className="mt-0.5 size-4 text-amber-600" />
              <p className="text-[13px] font-medium sm:text-sm">
                Review will be available after your reservation ends.
              </p>
            </div>
          )}

          {isEligibleReviewStatus && hasEnded && !isFullyPaid && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700 sm:text-sm">
              Please settle your remaining balance before leaving a review.
            </div>
          )}

          {canReview && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-[13px] text-blue-700 sm:text-sm">
              This reservation is now eligible for review. You can leave your feedback on the My Reviews page.
            </div>
          )}

          {eligibleForExtension && !extensionDetails && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                    Reservation Extension
                  </p>
                  <p className={`${uiTypography.bodyText} mt-1 text-[13px] text-indigo-700 sm:text-sm`}>
                    Need more time for this reservation? You can request an extension for admin review.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => openExtensionModal(reservation.id)}
                  className="min-h-[44px] rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Request Extension
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    )}
  </AnimatePresence>
</div>

                            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
  <span className={`${uiTypography.helperText} text-gray-400 text-xs sm:text-sm`}>
    Requested {formatDate(reservation.requestDate)}
  </span>

  <div className="w-full sm:w-auto">
    {canCancel ? (
  <button
    type="button"
    onClick={() =>
      handleCancelReservation(
        reservation.id,
        reservation.unitName,
        status,
        Number(reservation.paidAmount || 0),
        reservation.startDate
      )
    }
    className={`w-full rounded-xl bg-red-600 px-4 py-2.5 text-[13px] text-white shadow-sm transition-colors hover:bg-red-700 sm:w-auto sm:px-6 sm:py-3 sm:text-sm ${uiTypography.buttonText}`}
  >
    Cancel Reservation
  </button>
) : canRequestCancel ? (
  <button
    type="button"
    onClick={() => {
      setReservationToRequestCancel({
        id: reservation.id,
        unitName: reservation.unitName,
        paidAmount: Number(reservation.paidAmount || 0),
      });
      setCancellationReason('');
    }}
    className={`w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-700 shadow-sm transition hover:bg-red-100 sm:w-auto sm:px-6 sm:py-3 sm:text-sm ${uiTypography.buttonText}`}
  >
    Request Cancellation
  </button>
) : (
  <div className="hidden h-[44px] w-[180px] sm:block" />
)}
  </div>
</div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
                    })}
    </div>

    {totalPages > 1 && (
      <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-4 sm:flex-row">
        <p className="text-xs text-gray-500 sm:text-sm">
          Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
          {Math.min(currentPage * ITEMS_PER_PAGE, sortedReservations.length)} of{' '}
          {sortedReservations.length} reservations
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`min-w-[40px] rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  currentPage === page
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    )}
  </>
          )}
        </div>

        <ReservationFilterBottomSheet
          isOpen={showFilterMenu}
          filter={filterStatus}
          counts={filterCounts}
          onClose={() => setShowFilterMenu(false)}
          onSelect={handleFilterSelectFromSheet}
        />

        <AnimatePresence>
          {extensionModalReservation && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[80] bg-black/50"
                onClick={closeExtensionModal}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-[90] flex items-center justify-center p-4"
              >
                <div className="w-full max-w-md rounded-[28px] border border-gray-200 bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Request Extension</h2>
                      <p className="mt-1 text-sm text-gray-500">
                        {extensionModalReservation.unitName}
                      </p>
                    </div>

                    <button
                      onClick={closeExtensionModal}
                      className="rounded-full bg-gray-100 p-2 transition hover:bg-gray-200"
                    >
                      <X className="size-5 text-gray-500" />
                    </button>
                  </div>

                  <div className="space-y-4 px-6 py-5">
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-gray-500">Current End Date</span>
                        <span className="font-semibold text-gray-900">
                          {formatDate(extensionModalReservation.endDate)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-800">
                        Additional months
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={extensionMonths}
                        onChange={(e) => {
                          let value = e.target.value;

                          // allow only up to 2 digits (e.g. 12, 24, 36)
                          value = value.replace(/\D/g, '').slice(0, 2);

                          setExtensionMonths(value);
                        }}
                        className="w-full rounded-2xl border border-gray-300 px-4 py-3 min-h-[44px] text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                        placeholder="Enter number of months"
                      />
                    </div>

                    {extensionError && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {extensionError}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 border-t border-gray-100 px-6 py-5">
                    <button
                      type="button"
                      onClick={closeExtensionModal}
                      disabled={isSubmittingExtension}
                      className="flex-1 rounded-2xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleSubmitExtensionRequest}
                      disabled={isSubmittingExtension}
                      className="flex-1 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {isSubmittingExtension ? 'Submitting...' : 'Submit Request'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
  {reservationToCancel && (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] bg-black/50"
        onClick={() => {
          if (isCancellingReservation) return;
          setReservationToCancel(null);
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      >
        <div className="w-full max-w-md rounded-[28px] border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
            <h2 className="text-lg font-bold text-gray-900">
              Cancel Reservation
            </h2>

            <button
              onClick={() => {
                if (isCancellingReservation) return;
                setReservationToCancel(null);
              }}
              className="rounded-full bg-gray-100 p-2 transition hover:bg-gray-200"
            >
              <X className="size-5 text-gray-500" />
            </button>
          </div>

          <div className="space-y-3 px-6 py-5">
            <p className="text-sm text-gray-600">
              Are you sure you want to cancel your reservation for{' '}
              <span className="font-semibold text-gray-900">
                "{reservationToCancel.unitName}"
              </span>
              ?
            </p>

            {(() => {
  const hasPayment = Number(reservationToCancel.paidAmount || 0) > 0;
  const isApprovedState = ['approved', 'confirmed'].includes(
    reservationToCancel.status
  );

  if (isApprovedState && hasPayment) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 space-y-1">
        <p className="font-semibold">This booking will be cancelled.</p>
        <p>
          Payments already made may be non-refundable based on your unit type
          and management policy.
        </p>
        <p>The reserved slot/date will be released.</p>
      </div>
    );
  }

  if (isApprovedState && !hasPayment) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 space-y-1">
        <p className="font-semibold">This approved reservation will be cancelled.</p>
        <p>No payment has been recorded.</p>
        <p>The reserved slot/date will be released immediately.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
      This will mark the reservation as cancelled instead of deleting it.
    </div>
  );
})()}
          </div>

          <div className="flex gap-3 border-t border-gray-100 px-6 py-5">
            <button
              type="button"
              onClick={() => setReservationToCancel(null)}
              disabled={isCancellingReservation}
              className="flex-1 rounded-2xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Keep Reservation
            </button>

            <button
              type="button"
              disabled={isCancellingReservation}
              onClick={confirmCancelReservation}
              className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {isCancellingReservation ? 'Cancelling...' : 'Yes, Cancel'}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  )}
</AnimatePresence>
<AnimatePresence>
  {reservationToRequestCancel && (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] bg-black/50"
        onClick={() => {
          if (isRequestingCancellation) return;
          setReservationToRequestCancel(null);
          setCancellationReason('');
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      >
        <div className="w-full max-w-md rounded-[28px] border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Request Cancellation
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {reservationToRequestCancel.unitName}
              </p>
            </div>

            <button
              onClick={() => {
                if (isRequestingCancellation) return;
                setReservationToRequestCancel(null);
                setCancellationReason('');
              }}
              className="rounded-full bg-gray-100 p-2 transition hover:bg-gray-200"
            >
              <X className="size-5 text-gray-500" />
            </button>
          </div>

          <div className="space-y-4 px-6 py-5">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Since this reservation already has a recorded payment, cancellation requires admin review. Refunds, if applicable, will be handled by the admin.
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-800">
                Reason for cancellation
              </label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value.slice(0, 500))}
                rows={4}
                maxLength={500}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
                placeholder="Briefly explain why you want to cancel this reservation"
              />
              <p className="mt-1 text-xs text-gray-400">
                {cancellationReason.length}/500
              </p>
            </div>
          </div>

          <div className="flex gap-3 border-t border-gray-100 px-6 py-5">
            <button
              type="button"
              onClick={() => {
                setReservationToRequestCancel(null);
                setCancellationReason('');
              }}
              disabled={isRequestingCancellation}
              className="flex-1 rounded-2xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Keep Reservation
            </button>

            <button
              type="button"
              disabled={isRequestingCancellation || !cancellationReason.trim()}
              onClick={confirmRequestCancellation}
              className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {isRequestingCancellation ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  )}
</AnimatePresence>
    </div>
  );
}