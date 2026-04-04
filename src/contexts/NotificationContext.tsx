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
import { formatDate } from '../utils/date';
import { formatCurrency } from '../utils/currency';


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
    action: 'approved' | 'rejected' | 'completed'
  }) => Promise<void>;

  sendPaymentNotification: (params: {
    userId: string;
    paymentPublicId: string;
    amount: number;
  }) => Promise<void>;


  sendRefundNotification: (params: {
  userId: string;
  reservationPublicId?: string;
  paymentPublicId?: string;
  amount: number;
  notes?: string | null;
}) => Promise<void>;
  
sendPaymentReminderNotification: (params: {
  userId: string;
  reservationPublicId: string;
  remainingBalance: number;
  endDate: string;
}) => Promise<void>;

  sendOverdueReservationNotification: (params: {
    userId: string;
    reservationPublicId: string;
    remainingBalance: number;
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
  sendVisitNotification: (params: {
  userId: string;
  reservationPublicId: string;
  action: 'confirmed' | 'reschedule_requested' | 'declined';
  confirmedVisitDate?: string | null;
  confirmedVisitTime?: string | null;
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

  const sortNotificationsByDateDesc = useCallback((items: Notification[]) => {
    return [...items].sort(
      (a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()
    );
  }, []);

  const fetchNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('notification_id, user_id, title, message, type, is_read, date')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      return;
    }

    setNotifications(sortNotificationsByDateDesc((data ?? []).map(mapNotificationRow)));
  }, [sortNotificationsByDateDesc]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('notification_id, user_id, title, message, type, is_read, date')
        .order('date', { ascending: false });

      if (!mounted) return;

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      setNotifications(sortNotificationsByDateDesc((data ?? []).map(mapNotificationRow)));
    };

    void load();

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          if (!mounted) return;

          if (payload.eventType === 'INSERT') {
            const newNotification = mapNotificationRow(payload.new);

            setNotifications((prev) => {
              if (prev.some((item) => item.id === newNotification.id)) {
                return prev;
              }

              return sortNotificationsByDateDesc([newNotification, ...prev]);
            });

            return;
          }

          if (payload.eventType === 'UPDATE') {
            const updatedNotification = mapNotificationRow(payload.new);

            setNotifications((prev) =>
              sortNotificationsByDateDesc(
                prev.map((item) =>
                  item.id === updatedNotification.id ? updatedNotification : item
                )
              )
            );

            return;
          }

          if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.notification_id as string | undefined;

            if (!deletedId) return;

            setNotifications((prev) =>
              prev.filter((item) => item.id !== deletedId)
            );
          }
        }
      )
      .subscribe((status) => {
        if (import.meta.env.DEV) {
          console.log('Notifications realtime status:', status);
        }
      });

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [sortNotificationsByDateDesc]);

  
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

      const { error } = await supabase
        .from('notifications')
        .insert([payload]);

      if (error) {
        console.error('Error inserting notification:', error);
      }
    },
    []
  );

  const sendRefundNotification = useCallback(
    async ({
      userId,
      reservationPublicId,
      paymentPublicId,
      amount,
      notes,
    }: {
      userId: string;
      reservationPublicId?: string;
      paymentPublicId?: string;
      amount: number;
      notes?: string | null;
    }): Promise<void> => {
      const targetLabel =
        paymentPublicId
          ? `payment ${paymentPublicId}`
          : reservationPublicId
            ? `reservation ${reservationPublicId}`
            : 'your reservation';

      await addNotification({
        userId,
        title: 'Refund Issued',
        message: `A refund of ${formatCurrency(amount)} has been successfully processed for ${targetLabel}${
          notes ? `. Reason: ${notes}` : '.'
        }`,
        type: 'payment',
      });
    },
    [addNotification]
  );

  const sendPaymentReminderNotification = useCallback(
    async ({
      userId,
      reservationPublicId,
      remainingBalance,
      endDate,
    }: {
      userId: string;
      reservationPublicId: string;
      remainingBalance: number;
      endDate: string;
    }): Promise<void> => {
      await addNotification({
        userId,
        title: 'Payment Reminder',
        message: `Your reservation ${reservationPublicId} will end on ${formatDate(
          endDate
        )} and still has an outstanding balance of ${formatCurrency(
          remainingBalance
        )}. Please settle your payment before the end date.`,
        type: 'payment',
      });
    },
    [addNotification]
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
        void fetchNotifications();
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
        void fetchNotifications();
      }
    },
    [fetchNotifications]
  );

  const deleteNotification = useCallback(
    async (id: string): Promise<void> => {
      let removedNotification: Notification | null = null;

      setNotifications((prev) => {
        removedNotification = prev.find((notification) => notification.id === id) ?? null;
        return prev.filter((notification) => notification.id !== id);
      });

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('notification_id', id);

      if (error) {
        console.error('Error deleting notification:', error);

        if (removedNotification) {
          setNotifications((prev) =>
            sortNotificationsByDateDesc([...prev, removedNotification as Notification])
          );
        }
      }
    },
    [sortNotificationsByDateDesc]
  );

  const getNotificationsByUserId = useCallback(
    (userId: string) =>
      notifications.filter((notification) => notification.userId === userId),
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
      action: 'approved' | 'rejected' | 'completed';
    }): Promise<void> => {
      await addNotification({
        userId,
        title:
          action === 'approved'
            ? 'Reservation Approved'
            : action === 'completed'
              ? 'Reservation Completed'
              : 'Reservation Rejected',
        message:
          action === 'approved'
            ? `Your reservation ${reservationPublicId} has been approved. You may proceed to payments.`
            : action === 'completed'
              ? `Your reservation ${reservationPublicId} has been completed. Thank you for choosing us.`
              : `Your reservation ${reservationPublicId} has been rejected.`,
        type: 'reservation',
      });
    },
    [addNotification]
  );

  const sendVisitNotification = useCallback(
    async ({
      userId,
      reservationPublicId,
      action,
      confirmedVisitDate,
      confirmedVisitTime,
    }: {
      userId: string;
      reservationPublicId: string;
      action: 'confirmed' | 'reschedule_requested' | 'declined';
      confirmedVisitDate?: string | null;
      confirmedVisitTime?: string | null;
    }): Promise<void> => {
      const confirmedSchedule = confirmedVisitDate
        ? `${formatDate(confirmedVisitDate)}${
            confirmedVisitTime ? ` • ${confirmedVisitTime}` : ''
          }`
        : null;

      await addNotification({
        userId,
        title:
          action === 'confirmed'
            ? 'Visit Confirmed'
            : action === 'reschedule_requested'
              ? 'Visit Reschedule Requested'
              : 'Visit Declined',
        message:
          action === 'confirmed'
            ? `Your onsite visit for reservation ${reservationPublicId} has been confirmed${
                confirmedSchedule ? ` on ${confirmedSchedule}` : '.'
              }`
            : action === 'reschedule_requested'
              ? `Your onsite visit for reservation ${reservationPublicId} needs to be rescheduled. Please wait for the updated schedule.`
              : `Your onsite visit for reservation ${reservationPublicId} has been declined.`,
        type: 'system',
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
        message: `Your payment ${paymentPublicId} amounting to ${formatCurrency(amount)} has been verified.`,
        type: 'payment',
      });
    },
    [addNotification]
  );

  const sendOverdueReservationNotification = useCallback(
    async ({
      userId,
      reservationPublicId,
      remainingBalance,
    }: {
      userId: string;
      reservationPublicId: string;
      remainingBalance: number;
    }): Promise<void> => {
      await addNotification({
        userId,
        title: 'Outstanding Balance Reminder',
        message: `Your reservation ${reservationPublicId} has already ended but still has an outstanding balance of ${formatCurrency(
          remainingBalance
        )}. Please settle your payment as soon as possible to avoid further actions.`,
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
      sendRefundNotification,
      sendPaymentReminderNotification,
      sendInquiryResponseNotification,
      sendReviewReminderNotification,
      sendOverdueReservationNotification,
      sendSystemNotification,
      sendVisitNotification,
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
      sendRefundNotification,
      sendPaymentReminderNotification,
      sendInquiryResponseNotification,
      sendReviewReminderNotification,
      sendOverdueReservationNotification,
      sendSystemNotification,
      sendVisitNotification,
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
    throw new Error(
      'useNotifications must be used within NotificationProvider'
    );
  }

  return context;
}