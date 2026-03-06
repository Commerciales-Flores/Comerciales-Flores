import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useData } from "../../contexts/DataContext";
import {
  LayoutDashboard,
  Building2,
  Calendar,
  CreditCard,
  Bell,
  User,
  LogOut,
  MessageCircle,
} from "lucide-react";
import { useState } from "react";
import ContactSupportModal from "../ContactSupportModal";

export default function ClientLayout() {
  const { user, logout } = useAuth();
  const { getNotificationsByUserId } = useData();
  const navigate = useNavigate();
  const [showSupport, setShowSupport] = useState(false);

  // ✅ FIX: Get all user notifications first
  const userNotifications = getNotificationsByUserId(user?.id || "");

  // ✅ FIX: Calculate separate counts for the Bell and the Messages tab
  const totalUnreadCount = userNotifications.filter((n) => !n.read).length;
  const unreadInquiryCount = userNotifications.filter((n) => !n.read && n.type === 'inquiry').length;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const navItems = [
    {
      to: "/client/dashboard",
      icon: LayoutDashboard,
      label: "Dashboard",
    },
    {
      to: "/client/properties",
      icon: Building2,
      label: "Properties",
    },
    {
      to: "/client/reservations",
      icon: Calendar,
      label: "Reservations",
    },
    {
      to: "/client/payments",
      icon: CreditCard,
      label: "Payments",
    },
    {
      to: "/client/notifications",
      icon: Bell,
      label: "Notifications",
      badge: totalUnreadCount, // ✅ Uses overall count
    },
    {
      to: "/client/messages",
      icon: MessageCircle,
      label: "Messages",
      badge: unreadInquiryCount, // ✅ ONLY counts unread admin replies!
    },
    { to: "/client/profile", icon: User, label: "Profile" },
  ];

  // ✅ FIX: Replaced user?.lastName with the correct Supabase properties (first_name / last_name)
  const avatarUrl =
    (user as any)?.avatarUrl ||
    (user as any)?.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      user?.firstName || user?.lastName || "User"
    )}&background=0D8ABC&color=fff&size=128`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Building2 className="size-8 text-blue-600" />
              <div>
                <h1 className="text-blue-600 font-bold text-lg leading-tight">Commerciales Flores</h1>
                <p className="text-xs text-gray-500 font-medium tracking-wide uppercase">Client Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* ✅ FIX: Correctly displays the first name */}
              <span className="text-gray-700 font-medium hidden sm:inline-block">
                Welcome, {user?.firstName || 'Client'}
              </span>

              <NavLink
                to="/client/profile"
                aria-label="Open profile"
                className="flex items-center"
              >
                <img
                  src={avatarUrl}
                  alt={user?.firstName || "User avatar"}
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.onerror = null;
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      user?.firstName || "User"
                    )}&background=0D8ABC&color=fff&size=128`;
                  }}
                  className="w-9 h-9 rounded-full object-cover border-2 border-gray-200 shadow-sm hover:border-blue-500 transition-colors"
                />
              </NavLink>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
              >
                <LogOut className="size-4" />
                <span className="hidden sm:inline-block">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-3.5 border-b-2 transition-colors whitespace-nowrap relative font-medium text-sm ${
                    isActive
                      ? "border-blue-600 text-blue-700"
                      : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
                  }`
                }
              >
                <item.icon className="size-4.5" />
                {item.label}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm ring-2 ring-white">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Floating Support Button */}
      <button
        onClick={() => setShowSupport(true)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-xl hover:bg-blue-700 hover:scale-105 transition-all z-50 focus:ring-4 focus:ring-blue-200"
        aria-label="Contact Support"
      >
        <MessageCircle className="size-6" />
      </button>

      {/* Support Modal */}
      {showSupport && <ContactSupportModal onClose={() => setShowSupport(false)} />}
    </div>
  );
}