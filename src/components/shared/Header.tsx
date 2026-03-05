import { Link, useLocation } from 'react-router-dom';
import { Building2, Bell, LogOut } from 'lucide-react'; 
import { useAuth } from '../../contexts/AuthContext'; 
import { useData } from '../../contexts/DataContext';
import { useState } from 'react';
import NotificationDropdown from './NotificationDropdown';

export default function Header() {
  const { user, logout } = useAuth();
  const { notifications } = useData();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications?.filter((n: any) => n.userId === user?.id && !n.read).length || 0;
  
  const isClient = user?.role === 'client';
  const basePath = isClient ? '/client' : '/admin';

  const fullName = user ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User';

  // ✅ FIX: Extract the actual URL (if it exists) from any possible state it might be saved in
  const activeImageUrl = 
      (user as any)?.profilePictureUrl || 
      (user as any)?.profile_picture_url || 
      (user as any)?.avatarUrl || 
      null;

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
                  className={`text-gray-700 hover:text-blue-600 transition-colors ${
                    location.pathname === '/client' ? 'font-semibold text-blue-600' : ''
                  }`}
                >
                  Browse Spaces
                </Link>
                <Link
                  to="/client/bookings"
                  className={`text-gray-700 hover:text-blue-600 transition-colors ${
                    location.pathname === '/client/bookings' ? 'font-semibold text-blue-600' : ''
                  }`}
                >
                  My Bookings
                </Link>
                <Link
                  to="/client/payments"
                  className={`text-gray-700 hover:text-blue-600 transition-colors ${
                    location.pathname === '/client/payments' ? 'font-semibold text-blue-600' : ''
                  }`}
                >
                  Payments
                </Link>
                <Link
                  to="/client/contact"
                  className={`text-gray-700 hover:text-blue-600 transition-colors ${
                    location.pathname === '/client/contact' ? 'font-semibold text-blue-600' : ''
                  }`}
                >
                  Contact
                </Link>
              </nav>
            ) : (
              <nav className="hidden md:flex items-center gap-6">
                <Link
                  to="/admin"
                  className={`text-gray-700 hover:text-blue-600 transition-colors ${
                    location.pathname === '/admin' ? 'font-semibold text-blue-600' : ''
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/admin/spaces"
                  className={`text-gray-700 hover:text-blue-600 transition-colors ${
                    location.pathname === '/admin/spaces' ? 'font-semibold text-blue-600' : ''
                  }`}
                >
                  Spaces
                </Link>
                <Link
                  to="/admin/bookings"
                  className={`text-gray-700 hover:text-blue-600 transition-colors ${
                    location.pathname === '/admin/bookings' ? 'font-semibold text-blue-600' : ''
                  }`}
                >
                  Bookings
                </Link>
                <Link
                  to="/admin/payments"
                  className={`text-gray-700 hover:text-blue-600 transition-colors flex items-center gap-1 ${
                    location.pathname === '/admin/payments' ? 'font-semibold text-blue-600' : ''
                  }`}
                >
                  Payments
                </Link>
                <Link
                  to="/admin/customers"
                  className={`text-gray-700 hover:text-blue-600 transition-colors ${
                    location.pathname === '/admin/customers' ? 'font-semibold text-blue-600' : ''
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
                className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="View notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
                )}
              </button>
              {showNotifications && (
                <NotificationDropdown onClose={() => setShowNotifications(false)} />
              )}
            </div>
            
            <Link
              to="/profile"
              className="flex items-center gap-2 p-1.5 pr-3 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-full md:rounded-lg transition-colors"
            >
              {/* ✅ FIX: We actually use the variable now! */}
              {activeImageUrl ? (
                <img 
                  src={activeImageUrl} 
                  alt={fullName} 
                  className="w-7 h-7 rounded-full object-cover border border-gray-200 bg-white"
                />
              ) : (
                <img 
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8ABC&color=fff&size=128`} 
                  alt={fullName} 
                  className="w-7 h-7 rounded-full object-cover border border-gray-200 bg-white"
                />
              )}
              <span className="hidden md:inline text-sm font-medium">{fullName}</span>
            </Link>

            <div className="w-px h-6 bg-gray-200 hidden md:block"></div>

            <button
              onClick={logout}
              className="flex items-center gap-2 p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden md:inline text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}