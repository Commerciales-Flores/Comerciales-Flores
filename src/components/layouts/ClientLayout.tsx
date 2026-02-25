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

  const unreadCount = getNotificationsByUserId(
    user?.id || "",
  ).filter((n) => !n.read).length;

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
      badge: unreadCount,
    },
    {
      to: "/client/messages",
      icon: MessageCircle,
      label: "Messages",
      badge: unreadCount,
    },
    { to: "/client/profile", icon: User, label: "Profile" },
  ];

  // Build an avatar URL fallback (uses provided avatar, photoURL, or ui-avatars)
  /*

    Name is currently just Last Name must fix in the future
  */
  const avatarUrl =
    (user as any)?.avatarUrl ||
    (user as any)?.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      // Here
      user?.lastName || "User",
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
                <h1 className="text-blue-600">Commerciales Flores</h1>
                <p className="text-sm text-gray-500">Client Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Here */}
              <span className="text-gray-700">Welcome, {user?.lastName}</span>

              <NavLink
                to="/client/profile"
                aria-label="Open profile"
                className="flex items-center"
              >
                <img
                  src={avatarUrl}
                  // Here
                  alt={user?.lastName || "User avatar"}
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.onerror = null;
                    // Here
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      user?.lastName || "User",
                    )}&background=0D8ABC&color=fff&size=128`;
                  }}
                  className="w-8 h-8 rounded-full object-cover border border-gray-200 shadow-sm"
                />
              </NavLink>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="size-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap relative ${
                    isActive
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                  }`
                }
              >
                <item.icon className="size-4" />
                {item.label}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full size-5 flex items-center justify-center">
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
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
        aria-label="Contact Support"
      >
        <MessageCircle className="size-6" />
      </button>

      {/* Support Modal */}
      {showSupport && <ContactSupportModal onClose={() => setShowSupport(false)} />}
    </div>
  );
}