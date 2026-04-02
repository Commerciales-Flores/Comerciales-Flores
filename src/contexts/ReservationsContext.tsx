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
import type { Reservation, ReservationStatus } from '../data/types';
import { useRecords } from './RecordsContext';
import { useAuth } from './AuthContext';
import { getChangedFields, buildAuditSnapshot } from '../utils/auditHelpers';

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
    businessType: reservation.businessType,
    eventPurpose: reservation.eventPurpose,
    attendees: reservation.attendees,
    slotId: reservation.slotId,
    slotName: reservation.slotName,
    vehicleType: reservation.vehicleType,
    plateNumber: reservation.plateNumber,
    durationType: reservation.durationType,
  };

  return Object.fromEntries(
    Object.entries(details).filter(([, value]) => value !== undefined)
  );
}

function getRemainingBalance(reservation: Reservation) {
  return Math.max(0, Number(reservation.totalAmount || 0) - Number(reservation.paidAmount || 0));
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

export function ReservationsProvider({ children }: { children: ReactNode }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [reservationsVersion, setReservationsVersion] = useState(0);
  const { addAuditLog, ledgers } = useRecords();
  const { user } = useAuth();

  

  const getLedgerTotalsByReservationId = useCallback(
    (reservationId: string) => {
      console.log('looking for reservationId:', reservationId);
    console.log(
      'matching ledger reservationIds:',
      ledgers.map((entry) => ({
        ledgerId: entry.id,
        reservationId: entry.reservationId,
      }))
    );
      const entries = ledgers.filter(
        (entry) => entry.reservationId === reservationId
      );
      console.log('matched entries:', entries);

      let paid = 0;
      let refunds = 0;
      let discounts = 0;
      let penalties = 0;
      let adjustments = 0;

      for (const entry of entries) {
  switch (entry.entryType) {
    case 'payment':
    case 'balance':
      paid += entry.amount;
      break;
    case 'deposit':
      if (entry.depositType === 'advance') {
        paid += entry.amount;
      }
      break;  
    case 'refund':
      refunds += entry.amount;
      break;
    case 'discount':
      discounts += entry.amount;
      break;
    case 'penalty':
      penalties += entry.amount;
      break;
    case 'adjustment':
      adjustments += entry.amount;
      break;
  }
}

      const netPaid = paid - refunds - discounts + penalties + adjustments;

      return {
        paid,
        refunds,
        discounts,
        penalties,
        adjustments,
        netPaid,
      };
    },
    [ledgers]
  );

  const mapReservationRow = useCallback(
  (row: any): Reservation => {
    const totals = getLedgerTotalsByReservationId(row.reservation_id);

    const persistedPaidAmount = Number(row.paid_amount ?? 0);
    const derivedPaidAmount = Number(totals.netPaid ?? 0);

    // Prefer DB value, fall back to ledger-derived value only if needed
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
  [getLedgerTotalsByReservationId]
);

  const refreshReservations = useCallback(async () => {
    const { data, error } = await supabase
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
        `
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading reservations:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return;
    }

    setReservations((data ?? []).map(mapReservationRow));
  }, [mapReservationRow]);

  useEffect(() => {
    void refreshReservations();
  }, [refreshReservations, ledgers]);

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
          { count: 'exact' }
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
        data: (data ?? []).map(mapReservationRow),
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

    // Enforce rental-space duration + billing configuration early
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

      if (!Number.isFinite(Number(reservationData.duration)) || Number(reservationData.duration) <= 0) {
        throw new Error('Rental duration must be at least 1 month.');
      }

      if (!Number.isFinite(Number(reservationData.totalAmount)) || Number(reservationData.totalAmount) <= 0) {
        throw new Error('Rental total amount must be greater than zero.');
      }

      if (
        reservationData.paymentCycle === 'quarterly' &&
        Number(reservationData.duration) < 3
      ) {
        throw new Error('Quarterly payment cycle requires at least 3 months of rental duration.');
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
          total_amount: reservationData.totalAmount,
          status: 'pending',
          payment_method: reservationData.paymentMethod ?? null,
          payment_intent: reservationData.paymentIntent ?? null,
          mode_of_visit: reservationData.modeOfVisit ?? null,
          appointment_date: reservationData.appointmentDate ?? null,
          appointment_time: reservationData.appointmentTime ?? null,
          notes: reservationData.notes ?? null,
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
      if (reservationUpdate.notes !== undefined) dbPayload.notes = reservationUpdate.notes;
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

      // structured known fields
      const detailsPatch = buildReservationDetails(reservationUpdate);

      // raw details override (for extension system, future features)
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