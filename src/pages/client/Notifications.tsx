import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Bell, CheckCheck, Calendar, CreditCard, MessageSquare, AlertCircle } from 'lucide-react';

export default function ClientNotifications() {
  const { user } = useAuth();
  const { getNotificationsByUserId, markNotificationRead, markAllNotificationsRead } = useData();

  const notifications = getNotificationsByUserId(user?.id || '');
  const sortedNotifications = [...notifications].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  const typeIcons = {
    booking: Calendar,
    payment: CreditCard,
    inquiry: MessageSquare,
    system: AlertCircle
  };

  const typeColors = {
    booking: 'text-blue-600 bg-blue-100',
    payment: 'text-green-600 bg-green-100',
    inquiry: 'text-purple-600 bg-purple-100',
    system: 'text-gray-600 bg-gray-100'
  };

  const handleMarkRead = (id: string) => {
    markNotificationRead(id);
  };

  const handleMarkAllRead = () => {
    if (user) {
      markAllNotificationsRead(user.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="mb-2">Notifications</h1>
          <p className="text-gray-600">
            {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <CheckCheck className="size-4" />
            Mark all as read
          </button>
        )}
      </div>

      {sortedNotifications.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Bell className="size-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-gray-600 mb-2">No notifications</h3>
          <p className="text-sm text-gray-500">
            You'll be notified here about booking updates and payments
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedNotifications.map((notification) => {
            const Icon = typeIcons[notification.type];
            const colorClass = typeColors[notification.type];

            return (
              <div
                key={notification.id}
                onClick={() => !notification.read && handleMarkRead(notification.id)}
                className={`bg-white border rounded-lg p-4 cursor-pointer transition-all ${
                  notification.read
                    ? 'border-gray-200 opacity-75'
                    : 'border-blue-300 shadow-sm hover:shadow-md'
                }`}
              >
                <div className="flex gap-4">
                  <div className={`p-3 rounded-lg ${colorClass} flex-shrink-0`}>
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-gray-900">
                        {notification.title}
                        {!notification.read && (
                          <span className="ml-2 inline-block size-2 bg-blue-600 rounded-full" />
                        )}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {new Date(notification.date).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{notification.message}</p>
                    <div className="mt-2">
                      <span className="text-xs text-gray-500 capitalize">
                        {notification.type} notification
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
