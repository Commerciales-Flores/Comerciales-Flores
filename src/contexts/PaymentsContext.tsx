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
import type {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from '../data/types';

import {
  normalizeMoneyString,
  normalizeText,
} from '../utils/DataNormalization';

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

function normalizeSearchTerm(value: string) {
  return normalizeText(value).toLowerCase();
}

function sortPaymentsByCreatedAt(items: Payment[]) {
  return [...items].sort(
    (a, b) =>
      new Date(b.createdAt ?? b.date ?? 0).getTime() -
      new Date(a.createdAt ?? a.date ?? 0).getTime()
  );
}

async function getAccessTokenOrThrow() {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;

  if (sessionError || !accessToken) {
    throw new Error('Your session is no longer valid. Please sign in again.');
  }

  return accessToken;
}

export function PaymentsProvider({ children }: { children: ReactNode }) {
  const [payments, setPayments] = useState<Payment[]>([]);
const [paymentsVersion, setPaymentsVersion] = useState(0);

const hasLoadedPaymentsRef = useRef(false);
const refreshPaymentsPromiseRef = useRef<Promise<void> | null>(null);

  const refreshPayments = useCallback(async (force = false) => {
  if (!force && hasLoadedPaymentsRef.current) {
    return;
  }

  if (refreshPaymentsPromiseRef.current) {
    return refreshPaymentsPromiseRef.current;
  }

  const promise = (async () => {
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
      hasLoadedPaymentsRef.current = false;
      return;
    }

    setPayments(sortPaymentsByCreatedAt((data ?? []).map(mapPaymentRow)));
    hasLoadedPaymentsRef.current = true;
  })();

  refreshPaymentsPromiseRef.current = promise;

  try {
    await promise;
  } finally {
    refreshPaymentsPromiseRef.current = null;
  }
}, []);

  useEffect(() => {
  let cancelled = false;

  const start = () => {
    if (!cancelled) {
      void refreshPayments();
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
          { count: 'planned' }
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

  const addPayment = useCallback(
    async (
      paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'date'>
    ): Promise<string> => {
      const accessToken = await getAccessTokenOrThrow();

      const normalizedAmount = Number(
        normalizeMoneyString(String(paymentData.amount))
      );

      if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
        throw new Error('Invalid payment amount.');
      }

      const normalizedNotes = paymentData.notes
        ? normalizeText(paymentData.notes)
        : null;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-and-ledger`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            reservationId: paymentData.reservationId,
            amount: normalizedAmount,
            method: paymentData.method,
            status: paymentData.status,
            proofOfPayment: paymentData.proofOfPayment ?? null,
            notes: normalizedNotes,
            paymentMethodId: paymentData.paymentMethodId ?? null,
            paymentMethodSnapshot: paymentData.paymentMethodSnapshot ?? null,
            category: paymentData.category ?? 'payment',
          }),
        }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to create payment.');
      }

      const newPayment = mapPaymentRow(payload.payment);

      setPayments((prev) => {
        if (prev.some((item) => item.id === newPayment.id)) return prev;
        return sortPaymentsByCreatedAt([newPayment, ...prev]);
      });

      return newPayment.id;
    },
    []
  );

  const updatePayment = useCallback(
    async (id: string, paymentUpdate: Partial<Payment>): Promise<void> => {
      const accessToken = await getAccessTokenOrThrow();

      const normalizedAmount =
      paymentUpdate.amount !== undefined
        ? Number(normalizeMoneyString(String(paymentUpdate.amount)))
        : undefined;

      const normalizedNotes =
        paymentUpdate.notes !== undefined
          ? paymentUpdate.notes
            ? normalizeText(paymentUpdate.notes)
            : null
      : undefined;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-and-ledger`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            paymentId: id,
            reservationId: paymentUpdate.reservationId,
            amount: normalizedAmount,
            method: paymentUpdate.method,
            status: paymentUpdate.status,
            proofOfPayment: paymentUpdate.proofOfPayment ?? null,
            notes: normalizedNotes,
            paymentMethodId: paymentUpdate.paymentMethodId ?? null,
            paymentMethodSnapshot: paymentUpdate.paymentMethodSnapshot ?? null,
            category: paymentUpdate.category ?? 'payment',
          }),
        }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to update payment.');
      }

      const updatedPayment = mapPaymentRow(payload.payment);

      setPayments((prev) =>
        sortPaymentsByCreatedAt(
          prev.map((item) =>
            item.id === updatedPayment.id ? updatedPayment : item
          )
        )
      );
    },
    []
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
    const accessToken = await getAccessTokenOrThrow();

    const normalizedAmount = Number(normalizeMoneyString(String(amount)));
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      throw new Error('Invalid refund amount.');
    }

    const normalizedNotes = notes ? normalizeText(notes) : null;
    const normalizedReferenceNo = referenceNo ? normalizeText(referenceNo) : null;

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/issue-refund`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          reservationId,
          paymentId,
          amount: normalizedAmount,
          method,
          notes: normalizedNotes,
          referenceNo: normalizedReferenceNo,
        }),
      }
    );

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error || 'Failed to issue refund.');
    }
  },
  []
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