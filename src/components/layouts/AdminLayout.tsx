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

  useEffect(() => {
  if (!user) return;

  // Mark the current page as the first internal page
  window.history.replaceState({ internal: true, dashboard: location.pathname === '/client/dashboard' }, '');

  const handlePopState = (event: PopStateEvent) => {
    const state = event.state as any;

    if (!state || !state.internal) {
      // User pressed back to leave the app → log them out
      logout();
      navigate('/', { replace: true });
    } else if (state.dashboard) {
      // Hard start: dashboard → prevent going back anywhere
      window.history.pushState({ internal: true, dashboard: true }, '');
    } else {
      // Internal navigation → browser handles back normally
      // Optional: push current state so multiple internal pages don't break
      window.history.replaceState({ internal: true }, '');
    }
  };

  window.addEventListener('popstate', handlePopState);

  return () => window.removeEventListener('popstate', handlePopState);
}, [user, logout, navigate, location.pathname]);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    setShowLogoutConfirm(false);
    navigate("/login", { replace: true });
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
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* HEADER */}
<header className="bg-blue-900 text-white sticky top-0 z-50 shadow-md border-b border-blue-800">
  <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 flex justify-between items-center h-14 sm:h-16 md:h-16">

    {/* Brand Identity */}
    <div className="flex items-center gap-3">
      <div className="bg-blue-800 p-2 rounded-lg">
        <Building2 className="size-6 text-blue-300" />
      </div>
      <div className="hidden sm:block max-w-[180px] md:max-w-none truncate">
        <h1 className="font-bold tracking-tight text-base md:text-lg leading-none truncate">Commerciales Flores</h1>
        <p className="text-[10px] uppercase font-bold text-blue-400 tracking-widest mt-1">Admin Portal</p>
      </div>
    </div>

    {/* DESKTOP NAV + AVATAR */}
    <div className="hidden lg:flex items-center gap-4 xl:gap-6">
      <div className="flex items-center gap-4 pr-6 border-r border-blue-800">
        <span className="text-sm font-medium text-blue-100">
          Welcome, <span className="text-white font-semibold">{user?.name}</span>
        </span>
        <NavLink 
          to="/admin/profile" 
          className="relative hover:ring-2 hover:ring-blue-400 rounded-full transition-all p-0.5"
        >
          <img
            src={avatarUrl}
            alt={user?.name || "Admin avatar"}
            className="w-9 h-9 rounded-full object-cover border border-blue-700 shadow-sm"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              target.onerror = null;
              target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                user?.name || "Admin"
              )}&background=3b82f6&color=fff&size=128`;
            }}
          />
          <span className="absolute bottom-0.5 right-0.5 size-2.5 bg-emerald-500 border-2 border-blue-900 rounded-full"></span>
        </NavLink>
      </div>

      <button
        onClick={handleLogout}
        className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm font-bold shadow-sm active:scale-95"
      >
        <LogOut className="size-4" />
        Logout
      </button>
    </div>

    {/* MOBILE HAMBURGER */}
    <button
      className="lg:hidden flex items-center p-2 rounded-lg bg-blue-800 hover:bg-blue-700 transition-colors border border-blue-700"
      onClick={() => setMobileNavOpen(true)}
      aria-label="Open mobile menu"
    >
      <Menu className="size-6 text-blue-100" />
    </button>
  </div>
</header>

      {/* DESKTOP NAVBAR */}
      <nav className="hidden lg:block bg-white border-b border-gray-200 shadow-sm relative">
        <div className="w-full overflow-x-auto scrollbar-hide">
          <div
            ref={navRef}
            className="max-w-7xl mx-auto flex justify-start xl:justify-center gap-1 sm:gap-2 px-4 sm:px-6 lg:px-8 relative"
          >
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                data-active={location.pathname === item.to ? "true" : undefined}
                className="relative flex items-center gap-2 px-3 xl:px-4 py-2 xl:py-3 pr-5 whitespace-nowrap text-sm xl:text-base"
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

          <div className="absolute left-0 top-0 bottom-0 w-64 sm:w-72 bg-white shadow-lg flex flex-col">
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
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 md:py-8">
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