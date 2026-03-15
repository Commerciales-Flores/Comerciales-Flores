import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import type { Notification } from '../../contexts/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, CheckCheck, Calendar, CreditCard, MessageSquare,
  AlertCircle, X, Trash2, ChevronRight, Inbox, Filter, ListChecks
} from 'lucide-react';
import React from 'react';

export default function ClientNotifications() {
  const { user } = useAuth();
  const { getNotificationsByUserId, markNotificationRead, markAllNotificationsRead, deleteNotification } = useData();

  const notifications = getNotificationsByUserId(user?.id || '');
  const sortedNotifications = [...notifications].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const unreadCount = notifications.filter(n => !n.read).length;
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [filter, setFilter] = useState<
  'all' | 'reservation' | 'booking' | 'payment' | 'inquiry' | 'system'
>('all');

  const notificationFilters = [
    'all',
    'reservation',
    'booking',
    'payment',
    'inquiry',
    'system'
  ] as const;
  
  // Selection Logic
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedNotifs, setSelectedNotifs] = useState<Set<string>>(new Set());
  const [quickViewNotif, setQuickViewNotif] = useState<Notification | null>(null);

  const typeIcons: Record<string, React.ElementType> = {
    booking: Calendar, reservation: Calendar, payment: CreditCard, inquiry: MessageSquare, system: AlertCircle
  };

  const typeColors: Record<string, { bg: string; text: string; light: string }> = {
    booking: { bg: 'bg-blue-600', text: 'text-blue-600', light: 'bg-blue-50' },
    reservation: { bg: 'bg-blue-600', text: 'text-blue-600', light: 'bg-blue-50' },
    payment: { bg: 'bg-emerald-600', text: 'text-emerald-600', light: 'bg-emerald-50' },
    inquiry: { bg: 'bg-violet-600', text: 'text-violet-600', light: 'bg-violet-50' },
    system: { bg: 'bg-slate-600', text: 'text-slate-600', light: 'bg-slate-50' }
  };
  

  const handleOpenNotification = (n: Notification) => {
    if (selectionMode) {
      toggleSelection(n.id);
      return;
    }
    setQuickViewNotif(n);
    if (!n.read) markNotificationRead(n.id);
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedNotifs);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedNotifs(next);
  };

  const handleBulkMarkRead = () => {
    selectedNotifs.forEach(id => markNotificationRead(id));
    setSelectionMode(false);
    setSelectedNotifs(new Set());
  };

  const handleBulkDelete = () => {
    selectedNotifs.forEach(id => deleteNotification(id));
    setSelectionMode(false);
    setSelectedNotifs(new Set());
  };

  const filteredNotifications = sortedNotifications
    .filter(n => filter === 'all' ? true : n.type === filter)
    .map(n => {
      const date = new Date(n.date);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      return { ...n, group: diffDays === 0 ? 'Today' : diffDays === 1 ? 'Yesterday' : 'Earlier' };
    });

  const groupedNotifications = ['Today', 'Yesterday', 'Earlier'].map(group => ({
    group,
    items: filteredNotifications.filter(n => n.group === group)
  }));

  return (
    <div className="bg-gray-50 min-h-screen">
  <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      {/* Header Section */}
      <div className="flex justify-between items-end gap-4">
      <header>

        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          Notifications
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
          {notifications.length === 0 ? "All caught up!" : `${unreadCount} unread messages.`}
        </p>
      </header>
        

        <div className="flex items-center gap-2">
          {!selectionMode && notifications.length > 0 && (
            <>
              <button
                onClick={() => setShowFilterMenu(true)}
                className="md:hidden p-2.5 bg-white border border-gray-200 rounded-xl shadow-sm active:scale-95 transition"
              >
                <Filter className="size-5 text-gray-600" />
              </button>

              {unreadCount > 0 && user?.id && (
                <button
                  onClick={() => markAllNotificationsRead(user.id)}
                  className="px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                >
                  Mark all as read
                </button>
              )}
              <button 
                onClick={() => setSelectionMode(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
              >
                <ListChecks className="size-4" />
                <span className="hidden sm:inline">Select</span>
              </button>
            </>
          )}

          {selectionMode && (
            <button 
              onClick={() => { setSelectionMode(false); setSelectedNotifs(new Set()); }}
              className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Desktop Filter Tabs */}
      {!selectionMode && notifications.length > 0 && (
        <div className="hidden md:flex gap-1 p-1 bg-gray-100/80 rounded-xl w-fit">
          {notificationFilters.map(t => (
            <button
              key={t}
              onClick={() => setFilter(t as any)}
              className={`px-5 py-2 text-sm font-medium capitalize rounded-lg transition-all ${filter === t ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* List Content & Empty States */}
      <div className="space-y-8">
        {notifications.length === 0 ? (
          <motion.div initial={{ opacity: 0, y:10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-blue-50 p-6 rounded-3xl shadow-sm mb-4">
              <Inbox className="size-12 text-blue-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No notifications yet</h3>
            <p className="text-gray-500 max-w-xs text-sm mt-1">We'll let you know when something important happens.</p>
          </motion.div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Filter className="size-12 text-gray-200 mb-4" />
            <h3 className="text-lg font-bold text-gray-900">No {filter} updates</h3>
            <p className="text-gray-500 text-sm mt-1">Try changing your filters to see more.</p>
            <button onClick={() => setFilter('all')} className="mt-4 text-blue-600 font-bold text-sm">Clear Filter</button>
          </div>
        ) : (
          groupedNotifications.map(({ group, items }) => items.length > 0 && (
            <div key={group} className="space-y-4">
              <h4 className="text-xs uppercase tracking-widest text-gray-400 font-bold px-1">{group}</h4>
              <div className="grid gap-3">
                {items.map(n => {
                  const Icon = typeIcons[n.type] || Bell;
                  const style = typeColors[n.type] || typeColors.system;
                  const isSelected = selectedNotifs.has(n.id);

                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={n.id}
                      onClick={() => handleOpenNotification(n)}
                      className={`relative flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected ? 'border-blue-500 bg-blue-50/30' : 
                        n.read ? 'bg-white border-gray-100 opacity-80' : 'bg-white border-blue-100 shadow-sm ring-1 ring-blue-50'
                      }`}
                    >
                      {selectionMode && (
                        <div className="pt-1">
                          <div className={`size-5 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}>
                            {isSelected && <CheckCheck className="size-3 text-white" />}
                          </div>
                        </div>
                      )}
                      <div className={`p-2.5 rounded-xl ${style.light} ${style.text}`}><Icon className="size-5" /></div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-sm font-bold text-gray-900 line-clamp-1 ${!n.read && 'pr-4'}`}>{n.title}</h3>
                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{n.message}</p>
                      </div>
                      {!n.read && !selectionMode && <span className="size-2 rounded-full bg-blue-600 mt-2" />}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* BULK ACTIONS BAR */}
      <AnimatePresence>
        {selectionMode && selectedNotifs.size > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-gray-900 text-white rounded-2xl p-4 shadow-2xl z-[80] flex items-center justify-between"
          >
            <span className="text-sm font-bold pl-2">{selectedNotifs.size} selected</span>
            <div className="flex gap-2">
              <button onClick={handleBulkMarkRead} className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition">
                <CheckCheck className="size-4" /> Mark Read
              </button>
              <button onClick={handleBulkDelete} className="flex items-center gap-2 px-3 py-2 bg-red-500 hover:bg-red-600 rounded-xl text-xs font-bold transition">
                <Trash2 className="size-4" /> Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FILTER BOTTOM SHEET */}
      <AnimatePresence>
        {showFilterMenu && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowFilterMenu(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] md:hidden"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 max-h-[70vh] bg-white rounded-t-[32px] z-[70] shadow-2xl md:hidden flex flex-col"
            >
              <div className="p-6 border-b">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4" />
                <h2 className="text-xl font-bold">Filter by</h2>
              </div>

              <div className="p-6 overflow-y-auto">
                <div className="grid gap-2">
                  {notificationFilters.map(t => (
                    <button
                      key={t}
                      onClick={() => { setFilter(t); setShowFilterMenu(false); }}
                      className={`w-full p-4 rounded-2xl text-left font-semibold capitalize transition ${
                        filter === t
                          ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200'
                          : 'bg-gray-50 text-gray-600'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* DETAIL SIDE PANEL */}
      <AnimatePresence>
  {quickViewNotif && (
    <div className="fixed inset-0 z-[100] flex justify-end">

      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setQuickViewNotif(null)}
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
      />

      {/* Panel */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="relative w-full max-w-xl bg-white h-full md:rounded-l-[40px] flex flex-col overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
      >

        {/* Header */}
        <div className="relative p-8 pb-6 bg-gradient-to-b from-gray-50 to-white">
          <div className="flex items-start justify-between">

            <div className="flex items-center gap-4">

              {/* Icon */}
              <div
                className={`p-3 rounded-2xl shadow-sm ${
                  typeColors[quickViewNotif.type].light
                }`}
              >
                {React.createElement(
                  typeIcons[quickViewNotif.type] || Bell,
                  { className: `size-6 ${typeColors[quickViewNotif.type].text}` }
                )}
              </div>

              <div>
                <p
                  className={`text-xs font-bold uppercase tracking-widest ${
                    typeColors[quickViewNotif.type].text
                  }`}
                >
                  {quickViewNotif.type}
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  {new Date(quickViewNotif.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>

            </div>

            {/* Close button */}
            <button
              onClick={() => setQuickViewNotif(null)}
              className="p-2 rounded-full bg-blue-100 hover:bg-blue-200 transition active:scale-95"
            >
              <X className="size-5 text-blue-600" />
            </button>

          </div>

          {/* Title */}
          <h2 className="text-3xl font-extrabold text-gray-900 leading-tight mt-6">
            {quickViewNotif.title}
          </h2>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="text-gray-700 leading-relaxed text-[15px] space-y-4">
              {quickViewNotif.message.split('\n').map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white">
          <button
            onClick={() => setQuickViewNotif(null)}
            className="w-full py-3.5 rounded-2xl font-semibold text-white bg-blue-600 hover:bg-blue-700 transition active:scale-95"
          >
            Close Notification
          </button>
        </div>

      </motion.div>
    </div>
  )}
</AnimatePresence>
    </div>
    </div>
  );
}