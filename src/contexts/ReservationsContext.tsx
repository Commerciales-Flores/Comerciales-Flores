import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import supabase from '../supabaseClient';
import type { Reservation, ReservationStatus } from '../data/types';

interface ReservationsContextType {
  reservations: Reservation[];
  addReservation: (
    reservation: Omit<Reservation, 'id' | 'requestDate' | 'status' | 'paidAmount'>
  ) => Promise<string>;
  updateReservation: (id: string, reservation: Partial<Reservation>) => Promise<void>;
  deleteReservation: (id: string) => void;
  refreshReservations: () => Promise<void>;
  getReservationsByUserId: (userId: string) => Reservation[];
}

const ReservationsContext = createContext<ReservationsContextType | undefined>(undefined);

export function ReservationsProvider({ children }: { children: ReactNode }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const refreshReservations = async () => {
    const { data, error } = await supabase
      .from('reservations')
      .select(
        'reservation_id, public_id, user_id, unit_id, title, unit_type, start_date, end_date, duration, total_amount, status, notes, paid_amount, created_at, payment_method, payment_intent, mode_of_visit, details'
      )
      .order('created_at', { ascending: false });

    if (!error && data) {
      setReservations(
        data.map((row: any) => ({
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
    }
  };

  useEffect(() => {
    refreshReservations();
  }, []);

  const addReservation = async (
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
    return newReservation.id;
  };

  const updateReservation = async (
    id: string,
    reservation: Partial<Reservation>
  ): Promise<void> => {
    const dbPayload: any = {};
    if (reservation.status) dbPayload.status = reservation.status;
    if (reservation.paidAmount !== undefined) dbPayload.paid_amount = reservation.paidAmount;

    const { error } = await supabase
      .from('reservations')
      .update(dbPayload)
      .eq('reservation_id', id);

    if (error) throw error;

    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...reservation } : r))
    );
  };

  const deleteReservation = (id: string) => {
    setReservations((prev) => prev.filter((r) => r.id !== id));
  };

  const value = useMemo(
    () => ({
      reservations,
      addReservation,
      updateReservation,
      deleteReservation,
      refreshReservations,
      getReservationsByUserId: (userId: string) =>
        reservations.filter((r) => r.userId === userId),
    }),
    [reservations]
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