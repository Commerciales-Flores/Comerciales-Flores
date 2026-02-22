import { Link, useLocation } from 'react-router-dom';
import { Building2, Bell, User, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useState } from 'react';
import NotificationDropdown from './NotificationDropdown';

export default function Header() {
  const { user, logout } = useAuth();
  const { notifications } = useData();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter(n => n.userId === user?.id && !n.read).length;
  const isClient = user?.role === 'client';
  const basePath = isClient ? '/client' : '/admin';

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to={basePath} className="flex items-center gap-2">
              <Building2 className="w-8 h-8 text-blue-600" />
              <span className="font-semibold text-gray-900">Commerciales Flores</span>
            </Link>
            
            {isClient ? (
              <nav className="hidden md:flex items-center gap-6">
                <Link
                  to="/client"
                  className={`text-gray-700 hover:text-gray-900 transition-colors ${
                    location.pathname === '/client' ? 'font-semibold' : ''
                  }`}
                >
                  Browse Spaces
                </Link>
                <Link
                  to="/client/bookings"
                  className={`text-gray-700 hover:text-gray-900 transition-colors ${
                    location.pathname === '/client/bookings' ? 'font-semibold' : ''
                  }`}
                >
                  My Bookings
                </Link>
                <Link
                  to="/client/payments"
                  className={`text-gray-700 hover:text-gray-900 transition-colors ${
                    location.pathname === '/client/payments' ? 'font-semibold' : ''
                  }`}
                >
                  Payments
                </Link>
                <Link
                  to="/client/contact"
                  className={`text-gray-700 hover:text-gray-900 transition-colors ${
                    location.pathname === '/client/contact' ? 'font-semibold' : ''
                  }`}
                >
                  Contact
                </Link>
              </nav>
            ) : (
              <nav className="hidden md:flex items-center gap-6">
                <Link
                  to="/admin"
                  className={`text-gray-700 hover:text-gray-900 transition-colors ${
                    location.pathname === '/admin' ? 'font-semibold' : ''
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/admin/spaces"
                  className={`text-gray-700 hover:text-gray-900 transition-colors ${
                    location.pathname === '/admin/spaces' ? 'font-semibold' : ''
                  }`}
                >
                  Spaces
                </Link>
                <Link
                  to="/admin/bookings"
                  className={`text-gray-700 hover:text-gray-900 transition-colors ${
                    location.pathname === '/admin/bookings' ? 'font-semibold' : ''
                  }`}
                >
                  Bookings
                </Link>
                <Link
                  to="/admin/customers"
                  className={`text-gray-700 hover:text-gray-900 transition-colors ${
                    location.pathname === '/admin/customers' ? 'font-semibold' : ''
                  }`}
                >
                  Customers
                </Link>
              </nav>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
              {showNotifications && (
                <NotificationDropdown onClose={() => setShowNotifications(false)} />
              )}
            </div>
            
            <Link
              to="/profile"
              className="flex items-center gap-2 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <User className="w-5 h-5" />
              <span className="hidden md:inline">{user?.name}</span>
            </Link>

            <button
              onClick={logout}
              className="flex items-center gap-2 p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
