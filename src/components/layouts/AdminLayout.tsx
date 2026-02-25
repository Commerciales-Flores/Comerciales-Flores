import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LogoutConfirmModal from "../LogoutConfirmModal";
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
  Building2,
  ClipboardClock,
  Menu,
  X
} from 'lucide-react';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();
  const navRef = useRef<HTMLDivElement>(null);
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    navigate("/");
  };

  useEffect(() => {
    const updateUnderline = () => {
      const activeLink = navRef.current?.querySelector<HTMLAnchorElement>(
        'a[data-active="true"]'
      );
      if (activeLink) {
        setUnderlineStyle({
          left: activeLink.offsetLeft,
          width: activeLink.offsetWidth,
        });
      }
    };

    updateUnderline();
    window.addEventListener("resize", updateUnderline);
    return () => window.removeEventListener("resize", updateUnderline);
  }, [location.pathname]);

  const navItems = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/customers', icon: Users, label: 'Customers' },
    { to: '/admin/audit', icon: ClipboardClock, label: 'Audit Log' },
    { to: '/admin/business-slots', icon: CalendarDays, label: 'Business Slots' },
    { to: '/admin/reservations', icon: Calendar, label: 'Reservations' },
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
      user?.name || "User"
    )}&background=0D8ABC&color=fff&size=128`;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* HEADER */}
      <header className="bg-gradient-to-r from-blue-700 to-blue-900 text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">

          <div className="flex items-center gap-3">
            <Building2 className="size-8" />
            <div>
              <h1>Commerciales Flores</h1>
              <p className="text-sm text-blue-200">Admin Portal</p>
            </div>
          </div>

          {/* DESKTOP NAV + AVATAR */}
          <div className="hidden md:flex items-center gap-4">
            <span>Welcome, {user?.name}</span>

            <NavLink to="/admin/profile" className="flex items-center">
              <img
                src={avatarUrl}
                alt={user?.name || "Admin avatar"}
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.onerror = null;
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    user?.name || "Admin"
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

          {/* MOBILE HAMBURGER */}
          <button
            className="md:hidden flex items-center p-2 rounded-md hover:bg-blue-800 transition-colors"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open mobile menu"
          >
            <Menu className="size-6" />
          </button>
        </div>
      </header>

      {/* DESKTOP NAVBAR */}
      <nav className="hidden md:block bg-white border-b border-gray-200 shadow-sm relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={navRef}
          className="flex justify-center gap-1.5 px-1 relative"
        >
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-active={location.pathname === item.to ? "true" : undefined}
              className="flex items-center gap-2 px-4 py-3 whitespace-nowrap text-gray-600 hover:text-gray-900 relative"
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}

          {/* Sliding underline */}
          <span
            className="absolute bottom-0 h-0.5 bg-blue-600 transition-all duration-300"
            style={{
              left: underlineStyle.left,
              width: underlineStyle.width,
            }}
          />
        </div>
      </div>
    </nav>

      {/* MOBILE SLIDE-OUT MENU */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileNavOpen(false)}
          />

          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-lg flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <span className="font-bold">Menu</span>
              <button onClick={() => setMobileNavOpen(false)}>
                <X className="size-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileNavOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 border-l-4 transition-colors ${
                      isActive
                        ? 'border-blue-600 text-blue-600 bg-blue-50'
                        : 'border-transparent text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <item.icon className="size-5" />
                  {item.label}
                </NavLink>
              ))}
            </div>

            <div className="p-4 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <LogOut className="size-4" /> Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      {showLogoutConfirm && (
        <LogoutConfirmModal
          onConfirm={confirmLogout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}
    </div>
  );
}