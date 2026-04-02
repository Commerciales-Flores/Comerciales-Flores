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
import type {
  Payment,
  PaymentMethod,
  PaymentStatus,
  PaymentCycle,
  LedgerEntry,
} from '../data/types';
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

type PaymentCategory = 'payment' | 'advance_deposit' | 'security_deposit';

interface PaymentsContextType {
  payments: Payment[];
  paymentsVersion: number;
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
  issueRefund: (params: {
    reservationId: string;
    paymentId?: string | null;
    amount: number;
    method?: PaymentMethod | null;
    notes?: string | null;
    referenceNo?: string | null;
  }) => Promise<void>;
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
    category: (row.category ?? 'payment') as PaymentCategory,
  };
}

function allowsPartialPayments(unitType?: string | null) {
  return unitType === 'function_hall' || unitType === 'parking_slot';
}

function normalizeSearchTerm(value: string) {
  return value.trim();
}

function clampMoney(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Number(value));
}

function getMinimumPaymentPercent(reservation: {
  minimumPaymentPercentSnapshot?: number | null;
}) {
  const value = Number(reservation.minimumPaymentPercentSnapshot ?? 0);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function getMinimumRequiredAmount(params: {
  totalAmount: number;
  paidAmount: number;
  minimumPaymentPercentSnapshot?: number | null;
}) {
  const totalAmount = clampMoney(params.totalAmount);
  const paidAmount = clampMoney(params.paidAmount);
  const remaining = clampMoney(totalAmount - paidAmount);
  const minimumPercent = getMinimumPaymentPercent(params);

  if (minimumPercent <= 0) {
    return {
      minimumPercent: 0,
      minimumRequired: 0,
      remaining,
      isFirstPayment: paidAmount <= 0,
    };
  }

  const rawMinimum = clampMoney((totalAmount * minimumPercent) / 100);

  return {
    minimumPercent,
    minimumRequired: Math.min(rawMinimum, remaining),
    remaining,
    isFirstPayment: paidAmount <= 0,
  };
}

function validateMinimumFirstPayment(params: {
  totalAmount: number;
  paidAmount: number;
  minimumPaymentPercentSnapshot?: number | null;
}) {
  return (amount: number) => {
    const submittedAmount = clampMoney(amount);
    const { minimumPercent, minimumRequired, isFirstPayment } =
      getMinimumRequiredAmount(params);

    if (!isFirstPayment || minimumPercent <= 0) return;

    if (submittedAmount < minimumRequired) {
      throw new Error(
        `First payment must be at least ${minimumPercent}% of the total amount (₱${minimumRequired.toFixed(
          2
        )}).`
      );
    }
  };
}

function validateScheduledSubsequentPayment(params: {
  unitType?: string | null;
  totalAmount: number;
  paidAmount: number;
  duration?: number | null;
  paymentCycle?: PaymentCycle | null;
}) {
  return (amount: number) => {
    const submittedAmount = clampMoney(amount);
    const paidAmount = clampMoney(params.paidAmount);
    const totalAmount = clampMoney(params.totalAmount);
    const remaining = clampMoney(totalAmount - paidAmount);
    const isFirstPayment = paidAmount <= 0;

    if (remaining <= 0) return;

    const isPartialAllowed = allowsPartialPayments(params.unitType);

    if (isPartialAllowed) {
      if (isFirstPayment) return;

      const minimumRequired = Math.min(remaining, totalAmount * 0.05);

      if (submittedAmount < minimumRequired) {
        throw new Error(
          `Subsequent payments must be at least ₱${minimumRequired.toFixed(2)}.`
        );
      }

      return;
    }

    const duration = Math.max(1, Number(params.duration ?? 1));
    const cycle: PaymentCycle = params.paymentCycle ?? 'monthly';
    const monthlyAmount = duration > 0 ? totalAmount / duration : totalAmount;

    let minimumRequired = 0;

    if (cycle === 'monthly') {
      minimumRequired = monthlyAmount;
    } else if (cycle === 'quarterly') {
      minimumRequired = monthlyAmount * 3;
    } else if (cycle === 'full') {
      minimumRequired = remaining;
    }

    minimumRequired = Math.min(clampMoney(minimumRequired), remaining);

    if (minimumRequired <= 0) return;

    if (submittedAmount < minimumRequired) {
      if (cycle === 'full') {
        throw new Error(
          `Full payment is required for this rental reservation (₱${minimumRequired.toFixed(
            2
          )}).`
        );
      }

      throw new Error(
        `${
          cycle === 'quarterly' ? 'Quarterly' : 'Monthly'
        } rental payments must be at least ₱${minimumRequired.toFixed(2)}.`
      );
    }
  };
}

function isDepositCategory(category?: PaymentCategory | null) {
  return category === 'advance_deposit' || category === 'security_deposit';
}

function getLedgerMeaningFromCategory(category?: PaymentCategory | null): {
  entryType: LedgerEntry['entryType'];
  depositType?: LedgerEntry['depositType'];
} {
  if (category === 'advance_deposit') {
    return {
      entryType: 'deposit',
      depositType: 'advance',
    };
  }

  if (category === 'security_deposit') {
    return {
      entryType: 'deposit',
      depositType: 'security',
    };
  }

  return {
    entryType: 'payment',
    depositType: undefined,
  };
}

function sortPaymentsByCreatedAt(items: Payment[]) {
  return [...items].sort(
    (a, b) =>
      new Date(b.createdAt ?? b.date ?? 0).getTime() -
      new Date(a.createdAt ?? a.date ?? 0).getTime()
  );
}

export function PaymentsProvider({ children }: { children: ReactNode }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsVersion, setPaymentsVersion] = useState(0);
  const { reservations, refreshReservations } = useReservations();
  const { addAuditLog, addLedgerEntry } = useRecords();
  const { user } = useAuth();

  const refreshPayments = useCallback(async () => {
    const { data, error } = await supabase
      .from('payments')
      .select(
        'payment_id, public_id, reservation_id, user_id, amount, method, status, proofOfPayment, date, notes, created_at, updated_at, payment_method_id, payment_method_snapshot, category'
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

    setPayments(sortPaymentsByCreatedAt((data ?? []).map(mapPaymentRow)));
  }, []);

  useEffect(() => {
    void refreshPayments();
  }, [refreshPayments]);

  useEffect(() => {
  const channel = supabase
    .channel('payments-realtime')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'payments',
      },
      (payload) => {
        const newPayment = mapPaymentRow(payload.new);

        setPayments((prev) => {
          if (prev.some((item) => item.id === newPayment.id)) {
            return prev;
          }

          return sortPaymentsByCreatedAt([newPayment, ...prev]);
        });

        setPaymentsVersion((prev) => prev + 1);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'payments',
      },
      (payload) => {
        const updatedPayment = mapPaymentRow(payload.new);

        setPayments((prev) =>
          sortPaymentsByCreatedAt(
            prev.map((item) =>
              item.id === updatedPayment.id ? updatedPayment : item
            )
          )
        );

        setPaymentsVersion((prev) => prev + 1);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'payments',
      },
      (payload) => {
        const deletedId = payload.old.payment_id as string | undefined;
        if (!deletedId) return;

        setPayments((prev) => prev.filter((item) => item.id !== deletedId));
        setPaymentsVersion((prev) => prev + 1);
      }
    )
    .subscribe((status) => {
      if (import.meta.env.DEV) {
        console.log('Payments realtime status:', status);
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}, []);

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
          'payment_id, public_id, reservation_id, user_id, amount, method, status, proofOfPayment, date, notes, created_at, updated_at, payment_method_id, payment_method_snapshot, category',
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
            `category.ilike.%${trimmedSearch}%`,
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
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment_proofs')
        .upload(filePath, file, {
          upsert: false,
        });

      if (uploadError) throw uploadError;

      return filePath;
    } catch (error) {
      console.error('Error uploading proof:', error);
      return null;
    }
  }, []);

  const getReservationLedgerNetPaid = useCallback(
    async (reservationId: string): Promise<number> => {
      const { data: ledgerRows, error } = await supabase
        .from('ledger')
        .select('entry_type, deposit_type, amount')
        .eq('reservation_id', reservationId);

      if (error) throw error;

      let paid = 0;
      let refunds = 0;
      let discounts = 0;
      let penalties = 0;
      let adjustments = 0;

      for (const row of ledgerRows ?? []) {
        const amount = Number(row.amount ?? 0);

        switch (row.entry_type) {
          case 'payment':
          case 'balance':
            paid += amount;
            break;
          case 'deposit':
            if (row.deposit_type === 'advance') {
              paid += amount;
            }
            break;
          case 'refund':
            refunds += amount;
            break;
          case 'discount':
            discounts += amount;
            break;
          case 'penalty':
            penalties += amount;
            break;
          case 'adjustment':
            adjustments += amount;
            break;
        }
      }

      return Math.max(0, paid - refunds - discounts + penalties + adjustments);
    },
    []
  );

  const recalculateReservationPaidAmount = useCallback(
    async (reservationId: string) => {
      const netPaid = await getReservationLedgerNetPaid(reservationId);

      const { error: reservationUpdateError } = await supabase
        .from('reservations')
        .update({
          paid_amount: netPaid,
          updated_at: new Date().toISOString(),
        })
        .eq('reservation_id', reservationId);

      if (reservationUpdateError) throw reservationUpdateError;

      await refreshReservations();
    },
    [getReservationLedgerNetPaid, refreshReservations]
  );

  const addPayment = useCallback(
    async (
      paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'date'>
    ): Promise<string> => {
      const paymentDate = new Date().toISOString();

      const reservation = reservations.find((r) => r.id === paymentData.reservationId);
      if (!reservation) {
        throw new Error('Reservation not found for this payment.');
      }

      const category = (paymentData.category ?? 'payment') as PaymentCategory;
      const depositPayment = isDepositCategory(category);

      const ledgerPaid = await getReservationLedgerNetPaid(reservation.id);
      const submittedAmount = clampMoney(Number(paymentData.amount));
      const remaining = clampMoney(Number(reservation.totalAmount) - ledgerPaid);

      const enforceMinimumFirstPayment = validateMinimumFirstPayment({
        totalAmount: Number(reservation.totalAmount),
        paidAmount: ledgerPaid,
        minimumPaymentPercentSnapshot: reservation.minimumPaymentPercentSnapshot,
      });

      const enforceScheduledSubsequentPayment = validateScheduledSubsequentPayment({
        unitType: reservation.unitType,
        totalAmount: Number(reservation.totalAmount),
        paidAmount: ledgerPaid,
        duration: reservation.duration,
        paymentCycle: reservation.paymentCycle ?? null,
      });

      if (submittedAmount <= 0) {
        throw new Error('Payment amount must be greater than zero.');
      }

      if (!depositPayment && submittedAmount > remaining) {
        throw new Error('Payment amount cannot exceed the remaining balance.');
      }

      if (!depositPayment) {
        enforceMinimumFirstPayment(submittedAmount);
        enforceScheduledSubsequentPayment(submittedAmount);
      }

      const { data, error } = await supabase
        .from('payments')
        .insert([
          {
            user_id: paymentData.userId,
            reservation_id: paymentData.reservationId,
            amount: submittedAmount,
            method: paymentData.method,
            status: paymentData.status,
            proofOfPayment: paymentData.proofOfPayment,
            date: paymentDate,
            notes: paymentData.notes,
            payment_method_id: paymentData.paymentMethodId ?? null,
            payment_method_snapshot: paymentData.paymentMethodSnapshot ?? null,
            category,
          },
        ])
        .select(
          'payment_id, public_id, reservation_id, user_id, amount, method, status, proofOfPayment, date, notes, created_at, updated_at, payment_method_id, payment_method_snapshot, category'
        )
        .single();

      if (error) throw error;

      const newPayment = mapPaymentRow(data);

      if (newPayment.status === 'paid') {
        let approvedAmount = clampMoney(newPayment.amount);

        if (!depositPayment) {
          const refreshedLedgerPaid = await getReservationLedgerNetPaid(
            newPayment.reservationId
          );
          const remainingAtApproval = clampMoney(
            Number(reservation.totalAmount) - refreshedLedgerPaid
          );

          approvedAmount = Math.min(clampMoney(newPayment.amount), remainingAtApproval);

          if (approvedAmount <= 0) {
            throw new Error('This reservation no longer has an outstanding balance.');
          }

          if (approvedAmount !== newPayment.amount) {
            const { error: adjustError } = await supabase
              .from('payments')
              .update({ amount: approvedAmount })
              .eq('payment_id', newPayment.id);

            if (adjustError) throw adjustError;

            newPayment.amount = approvedAmount;
          }
        }

        const { entryType, depositType } = getLedgerMeaningFromCategory(category);

        await addLedgerEntry({
          userId: newPayment.userId,
          reservationId: newPayment.reservationId,
          paymentId: newPayment.id,
          entryType,
          depositType,
          amount: newPayment.amount,
          method: newPayment.method,
          status: 'verified',
          referenceNo: null,
          description:
            category === 'security_deposit'
              ? `Security deposit for ${newPayment.publicId ?? newPayment.id}`
              : category === 'advance_deposit'
              ? `Advance deposit for ${newPayment.publicId ?? newPayment.id}`
              : `Payment for reservation ${newPayment.publicId ?? newPayment.id}`,
          notes: newPayment.notes ?? null,
          recordedAt: newPayment.date,
          createdAt: new Date().toISOString(),
          createdBy: user?.id ?? null,
        });

        await recalculateReservationPaidAmount(newPayment.reservationId);
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
            notes: `Created ${category} ${newPayment.publicId ?? newPayment.id} for reservation ${
              newPayment.reservationId
            }`,
          });
        } catch (auditError) {
          console.error('Failed to audit payment creation:', auditError);
        }
      }

      return newPayment.id;
    },
    [
      addAuditLog,
      addLedgerEntry,
      getReservationLedgerNetPaid,
      recalculateReservationPaidAmount,
      refreshPayments,
      reservations,
      user?.id,
    ]
  );

  const updatePayment = useCallback(
    async (id: string, paymentUpdate: Partial<Payment>): Promise<void> => {
      const existingPayment = payments.find((p) => p.id === id);
      if (!existingPayment) return;

      const reservation = reservations.find((r) => r.id === existingPayment.reservationId);
      if (!reservation) {
        throw new Error('Reservation not found for this payment.');
      }

      const existingCategory = (existingPayment.category ?? 'payment') as PaymentCategory;
      const nextCategory = (paymentUpdate.category ??
        existingPayment.category ??
        'payment') as PaymentCategory;
      const isDeposit = isDepositCategory(nextCategory);

      const isApprovingNow =
        existingPayment.status !== 'paid' && paymentUpdate.status === 'paid';

      if (
        existingPayment.status === 'paid' &&
        paymentUpdate.amount !== undefined &&
        Number(paymentUpdate.amount) !== Number(existingPayment.amount)
      ) {
        throw new Error('Changing the amount of an already paid payment is not supported.');
      }

      if (
        existingPayment.status === 'paid' &&
        paymentUpdate.status !== undefined &&
        paymentUpdate.status !== 'paid'
      ) {
        throw new Error('Reverting an already paid payment is not supported.');
      }

      let sanitizedAmount =
        paymentUpdate.amount !== undefined
          ? clampMoney(Number(paymentUpdate.amount))
          : clampMoney(Number(existingPayment.amount));

      if (sanitizedAmount <= 0) {
        throw new Error('Payment amount must be greater than zero.');
      }

      const nextStatus = paymentUpdate.status ?? existingPayment.status;
      const ledgerPaid = await getReservationLedgerNetPaid(reservation.id);

      const enforceMinimumFirstPayment = validateMinimumFirstPayment({
        totalAmount: Number(reservation.totalAmount),
        paidAmount: ledgerPaid,
        minimumPaymentPercentSnapshot: reservation.minimumPaymentPercentSnapshot,
      });

      const enforceScheduledSubsequentPayment = validateScheduledSubsequentPayment({
        unitType: reservation.unitType,
        totalAmount: Number(reservation.totalAmount),
        paidAmount: ledgerPaid,
        duration: reservation.duration,
        paymentCycle: reservation.paymentCycle ?? null,
      });

      if (nextStatus === 'paid' && !isDeposit) {
        const isAlreadyCountedAsPaid = existingPayment.status === 'paid';

        if (!isAlreadyCountedAsPaid) {
          const remaining = clampMoney(Number(reservation.totalAmount) - ledgerPaid);

          if (sanitizedAmount > remaining) {
            throw new Error('Payment amount cannot exceed the remaining balance.');
          }

          enforceMinimumFirstPayment(sanitizedAmount);
          enforceScheduledSubsequentPayment(sanitizedAmount);
        }
      }

      if (isApprovingNow && !isDeposit) {
        const remaining = clampMoney(Number(reservation.totalAmount) - ledgerPaid);

        if (remaining <= 0) {
          throw new Error('This reservation is already fully paid.');
        }

        sanitizedAmount = Math.min(sanitizedAmount, remaining);
      }

      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (paymentUpdate.amount !== undefined || (isApprovingNow && !isDeposit)) {
        updatePayload.amount = sanitizedAmount;
      }

      if (paymentUpdate.method !== undefined) {
        updatePayload.method = paymentUpdate.method;
      }

      if (paymentUpdate.status !== undefined) {
        updatePayload.status = paymentUpdate.status;
      }

      if (paymentUpdate.proofOfPayment !== undefined) {
        updatePayload.proofOfPayment = paymentUpdate.proofOfPayment;
      }

      if (paymentUpdate.notes !== undefined) {
        updatePayload.notes = paymentUpdate.notes;
      }

      if (paymentUpdate.paymentMethodId !== undefined) {
        updatePayload.payment_method_id = paymentUpdate.paymentMethodId;
      }

      if (paymentUpdate.paymentMethodSnapshot !== undefined) {
        updatePayload.payment_method_snapshot = paymentUpdate.paymentMethodSnapshot;
      }

      if (paymentUpdate.category !== undefined) {
        updatePayload.category = paymentUpdate.category;
      }

      const { data, error } = await supabase
        .from('payments')
        .update(updatePayload)
        .eq('payment_id', id)
        .select(
          'payment_id, public_id, reservation_id, user_id, amount, method, status, proofOfPayment, date, notes, created_at, updated_at, payment_method_id, payment_method_snapshot, category'
        )
        .single();

      if (error) throw error;

      const finalPayment = mapPaymentRow(data);

      const updatedPaymentForAudit = buildAuditSnapshot(existingPayment, {
        ...paymentUpdate,
        amount:
          paymentUpdate.amount !== undefined || (isApprovingNow && !isDeposit)
            ? sanitizedAmount
            : existingPayment.amount,
      });

      const changedFields = getChangedFields(existingPayment, {
        ...paymentUpdate,
        amount:
          paymentUpdate.amount !== undefined || (isApprovingNow && !isDeposit)
            ? sanitizedAmount
            : existingPayment.amount,
      });

      let action = 'PAYMENT_UPDATED';

      if (isApprovingNow) {
        action = 'PAYMENT_APPROVED';
      } else if (paymentUpdate.status !== undefined && paymentUpdate.status === 'unpaid') {
        action = 'PAYMENT_REJECTED';
      } else if (
        paymentUpdate.proofOfPayment !== undefined &&
        paymentUpdate.proofOfPayment !== existingPayment.proofOfPayment
      ) {
        action = 'PAYMENT_PROOF_UPLOADED';
      }

      if (isApprovingNow) {
        const existingLedgerCheck = await supabase
          .from('ledger')
          .select('ledger_id')
          .eq('payment_id', existingPayment.id)
          .limit(1)
          .maybeSingle();

        if (existingLedgerCheck.error) {
          throw existingLedgerCheck.error;
        }

        if (!existingLedgerCheck.data) {
          const { entryType, depositType } = getLedgerMeaningFromCategory(nextCategory);

          await addLedgerEntry({
            userId: finalPayment.userId,
            reservationId: finalPayment.reservationId,
            paymentId: finalPayment.id,
            entryType,
            depositType,
            amount: finalPayment.amount,
            method: finalPayment.method,
            status: 'verified',
            referenceNo: null,
            description:
              nextCategory === 'security_deposit'
                ? `Security deposit for ${finalPayment.publicId ?? finalPayment.id}`
                : nextCategory === 'advance_deposit'
                ? `Advance deposit for ${finalPayment.publicId ?? finalPayment.id}`
                : `Payment for reservation ${finalPayment.publicId ?? finalPayment.id}`,
            notes: finalPayment.notes ?? null,
            recordedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            createdBy: user?.id ?? null,
          });
        }

        await recalculateReservationPaidAmount(finalPayment.reservationId);
      }

      if (user?.id && changedFields.length > 0) {
        try {
          await addAuditLog({
            userId: user.id,
            action,
            targetTable: 'payments',
            targetId: id,
            targetPublicId: existingPayment.publicId,
            beforeValue: existingPayment,
            afterValue: updatedPaymentForAudit,
            changedFields,
            notes:
              action === 'PAYMENT_APPROVED'
                ? `Approved ${nextCategory} ${existingPayment.publicId ?? id}`
                : action === 'PAYMENT_REJECTED'
                ? `Rejected ${existingCategory} ${existingPayment.publicId ?? id}`
                : action === 'PAYMENT_PROOF_UPLOADED'
                ? `Uploaded proof for ${existingCategory} ${existingPayment.publicId ?? id}`
                : `Updated ${existingCategory} ${existingPayment.publicId ?? id}`,
          });
        } catch (auditError) {
          console.error('Failed to audit payment update:', auditError);
        }
      }

    },
    [
      addAuditLog,
      addLedgerEntry,
      getReservationLedgerNetPaid,
      payments,
      recalculateReservationPaidAmount,
      refreshPayments,
      reservations,
      user?.id,
    ]
  );

  const issueRefund = useCallback(
    async ({
      reservationId,
      paymentId = null,
      amount,
      method = null,
      notes = null,
      referenceNo = null,
    }: {
      reservationId: string;
      paymentId?: string | null;
      amount: number;
      method?: PaymentMethod | null;
      notes?: string | null;
      referenceNo?: string | null;
    }) => {
      const refundAmount = clampMoney(Number(amount));

      if (refundAmount <= 0) {
        throw new Error('Refund amount must be greater than zero.');
      }

      const reservation = reservations.find((r) => r.id === reservationId);
      if (!reservation) {
        throw new Error('Reservation not found.');
      }

      let linkedPayment: Payment | undefined;
      let refundableLimit = 0;

      if (paymentId) {
        linkedPayment = payments.find((p) => p.id === paymentId);

        if (!linkedPayment) {
          throw new Error('Linked payment not found.');
        }

        if (linkedPayment.reservationId !== reservationId) {
          throw new Error('The selected payment does not belong to this reservation.');
        }

        if (linkedPayment.status !== 'paid') {
          throw new Error('Only approved payments can be refunded.');
        }

        const { data: refundRows, error: refundRowsError } = await supabase
          .from('ledger')
          .select('amount')
          .eq('reservation_id', reservationId)
          .eq('payment_id', paymentId)
          .eq('entry_type', 'refund');

        if (refundRowsError) throw refundRowsError;

        const alreadyRefundedForPayment = (refundRows ?? []).reduce(
          (sum, row) => sum + Number(row.amount ?? 0),
          0
        );

        refundableLimit = Math.max(
          0,
          Number(linkedPayment.amount) - alreadyRefundedForPayment
        );

        if (refundableLimit <= 0) {
          throw new Error('This payment has already been fully refunded.');
        }

        if (refundAmount > refundableLimit) {
          throw new Error(
            `Refund cannot exceed the remaining refundable amount for this payment (₱${refundableLimit.toFixed(
              2
            )}).`
          );
        }
      } else {
        const netPaid = await getReservationLedgerNetPaid(reservationId);

        if (netPaid <= 0) {
          throw new Error('No refundable balance available.');
        }

        refundableLimit = netPaid;

        if (refundAmount > refundableLimit) {
          throw new Error(`Refund cannot exceed ₱${refundableLimit.toFixed(2)}.`);
        }
      }

      const linkedCategory = (linkedPayment?.category ?? 'payment') as PaymentCategory;

      const description = linkedPayment
        ? linkedCategory === 'security_deposit'
          ? `Refund for security deposit ${linkedPayment.publicId ?? linkedPayment.id}`
          : linkedCategory === 'advance_deposit'
          ? `Refund for advance deposit ${linkedPayment.publicId ?? linkedPayment.id}`
          : `Refund for payment ${linkedPayment.publicId ?? linkedPayment.id}`
        : `Refund for reservation ${reservation.publicId ?? reservation.id}`;

      await addLedgerEntry({
        userId: reservation.userId,
        reservationId,
        paymentId: paymentId ?? null,
        entryType: 'refund',
        depositType:
          linkedCategory === 'security_deposit'
            ? 'security'
            : linkedCategory === 'advance_deposit'
            ? 'advance'
            : undefined,
        amount: refundAmount,
        method: method ?? linkedPayment?.method ?? null,
        status: 'verified',
        referenceNo,
        description,
        notes,
        recordedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        createdBy: user?.id ?? null,
      });

      await recalculateReservationPaidAmount(reservationId);

      if (user?.id) {
        try {
          await addAuditLog({
            userId: user.id,
            action: 'PAYMENT_REFUNDED',
            targetTable: 'payments',
            targetId: paymentId ?? reservationId,
            targetPublicId:
              linkedPayment?.publicId || reservation.publicId || undefined,
            beforeValue: linkedPayment ?? null,
            afterValue: {
              reservationId,
              paymentId: paymentId ?? null,
              refundAmount,
              method: method ?? linkedPayment?.method ?? null,
              notes,
              referenceNo,
            },
            changedFields: ['refund'],
            notes: linkedPayment
              ? `Issued refund of ₱${refundAmount.toFixed(2)} for ${
                  linkedPayment.category ?? 'payment'
                } ${linkedPayment.publicId ?? linkedPayment.id}`
              : `Issued refund of ₱${refundAmount.toFixed(2)} for reservation ${
                  reservation.publicId ?? reservation.id
                }`,
          });
        } catch (auditError) {
          console.error('Failed to audit refund:', auditError);
        }
      }

    },
    [
      addAuditLog,
      addLedgerEntry,
      getReservationLedgerNetPaid,
      payments,
      recalculateReservationPaidAmount,
      refreshPayments,
      reservations,
      user?.id,
    ]
  );

  const getPaymentsByUserId = useCallback(
    (userId: string) => payments.filter((p) => p.userId === userId),
    [payments]
  );

  const value = useMemo<PaymentsContextType>(
    () => ({
      payments,
      paymentsVersion,
      addPayment,
      updatePayment,
      uploadPaymentProof,
      refreshPayments,
      getPaymentsByUserId,
      fetchPaymentsPage,
      issueRefund,
    }),
    [
      payments,
      paymentsVersion,
      addPayment,
      updatePayment,
      uploadPaymentProof,
      refreshPayments,
      getPaymentsByUserId,
      fetchPaymentsPage,
      issueRefund,
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