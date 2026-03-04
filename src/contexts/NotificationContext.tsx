import { createContext, useContext, ReactNode } from 'react';
import { useData } from './DataContext';

interface NotificationContextType {
  sendBookingNotification: (userId: string, bookingId: string, status: 'approved' | 'rejected') => Promise<void>;
  sendPaymentNotification: (userId: string, paymentId: string, amount: number) => Promise<void>;
  sendInquiryResponseNotification: (userId: string, inquirySubject: string) => Promise<void>;
  sendSystemNotification: (userId: string, title: string, message: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { addNotification } = useData();

  const sendBookingNotification = async (userId: string, bookingId: string, status: 'approved' | 'rejected') => {
    const title = status === 'approved' ? 'Booking Approved' : 'Booking Rejected';
    const message = status === 'approved' 
      ? `Your booking #${bookingId.split('-')[0]} has been approved. You may now proceed with payment.`
      : `Your booking #${bookingId.split('-')[0]} has been rejected. Please contact support for more information.`;
    
    await addNotification({
      userId,
      title,
      message,
      type: 'booking'
    });
  };

  const sendPaymentNotification = async (userId: string, paymentId: string, amount: number) => {
    await addNotification({
      userId,
      title: 'Payment Confirmed',
      message: `Your payment of ₱${amount.toLocaleString()} has been confirmed. Payment ID: ${paymentId}`,
      type: 'payment'
    });
  };

  const sendInquiryResponseNotification = async (userId: string, inquirySubject: string) => {
    await addNotification({
      userId,
      title: 'Inquiry Response',
      message: `Admin has responded to your inquiry: "${inquirySubject}"`,
      type: 'inquiry'
    });
  };

  const sendSystemNotification = async (userId: string, title: string, message: string) => {
    await addNotification({
      userId,
      title,
      message,
      type: 'system'
    });
  };

  return (
    <NotificationContext.Provider
      value={{
        sendBookingNotification,
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