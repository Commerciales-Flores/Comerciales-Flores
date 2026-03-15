import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { MOCK_PARKING_SLOTS } from '../data/constants';
import type {
  AuditLog,
  BusinessSlot,
  ContentSettings,
  Inquiry,
  LedgerEntry,
  Notification,
  ParkingSlot,
  Payment,
  Reservation,
  Unit,
  User,
} from '../data/types';

export type {
  UnitType,
  ReservationStatus,
  PaymentStatus,
  PaymentMethod,
  PaymentCycle,
  InquiryStatus,
  Unit,
  Reservation,
  Payment,
  LedgerEntry,
  AuditLog,
  User,
  Inquiry,
  Notification,
  BusinessSlot,
  ParkingSlot,
  ContentSettings,
} from '../data/types';

import { UsersProvider, useUsers } from './UsersContext';
import { UnitsProvider, useUnits } from './UnitsContext';
import { RecordsProvider, useRecords } from './RecordsContext';
import { ReservationsProvider, useReservations } from './ReservationsContext';
import { PaymentsProvider, usePayments } from './PaymentsContext';
import { InquiriesProvider, useInquiries } from './InquiriesContext';
import {
  NotificationProvider,
  useNotifications,
} from './NotificationContext';
import {
  ContentSettingsProvider,
  useContentSettings,
} from './ContentSettingsContext';

interface DataContextType {
  users: User[];
  units: Unit[];
  reservations: Reservation[];
  payments: Payment[];
  ledgers: LedgerEntry[];
  auditLogs: AuditLog[];
  inquiries: Inquiry[];
  notifications: Notification[];
  businessSlots: BusinessSlot[];
  contentSettings: ContentSettings;
  parkingSlots: ParkingSlot[];

  addUnit: (unit: Omit<Unit, 'id'>) => Promise<void>;
  updateUnit: (id: string, unit: Partial<Unit>) => Promise<void>;
  deleteUnit: (id: string) => Promise<void>;

  addReservation: (
    reservation: Omit<Reservation, 'id' | 'requestDate' | 'status' | 'paidAmount'>
  ) => Promise<string>;
  updateReservation: (id: string, reservation: Partial<Reservation>) => Promise<void>;
  deleteReservation: (id: string) => void;

  addPayment: (payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'date'>) => Promise<string>;
  updatePayment: (id: string, payment: Partial<Payment>) => Promise<void>;

  uploadPaymentProof: (file: File) => Promise<string | null>;
  uploadUnitImage: (file: File) => Promise<string | null>;

  addLedgerEntry: (entry: Omit<LedgerEntry, 'id'>) => Promise<string>;
  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => Promise<string>;

  addInquiry: (inquiry: Omit<Inquiry, 'id' | 'date' | 'status'>) => Promise<string>;
  updateInquiry: (id: string, inquiry: Partial<Inquiry>) => Promise<void>;

  addNotification: (notification: Omit<Notification, 'id' | 'date' | 'read'>) => Promise<void>;
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
  getNotificationsByUserId: (userId: string) => Notification[];
  getInquiriesByUserId: (userId: string) => Inquiry[];
  getUserById: (id: string) => User | undefined;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

function DataComposer({ children }: { children: ReactNode }) {
  const { users, getUserById } = useUsers();
  const {
    units,
    addUnit,
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
  } = usePayments();
  const { inquiries, addInquiry, updateInquiry, getInquiriesByUserId } =
    useInquiries();
  const {
    notifications,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    getNotificationsByUserId,
  } = useNotifications();
  const { contentSettings, updateContentSettings } = useContentSettings();

  const value = useMemo<DataContextType>(
    () => ({
      users,
      units,
      reservations,
      payments,
      ledgers,
      auditLogs,
      inquiries,
      notifications,
      businessSlots,
      contentSettings,
      parkingSlots: MOCK_PARKING_SLOTS,

      addUnit,
      updateUnit,
      deleteUnit,

      addReservation,
      updateReservation,
      deleteReservation,

      addPayment,
      updatePayment,

      uploadPaymentProof,
      uploadUnitImage,

      addLedgerEntry,
      addAuditLog,

      addInquiry,
      updateInquiry,

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
      getNotificationsByUserId,
      getInquiriesByUserId,
      getUserById,
    }),
    [
      users,
      units,
      reservations,
      payments,
      ledgers,
      auditLogs,
      inquiries,
      notifications,
      businessSlots,
      contentSettings,
      addUnit,
      updateUnit,
      deleteUnit,
      addReservation,
      updateReservation,
      deleteReservation,
      addPayment,
      updatePayment,
      uploadPaymentProof,
      uploadUnitImage,
      addLedgerEntry,
      addAuditLog,
      addInquiry,
      updateInquiry,
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
      getNotificationsByUserId,
      getInquiriesByUserId,
      getUserById,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function DataProvider({ children }: { children: ReactNode }) {
  return (
    <UsersProvider>
      <UnitsProvider>
        <RecordsProvider>
          <ReservationsProvider>
            <PaymentsProvider>
              <InquiriesProvider>
                <NotificationProvider>
                  <ContentSettingsProvider>
                    <DataComposer>{children}</DataComposer>
                  </ContentSettingsProvider>
                </NotificationProvider>
              </InquiriesProvider>
            </PaymentsProvider>
          </ReservationsProvider>
        </RecordsProvider>
      </UnitsProvider>
    </UsersProvider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}