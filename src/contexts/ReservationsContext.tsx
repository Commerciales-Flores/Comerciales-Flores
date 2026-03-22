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
  status?: 'all' | 'pending' | 'confirmed' | 'cancelled';
  searchTerm?: string;
};

interface ReservationsContextType {
  reservations: Reservation[];
  addReservation: (
    reservation: Omit<Reservation, 'id' | 'requestDate' | 'status' | 'paidAmount'>
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

export function ReservationsProvider({ children }: { children: ReactNode }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const { addAuditLog, ledgers } = useRecords();
  const { user } = useAuth();

  const getLedgerTotalsByReservationId = useCallback(
    (reservationId: string) => {
      const entries = ledgers.filter(
        (entry) => entry.reservationId === reservationId
      );

      let paid = 0;
      let refunds = 0;
      let discounts = 0;
      let penalties = 0;
      let adjustments = 0;

      for (const entry of entries) {
        switch (entry.entryType) {
          case 'payment':
          case 'deposit':
          case 'balance':
            paid += entry.amount;
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

      return {
        id: row.reservation_id,
        publicId: row.public_id,
        userId: row.user_id,
        unitId: row.unit_id,
        unitName: row.title,
        unitType: row.unit_type,
        startDate: row.start_date,
        endDate: row.end_date,
        duration: row.duration,
        totalAmount: Number(row.total_amount),
        status: row.status as ReservationStatus,
        notes: row.notes,
        paidAmount: totals.netPaid,
        requestDate: row.created_at,
        paymentMethod: row.payment_method,
        paymentIntent: row.payment_intent,
        modeOfVisit: row.mode_of_visit,
        appointmentDate: row.appointment_date,
        appointmentTime: row.appointment_time,
        paymentCycle: row.details?.paymentCycle,
        businessType: row.details?.businessType,
        eventPurpose: row.details?.eventPurpose,
        attendees: row.details?.attendees,
        slotId: row.details?.slotId,
        slotName: row.details?.slotName,
        vehicleType: row.details?.vehicleType,
        plateNumber: row.details?.plateNumber,
        durationType: row.details?.durationType,
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
        details
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
  }, [refreshReservations]);

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
          details
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
      reservationData: Omit<Reservation, 'id' | 'requestDate' | 'status' | 'paidAmount'>
    ): Promise<string> => {

      if (!user?.id) {
        throw new Error('User not authenticated.');
      }
      const cleanDetails = buildReservationDetails(reservationData);

        if (
          reservationData.unitType === 'parking_slot' &&
          reservationData.slotId
        ) {
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
          },
        ])
        .select()
        .single();

      if (error) throw error;

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
        ...cleanDetails,
      };

      setReservations((prev) => [newReservation, ...prev]);

      try {
        await addAuditLog({
          userId: user.id,
          action: 'CREATE',
          targetTable: 'reservations',
          targetId: newReservation.id,
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
    [addAuditLog, user?.id]
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

      const detailsPatch = buildReservationDetails(reservationUpdate);
      if (Object.keys(detailsPatch).length > 0) {
        const existingDetails = buildReservationDetails(existingReservation);
        dbPayload.details = {
          ...existingDetails,
          ...detailsPatch,
        };
      }

      if (Object.keys(dbPayload).length === 0) return;

      const { error } = await supabase
        .from('reservations')
        .update(dbPayload)
        .eq('reservation_id', id);

      if (error) throw error;

      const updatedReservation = buildAuditSnapshot(existingReservation, reservationUpdate);

      setReservations((prev) =>
        prev.map((r) => (r.id === id ? updatedReservation : r))
      );

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

      setReservations((prev) => prev.filter((r) => r.id !== id));

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
      addReservation,
      updateReservation,
      deleteReservation,
      refreshReservations,
      getReservationsByUserId,
      fetchReservationsPage,
    }),
    [
      reservations,
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