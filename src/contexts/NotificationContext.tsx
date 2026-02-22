import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useData } from './DataContext';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  sendReservationNotification: (userId: string, reservationId: string, status: 'approved' | 'rejected') => void;
  sendPaymentNotification: (userId: string, paymentId: string, amount: number) => void;
  sendInquiryResponseNotification: (userId: string, inquirySubject: string) => void;
  sendSystemNotification: (userId: string, title: string, message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { addNotification } = useData();

  const sendReservationNotification = (userId: string, reservationId: string, status: 'approved' | 'rejected') => {
    const title = status === 'approved' ? 'Reservation Approved' : 'Reservation Rejected';
    const message = status === 'approved' 
      ? `Your reservation #${reservationId} has been approved. You may now proceed with payment.`
      : `Your reservation #${reservationId} has been rejected. Please contact support for more information.`;
    
    addNotification({
      userId,
      title,
      message,
      type: 'reservation'
    });
  };

  const sendPaymentNotification = (userId: string, paymentId: string, amount: number) => {
    addNotification({
      userId,
      title: 'Payment Confirmed',
      message: `Your payment of ₱${amount.toLocaleString()} has been confirmed. Payment ID: ${paymentId}`,
      type: 'payment'
    });
  };

  const sendInquiryResponseNotification = (userId: string, inquirySubject: string) => {
    addNotification({
      userId,
      title: 'Inquiry Response',
      message: `Admin has responded to your inquiry: "${inquirySubject}"`,
      type: 'inquiry'
    });
  };

  const sendSystemNotification = (userId: string, title: string, message: string) => {
    addNotification({
      userId,
      title,
      message,
      type: 'system'
    });
  };

  return (
    <NotificationContext.Provider
      value={{
        sendReservationNotification,
        sendPaymentNotification,
        sendInquiryResponseNotification,
        sendSystemNotification
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
