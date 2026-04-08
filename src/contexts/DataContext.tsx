import type { ReactNode } from 'react';

import { UsersProvider } from './UsersContext';
import { UnitsProvider } from './UnitsContext';
import { RecordsProvider } from './RecordsContext';
import { ReservationsProvider } from './ReservationsContext';
import { PaymentsProvider } from './PaymentsContext';
import { InquiriesProvider } from './InquiriesContext';
import { NotificationProvider } from './NotificationContext';
import { ContentSettingsProvider } from './ContentSettingsContext';

export type {
  UnitType,
  ReservationStatus,
  PaymentStatus,
  PaymentMethod,
  PaymentCycle,
  Unit,
  Reservation,
  Payment,
  LedgerEntry,
  AuditLog,
  User,
  Notification,
  BusinessSlot,
  ParkingSlot,
  ContentSettings,
} from '../data/types';

export function DataProvider({ children }: { children: ReactNode }) {
  return (
    <UsersProvider>
      <RecordsProvider>
        <UnitsProvider>
          <ReservationsProvider>
            <PaymentsProvider>
              <InquiriesProvider>
                <NotificationProvider>
                  <ContentSettingsProvider>{children}</ContentSettingsProvider>
                </NotificationProvider>
              </InquiriesProvider>
            </PaymentsProvider>
          </ReservationsProvider>
        </UnitsProvider>
      </RecordsProvider>
    </UsersProvider>
  );
}