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

export function ReservationsProvider({ children }: { children: ReactNode }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const { addAuditLog } = useRecords();
  const { user } = useAuth();

  const refreshReservations = useCallback(async () => {
    const { data, error } = await supabase
      .from('reservations')
      .select(
        'reservation_id, public_id, user_id, unit_id, title, unit_type, start_date, end_date, duration, total_amount, status, notes, paid_amount, created_at, payment_method, payment_intent, mode_of_visit, details'
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

    setReservations(
      (data ?? []).map((row: any) => ({
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
        paidAmount: Number(row.paid_amount || 0),
        requestDate: row.created_at,
        paymentMethod: row.payment_method,
        paymentIntent: row.payment_intent,
        modeOfVisit: row.mode_of_visit,
        paymentCycle: row.details?.paymentCycle,
        businessType: row.details?.businessType,
        eventPurpose: row.details?.eventPurpose,
        attendees: row.details?.attendees,
        slotId: row.details?.slotId,
        slotName: row.details?.slotName,
        vehicleType: row.details?.vehicleType,
        plateNumber: row.details?.plateNumber,
        durationType: row.details?.durationType,
      }))
    );
  }, []);

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
        'reservation_id, public_id, user_id, unit_id, title, unit_type, start_date, end_date, duration, total_amount, status, notes, paid_amount, created_at, payment_method, payment_intent, mode_of_visit, details',
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
      data: (data ?? []).map((row: any) => ({
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
        status: row.status,
        notes: row.notes,
        paidAmount: Number(row.paid_amount || 0),
        requestDate: row.created_at,
        paymentMethod: row.payment_method,
        paymentIntent: row.payment_intent,
        modeOfVisit: row.mode_of_visit,
        paymentCycle: row.details?.paymentCycle,
        businessType: row.details?.businessType,
        eventPurpose: row.details?.eventPurpose,
        attendees: row.details?.attendees,
        slotId: row.details?.slotId,
        slotName: row.details?.slotName,
        vehicleType: row.details?.vehicleType,
        plateNumber: row.details?.plateNumber,
        durationType: row.details?.durationType,
      })),
      count: count ?? 0,
    };
  },
  []
);

  const addReservation = useCallback(
    async (
      reservationData: Omit<Reservation, 'id' | 'requestDate' | 'status' | 'paidAmount'>
    ): Promise<string> => {
      const details = {
        paymentCycle: reservationData.paymentCycle,
        businessType: reservationData.businessType,
        eventPurpose: reservationData.eventPurpose,
        attendees: reservationData.attendees,
        slotId: reservationData.slotId,
        slotName: reservationData.slotName,
        vehicleType: reservationData.vehicleType,
        plateNumber: reservationData.plateNumber,
        durationType: reservationData.durationType,
      };

      const cleanDetails = Object.fromEntries(
        Object.entries(details).filter(([_, v]) => v !== undefined)
      );

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
            payment_method: reservationData.paymentMethod,
            payment_intent: reservationData.paymentIntent,
            mode_of_visit: reservationData.modeOfVisit,
            notes: reservationData.notes,
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
        paidAmount: Number(data.paid_amount || 0),
        requestDate: data.created_at,
        paymentMethod: data.payment_method,
        paymentIntent: data.payment_intent,
        modeOfVisit: data.mode_of_visit,
        ...cleanDetails,
      };

      setReservations((prev) => [newReservation, ...prev]);

      try {
        await addAuditLog({
          userId: user?.id || data.user_id,
          action: 'CREATE',
          targetTable: 'reservations',
          targetId: newReservation.id,
          beforeValue: undefined,
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
    async (id: string, reservation: Partial<Reservation>): Promise<void> => {
      const existingReservation = reservations.find((r) => r.id === id);
      if (!existingReservation) return;

      const dbPayload: any = {};
      if (reservation.status !== undefined) dbPayload.status = reservation.status;
      if (reservation.paidAmount !== undefined) dbPayload.paid_amount = reservation.paidAmount;
      if (reservation.notes !== undefined) dbPayload.notes = reservation.notes;

      if (Object.keys(dbPayload).length === 0) return;

      const { error } = await supabase
        .from('reservations')
        .update(dbPayload)
        .eq('reservation_id', id);

      if (error) throw error;

      const updatedReservation = buildAuditSnapshot(existingReservation, reservation);

      setReservations((prev) =>
        prev.map((r) => (r.id === id ? updatedReservation : r))
      );

      const changedFields = getChangedFields(existingReservation, reservation);

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
          afterValue: undefined,
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

  const value = useMemo(
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