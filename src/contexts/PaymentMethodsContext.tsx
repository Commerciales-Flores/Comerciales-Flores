import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import supabase from '../supabaseClient';
import {
  normalizeText,
  normalizeName,
  normalizePHPhone,
} from '../utils/DataNormalization';

export type PaymentMethodCode =
  | 'gcash'
  | 'paymaya'
  | 'bank_transfer'
  | 'cash'
  | 'cheque'
  | 'credit_card';

export type PaymentMethodConfig = {
  id: string;
  publicId: string | null;
  methodCode: PaymentMethodCode;
  displayName: string;
  accountName: string | null;
  accountNumber: string | null;
  mobileNumber: string | null;
  bankName: string | null;
  branchName: string | null;
  qrImagePath: string | null;
  qrImageUrl: string | null;
  instructions: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type PaymentMethodPayload = {
  methodCode: PaymentMethodCode;
  displayName: string;
  accountName?: string | null;
  accountNumber?: string | null;
  mobileNumber?: string | null;
  bankName?: string | null;
  branchName?: string | null;
  qrImagePath?: string | null;
  instructions?: string | null;
  isActive: boolean;
  sortOrder: number;
};

type PaymentMethodsContextType = {
  paymentMethods: PaymentMethodConfig[];
  activePaymentMethods: PaymentMethodConfig[];
  loadingPaymentMethods: boolean;
  refreshPaymentMethods: () => Promise<void>;
  addPaymentMethod: (payload: PaymentMethodPayload) => Promise<void>;
  updatePaymentMethod: (id: string, payload: PaymentMethodPayload) => Promise<void>;
  deletePaymentMethod: (id: string) => Promise<void>;
  uploadPaymentMethodQr: (file: File) => Promise<string | null>;
  getPaymentMethodByCode: (methodCode?: string | null) => PaymentMethodConfig | undefined;
};

const PaymentMethodsContext = createContext<PaymentMethodsContextType | undefined>(undefined);

/**
 * Centralized bucket for payment method assets
 */
const PAYMENT_METHODS_BUCKET = 'property_media';

/**
 * Safely resolve public image URL
 */
function getPublicImageUrl(path?: string | null) {
  if (!path) return null;

  // already full URL
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('blob:')
  ) {
    return path;
  }

  const { data } = supabase.storage
    .from(PAYMENT_METHODS_BUCKET)
    .getPublicUrl(path);

  return data?.publicUrl || null;
}

/**
 * Normalize DB row → UI config
 */
function mapPaymentMethodRow(row: any): PaymentMethodConfig {
  const qrPath = row.qr_image_path ?? null;

  return {
    id: row.payment_method_id,
    publicId: row.public_id ?? null,
    methodCode: row.method_code as PaymentMethodCode,
    displayName: normalizeText(row.display_name ?? ''),
    accountName: row.account_name ? normalizeName(row.account_name) : null,
    accountNumber: row.account_number ?? null,
    mobileNumber: row.mobile_number ? normalizePHPhone(row.mobile_number) : null,
    bankName: row.bank_name ? normalizeText(row.bank_name) : null,
    branchName: row.branch_name ? normalizeText(row.branch_name) : null,
    qrImagePath: qrPath,
    qrImageUrl: getPublicImageUrl(qrPath),
    instructions: row.instructions ? normalizeText(row.instructions) : null,
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

function sortPaymentMethods(items: PaymentMethodConfig[]) {
  return [...items].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.displayName.localeCompare(b.displayName);
  });
}

export function PaymentMethodsProvider({ children }: { children: ReactNode }) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);

  const refreshPaymentMethods = useCallback(async () => {
    setLoadingPaymentMethods(true);

    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('display_name', { ascending: true });

      if (error) throw error;

      setPaymentMethods((data ?? []).map(mapPaymentMethodRow));
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
    } finally {
      setLoadingPaymentMethods(false);
    }
  }, []);

  useEffect(() => {
    refreshPaymentMethods();
  }, [refreshPaymentMethods]);

  useEffect(() => {
  const channel = supabase
    .channel('payment-methods-realtime')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'payment_methods',
      },
      (payload) => {
        const newItem = mapPaymentMethodRow(payload.new);

        setPaymentMethods((prev) => {
          if (prev.some((item) => item.id === newItem.id)) return prev;
          return sortPaymentMethods([...prev, newItem]);
        });
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'payment_methods',
      },
      (payload) => {
        const updatedItem = mapPaymentMethodRow(payload.new);

        setPaymentMethods((prev) =>
          sortPaymentMethods(
            prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
          )
        );
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'payment_methods',
      },
      (payload) => {
        const deletedId = payload.old.payment_method_id as string | undefined;
        if (!deletedId) return;

        setPaymentMethods((prev) => prev.filter((item) => item.id !== deletedId));
      }
    )
    .subscribe((status) => {
      if (import.meta.env.DEV) {
        console.log('Payment methods realtime status:', status);
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}, []);

  const addPaymentMethod = useCallback(
  async (payload: PaymentMethodPayload) => {
    const { error } = await supabase.from('payment_methods').insert([
  {
    method_code: payload.methodCode,
    display_name: normalizeText(payload.displayName),
    account_name: payload.accountName
      ? normalizeName(payload.accountName)
      : null,
    account_number: payload.accountNumber
      ? normalizeText(payload.accountNumber)
      : null,
    mobile_number: payload.mobileNumber
      ? normalizePHPhone(payload.mobileNumber)
      : null,
    bank_name: payload.bankName
      ? normalizeText(payload.bankName)
      : null,
    branch_name: payload.branchName
      ? normalizeText(payload.branchName)
      : null,
    qr_image_path: payload.qrImagePath
      ? normalizeText(payload.qrImagePath)
      : null,
    instructions: payload.instructions
      ? normalizeText(payload.instructions)
      : null,
    is_active: payload.isActive,
    sort_order: Number(payload.sortOrder || 0),
  },
]);

    if (error) throw error;
  },
  []
);

  const updatePaymentMethod = useCallback(
  async (id: string, payload: PaymentMethodPayload) => {
    const { error } = await supabase
      .from('payment_methods')
      .update({
        method_code: payload.methodCode,
        display_name: normalizeText(payload.displayName),
        account_name: payload.accountName
          ? normalizeName(payload.accountName)
          : null,
        account_number: payload.accountNumber
          ? normalizeText(payload.accountNumber)
          : null,
        mobile_number: payload.mobileNumber
          ? normalizePHPhone(payload.mobileNumber)
          : null,
        bank_name: payload.bankName
          ? normalizeText(payload.bankName)
          : null,
        branch_name: payload.branchName
          ? normalizeText(payload.branchName)
          : null,
        qr_image_path: payload.qrImagePath
          ? normalizeText(payload.qrImagePath)
          : null,
        instructions: payload.instructions
          ? normalizeText(payload.instructions)
          : null,
        is_active: payload.isActive,
        sort_order: Number(payload.sortOrder || 0),
        updated_at: new Date().toISOString(),
      })
      .eq('payment_method_id', id);

    if (error) throw error;
  },
  []
);

  const deletePaymentMethod = useCallback(
  async (id: string) => {
    const { error } = await supabase
      .from('payment_methods')
      .delete()
      .eq('payment_method_id', id);

    if (error) throw error;
  },
  []
);

  /**
   * Upload QR → payment-methods/qr/
   */
  const uploadPaymentMethodQr = useCallback(async (file: File) => {
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';

      const filePath = `payment-methods/qr/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;

      const { error } = await supabase.storage
        .from(PAYMENT_METHODS_BUCKET)
        .upload(filePath, file, { upsert: false });

      if (error) throw error;

      return filePath;
    } catch (error) {
      console.error('Failed to upload payment method QR:', error);
      return null;
    }
  }, []);

  const activePaymentMethods = useMemo(
    () => paymentMethods.filter((item) => item.isActive),
    [paymentMethods]
  );

  const getPaymentMethodByCode = useCallback(
    (methodCode?: string | null) =>
      paymentMethods.find((item) => item.methodCode === methodCode),
    [paymentMethods]
  );

  const value = useMemo<PaymentMethodsContextType>(
    () => ({
      paymentMethods,
      activePaymentMethods,
      loadingPaymentMethods,
      refreshPaymentMethods,
      addPaymentMethod,
      updatePaymentMethod,
      deletePaymentMethod,
      uploadPaymentMethodQr,
      getPaymentMethodByCode,
    }),
    [
      paymentMethods,
      activePaymentMethods,
      loadingPaymentMethods,
      refreshPaymentMethods,
      addPaymentMethod,
      updatePaymentMethod,
      deletePaymentMethod,
      uploadPaymentMethodQr,
      getPaymentMethodByCode,
    ]
  );

  return (
    <PaymentMethodsContext.Provider value={value}>
      {children}
    </PaymentMethodsContext.Provider>
  );
}

export function usePaymentMethods() {
  const context = useContext(PaymentMethodsContext);

  if (!context) {
    throw new Error('usePaymentMethods must be used within PaymentMethodsProvider');
  }

  return context;
}