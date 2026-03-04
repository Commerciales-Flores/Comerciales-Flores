import { useEffect, useRef } from 'react';
import { CheckCheck, Info, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
// ✅ FIX: Added the 'type' keyword before Notification
import { useData, type Notification } from '../../contexts/DataContext';
import { format } from 'date-fns';

interface NotificationDropdownProps {
  onClose: () => void;
}

export default function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const { user } = useAuth();
  // ✅ FIX: Matched the exact function names exported by DataContext
  const { notifications, markNotificationRead, markAllNotificationsRead } = useData();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userNotifications = (notifications || [])
    // ✅ FIX: Added specific Notification types to silence TS7006
    .filter((n: Notification) => n.userId === user?.id)
    // ✅ FIX: Changed 'createdAt' to 'date' to match the DataContext schema
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

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-hidden flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-gray-900 font-semibold">Notifications</h3>
        {/* ✅ FIX: Typed 'n' here as well */}
        {userNotifications.some((n: Notification) => !n.read) && (
          <button
            onClick={() => {
              if (user?.id) markAllNotificationsRead(user.id);
            }}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      <div className="overflow-y-auto flex-1">
        {userNotifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Info className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {/* ✅ FIX: Typed 'notification' here as well */}
            {userNotifications.map((notification: Notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
                onClick={() => {
                  if (!notification.read) {
                    markNotificationRead(notification.id);
                  }
                }}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`mb-1 ${!notification.read ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-600 mb-2 leading-snug">{notification.message}</p>
                    <p className="text-xs text-gray-500">
                      {/* ✅ FIX: Changed 'createdAt' to 'date' */}
                      {format(new Date(notification.date), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
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