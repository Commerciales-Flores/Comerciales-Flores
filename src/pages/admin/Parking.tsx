import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Eye,
  X,
  Car,
  MapPin,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  ChevronDown,
} from 'lucide-react';

import supabase from '../../supabaseClient';
import {
  fetchParkingRules,
  saveParkingRules,
  DEFAULT_PARKING_RULES,
  type ParkingRules,
} from '../../data/appSettings';
import { useAdminData } from '../../contexts/AdminDataContext';
import { useReservations } from '../../contexts/ReservationsContext';
import { useUsers } from '../../contexts/UsersContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { DataTable, DataCell, ActionCell } from '../../components/common/DataTable';
import EmptyState from '../../components/common/EmptyState';
import type { Reservation, ReservationStatus } from '../../data/types';

import AdminFilterBar, {
  FILTER_SELECT_CLASS,
} from '../../components/common/AdminFilterBar';
import { formatDate } from '../../utils/date';
import { formatCurrency } from '../../utils/currency';
import SortSelect from '../../components/shared/filters/SortSelect';
import type { ReservationSortOption } from '../../data/sorting';
import { RESERVATION_SORT_OPTIONS } from '../../utils/sorting/sortingOptions';
import { sortReservations } from '../../utils/sorting/sortReservations';

type ParkingReservationStatus =
  | 'all'
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'overdue';

type ParkingSlotOption = {
  slot_id: string;
  unit_id: string;
  slot_code: string;
  label: string | null;
  status: 'active' | 'inactive' | 'maintenance';
  public_id: string;
};

type ParkingReservation = {
  id: string;
  publicId?: string;
  userId: string;
  unitId: string;
  unitName: string;
  unitType: string;
  status: ReservationStatus;
  startDate: string;
  endDate: string;
  requestDate: string;
  totalAmount: number;
  paidAmount: number;
  modeOfVisit?: string | null;
  paymentIntent?: string | null;
  notes?: string | null;
  details?: Record<string, any> | null;
  vehicleType?: string | null;
  plateNumber?: string | null;
  assignedParkingSlotId?: string | null;
};

type EnrichedParkingReservation = ParkingReservation & {
  reservationPublicId: string;
  fullName: string;
  userPublicId: string;
  location: string;
  requestDateLabel: string;
  startDateLabel: string;
  endDateLabel: string;
  requestDateMs: number;
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  confirmed: 'bg-green-100 text-green-700 border-green-200',
  overdue: 'bg-orange-100 text-orange-700 border-orange-200',
  completed: 'bg-blue-100 text-blue-700 border-blue-200',
  cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
};

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

function getGuestAwareName(reservation: any, user: any) {
  const details = reservation?.details ?? {};

  const guestName =
    details.guestName ||
    details.guest_name ||
    details.fullName ||
    details.full_name ||
    null;

  if (guestName) return String(guestName).trim();

  const fullName =
    `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() ||
    user?.email ||
    'Unknown User';

  return fullName;
}

function getVehicleType(reservation: any) {
  return (
    reservation?.vehicleType ||
    reservation?.details?.vehicleType ||
    reservation?.details?.vehicle_type ||
    'Not specified'
  );
}

function getPlateNumber(reservation: any) {
  return (
    reservation?.plateNumber ||
    reservation?.details?.plateNumber ||
    reservation?.details?.plate_number ||
    'Not specified'
  );
}

function getAssignedSlotLabel(
  reservation: any,
  slotMap: Map<string, ParkingSlotOption>
) {
  const assignedId = reservation.assignedParkingSlotId;
  const details = reservation.details ?? {};

  if (assignedId && slotMap.has(assignedId)) {
    const slot = slotMap.get(assignedId)!;
    return slot.label?.trim() || slot.slot_code;
  }

  return (
    details.assignedSlotCode ||
    details.assigned_slot_code ||
    details.assignedSlotLabel ||
    details.assigned_slot_label ||
    'Unassigned'
  );
}

export default function Parking() {
  const { updateReservation, getUnitById, loadingUnits } = useAdminData();
  const { fetchReservationsPage, reservationsVersion } = useReservations();
  const { users, isLoadingUsers, refreshUsers, getUserById } = useUsers();
  const { sendReservationNotification } = useNotifications();

  const [reservations, setReservations] = useState<ParkingReservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ParkingReservationStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
const [sortBy, setSortBy] =
  useState<ReservationSortOption>('newest');

  const [slotOptions, setSlotOptions] = useState<ParkingSlotOption[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [parkingRules, setParkingRules] =
  useState<ParkingRules>(DEFAULT_PARKING_RULES);
  const [showSettings, setShowSettings] = useState(false);

const [isSavingRules, setIsSavingRules] = useState(false);
const [rulesSaved, setRulesSaved] = useState(false);
const [rulesError, setRulesError] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(searchTerm, 250);

  useEffect(() => {
    if (users.length === 0) {
      void refreshUsers();
    }
  }, [users.length, refreshUsers]);

  const loadParkingReservations = useCallback(async () => {
    setLoading(true);

    try {
      const result = await fetchReservationsPage({
        page: 1,
        pageSize: 200,
        status: filterStatus,
        searchTerm: debouncedSearch,
      });

      const parkingOnly = (result.data ?? []).filter(
        (reservation: any) => reservation.unitType === 'parking_slot'
      );

      setReservations(parkingOnly);
    } catch (error) {
      console.error('Failed to load parking reservations:', error);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, [fetchReservationsPage, filterStatus, debouncedSearch]);

  useEffect(() => {
    void loadParkingReservations();
  }, [loadParkingReservations]);

  useEffect(() => {
    void loadParkingReservations();
  }, [reservationsVersion, loadParkingReservations]);

  useEffect(() => {
  let cancelled = false;

  const loadRules = async () => {
    try {
      const rules = await fetchParkingRules();

      if (!cancelled) {
        setParkingRules(rules);
      }
    } catch {
      if (!cancelled) {
        setParkingRules(DEFAULT_PARKING_RULES);
      }
    }
  };

  void loadRules();

  return () => {
    cancelled = true;
  };
}, []);

  const enrichedReservations = useMemo<EnrichedParkingReservation[]>(() => {
    return reservations.map((reservation: any) => {
      const user = getUserById(reservation.userId);
      const unit = getUnitById(reservation.unitId);

      return {
        ...reservation,
        reservationPublicId: reservation.publicId ?? reservation.id,
        fullName: getGuestAwareName(reservation, user),
        userPublicId: user?.publicId ?? 'Guest / No account',
        location: reservation.location ?? unit?.location ?? 'Not Specified',
        requestDateLabel: formatDate(reservation.requestDate),
        startDateLabel: formatDate(reservation.startDate),
        endDateLabel: formatDate(reservation.endDate),
        requestDateMs: new Date(reservation.requestDate).getTime(),
      };
    });
  }, [reservations, getUserById, getUnitById]);

  const filteredReservations = useMemo(() => {
  const term = debouncedSearch.trim().toLowerCase();

  const searched = !term
    ? enrichedReservations
    : enrichedReservations.filter((r) => {
        const fields = [
          r.fullName,
          r.reservationPublicId,
          r.userPublicId,
          r.unitName,
          r.location,
          r.status,
          getVehicleType(r),
          getPlateNumber(r),
        ];

        return fields.some((value) =>
          String(value ?? '').toLowerCase().includes(term)
        );
      });

  return sortReservations(
    searched.map((r) => ({
      ...r,
      created_at: r.requestDate,
      start_date: r.startDate,
      total_amount: r.totalAmount,
      public_id: r.reservationPublicId,
    })),
    sortBy
  );
}, [enrichedReservations, debouncedSearch, sortBy]);

  const selectedReservation = useMemo(() => {
    return (
      filteredReservations.find((reservation) => reservation.id === selectedReservationId) ?? null
    );
  }, [filteredReservations, selectedReservationId]);

  const canAssignSlot =
  !!selectedReservation &&
  (
    selectedReservation.status === 'pending' ||
    (
      selectedReservation.status === 'confirmed' &&
      !selectedReservation.assignedParkingSlotId
    )
  );

  const slotMap = useMemo(() => {
    return new Map(slotOptions.map((slot) => [slot.slot_id, slot]));
  }, [slotOptions]);

  const loadAvailableSlots = useCallback(async (reservation: EnrichedParkingReservation) => {
    setLoadingSlots(true);
    setAssignmentError(null);
    setSelectedSlotId('');

    try {
      const { data: allSlots, error: slotsError } = await supabase
        .from('parking_slots')
        .select('slot_id, unit_id, slot_code, label, status, public_id')
        .eq('unit_id', reservation.unitId)
        .order('slot_code', { ascending: true });

      if (slotsError) throw slotsError;

      const activeSlots = (allSlots ?? []).filter(
        (slot) => slot.status === 'active'
      ) as ParkingSlotOption[];

      const { data: blockingReservations, error: blockingError } = await supabase
        .from('reservations')
        .select(
          'reservation_id, unit_id, status, start_date, end_date, assigned_parking_slot_id'
        )
        .eq('unit_type', 'parking_slot')
        .in('status', ['confirmed', 'approved'])
        .not('assigned_parking_slot_id', 'is', null);

      if (blockingError) throw blockingError;

      const blockedSlotIds = new Set<string>();

      for (const item of blockingReservations ?? []) {
        if (item.reservation_id === reservation.id) continue;

        if (
          rangesOverlap(
            reservation.startDate,
            reservation.endDate,
            item.start_date,
            item.end_date
          ) &&
          item.assigned_parking_slot_id
        ) {
          blockedSlotIds.add(item.assigned_parking_slot_id);
        }
      }

      const available = activeSlots.filter((slot) => !blockedSlotIds.has(slot.slot_id));
      setSlotOptions(available);

      if (reservation.assignedParkingSlotId) {
        const currentStillAvailable = available.find(
          (slot) => slot.slot_id === reservation.assignedParkingSlotId
        );
        if (currentStillAvailable) {
          setSelectedSlotId(currentStillAvailable.slot_id);
        }
      }
    } catch (error: any) {
      console.error('Failed to load available parking slots:', error);
      setSlotOptions([]);
      setAssignmentError(error?.message || 'Failed to load available parking slots.');
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedReservation) return;
    if (selectedReservation.unitType !== 'parking_slot') return;

    void loadAvailableSlots(selectedReservation);
  }, [selectedReservation, loadAvailableSlots]);

  const handleReject = useCallback(
    async (reservation: EnrichedParkingReservation) => {
      await updateReservation(reservation.id, { status: 'cancelled' });

      await sendReservationNotification({
        userId: reservation.userId,
        reservationPublicId: reservation.reservationPublicId,
        action: 'rejected',
      });

      setSelectedReservationId(null);
      await loadParkingReservations();
    },
    [updateReservation, sendReservationNotification, loadParkingReservations]
  );

  const handleAssignAndApprove = useCallback(async () => {
  if (!selectedReservation) return;
  if (!selectedSlotId) {
    setAssignmentError(
      selectedReservation.status === 'pending'
        ? 'Please select a parking slot before approving.'
        : 'Please select a parking slot before assigning.'
    );
    return;
  }

  const assignedSlot = slotMap.get(selectedSlotId);
  if (!assignedSlot) {
    setAssignmentError('Selected slot is invalid or no longer available.');
    return;
  }

  try {
    setIsAssigning(true);
    setAssignmentError(null);

    const nextDetails = {
      ...(selectedReservation.details ?? {}),
      assignedSlotCode: assignedSlot.slot_code,
      assignedSlotLabel: assignedSlot.label ?? assignedSlot.slot_code,
      assignedAt: new Date().toISOString(),
    };

    const nextStatus: ReservationStatus =
  selectedReservation.status === 'pending'
    ? 'confirmed'
    : selectedReservation.status;

    await updateReservation(selectedReservation.id, {
      status: nextStatus,
      assignedParkingSlotId: assignedSlot.slot_id,
      details: nextDetails as any,
    });

    if (selectedReservation.status === 'pending') {
      await sendReservationNotification({
        userId: selectedReservation.userId,
        reservationPublicId: selectedReservation.reservationPublicId,
        action: 'approved',
      });
    }

    setSelectedReservationId(null);
    await loadParkingReservations();
  } catch (error: any) {
    console.error('Failed to assign parking slot:', error);
    setAssignmentError(
      error?.message ||
        (selectedReservation.status === 'pending'
          ? 'Failed to assign and approve request.'
          : 'Failed to assign parking slot.')
    );
  } finally {
    setIsAssigning(false);
  }
}, [
  selectedReservation,
  selectedSlotId,
  slotMap,
  updateReservation,
  sendReservationNotification,
  loadParkingReservations,
]);

  const handleSaveParkingRules = useCallback(async () => {
  try {
    setIsSavingRules(true);
    setRulesSaved(false);
    setRulesError(null);

    const saved = await saveParkingRules(parkingRules);

    setParkingRules(saved);
    setRulesSaved(true);
  } catch (error: any) {
    setRulesError(
      error?.message || 'Failed to save parking settings.'
    );
  } finally {
    setIsSavingRules(false);
  }
}, [parkingRules]);

  const hasActiveFilters =
  filterStatus !== 'all' ||
  Boolean(debouncedSearch.trim()) ||
  sortBy !== 'newest';
  const hasNoReservations = !loading && filteredReservations.length === 0 && !hasActiveFilters;
  const hasNoSearchResults = !loading && filteredReservations.length === 0 && hasActiveFilters;

  return (
    <div className="min-h-screen bg-white">
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <div className="hidden items-center justify-between lg:flex">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Parking Requests</h1>
            <p className="text-sm text-gray-500">
              Review parking requests, assign slots, and approve reservations.
            </p>
          </div>
        </div>

        <AdminFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          placeholder="Search by reservation ID, requester, parking area, vehicle, or plate."
          showMobileFilters={isFilterPanelOpen}
          onToggleMobileFilters={() => setIsFilterPanelOpen((prev) => !prev)}
          actions={
            <div className="hidden lg:flex lg:items-center lg:gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as ParkingReservationStatus)}
                className={FILTER_SELECT_CLASS}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="rejected">Rejected</option>
                <option value="overdue">Overdue</option>
              </select>

              <SortSelect<ReservationSortOption>
                value={sortBy}
                onChange={setSortBy}
                options={RESERVATION_SORT_OPTIONS}
                className="min-w-[220px]"
              />

              {hasActiveFilters && (
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
                onChange={(e) => setFilterStatus(e.target.value as ParkingReservationStatus)}
                className={FILTER_SELECT_CLASS}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="rejected">Rejected</option>
                <option value="overdue">Overdue</option>
              </select>

              <SortSelect<ReservationSortOption>
                value={sortBy}
                onChange={setSortBy}
                options={RESERVATION_SORT_OPTIONS}
                className="w-full"
              />
            </div>
          }
        />

        <div className="flex-1">
          {loading || loadingUnits || isLoadingUsers ? (
            <EmptyState
              icon={
                <div className="flex items-center justify-center">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                </div>
              }
              title="Loading parking requests..."
              description="Please wait while parking reservations are being retrieved."
            />
          ) : hasNoReservations ? (
            <EmptyState
              icon={<Car className="size-10 text-blue-500" />}
              title="No parking requests yet"
              description="Parking reservation requests will appear here once submitted."
            />
          ) : hasNoSearchResults ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="mb-4 rounded-3xl bg-gray-50 p-6 shadow-sm">
                <Search className="size-12 text-blue-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">No matching parking requests</h3>
              <p className="mt-1 max-w-xs text-sm text-gray-500">
                Try adjusting your search or status filter.
              </p>
            </motion.div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 lg:hidden">
                {filteredReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="font-mono text-[10px] uppercase tracking-tighter text-gray-400">
                        ID: {reservation.reservationPublicId}
                      </div>

                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                          statusColors[reservation.status] ?? 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {reservation.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-bold text-gray-900">{reservation.unitName}</h3>
                      <p className="text-xs text-gray-500">{reservation.location}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-2 text-sm">
                      <div>
                        <span className="block text-[10px] font-bold uppercase text-gray-400">
                          Requester
                        </span>
                        <span className="font-semibold text-gray-900">{reservation.fullName}</span>
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold uppercase text-gray-400">
                          Vehicle
                        </span>
                        <span className="font-semibold text-gray-900">
                          {getVehicleType(reservation)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="text-xs text-gray-500">
                        <Calendar className="mb-0.5 mr-1 inline size-3" />
                        {reservation.startDateLabel}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedReservationId(reservation.id)}
                          className="rounded-xl bg-blue-50 p-2.5 text-blue-600"
                        >
                          <Eye className="size-5" />
                        </button>
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
                        <span className="block">Requester</span>,
                        <span className="block">Parking Area</span>,
                        <span className="block">Date Range</span>,
                        <span className="block">Vehicle</span>,
                        <span className="block">Assigned Slot</span>,
                        <span className="block">Status</span>,
                        <span className="block">Actions</span>,
                      ]}
                    >
                      {filteredReservations.map((reservation) => (
                        <tr key={reservation.id} className="transition-colors hover:bg-blue-50/30">
                          <DataCell
                            value={reservation.reservationPublicId}
                            mono
                            className="w-[220px]"
                          />

                          <DataCell
                            value={
                              <div>
                                <p className="font-semibold text-gray-900">{reservation.fullName}</p>
                                <p className="mt-0.5 text-xs text-gray-500">
                                  {reservation.userPublicId}
                                </p>
                              </div>
                            }
                            className="w-[240px]"
                          />

                          <DataCell
                            value={
                              <div>
                                <p className="font-semibold text-gray-900">{reservation.unitName}</p>
                                <p className="mt-0.5 text-xs text-gray-500">{reservation.location}</p>
                              </div>
                            }
                            className="w-[240px]"
                          />

                          <DataCell
                            value={
                              <div className="text-xs text-gray-500">
                                <div>{reservation.startDateLabel}</div>
                                <div>to {reservation.endDateLabel}</div>
                              </div>
                            }
                            className="w-[200px]"
                          />

                          <DataCell
                            value={
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {getVehicleType(reservation)}
                                </p>
                                <p className="mt-0.5 text-xs text-gray-500">
                                  Plate: {getPlateNumber(reservation)}
                                </p>
                              </div>
                            }
                            className="w-[200px]"
                          />

                          <DataCell
                            value={getAssignedSlotLabel(reservation, slotMap)}
                            className="w-[180px]"
                          />

                          <DataCell
                            value={
                              <span
                                className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                                  statusColors[reservation.status] ??
                                  'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {reservation.status.toUpperCase()}
                              </span>
                            }
                            className="w-[160px]"
                          />

                          <ActionCell className="w-[90px]">
                            <button
                              onClick={() => setSelectedReservationId(reservation.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-md text-blue-600 hover:bg-blue-100"
                              title="View"
                            >
                              <Eye size={16} />
                            </button>
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
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
  <button
    type="button"
    onClick={() => setShowSettings((prev) => !prev)}
    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
  >
    <div className="flex items-start gap-3">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-slate-600">
        <Settings className="size-4" />
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-900">
          Parking Settings
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Adjust hourly parking schedule and same-day request rules.
        </p>
      </div>
    </div>

    <ChevronDown
      className={`size-5 text-slate-400 transition-transform duration-200 ${
        showSettings ? 'rotate-180' : ''
      }`}
    />
  </button>

  {showSettings && (
    <div className="border-t border-slate-200 px-5 pb-5 pt-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Hourly Start
          </label>

          <input
            type="time"
            value={parkingRules.hourly_start}
            onChange={(e) =>
              setParkingRules((prev) => ({
                ...prev,
                hourly_start: e.target.value,
              }))
            }
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
          />
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Hourly End
          </label>

          <input
            type="time"
            value={parkingRules.hourly_end}
            onChange={(e) =>
              setParkingRules((prev) => ({
                ...prev,
                hourly_end: e.target.value,
              }))
            }
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
          />
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Lead Time (Minutes)
          </label>

          <input
            type="number"
            min={0}
            step={30}
            value={parkingRules.same_day_lead_minutes}
            onChange={(e) =>
              setParkingRules((prev) => ({
                ...prev,
                same_day_lead_minutes: Number(e.target.value || 0),
              }))
            }
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
          />
        </div>
      </div>

      {rulesError && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {rulesError}
        </div>
      )}

      {rulesSaved && !rulesError && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Parking settings saved successfully.
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={handleSaveParkingRules}
          disabled={isSavingRules}
          className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSavingRules ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )}
</div>
      </div>
      

      {isFilterPanelOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center lg:hidden">
          <button className="absolute inset-0 bg-gray-900/40" onClick={() => setIsFilterPanelOpen(false)} />
          <div className="relative w-full animate-in slide-in-from-bottom rounded-t-3xl bg-white p-6 shadow-xl duration-300">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Filter by Status</h3>
              <button
                onClick={() => setIsFilterPanelOpen(false)}
                className="rounded-full bg-gray-100 p-2"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {(
                ['all', 'pending', 'confirmed', 'completed', 'cancelled', 'rejected', 'overdue'] as const
              ).map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setFilterStatus(status);
                    setIsFilterPanelOpen(false);
                  }}
                  className={`w-full rounded-2xl border-2 px-6 py-4 text-left font-semibold transition-all ${
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

      {selectedReservation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-slate-200/60 bg-white shadow-xl">
            <div className="flex items-center justify-between bg-slate-900 p-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Parking Request Dossier
                </h2>
                <p className="mt-1 font-mono text-xs font-medium text-slate-400">
                  {selectedReservation.reservationPublicId}
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedReservationId(null);
                  setAssignmentError(null);
                  setSelectedSlotId('');
                }}
                className="rounded-xl bg-white/5 p-2 text-slate-400 transition-all hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-6 sm:p-8">
              <div>
                <h3 className="mb-3 ml-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Request Overview
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <DetailItem
                    icon={<User className="size-4" />}
                    label="Requester"
                    value={selectedReservation.fullName}
                    subValue={selectedReservation.userPublicId}
                  />

                  <DetailItem
                    icon={<Car className="size-4" />}
                    label="Vehicle"
                    value={getVehicleType(selectedReservation)}
                    subValue={`Plate: ${getPlateNumber(selectedReservation)}`}
                  />

                  <DetailItem
                    icon={<MapPin className="size-4" />}
                    label="Parking Area"
                    value={selectedReservation.unitName}
                    subValue={selectedReservation.location}
                  />

                  <DetailItem
                    icon={<Calendar className="size-4" />}
                    label="Start Date"
                    value={selectedReservation.startDateLabel}
                  />

                  <DetailItem
                    icon={<Calendar className="size-4" />}
                    label="End Date"
                    value={selectedReservation.endDateLabel}
                  />

                  <DetailItem
                    icon={<Clock className="size-4" />}
                    label="Request Date"
                    value={selectedReservation.requestDateLabel}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h4 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <Car className="size-4" />
                  Slot Assignment
                </h4>

                {canAssignSlot ? (
                  <div className="space-y-4">
                    {assignmentError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {assignmentError}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Available Parking Slot
                      </label>

                      <select
                        value={selectedSlotId}
                        onChange={(e) => setSelectedSlotId(e.target.value)}
                        disabled={loadingSlots || isAssigning}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                      >
                        <option value="">
                          {loadingSlots ? 'Loading available slots...' : 'Select a slot'}
                        </option>

                        {slotOptions.map((slot) => (
                          <option key={slot.slot_id} value={slot.slot_id}>
                            {slot.label?.trim() || slot.slot_code}
                          </option>
                        ))}
                      </select>

                      <p className="ml-1 text-[11px] text-slate-400">
                        Only active, non-conflicting slots are shown for this date range.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                    Assigned Slot: {getAssignedSlotLabel(selectedReservation, slotMap)}
                  </div>
                )}
              </div>

              {selectedReservation.notes && (
                <div>
                  <h3 className="mb-3 ml-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Customer Notes
                  </h3>

                  <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 text-sm italic leading-relaxed text-amber-900">
                    “{selectedReservation.notes}”
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 bg-white px-6 py-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500">Current Status</span>
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
                      statusColors[selectedReservation.status] ??
                      'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {selectedReservation.status}
                  </span>
                </div>

                {canAssignSlot && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleReject(selectedReservation)}
                      disabled={isAssigning}
                      className="rounded-xl border border-rose-200 px-5 py-2.5 font-semibold text-rose-600 transition-all hover:bg-rose-500 hover:text-white disabled:opacity-50"
                    >
                      <span className="inline-flex items-center gap-2">
                        <XCircle className="size-4" />
                        Reject
                      </span>
                    </button>

                    <button
                      onClick={handleAssignAndApprove}
                      disabled={!selectedSlotId || isAssigning}
                      className="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="inline-flex items-center gap-2">
                        <CheckCircle className="size-4" />
                        {isAssigning
                          ? 'Assigning...'
                          : selectedReservation.status === 'pending'
                          ? 'Assign & Approve'
                          : 'Assign Slot'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    
    
  );
  
}

function DetailItem({
  icon,
  label,
  value,
  subValue,
}: {
  icon: React.ReactElement;
  label: string;
  value: React.ReactNode;
  subValue?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all">
      <div className="mt-0.5 flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-500">
        {React.cloneElement(icon, { className: 'size-4' })}
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <p className="mt-0.5 break-words text-sm font-semibold text-slate-900">
          {value}
        </p>

        {subValue ? <p className="mt-0.5 text-[11px] text-slate-500">{subValue}</p> : null}
      </div>
    </div>
  );
}