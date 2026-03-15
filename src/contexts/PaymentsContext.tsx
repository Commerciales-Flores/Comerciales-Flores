import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import supabase from '../supabaseClient';
import type { Payment, PaymentMethod, PaymentStatus } from '../data/types';
import { useReservations } from './ReservationsContext';
import { useRecords } from './RecordsContext';

interface PaymentsContextType {
  payments: Payment[];
  addPayment: (
    payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'date'>
  ) => Promise<string>;
  updatePayment: (id: string, payment: Partial<Payment>) => Promise<void>;
  uploadPaymentProof: (file: File) => Promise<string | null>;
  refreshPayments: () => Promise<void>;
  getPaymentsByUserId: (userId: string) => Payment[];
}

const PaymentsContext = createContext<PaymentsContextType | undefined>(undefined);

export function PaymentsProvider({ children }: { children: ReactNode }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const { reservations, updateReservation } = useReservations();
  const { addAuditLog, addLedgerEntry } = useRecords();

  const refreshPayments = async () => {
    const { data, error } = await supabase
      .from('payments')
      .select(
        'payment_id, public_id, reservation_id, user_id, amount, method, status, proofOfPayment, date, notes, created_at, updated_at'
      )
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPayments(
        data.map((row: any) => ({
          id: row.payment_id,
          publicId: row.public_id,
          reservationId: row.reservation_id,
          userId: row.user_id,
          amount: Number(row.amount),
          method: row.method as PaymentMethod,
          status: row.status as PaymentStatus,
          proofOfPayment: row.proofOfPayment,
          date: row.date,
          notes: row.notes,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }))
      );
    }
  };

  useEffect(() => {
    refreshPayments();
  }, []);

  const uploadPaymentProof = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment_proofs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('payment_proofs').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading proof:', error);
      return null;
    }
  };

  const addPayment = async (
    paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'date'>
  ): Promise<string> => {
    const paymentDate = new Date().toISOString();

    const { data, error } = await supabase
      .from('payments')
      .insert([
        {
          user_id: paymentData.userId,
          reservation_id: paymentData.reservationId,
          amount: paymentData.amount,
          method: paymentData.method,
          status: paymentData.status,
          proofOfPayment: paymentData.proofOfPayment,
          date: paymentDate,
          notes: paymentData.notes,
        },
      ])
      .select()
      .single();

    if (error) throw error;


    const newPayment: Payment = {
      id: data.payment_id,
      publicId: data.public_id,
      reservationId: data.reservation_id,
      userId: data.user_id,
      amount: Number(data.amount),
      method: data.method,
      status: data.status,
      proofOfPayment: data.proofOfPayment,
      date: data.date,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    await addAuditLog({
      userId: newPayment.userId,
      action: 'INSERT',
      targetTable: 'payments',
      targetId: newPayment.id,
      afterValue: newPayment,
      notes: `Created new payment for reservation ${newPayment.reservationId}`,
    });

    if (newPayment.status === 'paid') {
      await addLedgerEntry({
        userId: newPayment.userId,
        amount: newPayment.amount,
        date: newPayment.date,
      });

      const reservation = reservations.find((r) => r.id === newPayment.reservationId);
      if (reservation) {
        await updateReservation(reservation.id, {
          paidAmount: reservation.paidAmount + newPayment.amount,
        });
      }
    }

    setPayments((prev) => [newPayment, ...prev]);
    return newPayment.id;
  };

  const updatePayment = async (
    id: string,
    paymentUpdate: Partial<Payment>
  ): Promise<void> => {
    const existingPayment = payments.find((p) => p.id === id);
    if (!existingPayment) return;

    const dbPayload: any = {};
    if (paymentUpdate.status) dbPayload.status = paymentUpdate.status;
    if (paymentUpdate.amount !== undefined) dbPayload.amount = paymentUpdate.amount;
    if (paymentUpdate.method) dbPayload.method = paymentUpdate.method;
    if (paymentUpdate.proofOfPayment) dbPayload.proofOfPayment = paymentUpdate.proofOfPayment;
    if (paymentUpdate.notes) dbPayload.notes = paymentUpdate.notes;

    const { error } = await supabase
      .from('payments')
      .update(dbPayload)
      .eq('payment_id', id);

    if (error) throw error;

    await addAuditLog({
      userId: existingPayment.userId,
      action: 'UPDATE',
      targetTable: 'payments',
      targetId: id,
      beforeValue: existingPayment,
      afterValue: { ...existingPayment, ...paymentUpdate },
      changedFields: paymentUpdate,
      notes: `Updated payment ${id}`,
    });

    if (existingPayment.status !== 'paid' && paymentUpdate.status === 'paid') {
      const finalAmount =
        paymentUpdate.amount !== undefined ? paymentUpdate.amount : existingPayment.amount;

      await addLedgerEntry({
        userId: existingPayment.userId,
        amount: finalAmount,
        date: new Date().toISOString(),
      });
    }

    const reservation = reservations.find((r) => r.id === existingPayment.reservationId);
    if (reservation) {
      let newPaidAmount = reservation.paidAmount;
      let needsReservationUpdate = false;

      if (existingPayment.status !== 'paid' && paymentUpdate.status === 'paid') {
        newPaidAmount += paymentUpdate.amount ?? existingPayment.amount;
        needsReservationUpdate = true;
      } else if (
        existingPayment.status === 'paid' &&
        paymentUpdate.status &&
        paymentUpdate.status !== 'paid'
      ) {
        newPaidAmount -= existingPayment.amount;
        needsReservationUpdate = true;
      } else if (
        existingPayment.status === 'paid' &&
        (!paymentUpdate.status || paymentUpdate.status === 'paid') &&
        paymentUpdate.amount !== undefined &&
        paymentUpdate.amount !== existingPayment.amount
      ) {
        newPaidAmount =
          newPaidAmount - existingPayment.amount + paymentUpdate.amount;
        needsReservationUpdate = true;
      }

      if (needsReservationUpdate) {
        await updateReservation(reservation.id, {
          paidAmount: Math.max(0, newPaidAmount),
        });
      }
    }

    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...paymentUpdate } : p))
    );
  };

  const value = useMemo(
    () => ({
      payments,
      addPayment,
      updatePayment,
      uploadPaymentProof,
      refreshPayments,
      getPaymentsByUserId: (userId: string) =>
        payments.filter((p) => p.userId === userId),
    }),
    [payments, reservations]
  );

  return (
    <PaymentsContext.Provider value={value}>
      {children}
    </PaymentsContext.Provider>
  );
}

export function usePayments() {
  const context = useContext(PaymentsContext);
  if (!context) throw new Error('usePayments must be used within PaymentsProvider');
  return context;
}