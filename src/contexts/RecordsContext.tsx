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

interface RecordsContextType {
  ledgers: LedgerEntry[];
  auditLogs: AuditLog[];
  businessSlots: BusinessSlot[];

  addLedgerEntry: (entry: Omit<LedgerEntry, 'id'>) => Promise<string>;
  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => Promise<string>;

  addBusinessSlot: (slot: Omit<BusinessSlot, 'id'>) => void;
  updateBusinessSlot: (id: string, slot: Partial<BusinessSlot>) => void;
  deleteBusinessSlot: (id: string) => void;

  refreshLedgers: () => Promise<void>;
  refreshAuditLogs: () => Promise<void>;
}

const RecordsContext = createContext<RecordsContextType | undefined>(undefined);

export function RecordsProvider({ children }: { children: ReactNode }) {
  const [ledgers, setLedgers] = useState<LedgerEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [businessSlots, setBusinessSlots] = useState<BusinessSlot[]>([]);

  const refreshLedgers = async () => {
    const { data, error } = await supabase
      .from('ledger')
      .select('ledger_id, user_id, amount, date')
      .order('date', { ascending: false });

    if (!error && data) {
      setLedgers(
        data.map((row: any) => ({
          id: row.ledger_id,
          userId: row.user_id,
          amount: Number(row.amount),
          date: row.date,
        }))
      );
    }
  };

  const refreshAuditLogs = async () => {
    const { data, error } = await supabase
      .from('audit_log')
      .select(
        'audit_id, public_id, user_id, action, target_table, target_id, before_value, after_value, changed_fields, timestamp, notes'
      )
      .order('timestamp', { ascending: false });

    if (!error && data) {
      setAuditLogs(
        data.map((row: any) => ({
          id: row.audit_id,
          publicId: row.public_id,
          userId: row.user_id,
          action: row.action,
          targetTable: row.target_table,
          targetId: row.target_id,
          beforeValue: row.before_value,
          afterValue: row.after_value,
          changedFields: row.changed_fields,
          timestamp: row.timestamp,
          notes: row.notes,
        }))
      );
    }
  };

  useEffect(() => {
    refreshLedgers();
    refreshAuditLogs();
  }, []);

  const addLedgerEntry = async (
    entry: Omit<LedgerEntry, 'id'>
  ): Promise<string> => {
    const { data, error } = await supabase
      .from('ledger')
      .insert([
        {
          user_id: entry.userId,
          amount: entry.amount,
          date: entry.date || new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    const newEntry: LedgerEntry = {
      id: data.ledger_id,
      userId: data.user_id,
      amount: Number(data.amount),
      date: data.date,
    };

    setLedgers((prev) => [newEntry, ...prev]);
    return newEntry.id;
  };

  const addAuditLog = async (
    log: Omit<AuditLog, 'id' | 'timestamp'>
  ): Promise<string> => {
    const { data, error } = await supabase
      .from('audit_log')
      .insert([
        {
          user_id: log.userId,
          action: log.action,
          target_table: log.targetTable,
          target_id: log.targetId,
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


    const newLog: AuditLog = {
      id: data.audit_id,
    publicId: data.public_id,
      userId: data.user_id,
      action: data.action,
      targetTable: data.target_table,
      targetId: data.target_id,
      beforeValue: data.before_value,
      afterValue: data.after_value,
      changedFields: data.changed_fields,
      timestamp: data.timestamp,
      notes: data.notes,
    };

    setAuditLogs((prev) => [newLog, ...prev]);
    return newLog.id;
  };

  const addBusinessSlot = (slot: Omit<BusinessSlot, 'id'>) => {
    const newSlot: BusinessSlot = {
      ...slot,
      id: crypto.randomUUID(),
    };
    setBusinessSlots((prev) => [newSlot, ...prev]);
  };

  const updateBusinessSlot = (id: string, slot: Partial<BusinessSlot>) => {
    setBusinessSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...slot } : s)));
  };

  const deleteBusinessSlot = (id: string) => {
    setBusinessSlots((prev) => prev.filter((s) => s.id !== id));
  };

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