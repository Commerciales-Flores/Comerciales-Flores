import { useEffect, useRef } from 'react';
import { CheckCheck, Info, Calendar, CreditCard, MessageSquare, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useData, type Notification } from '../../contexts/DataContext';
import { format } from 'date-fns';

interface NotificationDropdownProps {
  onClose: () => void;
}

export default function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const { user } = useAuth();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useData();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userNotifications = (notifications || [])
    .filter((n: Notification) => n.userId === user?.id)
    .sort((a: Notification, b: Notification) => new Date(b.date).getTime() - new Date(a.date).getTime());

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // ✅ FIX: Synced the icons with the distinct types in your schema
  const getIcon = (type: string) => {
    switch (type) {
      case 'booking':
        return <Calendar className="w-5 h-5 text-blue-600" />;
      case 'payment':
        return <CreditCard className="w-5 h-5 text-green-600" />;
      case 'inquiry':
        return <MessageSquare className="w-5 h-5 text-purple-600" />;
      case 'system':
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 max-h-[32rem] overflow-hidden flex flex-col z-[100]"
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50/50">
        <h3 className="text-gray-900 font-bold">Notifications</h3>
        {userNotifications.some((n: Notification) => !n.read) && (
          <button
            onClick={() => {
              if (user?.id) markAllNotificationsRead(user.id);
            }}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold uppercase tracking-wider transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      <div className="overflow-y-auto flex-1">
        {userNotifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
               <Info className="w-6 h-6 text-gray-400" />
            </div>
            <p className="font-medium text-gray-600">No notifications yet</p>
            <p className="text-xs mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {userNotifications.map((notification: Notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors relative ${
                  !notification.read ? 'bg-blue-50/30' : ''
                }`}
                onClick={() => {
                  if (!notification.read) {
                    markNotificationRead(notification.id);
                  }
                }}
              >
                {!notification.read && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                )}
                
                <div className="flex gap-4">
                  <div className={`flex-shrink-0 mt-0.5 p-2 rounded-lg ${
                      notification.type === 'booking' ? 'bg-blue-100' :
                      notification.type === 'payment' ? 'bg-green-100' :
                      notification.type === 'inquiry' ? 'bg-purple-100' : 'bg-gray-100'
                  }`}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`mb-1 ${!notification.read ? 'text-gray-900 font-bold' : 'text-gray-700 font-medium'}`}>
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-600 mb-2 leading-snug">{notification.message}</p>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                      {format(new Date(notification.date), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="flex-shrink-0 mt-2">
                      <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}