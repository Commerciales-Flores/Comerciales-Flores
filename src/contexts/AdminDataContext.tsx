import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';

import type {
  AuditLog,
  BusinessSlot,
  ContentSettings,
  LedgerEntry,
  Notification,
  Payment,
  Reservation,
  Unit,
  User,
} from '../data/types';

import {
  useInquiries,
  type SupportMessage,
  type SupportSenderType,
  type SupportTicket,
} from './InquiriesContext';
import { useNotifications } from './NotificationContext';
import { useContentSettings } from './ContentSettingsContext';
import { usePayments } from './PaymentsContext';
import { useRecords } from './RecordsContext';
import { useReservations } from './ReservationsContext';
import { useUnits } from './UnitsContext';
import { useUsers } from './UsersContext';

type CreateTicketInput = {
  userId?: string | null;
  firstName?: string;
  lastName?: string;
  email?: string;
  subject: string;
  message: string;
  senderType?: SupportSenderType;
};

type SendTicketMessageInput = {
  body: string;
  senderType: SupportSenderType;
  senderUserId?: string | null;
  senderName?: string | null;
  senderEmail?: string | null;
};

interface AdminDataContextType {
  users: User[];
  units: Unit[];
  loadingUnits: boolean;
  reservations: Reservation[];
  payments: Payment[];
  ledgers: LedgerEntry[];
  auditLogs: AuditLog[];
  messages: SupportMessage[];
  notifications: Notification[];
  businessSlots: BusinessSlot[];
  contentSettings: ContentSettings;
  isLoadingMessages: boolean;

  addUnit: (unit: Omit<Unit, 'id'>) => Promise<void>;
  updateUnit: (id: string, unit: Partial<Unit>) => Promise<void>;
  deleteUnit: (id: string) => Promise<void>;
  uploadUnitImage: (file: File) => Promise<string | null>;

  addReservation: (
    reservation: Omit<Reservation, 'id' | 'requestDate' | 'status' | 'paidAmount'>
  ) => Promise<string>;
  updateReservation: (id: string, reservation: Partial<Reservation>) => Promise<void>;
  deleteReservation: (id: string) => void;

  addPayment: (
    payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'date'>
  ) => Promise<string>;
  updatePayment: (id: string, payment: Partial<Payment>) => Promise<void>;
  uploadPaymentProof: (file: File) => Promise<string | null>;
  issueRefund: (params: {
    reservationId: string;
    paymentId?: string | null;
    amount: number;
    method?: any;
    notes?: string | null;
    referenceNo?: string | null;
  }) => Promise<void>;

  addLedgerEntry: (entry: Omit<LedgerEntry, 'id'>) => Promise<string>;
  addAuditLog: (
    log: Omit<AuditLog, 'id' | 'timestamp'> & { targetPublicId?: string }
  ) => Promise<string>;

  createTicket: (input: CreateTicketInput) => Promise<SupportTicket>;
  sendTicketMessage: (
    ticketId: string,
    input: SendTicketMessageInput
  ) => Promise<{ ticket: SupportTicket; message: SupportMessage }>;
  markTicketResolved: (ticketId: string) => Promise<SupportTicket>;
  reopenTicket: (ticketId: string) => Promise<SupportTicket>;
  fetchMessagesByTicketId: (
    ticketId: string,
    force?: boolean
  ) => Promise<SupportMessage[]>;
  getMessagesByTicketId: (ticketId: string) => SupportMessage[];

  addNotification: (
    notification: Omit<Notification, 'id' | 'date' | 'read'>
  ) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: (userId: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;

  addBusinessSlot: (slot: Omit<BusinessSlot, 'id'>) => void;
  updateBusinessSlot: (id: string, slot: Partial<BusinessSlot>) => void;
  deleteBusinessSlot: (id: string) => void;

  updateContentSettings: (settings: Partial<ContentSettings>) => Promise<void>;

  getUnitById: (id: string) => Unit | undefined;
  getReservationsByUserId: (userId: string) => Reservation[];
  getPaymentsByUserId: (userId: string) => Payment[];
  getLedgerByUserId: (userId: string) => LedgerEntry[];
  getNotificationsByUserId: (userId: string) => Notification[];
  getUserById: (id: string) => User | undefined;
}

const AdminDataContext = createContext<AdminDataContextType | undefined>(undefined);

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const { users, getUserById } = useUsers();

  const {
    units,
    addUnit,
    loadingUnits,
    updateUnit,
    deleteUnit,
    uploadUnitImage,
    getUnitById,
  } = useUnits();

  const {
    ledgers,
    auditLogs,
    businessSlots,
    addLedgerEntry,
    addAuditLog,
    addBusinessSlot,
    updateBusinessSlot,
    deleteBusinessSlot,
  } = useRecords();

  const {
    reservations,
    addReservation,
    updateReservation,
    deleteReservation,
    getReservationsByUserId,
  } = useReservations();

  const {
    payments,
    addPayment,
    updatePayment,
    uploadPaymentProof,
    getPaymentsByUserId,
    issueRefund,
  } = usePayments();

  const {
    messages,
    isLoadingMessages,
    createTicket,
    sendTicketMessage,
    markTicketResolved,
    reopenTicket,
    fetchMessagesByTicketId,
    getMessagesByTicketId,
  } = useInquiries();

  const {
    notifications,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    getNotificationsByUserId,
  } = useNotifications();

  const { contentSettings, updateContentSettings } = useContentSettings();

  const getLedgerByUserId = useCallback(
    (userId: string) => ledgers.filter((entry) => entry.userId === userId),
    [ledgers]
  );

  const value = useMemo<AdminDataContextType>(
    () => ({
      users,
      units,
      loadingUnits,
      reservations,
      payments,
      ledgers,
      auditLogs,
      messages,
      notifications,
      businessSlots,
      contentSettings,
      isLoadingMessages,

      addUnit,
      updateUnit,
      deleteUnit,
      uploadUnitImage,

      addReservation,
      updateReservation,
      deleteReservation,

      addPayment,
      updatePayment,
      uploadPaymentProof,
      issueRefund,

      addLedgerEntry,
      addAuditLog,

      createTicket,
      sendTicketMessage,
      markTicketResolved,
      reopenTicket,
      fetchMessagesByTicketId,
      getMessagesByTicketId,

      addNotification,
      markNotificationRead,
      markAllNotificationsRead,
      deleteNotification,

      addBusinessSlot,
      updateBusinessSlot,
      deleteBusinessSlot,

      updateContentSettings,

      getUnitById,
      getReservationsByUserId,
      getPaymentsByUserId,
      getLedgerByUserId,
      getNotificationsByUserId,
      getUserById,
    }),
    [
      users,
      units,
      loadingUnits,
      reservations,
      payments,
      ledgers,
      auditLogs,
      messages,
      notifications,
      businessSlots,
      contentSettings,
      isLoadingMessages,
      addUnit,
      updateUnit,
      deleteUnit,
      uploadUnitImage,
      addReservation,
      updateReservation,
      deleteReservation,
      addPayment,
      updatePayment,
      uploadPaymentProof,
      issueRefund,
      addLedgerEntry,
      addAuditLog,
      createTicket,
      sendTicketMessage,
      markTicketResolved,
      reopenTicket,
      fetchMessagesByTicketId,
      getMessagesByTicketId,
      addNotification,
      markNotificationRead,
      markAllNotificationsRead,
      deleteNotification,
      addBusinessSlot,
      updateBusinessSlot,
      deleteBusinessSlot,
      updateContentSettings,
      getUnitById,
      getReservationsByUserId,
      getPaymentsByUserId,
      getLedgerByUserId,
      getNotificationsByUserId,
      getUserById,
    ]
  );

  return (
    <AdminDataContext.Provider value={value}>
      {children}
    </AdminDataContext.Provider>
  );
}

export function useAdminData() {
  const context = useContext(AdminDataContext);

  if (!context) {
    throw new Error('useAdminData must be used within AdminDataProvider');
  }

  return context;
}