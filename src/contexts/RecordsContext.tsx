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
import type { AuditLog, BusinessSlot, LedgerEntry } from '../data/types';
import { normalizeText } from '../utils/DataNormalization';

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
  ledgerVersion: number;
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

function mapLedgerRow(row: any): LedgerEntry {
  return {
    id: row.ledger_id,
    userId: row.user_id,
    publicId: row.public_id,
    reservationId: row.reservation_id,
    paymentId: row.payment_id,
    entryType: row.entry_type,
    depositType: row.deposit_type ?? null,
    amount: Number(row.amount),
    method: row.method,
    status: row.status,
    referenceNo: row.reference_no,
    description: row.description ? normalizeText(row.description) : null,
    notes: row.notes ? normalizeText(row.notes) : null,
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

function sortLedgers(items: LedgerEntry[]) {
  return [...items].sort(
    (a, b) =>
      new Date(b.recordedAt ?? 0).getTime() - new Date(a.recordedAt ?? 0).getTime()
  );
}

function sortAuditLogs(items: AuditLog[]) {
  return [...items].sort(
    (a, b) =>
      new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime()
  );
}

export function RecordsProvider({ children }: { children: ReactNode }) {
  const [ledgers, setLedgers] = useState<LedgerEntry[]>([]);
  const [ledgerVersion, setLedgerVersion] = useState(0);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [businessSlots, setBusinessSlots] = useState<BusinessSlot[]>([]);

  const refreshLedgers = useCallback(async () => {
    const { data, error } = await supabase
      .from('ledger')
      .select(`
        ledger_id,
        public_id,
        user_id,
        reservation_id,
        payment_id,
        entry_type,
        deposit_type,
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

    setLedgers(sortLedgers((data ?? []).map(mapLedgerRow)));
  }, []);

  const refreshAuditLogs = useCallback(async () => {
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

    if (error) {
      console.error('Error loading audit logs:', error);
      return;
    }

    setAuditLogs(sortAuditLogs((data ?? []).map(mapAuditRow)));
  }, []);

  useEffect(() => {
    void refreshLedgers();
    void refreshAuditLogs();
  }, [refreshLedgers, refreshAuditLogs]);

  useEffect(() => {
  const channel = supabase
    .channel('records-realtime')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'ledger',
      },
      (payload) => {
        const newEntry = mapLedgerRow(payload.new);

        setLedgers((prev) => {
          if (prev.some((item) => item.id === newEntry.id)) return prev;
          return sortLedgers([newEntry, ...prev]);
        });

        setLedgerVersion((prev) => prev + 1);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'ledger',
      },
      (payload) => {
        const updatedEntry = mapLedgerRow(payload.new);

        setLedgers((prev) =>
          sortLedgers(
            prev.map((item) => (item.id === updatedEntry.id ? updatedEntry : item))
          )
        );

        setLedgerVersion((prev) => prev + 1);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'ledger',
      },
      (payload) => {
        const deletedId = payload.old.ledger_id as string | undefined;
        if (!deletedId) return;

        setLedgers((prev) => prev.filter((item) => item.id !== deletedId));
        setLedgerVersion((prev) => prev + 1);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'audit_log',
      },
      (payload) => {
        const newLog = mapAuditRow(payload.new);

        setAuditLogs((prev) => {
          if (prev.some((item) => item.id === newLog.id)) return prev;
          return sortAuditLogs([newLog, ...prev]);
        });
      }
    )
    .subscribe((status) => {
      if (import.meta.env.DEV) {
        console.log('Records realtime status:', status);
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}, []);

  const fetchAuditLogsPage = useCallback(
    async ({
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

      const normalizedSearch = normalizeText(searchTerm).toLowerCase();

      if (normalizedSearch) {
        query = query.or(
          [
            `action.ilike.%${normalizedSearch}%`,
            `target_table.ilike.%${normalizedSearch}%`,
            `target_id.ilike.%${normalizedSearch}%`,
            `user_id.ilike.%${normalizedSearch}%`,
            `notes.ilike.%${normalizedSearch}%`,
            `public_id.ilike.%${normalizedSearch}%`,
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
    },
    []
  );

  const addLedgerEntry = useCallback(
    async (entry: Omit<LedgerEntry, 'id'>): Promise<string> => {
      const { data, error } = await supabase
        .from('ledger')
        .insert([
          {
            user_id: entry.userId,
            reservation_id: entry.reservationId,
            payment_id: entry.paymentId,
            entry_type: entry.entryType,
            deposit_type: entry.depositType ?? null,
            amount: entry.amount,
            method: entry.method,
            status: entry.status,
            reference_no: entry.referenceNo,
            description: entry.description ? normalizeText(entry.description) : null,
            notes: entry.notes ? normalizeText(entry.notes) : null,
            recorded_at: entry.recordedAt,
            created_at: entry.createdAt,
            created_by: entry.createdBy,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return data.ledger_id;
    },
    []
  );

  const addAuditLog = useCallback(
    async (
      log: Omit<AuditLog, 'id' | 'timestamp'> & { targetPublicId?: string }
    ): Promise<string> => {
      const { data, error } = await supabase
        .from('audit_log')
        .insert([
          {
            user_id: log.userId,
            action: log.action,
            target_table: log.targetTable,
            target_id: log.targetId,
            target_public_id: log.targetPublicId ?? null,
            before_value: log.beforeValue,
            after_value: log.afterValue,
            changed_fields: log.changedFields,
            notes: log.notes ? normalizeText(log.notes) : null,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return data.audit_id;
    },
    []
  );

  const addBusinessSlot = useCallback((slot: Omit<BusinessSlot, 'id'>) => {
    setBusinessSlots((prev) => [{ ...slot, id: crypto.randomUUID() }, ...prev]);
  }, []);

  const updateBusinessSlot = useCallback((id: string, slot: Partial<BusinessSlot>) => {
    setBusinessSlots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...slot } : s))
    );
  }, []);

  const deleteBusinessSlot = useCallback((id: string) => {
    setBusinessSlots((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      ledgers,
      auditLogs,
      businessSlots,
      ledgerVersion,
      addLedgerEntry,
      addAuditLog,
      addBusinessSlot,
      updateBusinessSlot,
      deleteBusinessSlot,
      refreshLedgers,
      refreshAuditLogs,
      fetchAuditLogsPage,
    }),
    [
      ledgers,
      auditLogs,
      businessSlots,
      ledgerVersion,
      addLedgerEntry,
      addAuditLog,
      addBusinessSlot,
      updateBusinessSlot,
      deleteBusinessSlot,
      refreshLedgers,
      refreshAuditLogs,
      fetchAuditLogsPage,
    ]
  );

  return <RecordsContext.Provider value={value}>{children}</RecordsContext.Provider>;
}

export function useRecords() {
  const context = useContext(RecordsContext);
  if (!context) throw new Error('useRecords must be used within RecordsProvider');
  return context;
}