import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import supabase from '../supabaseClient';
import type { AuditLog, BusinessSlot, LedgerEntry } from '../data/types';

type AuditLogFilters = {
  searchTerm?: string;
  action?: string;
  module?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
};

interface RecordsContextType {
  ledgers: LedgerEntry[];
  auditLogs: AuditLog[];
  businessSlots: BusinessSlot[];

  addLedgerEntry: (entry: Omit<LedgerEntry, 'id'>) => Promise<string>;
  
  addAuditLog: (
    log: Omit<AuditLog, 'id' | 'timestamp'> & { targetPublicId?: string }
  ) => Promise<string>;

  addBusinessSlot: (slot: Omit<BusinessSlot, 'id'>) => void;
  updateBusinessSlot: (id: string, slot: Partial<BusinessSlot>) => void;
  deleteBusinessSlot: (id: string) => void;

  refreshLedgers: () => Promise<void>;
  refreshAuditLogs: () => Promise<void>;

  fetchAuditLogsPage: (filters: AuditLogFilters) => Promise<{
    data: AuditLog[];
    count: number;
  }>;
}

const RecordsContext = createContext<RecordsContextType | undefined>(undefined);

/* ------------------ MAPPERS ------------------ */

function mapLedgerRow(row: any): LedgerEntry {
  return {
    id: row.ledger_id,
    userId: row.user_id,
    publicId: row.public_id,
    reservationId: row.reservation_id,
    paymentId: row.payment_id,
    entryType: row.entry_type,
    amount: Number(row.amount),
    method: row.method,
    status: row.status,
    referenceNo: row.reference_no,
    description: row.description,
    notes: row.notes,
    recordedAt: row.recorded_at,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

function mapAuditRow(row: any): AuditLog {
  return {
    id: row.audit_id,
    publicId: row.public_id,
    userId: row.user_id,
    action: row.action,
    targetTable: row.target_table,
    targetId: row.target_id,
    targetPublicId: row.target_public_id,
    beforeValue: row.before_value,
    afterValue: row.after_value,
    changedFields: row.changed_fields,
    timestamp: row.timestamp,
    notes: row.notes,
  };
}

/* ------------------ PROVIDER ------------------ */

export function RecordsProvider({ children }: { children: ReactNode }) {
  const [ledgers, setLedgers] = useState<LedgerEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [businessSlots, setBusinessSlots] = useState<BusinessSlot[]>([]);

  /* ---------- LOADERS ---------- */

  const refreshLedgers = async () => {
    const { data, error } = await supabase
      .from('ledger')
      .select(`
        ledger_id,
        public_id,
        user_id,
        reservation_id,
        payment_id,
        entry_type,
        amount,
        method,
        status,
        reference_no,
        description,
        notes,
        recorded_at,
        created_at,
        created_by
      `)
      .order('recorded_at', { ascending: false });

    if (error) {
      console.error('Error loading ledgers:', error);
      return;
    }

    setLedgers((data ?? []).map(mapLedgerRow));
  };

  const refreshAuditLogs = async () => {
    const { data, error } = await supabase
      .from('audit_log')
      .select(`
        audit_id,
        public_id,
        user_id,
        action,
        target_table,
        target_id,
        target_public_id,
        before_value,
        after_value,
        changed_fields,
        timestamp,
        notes
      `)
      .order('timestamp', { ascending: false });

    if (!error && data) {
      setAuditLogs(data.map(mapAuditRow));
    }
  };

  useEffect(() => {
    void refreshLedgers();
    void refreshAuditLogs();
  }, []);

  /* ---------- PAGINATION ---------- */

  const fetchAuditLogsPage = async ({
    searchTerm = '',
    action = 'All',
    module = 'All',
    startDate = '',
    endDate = '',
    page = 1,
    pageSize = 25,
  }: AuditLogFilters) => {
    let query = supabase
      .from('audit_log')
      .select(
        'audit_id, public_id, user_id, action, target_table, target_id, target_public_id, before_value, after_value, changed_fields, timestamp, notes',
        { count: 'exact' }
      )
      .order('timestamp', { ascending: false });

    if (action !== 'All') query = query.eq('action', action);
    if (module !== 'All') query = query.eq('target_table', module);

    if (startDate) query = query.gte('timestamp', `${startDate}T00:00:00`);
    if (endDate) query = query.lte('timestamp', `${endDate}T23:59:59`);

    if (searchTerm.trim()) {
      query = query.or(
        [
          `action.ilike.%${searchTerm}%`,
          `target_table.ilike.%${searchTerm}%`,
          `target_id.ilike.%${searchTerm}%`,
          `user_id.ilike.%${searchTerm}%`,
          `notes.ilike.%${searchTerm}%`,
          `public_id.ilike.%${searchTerm}%`,
        ].join(',')
      );
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    return {
      data: (data ?? []).map(mapAuditRow),
      count: count ?? 0,
    };
  };

  /* ---------- MUTATIONS ---------- */

  const addLedgerEntry = async (
    entry: Omit<LedgerEntry, 'id'>
  ): Promise<string> => {
    console.log('ledger insert reservation_id:', entry.reservationId);
    const { data, error } = await supabase
      .from('ledger')
      
      .insert([
        {
          user_id: entry.userId,
          reservation_id: entry.reservationId,
          payment_id: entry.paymentId,
          entry_type: entry.entryType,
          amount: entry.amount,
          method: entry.method,
          status: entry.status, 
          reference_no: entry.referenceNo,
          description: entry.description,
          notes: entry.notes,
          recorded_at: entry.recordedAt,
          created_at: entry.createdAt,
          created_by: entry.createdBy,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    const newEntry = mapLedgerRow(data);
    setLedgers((prev) => [newEntry, ...prev]);
    return newEntry.id;
  };

  const addAuditLog = async (
  log: Omit<AuditLog, 'id' | 'timestamp'> & { targetPublicId?: string }
): Promise<string> => {
  const { data, error } = await supabase
    .from('audit_log')
    .insert([
      {
        user_id: log.userId,
        action: log.action,
        target_table: log.targetTable,
        target_id: log.targetId, // always UUID
        target_public_id: log.targetPublicId ?? null, // always text
        before_value: log.beforeValue,
        after_value: log.afterValue,
        changed_fields: log.changedFields,
        timestamp: new Date().toISOString(),
        notes: log.notes,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  const newLog = mapAuditRow(data);
  setAuditLogs((prev) => [newLog, ...prev]);
  return newLog.id;
};

  /* ---------- BUSINESS SLOTS ---------- */

  const addBusinessSlot = (slot: Omit<BusinessSlot, 'id'>) => {
    setBusinessSlots((prev) => [{ ...slot, id: crypto.randomUUID() }, ...prev]);
  };

  const updateBusinessSlot = (id: string, slot: Partial<BusinessSlot>) => {
    setBusinessSlots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...slot } : s))
    );
  };

  const deleteBusinessSlot = (id: string) => {
    setBusinessSlots((prev) => prev.filter((s) => s.id !== id));
  };

  /* ---------- CONTEXT ---------- */

  const value = useMemo(
    () => ({
      ledgers,
      auditLogs,
      businessSlots,
      addLedgerEntry,
      addAuditLog,
      addBusinessSlot,
      updateBusinessSlot,
      deleteBusinessSlot,
      refreshLedgers,
      refreshAuditLogs,
      fetchAuditLogsPage,
    }),
    [ledgers, auditLogs, businessSlots]
  );

  return <RecordsContext.Provider value={value}>{children}</RecordsContext.Provider>;
}

export function useRecords() {
  const context = useContext(RecordsContext);
  if (!context) throw new Error('useRecords must be used within RecordsProvider');
  return context;
}