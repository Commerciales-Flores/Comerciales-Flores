import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from "../../contexts/DataContext";
import { 
  LayoutDashboard, 
  Users, 
  CalendarDays, 
  Calendar, 
  CreditCard, 
  MessageSquare, 
  FileText, 
  BarChart3, 
  User, 
  LogOut,
  Building2
} from 'lucide-react';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/customers', icon: Users, label: 'Customers' },
    { to: '/admin/business-slots', icon: CalendarDays, label: 'Business Slots' },
    { to: '/admin/bookings', icon: Calendar, label: 'Reservations' },
    { to: '/admin/payments', icon: CreditCard, label: 'Payments' },
    { to: '/admin/inquiries', icon: MessageSquare, label: 'Inquiries' },
    { to: '/admin/content', icon: FileText, label: 'Content' },
    { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/admin/profile', icon: User, label: 'Profile' },
  ];

  const avatarUrl =
    (user as any)?.avatarUrl ||
    (user as any)?.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      user?.name || "User",
    )}&background=0D8ABC&color=fff&size=128`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-700 to-blue-900 text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Building2 className="size-8" />
              <div>
                <h1>Commerciales Flores</h1>
                <p className="text-sm text-blue-200">Admin Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span>Welcome, {user?.name}</span>

              <NavLink
                to="/admin/profile"
                aria-label="Open profile"
                className="flex items-center"
              >
                <img
                  src={avatarUrl}
                  alt={user?.name || "Admin avatar"}
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.onerror = null;
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      user?.name || "Admin",
                    )}&background=0D8ABC&color=fff&size=128`;
                  }}
                  className="w-8 h-8 rounded-full object-cover border border-gray-200 shadow-sm"
                />
              </NavLink>


              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-blue-800 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <LogOut className="size-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`
                }
              >
                <item.icon className="size-4" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
