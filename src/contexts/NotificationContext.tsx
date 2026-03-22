import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
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

  sendReservationNotification: (params: {
    userId: string;
    reservationPublicId: string;
    action: 'approved' | 'rejected';
  }) => Promise<void>;

  sendPaymentNotification: (params: {
    userId: string;
    paymentPublicId: string;
    amount: number;
  }) => Promise<void>;

  sendInquiryResponseNotification: (params: {
    userId: string;
    subject: string;
  }) => Promise<void>;

  sendReviewReminderNotification: (params: {
    userId: string;
    unitName: string;
  }) => Promise<void>;

  sendSystemNotification: (
    userId: string,
    title: string,
    message: string
  ) => Promise<void>;

  sendDeletionStatusNotification: (params: {
    userId: string;
    status: 'approved' | 'rejected';
  }) => Promise<void>;
}

const NotificationContext = createContext<NotificationsDataContextType | undefined>(
  undefined
);

function mapNotificationRow(row: any): Notification {
  return {
    id: row.notification_id,
    userId: row.user_id,
    title: row.title,
    message: row.message,
    type: row.type,
    read: row.is_read,
    date: row.date,
  };
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('notification_id, user_id, title, message, type, is_read, date')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      return;
    }

    setNotifications((data ?? []).map(mapNotificationRow));
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('notification_id, user_id, title, message, type, is_read, date')
        .order('date', { ascending: false });

      if (!mounted) return;

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      setNotifications((data ?? []).map(mapNotificationRow));
    };

    loadNotifications();

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications]);

  const addNotification = useCallback(
    async (
      notification: Omit<Notification, 'id' | 'date' | 'read'>
    ): Promise<void> => {
      const payload = {
        user_id: notification.userId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        is_read: false,
        date: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('notifications')
        .insert([payload])
        .select('notification_id, user_id, title, message, type, is_read, date')
        .single();

      if (error) {
        console.error('Error inserting notification:', error);
        return;
      }

      const newNotification = mapNotificationRow(data);

      setNotifications((prev) => {
        if (prev.some((item) => item.id === newNotification.id)) {
          return prev;
        }
        return [newNotification, ...prev];
      });
    },
    []
  );

  const markNotificationRead = useCallback(
    async (id: string): Promise<void> => {
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id ? { ...notification, read: true } : notification
        )
      );

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('notification_id', id);

      if (error) {
        console.error('Error marking notification as read:', error);
        fetchNotifications();
      }
    },
    [fetchNotifications]
  );

  const markAllNotificationsRead = useCallback(
    async (userId: string): Promise<void> => {
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.userId === userId
            ? { ...notification, read: true }
            : notification
        )
      );

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        fetchNotifications();
      }
    },
    [fetchNotifications]
  );

  const deleteNotification = useCallback(
    async (id: string): Promise<void> => {
      const previousNotifications = notifications;

      setNotifications((prev) => prev.filter((notification) => notification.id !== id));

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('notification_id', id);

      if (error) {
        console.error('Error deleting notification:', error);
        setNotifications(previousNotifications);
      }
    },
    [notifications]
  );

  const getNotificationsByUserId = useCallback(
    (userId: string) => notifications.filter((notification) => notification.userId === userId),
    [notifications]
  );

  const sendReservationNotification = useCallback(
    async ({
      userId,
      reservationPublicId,
      action,
    }: {
      userId: string;
      reservationPublicId: string;
      action: 'approved' | 'rejected';
    }): Promise<void> => {
      await addNotification({
        userId,
        title:
          action === 'approved'
            ? 'Reservation Approved'
            : 'Reservation Rejected',
        message:
          action === 'approved'
            ? `Your reservation ${reservationPublicId} has been approved.`
            : `Your reservation ${reservationPublicId} has been rejected.`,
        type: 'reservation',
      });
    },
    [addNotification]
  );

  const sendPaymentNotification = useCallback(
    async ({
      userId,
      paymentPublicId,
      amount,
    }: {
      userId: string;
      paymentPublicId: string;
      amount: number;
    }): Promise<void> => {
      await addNotification({
        userId,
        title: 'Payment Verified',
        message: `Your payment ${paymentPublicId} amounting to ₱${amount.toLocaleString()} has been verified.`,
        type: 'payment',
      });
    },
    [addNotification]
  );

  const sendInquiryResponseNotification = useCallback(
    async ({
      userId,
      subject,
    }: {
      userId: string;
      subject: string;
    }): Promise<void> => {
      await addNotification({
        userId,
        title: 'Inquiry Response',
        message: `Your inquiry "${subject}" has received a response.`,
        type: 'inquiry',
      });
    },
    [addNotification]
  );

  const sendReviewReminderNotification = useCallback(
    async ({
      userId,
      unitName,
    }: {
      userId: string;
      unitName: string;
    }): Promise<void> => {
      await addNotification({
        userId,
        title: 'Leave a Review',
        message: `Your reservation is complete. Share your experience for ${unitName}.`,
        type: 'review',
      });
    },
    [addNotification]
  );

  const sendSystemNotification = useCallback(
    async (userId: string, title: string, message: string): Promise<void> => {
      await addNotification({
        userId,
        title,
        message,
        type: 'system',
      });
    },
    [addNotification]
  );

  const sendDeletionStatusNotification = useCallback(
  async ({
    userId,
    status,
  }: {
    userId: string;
    status: 'approved' | 'rejected';
  }) => {
    await addNotification({
      userId,
      title:
        status === 'approved'
          ? 'Account Deletion Approved'
          : 'Account Deletion Rejected',
      message:
        status === 'approved'
          ? 'Your account deletion request has been approved. Your account will be permanently removed.'
          : 'Your account deletion request has been rejected. Please contact support for more details.',
      type: 'system',
    });
  },
  [addNotification]
);

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
      sendReviewReminderNotification,
      sendSystemNotification,
      sendDeletionStatusNotification,
    }),
    [
      notifications,
      addNotification,
      markNotificationRead,
      markAllNotificationsRead,
      deleteNotification,
      getNotificationsByUserId,
      sendReservationNotification,
      sendPaymentNotification,
      sendInquiryResponseNotification,
      sendReviewReminderNotification,
      sendSystemNotification,
      sendDeletionStatusNotification,
    ]
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