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
import type { Payment, PaymentMethod, PaymentStatus } from '../data/types';
import { useReservations } from './ReservationsContext';
import { useRecords } from './RecordsContext';
import { useAuth } from './AuthContext';
import { getChangedFields, buildAuditSnapshot } from '../utils/auditHelpers';

type PaymentsPageFilters = {
  page?: number;
  pageSize?: number;
  status?: 'all' | 'paid' | 'unpaid' | 'partial';
  searchTerm?: string;
};

interface PaymentsContextType {
  payments: Payment[];
  addPayment: (
    payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'date'>
  ) => Promise<string>;
  updatePayment: (id: string, payment: Partial<Payment>) => Promise<void>;
  uploadPaymentProof: (file: File) => Promise<string | null>;
  refreshPayments: () => Promise<void>;
  getPaymentsByUserId: (userId: string) => Payment[];
  fetchPaymentsPage: (filters: PaymentsPageFilters) => Promise<{
    data: Payment[];
    count: number;
  }>;
}

const PaymentsContext = createContext<PaymentsContextType | undefined>(undefined);

function mapPaymentRow(row: any): Payment {
  return {
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
    paymentMethodId: row.payment_method_id ?? null,
    paymentMethodSnapshot: row.payment_method_snapshot ?? null,
  };
}

function normalizeSearchTerm(value: string) {
  return value.trim();
}

export function PaymentsProvider({ children }: { children: ReactNode }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const { reservations, updateReservation } = useReservations();
  const { addAuditLog, addLedgerEntry } = useRecords();
  const { user } = useAuth();

  const refreshPayments = useCallback(async () => {
    const { data, error } = await supabase
      .from('payments')
      .select(
        'payment_id, public_id, reservation_id, user_id, amount, method, status, proofOfPayment, date, notes, created_at, updated_at, payment_method_id, payment_method_snapshot'
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading payments:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return;
    }

    setPayments((data ?? []).map(mapPaymentRow));
  }, []);

  useEffect(() => {
    void refreshPayments();
  }, [refreshPayments]);

  const fetchPaymentsPage = useCallback(
    async ({
      page = 1,
      pageSize = 25,
      status = 'all',
      searchTerm = '',
    }: PaymentsPageFilters): Promise<{
      data: Payment[];
      count: number;
    }> => {
      let query = supabase
        .from('payments')
        .select(
          'payment_id, public_id, reservation_id, user_id, amount, method, status, proofOfPayment, date, notes, created_at, updated_at, payment_method_id, payment_method_snapshot',
          { count: 'exact' }
        )
        .order('date', { ascending: false });

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      const trimmedSearch = normalizeSearchTerm(searchTerm);
      if (trimmedSearch) {
        query = query.or(
          [
            `public_id.ilike.%${trimmedSearch}%`,
            `reservation_id.ilike.%${trimmedSearch}%`,
            `user_id.ilike.%${trimmedSearch}%`,
            `notes.ilike.%${trimmedSearch}%`,
            `method.ilike.%${trimmedSearch}%`,
          ].join(',')
        );
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      return {
        data: (data ?? []).map(mapPaymentRow),
        count: count ?? 0,
      };
    },
    []
  );

  const uploadPaymentProof = useCallback(async (file: File): Promise<string | null> => {
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
  }, []);

  const addPayment = useCallback(
  async (
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
          payment_method_id: paymentData.paymentMethodId ?? null,
          payment_method_snapshot: paymentData.paymentMethodSnapshot ?? null,
        },
      ])
      .select(
        'payment_id, public_id, reservation_id, user_id, amount, method, status, proofOfPayment, date, notes, created_at, updated_at, payment_method_id, payment_method_snapshot'
      )
      .single();

    if (error) throw error;

    const newPayment = mapPaymentRow(data);

    if (newPayment.status === 'paid') {
      await addLedgerEntry({
        userId: newPayment.userId,
        reservationId: newPayment.reservationId,
        paymentId: newPayment.id,
        entryType: 'payment',
        amount: newPayment.amount,
        method: newPayment.method,
        status: 'verified',
        referenceNo: null,
        description: `Payment for reservation ${newPayment.publicId ?? newPayment.id}`,
        notes: newPayment.notes ?? null,
        recordedAt: newPayment.date,
        createdAt: new Date().toISOString(),
        createdBy: user?.id ?? null,
      });

      const reservation = reservations.find((r) => r.id === newPayment.reservationId);
      if (reservation) {
        await updateReservation(reservation.id, {
          paidAmount: reservation.paidAmount + newPayment.amount,
        });
      }
    }

    if (user?.id) {
      try {
        await addAuditLog({
          userId: user.id,
          action: 'PAYMENT_CREATED',
          targetTable: 'payments',
          targetId: newPayment.id,
          targetPublicId: newPayment.publicId,
          beforeValue: null,
          afterValue: newPayment,
          changedFields: Object.keys(newPayment),
          notes: `Created payment ${newPayment.publicId ?? newPayment.id} for reservation ${newPayment.reservationId}`,
        });
      } catch (auditError) {
        console.error('Failed to audit payment creation:', auditError);
      }
    }

    await refreshPayments();
    return newPayment.id;
  },
  [addAuditLog, addLedgerEntry, refreshPayments, reservations, updateReservation, user?.id]
);

  const updatePayment = useCallback(
    async (id: string, paymentUpdate: Partial<Payment>): Promise<void> => {
      const existingPayment = payments.find((p) => p.id === id);
      if (!existingPayment) return;

      if (
        existingPayment.status === 'paid' &&
        paymentUpdate.amount !== undefined &&
        paymentUpdate.amount !== existingPayment.amount
      ) {
        throw new Error('Changing the amount of an already paid payment is not supported yet.');
      }

      if (
        existingPayment.status === 'paid' &&
        paymentUpdate.status !== undefined &&
        paymentUpdate.status !== 'paid'
      ) {
        throw new Error('Reverting an already paid payment is not supported yet.');
      }

      const dbPayload: Record<string, unknown> = {};

      if (paymentUpdate.status !== undefined) dbPayload.status = paymentUpdate.status;
      if (paymentUpdate.amount !== undefined) dbPayload.amount = paymentUpdate.amount;
      if (paymentUpdate.method !== undefined) dbPayload.method = paymentUpdate.method;
      if (paymentUpdate.proofOfPayment !== undefined) {
        dbPayload.proofOfPayment = paymentUpdate.proofOfPayment;
      }
      if (paymentUpdate.notes !== undefined) dbPayload.notes = paymentUpdate.notes;

      if (Object.keys(dbPayload).length === 0) return;

      const { error } = await supabase
        .from('payments')
        .update(dbPayload)
        .eq('payment_id', id);

      if (error) throw error;

      const updatedPayment = buildAuditSnapshot(existingPayment, paymentUpdate);
      const changedFields = getChangedFields(existingPayment, paymentUpdate);

      let action = 'PAYMENT_UPDATED';

      if (existingPayment.status !== 'paid' && paymentUpdate.status === 'paid') {
        action = 'PAYMENT_APPROVED';
      } else if (
        paymentUpdate.status !== undefined &&
        paymentUpdate.status === 'unpaid'
      ) {
        action = 'PAYMENT_REJECTED';
      } else if (
        paymentUpdate.proofOfPayment !== undefined &&
        paymentUpdate.proofOfPayment !== existingPayment.proofOfPayment
      ) {
        action = 'PAYMENT_PROOF_UPLOADED';
      }

      if (existingPayment.status !== 'paid' && paymentUpdate.status === 'paid') {
        const finalAmount =
          paymentUpdate.amount !== undefined ? paymentUpdate.amount : existingPayment.amount;
        const finalMethod =
          paymentUpdate.method !== undefined ? paymentUpdate.method : existingPayment.method;
        const finalNotes =
          paymentUpdate.notes !== undefined ? paymentUpdate.notes : existingPayment.notes;

        await addLedgerEntry({
          userId: existingPayment.userId,
          reservationId: existingPayment.reservationId,
          paymentId: existingPayment.id,
          entryType: 'payment',
          amount: finalAmount,
          method: finalMethod,
          status: 'verified',
          referenceNo: null,
          description: `Payment for reservation ${existingPayment.publicId ?? existingPayment.id}`,
          notes: finalNotes ?? null,
          recordedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          createdBy: user?.id ?? null,
        });

        const reservation = reservations.find((r) => r.id === existingPayment.reservationId);
        if (reservation) {
          await updateReservation(reservation.id, {
            paidAmount: reservation.paidAmount + finalAmount,
          });
        }
      }

      if (user?.id && changedFields.length > 0) {
        try {
          await addAuditLog({
            userId: user.id,
            action,
            targetTable: 'payments',
            targetId: id,
            beforeValue: existingPayment,
            afterValue: updatedPayment,
            changedFields,
            notes:
              action === 'PAYMENT_APPROVED'
                ? `Approved payment ${existingPayment.publicId ?? id}`
                : action === 'PAYMENT_REJECTED'
                  ? `Rejected payment ${existingPayment.publicId ?? id}`
                  : action === 'PAYMENT_PROOF_UPLOADED'
                    ? `Uploaded proof for payment ${existingPayment.publicId ?? id}`
                    : `Updated payment ${existingPayment.publicId ?? id}`,
          });
        } catch (auditError) {
          console.error('Failed to audit payment update:', auditError);
        }
      }

      await refreshPayments();
    },
    [addAuditLog, addLedgerEntry, payments, refreshPayments, reservations, updateReservation, user?.id]
  );

  const getPaymentsByUserId = useCallback(
    (userId: string) => payments.filter((p) => p.userId === userId),
    [payments]
  );

  const value = useMemo<PaymentsContextType>(
    () => ({
      payments,
      addPayment,
      updatePayment,
      uploadPaymentProof,
      refreshPayments,
      getPaymentsByUserId,
      fetchPaymentsPage,
    }),
    [
      payments,
      addPayment,
      updatePayment,
      uploadPaymentProof,
      refreshPayments,
      getPaymentsByUserId,
      fetchPaymentsPage,
    ]
  );

  return (
    <PaymentsContext.Provider value={value}>
      {children}
    </PaymentsContext.Provider>
  );
}

export function usePayments() {
  const context = useContext(PaymentsContext);
  if (!context) {
    throw new Error('usePayments must be used within PaymentsProvider');
  }
  return context;
}