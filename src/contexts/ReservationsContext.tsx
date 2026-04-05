import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import supabase from '../supabaseClient';
import type { Reservation, ReservationStatus, LedgerEntry } from '../data/types';
import { useRecords } from './RecordsContext';
import { useAuth } from './AuthContext';
import { getChangedFields, buildAuditSnapshot } from '../utils/auditHelpers';

import {
  normalizeText,
  normalizePlateNumber,
  normalizeName,
  normalizeAddress,
} from '../utils/DataNormalization';

type ReservationsPageFilters = {
  page?: number;
  pageSize?: number;
  status?: 'all' | 'pending' | 'confirmed' | 'overdue' | 'completed' | 'cancelled' | 'rejected';
  searchTerm?: string;
};

interface ReservationsContextType {
  reservations: Reservation[];
  reservationsVersion: number;
  addReservation: (
    reservation: Omit<
      Reservation,
      'id' | 'requestDate' | 'status' | 'paidAmount' | 'minimumPaymentPercentSnapshot'
    >
  ) => Promise<string>;
  updateReservation: (id: string, reservation: Partial<Reservation>) => Promise<void>;
  deleteReservation: (id: string) => Promise<void>;
  refreshReservations: () => Promise<void>;
  getReservationsByUserId: (userId: string) => Reservation[];
  fetchReservationsPage: (filters: ReservationsPageFilters) => Promise<{
    data: Reservation[];
    count: number;
  }>;
}

const ReservationsContext = createContext<ReservationsContextType | undefined>(undefined);

function buildReservationDetails(reservation: Partial<Reservation>) {
  const details = {
    paymentCycle: reservation.paymentCycle,
    businessType: reservation.businessType
      ? normalizeText(reservation.businessType)
      : undefined,
    eventPurpose: reservation.eventPurpose
      ? normalizeText(reservation.eventPurpose)
      : undefined,
    attendees: reservation.attendees,
    slotId: reservation.slotId,
    slotName: reservation.slotName
      ? normalizeText(reservation.slotName)
      : undefined,
    vehicleType: reservation.vehicleType
      ? normalizeText(reservation.vehicleType)
      : undefined,
    plateNumber: reservation.plateNumber
      ? normalizePlateNumber(reservation.plateNumber)
      : undefined,
    durationType: reservation.durationType,
  };

  return Object.fromEntries(
    Object.entries(details).filter(([, value]) => value !== undefined)
  );
}

function getRemainingBalance(reservation: Reservation) {
  return Math.max(
    0,
    Number(reservation.totalAmount || 0) - Number(reservation.paidAmount || 0)
  );
}

function isFullyPaid(reservation: Reservation) {
  return getRemainingBalance(reservation) <= 0;
}

function hasReservationEnded(reservation: Reservation) {
  if (!reservation.endDate) return false;
  return new Date(reservation.endDate).getTime() < Date.now();
}

function isOverdueReservation(reservation: Reservation) {
  return (
    reservation.status === 'confirmed' &&
    hasReservationEnded(reservation) &&
    !isFullyPaid(reservation)
  );
}

function sortReservationsByRequestDate(items: Reservation[]) {
  return [...items].sort(
    (a, b) =>
      new Date(b.requestDate ?? 0).getTime() - new Date(a.requestDate ?? 0).getTime()
  );
}

function buildLedgerTotalsMap(ledgers: LedgerEntry[]) {
  const map = new Map<
    string,
    {
      paid: number;
      refunds: number;
      discounts: number;
      penalties: number;
      adjustments: number;
      netPaid: number;
    }
  >();

  for (const entry of ledgers) {
    if (!entry.reservationId) continue;

    const current = map.get(entry.reservationId) ?? {
      paid: 0,
      refunds: 0,
      discounts: 0,
      penalties: 0,
      adjustments: 0,
      netPaid: 0,
    };

    switch (entry.entryType) {
      case 'payment':
      case 'balance':
        current.paid += Number(entry.amount || 0);
        break;
      case 'deposit':
        if (entry.depositType === 'advance') {
          current.paid += Number(entry.amount || 0);
        }
        break;
      case 'refund':
        current.refunds += Number(entry.amount || 0);
        break;
      case 'discount':
        current.discounts += Number(entry.amount || 0);
        break;
      case 'penalty':
        current.penalties += Number(entry.amount || 0);
        break;
      case 'adjustment':
        current.adjustments += Number(entry.amount || 0);
        break;
    }

    current.netPaid =
      current.paid -
      current.refunds -
      current.discounts +
      current.penalties +
      current.adjustments;

    map.set(entry.reservationId, current);
  }

  return map;
}

export function ReservationsProvider({ children }: { children: ReactNode }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [reservationsVersion, setReservationsVersion] = useState(0);

  const { addAuditLog, ledgers } = useRecords();
  const { user } = useAuth();

  const hasLoadedReservationsRef = useRef(false);
const refreshReservationsPromiseRef = useRef<Promise<void> | null>(null);

  const ledgerTotalsMap = useMemo(() => buildLedgerTotalsMap(ledgers), [ledgers]);

  const applyDerivedReservationState = useCallback(
    (reservation: Reservation): Reservation => {
      const totals = ledgerTotalsMap.get(reservation.id);

      const persistedPaidAmount = Number(reservation.paidAmount ?? 0);
      const derivedPaidAmount = Number(totals?.netPaid ?? 0);
      const finalPaidAmount =
        persistedPaidAmount > 0 ? persistedPaidAmount : derivedPaidAmount;

      const nextReservation: Reservation = {
        ...reservation,
        paidAmount: finalPaidAmount,
      };

      if (isOverdueReservation(nextReservation)) {
        return { ...nextReservation, status: 'overdue' };
      }

      if (nextReservation.status === 'overdue' && !hasReservationEnded(nextReservation)) {
        return { ...nextReservation, status: 'confirmed' };
      }

      return nextReservation;
    },
    [ledgerTotalsMap]
  );

  const mapReservationRow = useCallback(
    (row: any): Reservation => {
      const persistedPaidAmount = Number(row.paid_amount ?? 0);
      const derivedPaidAmount = Number(
        ledgerTotalsMap.get(row.reservation_id)?.netPaid ?? 0
      );

      const finalPaidAmount =
        persistedPaidAmount > 0 ? persistedPaidAmount : derivedPaidAmount;

      let computedStatus = row.status as ReservationStatus;

      const baseReservation: Reservation = {
        id: row.reservation_id,
        publicId: row.public_id,
        userId: row.user_id,
        unitId: row.unit_id,
        unitName: row.title,
        unitType: row.unit_type,
        startDate: row.start_date,
        endDate: row.end_date,
        duration: row.duration,
        details: row.details ?? {},
        totalAmount: Number(row.total_amount),
        status: computedStatus,
        notes: row.notes,
        paidAmount: finalPaidAmount,
        requestDate: row.created_at,
        paymentMethod: row.payment_method,
        paymentIntent: row.payment_intent,
        modeOfVisit: row.mode_of_visit,
        appointmentDate: row.appointment_date,
        appointmentTime: row.appointment_time,
        paymentCycle: row.details?.paymentCycle as Reservation['paymentCycle'],
        businessType: row.details?.businessType,
        eventPurpose: row.details?.eventPurpose,
        attendees: row.details?.attendees,
        slotId: row.details?.slotId,
        slotName: row.details?.slotName,
        vehicleType: row.details?.vehicleType,
        plateNumber: row.details?.plateNumber,
        durationType: row.details?.durationType,
        confirmedVisitDate: row.confirmed_visit_date,
        confirmedVisitTime: row.confirmed_visit_time,
        visitStatus: row.visit_status ?? 'requested',
        minimumPaymentPercentSnapshot: row.minimum_payment_percent_snapshot ?? null,
      };

      if (isOverdueReservation(baseReservation)) {
        computedStatus = 'overdue';
      }

      return {
        ...baseReservation,
        status: computedStatus,
      };
    },
    [ledgerTotalsMap]
  );

  const refreshReservations = useCallback(async (force = false) => {
  if (!force && hasLoadedReservationsRef.current) {
    return;
  }

  if (refreshReservationsPromiseRef.current) {
    return refreshReservationsPromiseRef.current;
  }

  const promise = (async () => {
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        reservation_id,
        public_id,
        user_id,
        unit_id,
        title,
        unit_type,
        start_date,
        end_date,
        duration,
        total_amount,
        status,
        notes,
        paid_amount,
        created_at,
        payment_method,
        payment_intent,
        mode_of_visit,
        appointment_date,
        appointment_time,
        confirmed_visit_date,
        confirmed_visit_time,
        visit_status,
        details,
        minimum_payment_percent_snapshot
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading reservations:', error);
      hasLoadedReservationsRef.current = false;
      return;
    }

    setReservations(sortReservationsByRequestDate((data ?? []).map(mapReservationRow)));
    hasLoadedReservationsRef.current = true;
  })();

  refreshReservationsPromiseRef.current = promise;

  try {
    await promise;
  } finally {
    refreshReservationsPromiseRef.current = null;
  }
}, [mapReservationRow]);

  useEffect(() => {
  let cancelled = false;

  const start = () => {
    if (!cancelled) {
      void refreshReservations();
    }
  };

  if ('requestIdleCallback' in window) {
    const idleWindow = window as Window & {
      requestIdleCallback: (cb: () => void) => number;
      cancelIdleCallback: (id: number) => void;
    };

    const idleId = idleWindow.requestIdleCallback(start);

    return () => {
      cancelled = true;
      idleWindow.cancelIdleCallback(idleId);
    };
  }

  const timeoutId = globalThis.setTimeout(start, 300);

  return () => {
    cancelled = true;
    globalThis.clearTimeout(timeoutId);
  };
}, [refreshReservations]);

  useEffect(() => {
    setReservations((prev) =>
      sortReservationsByRequestDate(prev.map(applyDerivedReservationState))
    );
  }, [applyDerivedReservationState]);

  useEffect(() => {
    const channel = supabase
      .channel('reservations-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reservations',
        },
        (payload) => {
          const newReservation = mapReservationRow(payload.new);

          setReservations((prev) => {
            if (prev.some((item) => item.id === newReservation.id)) {
              return prev;
            }

            return sortReservationsByRequestDate([newReservation, ...prev]);
          });

          setReservationsVersion((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reservations',
        },
        (payload) => {
          const updatedReservation = mapReservationRow(payload.new);

          setReservations((prev) =>
            sortReservationsByRequestDate(
              prev.map((item) =>
                item.id === updatedReservation.id ? updatedReservation : item
              )
            )
          );

          setReservationsVersion((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'reservations',
        },
        (payload) => {
          const deletedId = payload.old.reservation_id as string | undefined;
          if (!deletedId) return;

          setReservations((prev) => prev.filter((item) => item.id !== deletedId));
          setReservationsVersion((prev) => prev + 1);
        }
      )
      .subscribe((status) => {
        if (import.meta.env.DEV) {
          console.log('Reservations realtime status:', status);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [mapReservationRow]);

  const fetchReservationsPage = useCallback(
    async ({
      page = 1,
      pageSize = 25,
      status = 'all',
      searchTerm = '',
    }: ReservationsPageFilters): Promise<{
      data: Reservation[];
      count: number;
    }> => {
      let query = supabase
        .from('reservations')
        .select(
          `
          reservation_id,
          public_id,
          user_id,
          unit_id,
          title,
          unit_type,
          start_date,
          end_date,
          duration,
          total_amount,
          status,
          notes,
          paid_amount,
          created_at,
          payment_method,
          payment_intent,
          mode_of_visit,
          appointment_date,
          appointment_time,
          confirmed_visit_date,
          confirmed_visit_time,
          visit_status,
          details,
          minimum_payment_percent_snapshot
          `,
          { count: 'planned' }
        )
        .order('created_at', { ascending: false });

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      const trimmedSearch = searchTerm.trim();
      if (trimmedSearch) {
        query = query.or(
          [
            `public_id.ilike.%${trimmedSearch}%`,
            `user_id.ilike.%${trimmedSearch}%`,
            `title.ilike.%${trimmedSearch}%`,
            `notes.ilike.%${trimmedSearch}%`,
            `unit_type.ilike.%${trimmedSearch}%`,
            `mode_of_visit.ilike.%${trimmedSearch}%`,
          ].join(',')
        );
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      return {
        data: sortReservationsByRequestDate((data ?? []).map(mapReservationRow)),
        count: count ?? 0,
      };
    },
    [mapReservationRow]
  );

  const addReservation = useCallback(
    async (
      reservationData: Omit<
        Reservation,
        'id' | 'requestDate' | 'status' | 'paidAmount' | 'minimumPaymentPercentSnapshot'
      >
    ): Promise<string> => {
      if (!user?.id) {
        throw new Error('User not authenticated.');
      }

      if (reservationData.unitType === 'rental_space') {
        if (reservationData.durationType !== 'months') {
          throw new Error('Rental spaces must use monthly duration.');
        }

        if (
          reservationData.paymentCycle &&
          !['monthly', 'quarterly', 'full'].includes(reservationData.paymentCycle)
        ) {
          throw new Error('Invalid rental payment cycle.');
        }

        if (!reservationData.paymentCycle) {
          throw new Error('Please select a payment cycle for this rental space.');
        }

        if (
          !Number.isFinite(Number(reservationData.duration)) ||
          Number(reservationData.duration) <= 0
        ) {
          throw new Error('Rental duration must be at least 1 month.');
        }

        if (
          !Number.isFinite(Number(reservationData.totalAmount)) ||
          Number(reservationData.totalAmount) <= 0
        ) {
          throw new Error('Rental total amount must be greater than zero.');
        }

        if (
          reservationData.paymentCycle === 'quarterly' &&
          Number(reservationData.duration) < 3
        ) {
          throw new Error(
            'Quarterly payment cycle requires at least 3 months of rental duration.'
          );
        }
      }

      const cleanDetails = buildReservationDetails(reservationData);

      if (reservationData.unitType === 'parking_slot' && reservationData.slotId) {
        const { data: existing, error: checkError } = await supabase
          .from('reservations')
          .select('reservation_id')
          .eq('unit_type', 'parking_slot')
          .eq('details->>slotId', reservationData.slotId)
          .in('status', ['approved', 'confirmed']);

        if (checkError) {
          console.error('Slot validation failed:', checkError);
          throw new Error('Unable to validate parking slot.');
        }

        if (existing && existing.length > 0) {
          throw new Error(
            'This parking slot is already occupied. Please select another.'
          );
        }
      }

      const { data: unitRow, error: unitError } = await supabase
        .from('units')
        .select('minimum_payment_percent')
        .eq('unit_id', reservationData.unitId)
        .single();

      if (unitError) {
        console.error('Failed to fetch unit minimum payment:', unitError);
        throw new Error('Unable to determine minimum payment requirement.');
      }

      const minimumPaymentPercentSnapshot =
        unitRow?.minimum_payment_percent ?? null;

      const { data, error } = await supabase
        .from('reservations')
        .insert([
          {
            user_id: reservationData.userId,
            unit_id: reservationData.unitId,
            title: reservationData.unitName,
            unit_type: reservationData.unitType,
            start_date: reservationData.startDate,
            end_date: reservationData.endDate,
            duration: reservationData.duration,
            total_amount: Number(reservationData.totalAmount),
            status: 'pending',
            payment_method: reservationData.paymentMethod ?? null,
            payment_intent: reservationData.paymentIntent ?? null,
            mode_of_visit: reservationData.modeOfVisit ?? null,
            appointment_date: reservationData.appointmentDate ?? null,
            appointment_time: reservationData.appointmentTime ?? null,
            notes: reservationData.notes
              ? normalizeText(reservationData.notes)
              : null,
            details: cleanDetails,
            minimum_payment_percent_snapshot: minimumPaymentPercentSnapshot,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const cycle = data.details?.paymentCycle;
      const safePaymentCycle =
        cycle === 'monthly' || cycle === 'quarterly' || cycle === 'full'
          ? cycle
          : undefined;

      const newReservation: Reservation = {
        id: data.reservation_id,
        publicId: data.public_id,
        userId: data.user_id,
        unitId: data.unit_id,
        unitName: data.title,
        unitType: data.unit_type,
        startDate: data.start_date,
        endDate: data.end_date,
        duration: data.duration,
        totalAmount: Number(data.total_amount),
        status: data.status,
        notes: data.notes,
        paidAmount: 0,
        requestDate: data.created_at,
        paymentMethod: data.payment_method,
        paymentIntent: data.payment_intent,
        modeOfVisit: data.mode_of_visit,
        appointmentDate: data.appointment_date,
        appointmentTime: data.appointment_time,
        paymentCycle: safePaymentCycle,
        businessType: data.details?.businessType,
        eventPurpose: data.details?.eventPurpose,
        attendees: data.details?.attendees,
        slotId: data.details?.slotId,
        slotName: data.details?.slotName,
        vehicleType: data.details?.vehicleType,
        plateNumber: data.details?.plateNumber,
        durationType: data.details?.durationType,
        minimumPaymentPercentSnapshot,
      };

      try {
        await addAuditLog({
          userId: user.id,
          action: 'CREATE',
          targetTable: 'reservations',
          targetId: newReservation.id,
          targetPublicId: newReservation.publicId,
          beforeValue: null,
          afterValue: newReservation,
          changedFields: Object.keys(newReservation),
          notes: `Created reservation ${newReservation.publicId ?? newReservation.id}`,
        });
      } catch (auditError) {
        console.error('Failed to audit reservation creation:', auditError);
      }

      return newReservation.id;
    },
    [addAuditLog, user]
  );

  const updateReservation = useCallback(
    async (id: string, reservationUpdate: Partial<Reservation>): Promise<void> => {
      const existingReservation = reservations.find((r) => r.id === id);
      if (!existingReservation) return;

      const dbPayload: Record<string, unknown> = {};

      if (reservationUpdate.status !== undefined) dbPayload.status = reservationUpdate.status;
      if (reservationUpdate.notes !== undefined) {
        dbPayload.notes = reservationUpdate.notes
          ? normalizeText(reservationUpdate.notes)
          : null;
      }
      if (reservationUpdate.appointmentDate !== undefined) {
        dbPayload.appointment_date = reservationUpdate.appointmentDate;
      }
      if (reservationUpdate.appointmentTime !== undefined) {
        dbPayload.appointment_time = reservationUpdate.appointmentTime;
      }
      if (reservationUpdate.modeOfVisit !== undefined) {
        dbPayload.mode_of_visit = reservationUpdate.modeOfVisit;
      }
      if (reservationUpdate.confirmedVisitDate !== undefined) {
        dbPayload.confirmed_visit_date = reservationUpdate.confirmedVisitDate;
      }
      if (reservationUpdate.confirmedVisitTime !== undefined) {
        dbPayload.confirmed_visit_time = reservationUpdate.confirmedVisitTime;
      }
      if (reservationUpdate.visitStatus !== undefined) {
        dbPayload.visit_status = reservationUpdate.visitStatus;
      }
      if (reservationUpdate.endDate !== undefined) {
        dbPayload.end_date = reservationUpdate.endDate;
      }
      if (reservationUpdate.duration !== undefined) {
        dbPayload.duration = reservationUpdate.duration;
      }
      if (reservationUpdate.totalAmount !== undefined) {
        dbPayload.total_amount = reservationUpdate.totalAmount;
      }

      const detailsPatch = buildReservationDetails(reservationUpdate);
      const rawDetails = (reservationUpdate as any).details;

      if (rawDetails !== undefined || Object.keys(detailsPatch).length > 0) {
        const existingDetails = existingReservation.details ?? {};

        dbPayload.details = {
          ...existingDetails,
          ...detailsPatch,
          ...(rawDetails ?? {}),
        };
      }

      if (Object.keys(dbPayload).length === 0) return;

      const { error } = await supabase
        .from('reservations')
        .update(dbPayload)
        .eq('reservation_id', id);

      if (error) throw error;

      const updatedReservation = buildAuditSnapshot(existingReservation, reservationUpdate);
      const changedFields = getChangedFields(existingReservation, reservationUpdate);

      if (changedFields.length === 0) return;

      try {
        await addAuditLog({
          userId: user?.id || existingReservation.userId,
          action: 'UPDATE',
          targetTable: 'reservations',
          targetId: id,
          targetPublicId: existingReservation.publicId,
          beforeValue: existingReservation,
          afterValue: updatedReservation,
          changedFields,
          notes: `Updated reservation ${existingReservation.publicId ?? id}`,
        });
      } catch (auditError) {
        console.error('Failed to audit reservation update:', auditError);
      }
    },
    [addAuditLog, reservations, user?.id]
  );

  const deleteReservation = useCallback(
    async (id: string): Promise<void> => {
      const existingReservation = reservations.find((r) => r.id === id);
      if (!existingReservation) return;

      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('reservation_id', id);

      if (error) throw error;

      try {
        await addAuditLog({
          userId: user?.id || existingReservation.userId,
          action: 'DELETE',
          targetTable: 'reservations',
          targetId: id,
          targetPublicId: existingReservation.publicId,
          beforeValue: existingReservation,
          afterValue: null,
          changedFields: Object.keys(existingReservation),
          notes: `Deleted reservation ${existingReservation.publicId ?? id}`,
        });
      } catch (auditError) {
        console.error('Failed to audit reservation deletion:', auditError);
      }
    },
    [addAuditLog, reservations, user?.id]
  );

  const getReservationsByUserId = useCallback(
    (userId: string) => reservations.filter((r) => r.userId === userId),
    [reservations]
  );

  const value = useMemo<ReservationsContextType>(
    () => ({
      reservations,
      reservationsVersion,
      addReservation,
      updateReservation,
      deleteReservation,
      refreshReservations,
      getReservationsByUserId,
      fetchReservationsPage,
    }),
    [
      reservations,
      reservationsVersion,
      addReservation,
      updateReservation,
      deleteReservation,
      refreshReservations,
      getReservationsByUserId,
      fetchReservationsPage,
    ]
  );

  return (
    <ReservationsContext.Provider value={value}>
      {children}
    </ReservationsContext.Provider>
  );
}

export function useReservations() {
  const context = useContext(ReservationsContext);
  if (!context) {
    throw new Error('useReservations must be used within ReservationsProvider');
  }
  return context;
}