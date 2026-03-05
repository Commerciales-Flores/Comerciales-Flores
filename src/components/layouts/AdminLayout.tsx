import { useState, useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LogoutConfirmModal from "../LogoutConfirmModal";
import ErrorWrapper from "./ErrorWrapper";
import { AnimatePresence } from 'framer-motion';
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
import { motion } from "framer-motion";

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

  const isDashboard = location.pathname === '/admin/dashboard';

  // Push the first internal state if it's the dashboard
  if (isDashboard) {
    // Replace current entry (login page) with dashboard
    window.history.replaceState({ internal: true, dashboard: true }, '');
    // Push another state so back button is trapped
    window.history.pushState({ internal: true, dashboard: true }, '');
  } else {
    // For other internal pages
    window.history.replaceState({ internal: true, dashboard: false }, '');
  }

  const handlePopState = (event: PopStateEvent) => {
    const state = event.state as any;

    if (!state || !state.internal) {
      // User tried to go back outside SPA → logout 
      logout("Security: Session ended because you left the site.");
      navigate('/login', { replace: true });
    } else if (state.dashboard) {
      // Hard lock at dashboard → do nothing
      window.history.pushState({ internal: true, dashboard: true }, '');
    } else {
      // Internal page → keep state
      window.history.replaceState({ internal: true, dashboard: false }, '');
    }
  };

  window.addEventListener('popstate', handlePopState);

  return () => {
    window.removeEventListener('popstate', handlePopState);
  };
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

  const validPaths = [
    '/admin/dashboard',
    '/admin/customers',
    '/admin/audit',
    '/admin/business-slots',
    '/admin/reservations',
    '/admin/payments',
    '/admin/inquiries',
    '/admin/content',
    '/admin/analytics',
    '/admin/profile'
  ];

  const isValidChildRoute = validPaths.includes(location.pathname);

  const avatarUrl =
    (user as any)?.avatarUrl ||
    (user as any)?.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      user?.name || "User"
    )}&background=0D8ABC&color=fff&size=128`;


  return (
    <ErrorWrapper validPaths={validPaths} allowedRoles={['admin']}>
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* HEADER */}
<header className="bg-blue-900 text-white sticky top-0 z-50 shadow-md border-b border-blue-800">
          <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-16">

            {/* Brand Identity - Now visible on all screen sizes */}
            <div className="flex items-center gap-3">
              <div className="bg-blue-800 p-2 rounded-lg">
                <Building2 className="size-6 text-blue-300" />
              </div>
              <div className="flex flex-col">
                <h1 className="font-bold tracking-tight text-sm md:text-lg leading-none">
                  Commerciales Flores
                </h1>
                <p className="text-[10px] uppercase font-bold text-blue-400 tracking-widest mt-1">
                  Admin Portal
                </p>
              </div>
            </div>

            {/* DESKTOP NAV + AVATAR (Lg screens) */}
            <div className="hidden lg:flex items-center gap-6">
              <div className="flex items-center gap-4 pr-6 border-r border-blue-800">
                <span className="text-sm font-medium text-blue-100">
                  Welcome, <span className="text-white font-semibold">{user?.name}</span>
                </span>
                <NavLink to="/admin/profile" className="p-0.5 hover:ring-2 hover:ring-blue-400 rounded-full transition-all">
                  <img src={avatarUrl} className="w-9 h-9 rounded-full border border-blue-700 shadow-sm" alt="Avatar" />
                </NavLink>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm font-bold shadow-sm">
                <LogOut className="size-4" /> Logout
              </button>
            </div>

            {/* MOBILE HAMBURGER (Visible below lg) */}
            <button
              className="lg:hidden p-2 rounded-lg bg-blue-800 hover:bg-blue-700 border border-blue-700"
              onClick={() => setMobileNavOpen(true)}
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

      {/* MOBILE SLIDE-OUT MENU (Matches Client style) */}
        <AnimatePresence>
          {mobileNavOpen && (
            <div className="fixed inset-0 z-[100]">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileNavOpen(false)}
                className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
              />

              {/* Drawer Content */}
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute left-0 top-0 bottom-0 w-72 sm:w-80 bg-white shadow-2xl flex flex-col overflow-hidden"
              >
                {/* White Profile Header */}
                {/* Dark Admin Header - Matches Admin Header Color */}
                  <div className="p-6 bg-blue-900 text-white relative">
                    <div className="flex justify-between items-start mb-4">
                      <NavLink 
                        to="/admin/profile" 
                        onClick={() => setMobileNavOpen(false)}
                        className="relative group"
                      >
                        <img
                          src={avatarUrl}
                          alt={user?.name || "Admin avatar"}
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-800 shadow-md bg-white" 
                        />
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 border-2 border-blue-900 size-4 rounded-full" />
                      </NavLink>
                      <button 
                        onClick={() => setMobileNavOpen(false)}
                        className="p-2 hover:bg-blue-800 rounded-xl text-blue-200 transition-colors"
                      >
                        <X className="size-6" />
                      </button>
                    </div>
                    <div>
                      <h2 className="font-bold text-white text-lg leading-tight">{user?.name}</h2>
                      <p className="text-blue-300 text-xs truncate font-medium mt-0.5">{user?.email}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-blue-800 text-blue-100 uppercase tracking-tighter border border-blue-700">
                          Administrator
                        </span>
                      </div>
                    </div>
                    
                    {/* Subtle Decorative Icon */}
                    <Building2 className="absolute bottom-4 right-4 size-12 text-blue-800/50 -rotate-12" />
                  </div>

                {/* Navigation Items */}
                <div className="flex-1 overflow-y-auto py-6">
                  <p className="px-6 text-[10px] font-black uppercase text-gray-400 tracking-[0.15em] mb-4">
                    Admin Menu
                  </p>
                  <div className="space-y-1">
                    {navItems.map((item) => {
                      const isActive = location.pathname === item.to;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => setMobileNavOpen(false)}
                          className={`flex items-center gap-4 px-6 py-3 transition-all relative ${
                            isActive ? "text-blue-600 font-bold bg-blue-50/50" : "text-gray-600"
                          }`}
                        >
                          {isActive && (
                            <motion.div layoutId="activeNavAdmin" className="absolute left-0 w-1 h-6 bg-blue-600 rounded-r-full" />
                          )}
                          <item.icon className={`size-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                          <span className="text-sm">{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Logout */}
                <div className="p-4 border-t border-gray-50 bg-gray-50/50">
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileNavOpen(false);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-rose-600 hover:bg-rose-50 rounded-xl transition-all text-sm font-bold"
                  >
                    <LogOut className="size-5" /> Logout
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

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
      </ErrorWrapper>
  );
}