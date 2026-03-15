import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import supabase from '../supabaseClient';
import type { Notification } from '../data/types';

interface NotificationsDataContextType {
  notifications: Notification[];
  addNotification: (
    notification: Omit<Notification, 'id' | 'date' | 'read'>
  ) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: (userId: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  getNotificationsByUserId: (userId: string) => Notification[];

  sendReservationNotification: (
    userId: string,
    reservationId: string,
    action: 'approved' | 'rejected'
  ) => Promise<void>;

  sendPaymentNotification: (
    userId: string,
    paymentId: string,
    amount: number
  ) => Promise<void>;

  sendInquiryResponseNotification: (
    userId: string,
    subject: string
  ) => Promise<void>;

  sendSystemNotification: (
    userId: string,
    title: string,
    message: string
  ) => Promise<void>;
}

const NotificationContext = createContext<NotificationsDataContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('notification_id, user_id, title, message, type, is_read, date')
        .order('date', { ascending: false });

      if (!error && data) {
        setNotifications(
          data.map((row: any) => ({
            id: row.notification_id,
            userId: row.user_id,
            title: row.title,
            message: row.message,
            type: row.type,
            read: row.is_read,
            date: row.date,
          }))
        );
      }
    };

    fetchNotifications();
  }, []);

  const addNotification = async (
    notification: Omit<Notification, 'id' | 'date' | 'read'>
  ): Promise<void> => {
    const { data, error } = await supabase
      .from('notifications')
      .insert([
        {
          user_id: notification.userId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          is_read: false,
          date: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error inserting notification:', error);
      return;
    }

    const newNotification: Notification = {
      id: data.notification_id,
      userId: data.user_id,
      title: data.title,
      message: data.message,
      type: data.type,
      read: data.is_read,
      date: data.date,
    };

    setNotifications((prev) => [newNotification, ...prev]);
  };

  const markNotificationRead = async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('notification_id', id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    }
  };

  const markAllNotificationsRead = async (userId: string): Promise<void> => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.userId === userId ? { ...n, read: true } : n))
      );
    }
  };

  const deleteNotification = async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('notification_id', id);

    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const getNotificationsByUserId = (userId: string) =>
    notifications.filter((n) => n.userId === userId);

  const sendReservationNotification = async (
    userId: string,
    reservationId: string,
    action: 'approved' | 'rejected'
  ): Promise<void> => {
    await addNotification({
      userId,
      title: action === 'approved' ? 'Reservation Approved' : 'Reservation Rejected',
      message:
        action === 'approved'
          ? `Your reservation (${reservationId}) has been approved.`
          : `Your reservation (${reservationId}) has been rejected.`,
      type: 'reservation',
    });
  };

  const sendPaymentNotification = async (
    userId: string,
    paymentId: string,
    amount: number
  ): Promise<void> => {
    await addNotification({
      userId,
      title: 'Payment Verified',
      message: `Your payment (${paymentId}) amounting to ${amount} has been verified.`,
      type: 'payment',
    });
  };

  const sendInquiryResponseNotification = async (
    userId: string,
    subject: string
  ): Promise<void> => {
    await addNotification({
      userId,
      title: 'Inquiry Response',
      message: `Your inquiry "${subject}" has received a response.`,
      type: 'inquiry',
    });
  };

  const sendSystemNotification = async (
    userId: string,
    title: string,
    message: string
  ): Promise<void> => {
    await addNotification({
      userId,
      title,
      message,
      type: 'system',
    });
  };

  const value = useMemo(
    () => ({
      notifications,
      addNotification,
      markNotificationRead,
      markAllNotificationsRead,
      deleteNotification,
      getNotificationsByUserId,
      sendReservationNotification,
      sendPaymentNotification,
      sendInquiryResponseNotification,
      sendSystemNotification,
    }),
    [notifications]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}