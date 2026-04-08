import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';

import type {
  Notification,
  Payment,
  Reservation,
  Unit,
} from '../data/types';

import {
  useInquiries,
  type SupportMessage,
  type SupportSenderType,
  type SupportTicket,
} from './InquiriesContext';
import { useNotifications } from './NotificationContext';
import { usePayments } from './PaymentsContext';
import { useReservations } from './ReservationsContext';
import { useUnits } from './UnitsContext';

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

interface ClientDataContextType {
  units: Unit[];
  loadingUnits: boolean;
  reservations: Reservation[];
  payments: Payment[];
  messages: SupportMessage[];
  notifications: Notification[];
  isLoadingMessages: boolean;

  getUnitById: (id: string) => Unit | undefined;

  addReservation: (
    reservation: Omit<Reservation, 'id' | 'requestDate' | 'status' | 'paidAmount'>
  ) => Promise<string>;
  updateReservation: (id: string, reservation: Partial<Reservation>) => Promise<void>;

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

  getReservationsByUserId: (userId: string) => Reservation[];
  getPaymentsByUserId: (userId: string) => Payment[];
  getNotificationsByUserId: (userId: string) => Notification[];
}

const ClientDataContext = createContext<ClientDataContextType | undefined>(undefined);

export function ClientDataProvider({ children }: { children: ReactNode }) {
  const {
    units,
    loadingUnits,
    getUnitById,
  } = useUnits();

  const {
    reservations,
    addReservation,
    updateReservation,
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

  const value = useMemo<ClientDataContextType>(
    () => ({
      units,
      loadingUnits,
      reservations,
      payments,
      messages,
      notifications,
      isLoadingMessages,

      getUnitById,

      addReservation,
      updateReservation,

      addPayment,
      updatePayment,
      uploadPaymentProof,
      issueRefund,

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

      getReservationsByUserId,
      getPaymentsByUserId,
      getNotificationsByUserId,
    }),
    [
      units,
      loadingUnits,
      reservations,
      payments,
      messages,
      notifications,
      isLoadingMessages,
      getUnitById,
      addReservation,
      updateReservation,
      addPayment,
      updatePayment,
      uploadPaymentProof,
      issueRefund,
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
      getReservationsByUserId,
      getPaymentsByUserId,
      getNotificationsByUserId,
    ]
  );

  return (
    <ClientDataContext.Provider value={value}>
      {children}
    </ClientDataContext.Provider>
  );
}

export function useClientData() {
  const context = useContext(ClientDataContext);

  if (!context) {
    throw new Error('useClientData must be used within ClientDataProvider');
  }

  return context;
}