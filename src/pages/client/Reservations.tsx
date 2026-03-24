import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useReservations } from '../../contexts/ReservationsContext';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDate } from '../../utils/date';
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
} from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { getUnitTypeLabel } from '../../utils/propertyHelpers';
import { uiTypography } from '../../styles/uiTypography';
import EmptyState from '../../components/common/EmptyState';

type FilterStatus = 'all' | 'pending' | 'confirmed' | 'cancelled';
type ReservationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'confirmed'
  | 'cancelled'
  | 'completed';

const FILTER_OPTIONS: FilterStatus[] = ['all', 'pending', 'confirmed', 'cancelled'];

const STATUS_COLORS: Record<ReservationStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  confirmed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  completed: 'bg-blue-100 text-blue-800 border-blue-200',
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

const STATUS_ICONS: Record<ReservationStatus, string> = {
  pending: '⏳',
  approved: '✓',
  rejected: '✗',
  confirmed: '✓',
  cancelled: '✗',
  completed: '✓',
};

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
          className={`inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium capitalize transition-all ${
            filter === status
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span>{status}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              filter === status
                ? 'bg-blue-50 text-blue-600'
                : 'bg-white text-gray-500'
            }`}
          >
            {counts[status]}
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
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/40  md:hidden"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-[70] flex max-h-[70vh] flex-col rounded-t-[32px] bg-white shadow-2xl md:hidden"
          >
            <div className="border-b p-6">
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200" />
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Filter reservations</h2>
                <button
                  onClick={onClose}
                  className="rounded-full bg-gray-100 p-2 transition hover:bg-gray-200"
                >
                  <X className="size-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-6">
              <div className="grid gap-2">
                {FILTER_OPTIONS.map((status) => (
                  <button
                    key={status}
                    onClick={() => onSelect(status)}
                    className={`flex w-full items-center justify-between rounded-2xl p-4 text-left font-semibold capitalize transition ${
                      filter === status
                        ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200'
                        : 'bg-gray-50 text-gray-600'
                    }`}
                  >
                    <span>{status}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        filter === status
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-white text-gray-500'
                      }`}
                    >
                      {counts[status]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function ClientReservations() {
  const { user } = useAuth();
  const { units } = useData();
const { getReservationsByUserId, deleteReservation } = useReservations();
  
const [expandedDetailsId, setExpandedDetailsId] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

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
      cancelled: userReservations.filter((r) => r.status === 'cancelled').length,
    };
  }, [userReservations]);

  const filteredReservations = useMemo(() => {
    if (filterStatus === 'all') return userReservations;
    return userReservations.filter((reservation) => {
      if (filterStatus === 'confirmed') {
        return ['approved', 'confirmed', 'completed'].includes(reservation.status);
      }

      return reservation.status === filterStatus;
    });
  }, [filterStatus, userReservations]);

  const sortedReservations = useMemo(() => {
    return [...filteredReservations].sort(
      (a, b) =>
        new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()
    );
  }, [filteredReservations]);

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

const toggleDetails = useCallback(
  (id: string) => {
    setExpandedDetailsId((prev) => (prev === id ? null : id));
  },
  []
);

  const handleDeleteReservation = useCallback(
  async (reservationId: string, unitName: string) => {
      if (
        window.confirm(
          `Are you sure you want to cancel your reservation for "${unitName}"?`
        )
      ) {
        await deleteReservation(reservationId);
      }
    },
    [deleteReservation]
  );

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

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        <div className="flex justify-between items-end gap-4">
          <header>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              My Reservations
            </h1>
            <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">
              View and manage your reservation requests
            </p>
          </header>

          {userReservations.length > 0 && (
            <button
              onClick={() => setShowFilterMenu(true)}
              className="rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm transition active:scale-95 md:hidden"
            >
              <Filter className="size-5 text-gray-600" />
            </button>
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
                  filterStatus === 'all'
                    ? "You haven't made any reservations yet."
                    : `No ${filterStatus} reservations found.`
                }
              />
            </motion.div>
          ) : (
            <div className="grid gap-4">
              {sortedReservations.map((reservation) => {
                const unit = reservationUnitMap.get(reservation.unitId);
                const balance = reservation.totalAmount - reservation.paidAmount;
                const paymentProgress =
                  reservation.totalAmount > 0
                    ? Math.min(
                        100,
                        Math.max(
                          0,
                          (reservation.paidAmount / reservation.totalAmount) * 100
                        )
                      )
                    : 0;
                const isDetailsExpanded = expandedDetailsId === reservation.id;
                const isCardExpanded = !isMobile || expandedId === reservation.id;
                const status =
                  (reservation.status as ReservationStatus) in STATUS_COLORS
                    ? (reservation.status as ReservationStatus)
                    : 'pending';

                const formattedDuration = formatReservationDuration(
                  reservation.duration,
                  reservation.durationType
                );

                return (
                  <motion.div
                    layout
                    key={reservation.id}
                    className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm sm:rounded-[22px]"
                  >
                    <div
                      className={`p-4 sm:p-5 ${isMobile ? 'cursor-pointer' : ''}`}
                      onClick={() => toggleExpand(reservation.id)}
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="mb-1.5 flex items-start justify-between gap-2.5">
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-blue-600 sm:text-[13px]">
                                {getUnitTypeLabel(reservation.unitType)}
                              </span>

                              <p
                                className={`${uiTypography.helperText} mt-1 truncate text-gray-400 text-[11px]`}
                              >
                                ID: {reservation.publicId || reservation.id}
                              </p>
                            </div>

                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${uiTypography.buttonTextBold} shadow-sm ${STATUS_COLORS[status]}`}
                            >
                              {STATUS_ICONS[status]} {status.toUpperCase()}
                            </span>
                          </div>

                          <h3
                            className={`${uiTypography.cardTitle} truncate text-[15px] sm:text-base text-gray-900`}
                          >
                            {reservation.unitName}
                          </h3>

                          <div className="mt-0.5 flex items-center gap-1.5 text-gray-500">
                            <MapPin className="size-4 text-red-600" />
                            <span
                              className={`${uiTypography.bodyText} truncate text-[13px] sm:text-sm`}
                            >
                              {unit?.location || 'N/A'}
                            </span>
                          </div>
                        </div>

                        {isMobile && (
                          <motion.div
                            animate={{ rotate: isCardExpanded ? 180 : 0 }}
                            className="ml-2 rounded-lg bg-gray-50 p-1"
                          >
                            <ChevronDown className="size-5 text-gray-400" />
                          </motion.div>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 rounded-xl border border-gray-100 bg-gray-50/80 p-2.5">
                        <div>
                          <p
                            className={`${uiTypography.miniStatLabel} mb-1 text-gray-500 text-[10px]`}
                          >
                            Start
                          </p>
                          <p
                            className={`${uiTypography.miniStatValue} text-gray-900 text-[13px] sm:text-sm`}
                          >
                            {formatDate(reservation.startDate)}
                          </p>
                        </div>

                        <div className="border-x border-gray-200 px-2">
                          <p
                            className={`${uiTypography.miniStatLabel} mb-1 text-gray-500 text-[10px]`}
                          >
                            End
                          </p>
                          <p
                            className={`${uiTypography.miniStatValue} text-gray-900 text-[13px] sm:text-sm`}
                          >
                            {formatDate(reservation.endDate)}
                          </p>
                        </div>

                        <div className="pl-1">
                          <p
                            className={`${uiTypography.miniStatLabel} mb-1 text-gray-500 text-[10px]`}
                          >
                            Duration
                          </p>
                          <p
                            className={`${uiTypography.miniStatValue} text-gray-900 text-[13px] sm:text-sm`}
                          >
                            {formattedDuration}
                          </p>
                        </div>
                      </div>
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
className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-left transition hover:bg-gray-100"          >
            <div>
              <p className={`${uiTypography.miniStatLabel} text-gray-500`}>
                Reservation Details
              </p>
              <p className={`${uiTypography.helperText} mt-0.5 text-[11px] text-gray-400`}>
                View visit mode, payment method, purpose, notes, and more
              </p>
            </div>

            <motion.div
              animate={{ rotate: isDetailsExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-lg bg-white p-1 shadow-sm"
            >
              <ChevronDown className="size-4 text-gray-500" />
            </motion.div>
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

                    {reservation.paymentCycle && (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-gray-500">
                          <Clock className="size-4 text-amber-600" />
                          <span className={uiTypography.miniStatLabel}>Cycle</span>
                        </div>
                        <span
                          className={`${uiTypography.infoBlockValue} capitalize text-gray-900 text-right`}
                        >
                          {reservation.paymentCycle}
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
                            className={`${uiTypography.miniStatLabel} text-blue-700 text-[10px]`}
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
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <div className="mb-3 grid grid-cols-3 gap-2">
            <div className="text-center sm:text-left">
              <p
                className={`${uiTypography.miniStatLabel} mb-0.5 text-gray-500 text-[10px]`}
              >
                Total
              </p>
              <p
                className={`${uiTypography.miniStatValue} text-gray-900 text-[13px] sm:text-sm`}
              >
                {formatCurrency(reservation.totalAmount)}
              </p>
            </div>

            <div className="text-center sm:text-left">
              <p
                className={`${uiTypography.miniStatLabel} mb-0.5 text-gray-500 text-[10px]`}
              >
                Paid
              </p>
              <p
                className={`${uiTypography.miniStatValue} text-green-600 text-[13px] sm:text-sm`}
              >
                {formatCurrency(reservation.paidAmount)}
              </p>
            </div>

            <div className="text-center sm:text-left">
              <p
                className={`${uiTypography.miniStatLabel} mb-0.5 text-gray-500 text-[10px]`}
              >
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
            <div className="mb-3">
              <div
                className={`${uiTypography.helperText} flex justify-between text-gray-500 mb-1 text-[11px]`}
              >
                <span>Payment Progress</span>
                <span>{paymentProgress.toFixed(0)}%</span>
              </div>

              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
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
        </div>

        {reservation.status === 'pending' && (
          <div
            className={`rounded-2xl border border-yellow-200 bg-yellow-50 p-4 ${uiTypography.bodyText} text-[13px] sm:text-sm text-yellow-800`}
          >
            Pending admin approval. You will be notified once reviewed.
          </div>
        )}

        {['approved', 'confirmed', 'completed'].includes(reservation.status) && balance > 0 && (
          <div
            className={`rounded-2xl border border-yellow-200 bg-yellow-50 p-4 ${uiTypography.bodyText} text-[13px] sm:text-sm text-yellow-800`}
          >
            Approved! Please go to Payments to complete your transaction. Minimum payment rules will be shown there before submission.
          </div>
        )}

       <div className="flex flex-col items-start justify-between gap-2 pt-1 sm:flex-row sm:items-center">
          <span className={`${uiTypography.helperText} text-gray-400 text-[11px]`}>
            Requested {formatDate(reservation.requestDate)}
          </span>

          {reservation.status === 'pending' && (
            <button
              onClick={() =>
                handleDeleteReservation(reservation.id, reservation.unitName)
              }
              className={`w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-red-600 text-white text-[13px] sm:text-sm ${uiTypography.buttonText} rounded-xl hover:bg-red-700 transition-colors shadow-sm`}
            >
              Cancel Reservation
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )}
</AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <ReservationFilterBottomSheet
          isOpen={showFilterMenu}
          filter={filterStatus}
          counts={filterCounts}
          onClose={() => setShowFilterMenu(false)}
          onSelect={handleFilterSelectFromSheet}
        />
      </div>
    </div>
  );
}