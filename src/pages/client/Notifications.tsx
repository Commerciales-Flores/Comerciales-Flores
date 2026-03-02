import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import type { Notification } from '../../contexts/DataContext';
import {
  Bell,
  CheckCheck,
  Calendar,
  CreditCard,
  MessageSquare,
  AlertCircle,
  X,
  Trash2,
  ChevronRight,
  Inbox
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

  const typeIcons: Record<string, React.ElementType> = {
    booking: Calendar,
    reservation: Calendar,
    payment: CreditCard,
    inquiry: MessageSquare,
    system: AlertCircle
  };

  const typeColors: Record<string, { bg: string; text: string; light: string }> = {
    booking: { bg: 'bg-blue-600', text: 'text-blue-600', light: 'bg-blue-50' },
    reservation: { bg: 'bg-blue-600', text: 'text-blue-600', light: 'bg-blue-50' },
    payment: { bg: 'bg-emerald-600', text: 'text-emerald-600', light: 'bg-emerald-50' },
    inquiry: { bg: 'bg-violet-600', text: 'text-violet-600', light: 'bg-violet-50' },
    system: { bg: 'bg-slate-600', text: 'text-slate-600', light: 'bg-slate-50' }
  };

  const [filter, setFilter] = useState<'all' | 'booking' | 'payment' | 'inquiry'>('all');
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedNotifs, setSelectedNotifs] = useState<Set<string>>(new Set());
  const [quickViewNotif, setQuickViewNotif] = useState<Notification | null>(null);

  const handleOpenNotification = (n: Notification) => {
    if (deleteMode) return;
    setQuickViewNotif(n);
    if (!n.read) markNotificationRead(n.id);
  };

  const handleMarkAllRead = () => { if (user) markAllNotificationsRead(user.id); };
  
  const handleDeleteSelected = () => {
    selectedNotifs.forEach(id => deleteNotification(id));
    setSelectedNotifs(new Set());
    setDeleteMode(false);
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
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Notifications</h1>
          <p className="text-gray-500 mt-1">
            {notifications.length === 0
              ? "No updates yet."
              : `You have ${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}.`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {notifications.length > 0 && !deleteMode && (
            <>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full transition"
                >
                  <CheckCheck className="size-4" /> Mark all read
                </button>
              )}
              <button
                onClick={() => setDeleteMode(true)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition"
              >
                <Trash2 className="size-5" />
              </button>
            </>
          )}

          {deleteMode && (
            <div className="flex items-center gap-2 animate-in zoom-in-95 duration-200">
              <button
                onClick={() => { setDeleteMode(false); setSelectedNotifs(new Set()); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-full transition"
              >
                Cancel
              </button>
              <button
                disabled={selectedNotifs.size === 0}
                onClick={handleDeleteSelected}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50 shadow-sm transition"
              >
                Delete {selectedNotifs.size > 0 && `(${selectedNotifs.size})`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      {notifications.length > 0 && (
        <div className="flex gap-1 p-1 bg-gray-100/80 rounded-xl w-fit">
          {['all', 'booking', 'payment', 'inquiry'].map(t => (
            <button
              key={t}
              onClick={() => setFilter(t as any)}
              className={`px-5 py-2 text-sm font-medium capitalize rounded-lg transition-all ${
                filter === t 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Main Content */}
      {sortedNotifications.length === 0 ? (
        <div className="bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 py-20 text-center">
          <div className="bg-white size-16 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 border border-gray-100">
            <Inbox className="size-8 text-gray-300" />
          </div>
          <h3 className="text-gray-900 font-semibold text-lg">Inbox Zero!</h3>
          <p className="text-gray-500 max-w-xs mx-auto text-sm mt-2">
            You're all caught up. New updates regarding your bookings or inquiries will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedNotifications.map(({ group, items }) => {
            if (!items.length) return null;
            return (
              <div key={group} className="space-y-4">
                <h4 className="text-xs uppercase tracking-widest text-gray-400 font-bold px-1">{group}</h4>
                <div className="grid gap-3">
                  {items.map(notification => {
                    const Icon = typeIcons[notification.type] || Bell;
                    const style = typeColors[notification.type] || typeColors.system;
                    const isSelected = selectedNotifs.has(notification.id);

                    return (
                      <div
                        key={notification.id}
                        onClick={() => handleOpenNotification(notification)}
                        className={`group relative flex items-start gap-4 p-4 rounded-2xl transition-all duration-200 border ${
                          notification.read 
                            ? 'bg-white border-gray-100 grayscale-[0.5] opacity-70' 
                            : 'bg-white border-blue-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] ring-1 ring-blue-50'
                        } ${deleteMode ? 'cursor-default' : 'cursor-pointer hover:border-blue-300 hover:shadow-md active:scale-[0.99]'}`}
                      >
                        {deleteMode && (
                          <div className="flex items-center h-full">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                const newSet = new Set(selectedNotifs);
                                isSelected ? newSet.delete(notification.id) : newSet.add(notification.id);
                                setSelectedNotifs(newSet);
                              }}
                              className="size-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition cursor-pointer"
                            />
                          </div>
                        )}

                        <div className={`p-3 rounded-xl flex-shrink-0 transition-colors ${style.light} ${style.text}`}>
                          <Icon className="size-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${style.text}`}>
                              {notification.type}
                            </p>
                            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-tighter">
                              {new Date(notification.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <h3 className={`text-sm font-bold text-gray-900 mb-0.5 ${!notification.read && 'pr-4'}`}>
                            {notification.title}
                          </h3>
                          <p className="text-sm text-gray-500 line-clamp-1 leading-relaxed">
                            {notification.message}
                          </p>
                        </div>

                        {!deleteMode && (
                          <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight className="size-5 text-gray-300" />
                          </div>
                        )}

                        {!notification.read && (
                          <span className="absolute top-4 right-4 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-over Detail Panel */}
      {quickViewNotif && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div 
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" 
            onClick={() => setQuickViewNotif(null)} 
          />
          <div className="absolute inset-y-0 right-0 max-w-full flex">
            <div className="w-screen max-w-md bg-white shadow-2xl animate-in slide-in-from-right duration-300 ring-1 ring-black/5">
              <div className="h-full flex flex-col">
                <div className="px-6 py-6 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${typeColors[quickViewNotif.type].light} ${typeColors[quickViewNotif.type].text}`}>
                    {quickViewNotif.type}
                  </span>
                  <button
                    onClick={() => setQuickViewNotif(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-full transition shadow-sm border border-transparent hover:border-gray-200"
                  >
                    <X className="size-5" />
                  </button>
                </div>
                
                <div className="flex-1 px-8 py-10 overflow-y-auto">
                  <p className="text-xs font-semibold text-gray-400 mb-2">
                    {new Date(quickViewNotif.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <h2 className="text-2xl font-extrabold text-gray-900 leading-tight mb-6">
                    {quickViewNotif.title}
                  </h2>
                  <div className="prose prose-sm text-gray-600 leading-relaxed">
                    {quickViewNotif.message.split('\n').map((paragraph, i) => (
                      <p key={i} className="mb-4 text-base">{paragraph}</p>
                    ))}
                  </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50/30">
                  <button
                    onClick={() => setQuickViewNotif(null)}
                    className="w-full py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}