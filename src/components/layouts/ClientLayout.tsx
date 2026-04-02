import { Outlet, NavLink, useNavigate, Navigate } from "react-router-dom";
import { useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import LogoutConfirmModal from "../LogoutConfirmModal";
import { useLocation } from "react-router-dom";
import ErrorWrapper from "./ErrorWrapper";
import { motion, AnimatePresence } from 'framer-motion';
import { useInquiries } from "../../contexts/InquiriesContext";
import {
  LayoutDashboard,
  Building2,
  Calendar,
  CreditCard,
  Bell,
  User,
  LogOut,
  MessageCircle,
  Menu,
  X,
  Star,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import ContactSupportModal from "../ContactSupportModal";

export default function ClientLayout() {
  const { user, logout } = useAuth();

  const { getNotificationsByUserId } = useNotifications();
  const navigate = useNavigate();
  const [showSupport, setShowSupport] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const navRef = useRef<HTMLDivElement>(null);
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });
  const { tickets, fetchTickets } = useInquiries();

const userNotifications = useMemo(
  () => getNotificationsByUserId(user?.id || ""),
  [getNotificationsByUserId, user?.id]
);

const unreadNotifications = useMemo(
  () => userNotifications.filter((n) => !n.read).length,
  [userNotifications]
);


  const location = useLocation();

  const unreadMessages = useMemo(() => {
  if (!user?.id) return 0;
  if (location.pathname === "/client/messages") return 0;

  return tickets.filter((ticket) => {
    if (ticket.userId !== user.id) return false;

    const isUnreadForCustomer =
      ticket.lastMessageBy === "support" &&
      new Date(ticket.lastMessageAt || 0).getTime() >
        new Date(ticket.lastReadAtCustomer || 0).getTime();

    return isUnreadForCustomer;
  }).length;
}, [location.pathname, tickets, user?.id]);

  useEffect(() => {
  if (!user) return;

  const isDashboard = location.pathname === '/client/dashboard';

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
    if (mobileNavOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [mobileNavOpen]);

  useEffect(() => {
  if (!user?.id) return;

  void fetchTickets(user.id);
}, [fetchTickets, user?.id]);

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
    { to: "/client/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/client/properties", icon: Building2, label: "Properties" },
    { to: "/client/reservations", icon: Calendar, label: "Reservations" },
    { to: "/client/payments", icon: CreditCard, label: "Payments" },
    { to: "/client/reviews", icon: Star, label: "Reviews" },
    { to: "/client/notifications", icon: Bell, label: "Notifications", badge: unreadNotifications },
    { to: "/client/messages", icon: MessageCircle, label: "Messages", badge: unreadMessages },
    { to: "/client/profile", icon: User, label: "Profile" },
  ];

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || "User";

  const avatarUrl =
  (user as any)?.avatarUrl ||
  (user as any)?.photoURL ||
  (user as any)?.profilePictureUrl ||
  `https://ui-avatars.com/api/?name=${encodeURIComponent(
    fullName
  )}&background=0D8ABC&color=fff&size=128`;

  if (!user) return <Navigate to="/login" replace />;

  return (
    <ErrorWrapper validPaths={navItems.map(item => item.to)} allowedRoles={['client']}>
    <div className="min-h-screen flex flex-col bg-white-50">

      {/* CLIENT HEADER */}
<header className="bg-white border-b border-gray-200 sticky top-0 z-50">
  <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 flex justify-between items-center h-16 sm:h-20">

    {/* Brand Identity */}
    <div className="flex items-center gap-3">
      <div className="bg-blue-50 p-2 rounded-lg">
        <Building2 className="size-6 text-blue-600" />
      </div>

      <div className="flex flex-col">
        <h1 className="font-bold tracking-tight text-sm md:text-lg leading-none text-gray-900">
          Comerciales Flores
        </h1>
        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mt-1">
          Client Portal
        </p>
      </div>
    </div>

    {/* DESKTOP NAV + AVATAR */}
    <div className="hidden md:flex items-center gap-4 lg:gap-6">
      <div className="flex items-center gap-4 pr-6 border-r border-gray-100">
        <span className="text-sm text-gray-600">
          Welcome, <span className="text-gray-900 font-medium">{fullName}</span>
        </span>

        <NavLink 
          to="/client/profile" 
          className="relative hover:ring-2 hover:ring-blue-400 rounded-full transition-all p-0.5"
        >
          <img
            src={avatarUrl}
            alt={fullName || "User avatar"}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-gray-200 shadow-sm" 
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              target.onerror = null;
              target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                fullName
              )}&background=eff6ff&color=2563eb&size=128`;
            }}
          />
        </NavLink>
      </div>

      <button

        onClick={() => {
        setMobileNavOpen(false); // close panel
        handleLogout(); // show logout modal
      }}
        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all text-sm font-semibold"
      >
        <LogOut className="size-4" />
        Logout
      </button>
    </div>

    {/* MOBILE HAMBURGER */}
    <button
      className="md:hidden flex items-center p-2 sm:p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors"
      onClick={() => setMobileNavOpen(true)}
      aria-label="Open mobile menu"
    >
      <Menu className="size-6 text-gray-600" />
    </button>
  </div>
</header>

      {/* DESKTOP NAVBAR */}
    <nav className="hidden md:block bg-white border-b border-gray-200 relative">
      <div ref={navRef} className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 flex gap-1 sm:gap-2 md:gap-4 overflow-x-auto relative">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            data-active={location.pathname === item.to ? "true" : undefined}
            className="relative flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 pr-6 whitespace-nowrap text-gray-600 hover:text-gray-900"
          >
            <item.icon className="size-4" />
            {item.label}
            {item.badge !== undefined && item.badge > 0 && (
              <span className="absolute top-0.5 right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {item.badge > 9 ? "9+" : item.badge}
              </span>
            )}
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
    </nav>

      {/* MOBILE SLIDE-OUT MENU */}
<AnimatePresence>
  {mobileNavOpen && (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setMobileNavOpen(false)}
        className="absolute inset-0 bg-gray-900/40 "
      />

      {/* Drawer Content */}
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="absolute left-0 top-0 bottom-0 w-72 sm:w-80 bg-white shadow-2xl flex flex-col overflow-hidden"
      >
        {/* White Profile Header - Matches Main Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <NavLink 
              to="/client/profile" 
              onClick={() => setMobileNavOpen(false)}
              className="relative group"
            >
              <img
                src={avatarUrl}
                alt={fullName || "User avatar"}
                className="w-16 h-16 rounded-2xl object-cover border border-gray-100 shadow-sm transition-transform group-active:scale-95" 
              />
              <div className="absolute -bottom-1 -right-1 bg-green-500 border-2 border-white size-4 rounded-full" />
            </NavLink>
            <button 
              onClick={() => setMobileNavOpen(false)}
              className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-colors"
            >
              <X className="size-6" />
            </button>
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-lg leading-tight">{fullName}</h2>
            <p className="text-gray-500 text-xs truncate font-medium mt-0.5">{user?.email}</p>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-6">
          <p className="px-6 text-[10px] font-black uppercase text-gray-400 tracking-[0.15em] mb-4">
            Main Menu
          </p>
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex items-center gap-4 px-6 py-3.5 transition-all relative ${
                    isActive
                      ? "text-blue-600 font-bold bg-blue-50/50"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {/* Active Indicator Line */}
                  {isActive && (
                    <motion.div 
                      layoutId="activeNavMobile"
                      className="absolute left-0 w-1 h-8 bg-blue-600 rounded-r-full"
                    />
                  )}
                  
                  <item.icon className={`size-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className="text-sm tracking-tight">{item.label}</span>
                  
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-gray-50 bg-gray-50/50">
          <button
            onClick={() => {
              setMobileNavOpen(false);
              setShowSupport(true);

            }}
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:text-gray-900 w-full rounded-xl transition-colors text-sm font-semibold"
          >
            <MessageCircle className="size-5 text-gray-400" />
            Help & Support
          </button>
          <button
            onClick={() => {
              handleLogout();
              setMobileNavOpen(false);
            }}
            className="flex items-center gap-3 w-full px-4 py-3 text-rose-600 hover:bg-rose-50 rounded-xl transition-all text-sm font-bold mt-1"
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

      {/* Floating Support Button */}
      <button
        onClick={() => setShowSupport(true)}
        className="hidden md:flex fixed bottom-6 right-6 bg-blue-600 text-white p-3 sm:p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
        aria-label="Contact Support"
      >
        <MessageCircle className="size-6" />
      </button>

      {showSupport && (
        <ContactSupportModal onClose={() => setShowSupport(false)} />
        )}

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