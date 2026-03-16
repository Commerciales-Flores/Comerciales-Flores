import React, { useCallback, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import type { Notification } from '../../contexts/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCheck,
  Calendar,
  CreditCard,
  MessageSquare,
  AlertCircle,
  X,
  Trash2,
  Inbox,
  Filter,
  ListChecks,
} from 'lucide-react';

const notificationFilters = [
  'all',
  'reservation',
  'booking',
  'payment',
  'inquiry',
  'system',
] as const;

type NotificationFilter = (typeof notificationFilters)[number];

const typeIcons: Record<string, React.ElementType> = {
  booking: Calendar,
  reservation: Calendar,
  payment: CreditCard,
  inquiry: MessageSquare,
  system: AlertCircle,
};

const typeColors: Record<
  string,
  { bg: string; text: string; light: string }
> = {
  booking: {
    bg: 'bg-blue-600',
    text: 'text-blue-600',
    light: 'bg-blue-50',
  },
  reservation: {
    bg: 'bg-blue-600',
    text: 'text-blue-600',
    light: 'bg-blue-50',
  },
  payment: {
    bg: 'bg-emerald-600',
    text: 'text-emerald-600',
    light: 'bg-emerald-50',
  },
  inquiry: {
    bg: 'bg-violet-600',
    text: 'text-violet-600',
    light: 'bg-violet-50',
  },
  system: {
    bg: 'bg-slate-600',
    text: 'text-slate-600',
    light: 'bg-slate-50',
  },
};

const defaultTypeColor = {
  bg: 'bg-slate-600',
  text: 'text-slate-600',
  light: 'bg-slate-50',
};

const fullDateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function getTimestamp(value?: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatShortDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return shortDateFormatter.format(date);
}

function formatFullDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return fullDateFormatter.format(date);
}

function getNotificationGroup(dateValue?: string | null) {
  if (!dateValue) return 'Earlier';

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Earlier';

  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return 'Earlier';
}

function getNotificationIcon(type?: string) {
  return typeIcons[type ?? ''] ?? Bell;
}

function getNotificationColor(type?: string) {
  return typeColors[type ?? ''] ?? defaultTypeColor;
}

type NotificationCardProps = {
  notification: Notification;
  selectionMode: boolean;
  isSelected: boolean;
  onOpen: (notification: Notification) => void;
};

const NotificationCard = React.memo(function NotificationCard({
  notification,
  selectionMode,
  isSelected,
  onOpen,
}: NotificationCardProps) {
  const Icon = getNotificationIcon(notification.type);
  const style = getNotificationColor(notification.type);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onOpen(notification)}
      className={`relative flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50/30'
          : notification.read
          ? 'border-gray-100 bg-white opacity-80'
          : 'border-blue-100 bg-white shadow-sm ring-1 ring-blue-50'
      }`}
    >
      {selectionMode && (
        <div className="pt-1">
          <div
            className={`flex size-5 items-center justify-center rounded-md border-2 transition-colors ${
              isSelected
                ? 'border-blue-600 bg-blue-600'
                : 'border-gray-300 bg-white'
            }`}
          >
            {isSelected && <CheckCheck className="size-3 text-white" />}
          </div>
        </div>
      )}

      <div className={`rounded-xl p-2.5 ${style.light} ${style.text}`}>
        <Icon className="size-5" />
      </div>

      <div className="min-w-0 flex-1">
        <h3
          className={`line-clamp-1 text-sm font-bold text-gray-900 ${
            !notification.read ? 'pr-4' : ''
          }`}
        >
          {notification.title}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">
          {notification.message}
        </p>
      </div>

      {!notification.read && !selectionMode && (
        <span className="mt-2 size-2 rounded-full bg-blue-600" />
      )}
    </motion.div>
  );
});

type EmptyStateProps = {
  filter: NotificationFilter;
  onClear: () => void;
  hasNotifications: boolean;
};

const EmptyState = React.memo(function EmptyState({
  filter,
  onClear,
  hasNotifications,
}: EmptyStateProps) {
  if (!hasNotifications) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="mb-4 rounded-3xl bg-blue-50 p-6 shadow-sm">
          <Inbox className="size-10 text-blue-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">No notifications yet</h3>
        <p className="mt-1 max-w-xs text-sm text-gray-500">
          We&apos;ll let you know when something important happens.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Filter className="mb-4 size-10 text-gray-200" />
      <h3 className="text-lg font-bold text-gray-900">No {filter} updates</h3>
      <p className="mt-1 text-sm text-gray-500">
        Try changing your filters to see more.
      </p>
      <button
        onClick={onClear}
        className="mt-4 text-sm font-bold text-blue-600"
      >
        Clear Filter
      </button>
    </div>
  );
});

type FilterTabsProps = {
  filter: NotificationFilter;
  onChange: (filter: NotificationFilter) => void;
};

const FilterTabs = React.memo(function FilterTabs({
  filter,
  onChange,
}: FilterTabsProps) {
  return (
    <div className="hidden w-fit gap-1 rounded-xl bg-gray-100/80 p-1 md:flex">
      {notificationFilters.map((type) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className={`rounded-lg px-5 py-2 text-sm font-medium capitalize transition-all ${
            filter === type
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {type}
        </button>
      ))}
    </div>
  );
});

type FilterBottomSheetProps = {
  isOpen: boolean;
  filter: NotificationFilter;
  onClose: () => void;
  onSelect: (filter: NotificationFilter) => void;
};

const FilterBottomSheet = React.memo(function FilterBottomSheet({
  isOpen,
  filter,
  onClose,
  onSelect,
}: FilterBottomSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm md:hidden"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-[70] flex max-h-[70vh] flex-col rounded-t-[32px] bg-white shadow-2xl md:hidden"
          >
            <div className="border-b p-6">
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200" />
              <h2 className="text-xl font-bold">Filter by</h2>
            </div>

            <div className="overflow-y-auto p-6">
              <div className="grid gap-2">
                {notificationFilters.map((type) => (
                  <button
                    key={type}
                    onClick={() => onSelect(type)}
                    className={`w-full rounded-2xl p-4 text-left font-semibold capitalize transition ${
                      filter === type
                        ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200'
                        : 'bg-gray-50 text-gray-600'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

type QuickViewPanelProps = {
  notification: Notification | null;
  onClose: () => void;
};

const QuickViewPanel = React.memo(function QuickViewPanel({
  notification,
  onClose,
}: QuickViewPanelProps) {
  return (
    <AnimatePresence>
      {notification && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="relative flex h-full w-full max-w-xl flex-col overflow-hidden bg-white shadow-[0_20px_60px_rgba(0,0,0,0.15)] md:rounded-l-[40px]"
          >
            <div className="relative bg-gradient-to-b from-gray-50 to-white p-8 pb-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`rounded-2xl p-3 shadow-sm ${
                      getNotificationColor(notification.type).light
                    }`}
                  >
                    {React.createElement(getNotificationIcon(notification.type), {
                      className: `size-6 ${
                        getNotificationColor(notification.type).text
                      }`,
                    })}
                  </div>

                  <div>
                    <p
                      className={`text-xs font-bold uppercase tracking-widest ${
                        getNotificationColor(notification.type).text
                      }`}
                    >
                      {notification.type}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      {formatFullDate(notification.date)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="rounded-full bg-blue-100 p-2 transition hover:bg-blue-200 active:scale-95"
                >
                  <X className="size-5 text-blue-600" />
                </button>
              </div>

              <h2 className="mt-6 text-3xl font-extrabold leading-tight text-gray-900">
                {notification.title}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 shadow-sm">
                <div className="space-y-4 text-[15px] leading-relaxed text-gray-700">
                  {notification.message.split('\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white p-6">
              <button
                onClick={onClose}
                className="w-full rounded-2xl bg-blue-600 py-3.5 font-semibold text-white transition hover:bg-blue-700 active:scale-95"
              >
                Close Notification
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});

export default function ClientNotifications() {
  const { user } = useAuth();
  const {
    getNotificationsByUserId,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
  } = useData();

  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedNotifs, setSelectedNotifs] = useState<Set<string>>(() => new Set());
  const [quickViewNotif, setQuickViewNotif] = useState<Notification | null>(null);

  const userId = user?.id ?? '';

  const sortedNotifications = useMemo(() => {
    if (!userId) return [];
    const notifications = getNotificationsByUserId(userId) ?? [];

    return [...notifications].sort(
      (a, b) => getTimestamp(b.date) - getTimestamp(a.date)
    );
  }, [getNotificationsByUserId, userId]);

  const unreadCount = useMemo(
    () => sortedNotifications.reduce((count, notif) => count + (notif.read ? 0 : 1), 0),
    [sortedNotifications]
  );

  const groupedNotifications = useMemo(() => {
    const filtered = sortedNotifications.filter((notification) =>
      filter === 'all' ? true : notification.type === filter
    );

    const groups: Record<'Today' | 'Yesterday' | 'Earlier', Notification[]> = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    };

    for (const notification of filtered) {
      const group = getNotificationGroup(notification.date) as
        | 'Today'
        | 'Yesterday'
        | 'Earlier';
      groups[group].push(notification);
    }

    return [
      { group: 'Today' as const, items: groups.Today },
      { group: 'Yesterday' as const, items: groups.Yesterday },
      { group: 'Earlier' as const, items: groups.Earlier },
    ];
  }, [sortedNotifications, filter]);

  const filteredCount = useMemo(
    () => groupedNotifications.reduce((sum, group) => sum + group.items.length, 0),
    [groupedNotifications]
  );

  const clearSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedNotifs(new Set());
  }, []);

  const toggleSelection = useCallback((id: string) => {
    setSelectedNotifs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleOpenNotification = useCallback(
    (notification: Notification) => {
      if (selectionMode) {
        toggleSelection(notification.id);
        return;
      }

      setQuickViewNotif(notification);

      if (!notification.read) {
        markNotificationRead(notification.id);
      }
    },
    [selectionMode, toggleSelection, markNotificationRead]
  );

  const handleBulkMarkRead = useCallback(() => {
    selectedNotifs.forEach((id) => markNotificationRead(id));
    clearSelection();
  }, [selectedNotifs, markNotificationRead, clearSelection]);

  const handleBulkDelete = useCallback(() => {
    selectedNotifs.forEach((id) => deleteNotification(id));
    clearSelection();
  }, [selectedNotifs, deleteNotification, clearSelection]);

  const handleMarkAllRead = useCallback(() => {
    if (!userId) return;
    markAllNotificationsRead(userId);
  }, [markAllNotificationsRead, userId]);

  const handleFilterChange = useCallback((nextFilter: NotificationFilter) => {
    setFilter(nextFilter);
  }, []);

  const handleFilterSelectFromSheet = useCallback((nextFilter: NotificationFilter) => {
    setFilter(nextFilter);
    setShowFilterMenu(false);
  }, []);

  const closeQuickView = useCallback(() => {
    setQuickViewNotif(null);
  }, []);

  const hasNotifications = sortedNotifications.length > 0;
  const selectedCount = selectedNotifs.size;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <div className="flex items-end justify-between gap-4">
          <header>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
              Notifications
            </h1>
            <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">
              {!hasNotifications
                ? 'All caught up!'
                : `${unreadCount} unread messages.`}
            </p>
          </header>

          <div className="flex items-center gap-2">
            {!selectionMode && hasNotifications && (
              <>
                <button
                  onClick={() => setShowFilterMenu(true)}
                  className="rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm transition active:scale-95 md:hidden"
                >
                  <Filter className="size-5 text-gray-600" />
                </button>

                {unreadCount > 0 && userId && (
                  <button
                    onClick={handleMarkAllRead}
                    className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-100"
                  >
                    Mark all as read
                  </button>
                )}

                <button
                  onClick={() => setSelectionMode(true)}
                  className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-100"
                >
                  <ListChecks className="size-4" />
                  <span className="hidden sm:inline">Select</span>
                </button>
              </>
            )}

            {selectionMode && (
              <button
                onClick={clearSelection}
                className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {!selectionMode && hasNotifications && (
          <FilterTabs filter={filter} onChange={handleFilterChange} />
        )}

        <div className="space-y-8">
          {!hasNotifications ? (
            <EmptyState
              filter={filter}
              onClear={() => setFilter('all')}
              hasNotifications={false}
            />
          ) : filteredCount === 0 ? (
            <EmptyState
              filter={filter}
              onClear={() => setFilter('all')}
              hasNotifications
            />
          ) : (
            groupedNotifications.map(
              ({ group, items }) =>
                items.length > 0 && (
                  <div key={group} className="space-y-4">
                    <h4 className="px-1 text-xs font-bold uppercase tracking-widest text-gray-400">
                      {group}
                    </h4>

                    <div className="grid gap-3">
                      {items.map((notification) => (
                        <NotificationCard
                          key={notification.id}
                          notification={notification}
                          selectionMode={selectionMode}
                          isSelected={selectedNotifs.has(notification.id)}
                          onOpen={handleOpenNotification}
                        />
                      ))}
                    </div>
                  </div>
                )
            )
          )}
        </div>

        <AnimatePresence>
          {selectionMode && selectedCount > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-6 left-1/2 z-[80] flex w-[90%] max-w-md -translate-x-1/2 items-center justify-between rounded-2xl bg-gray-900 p-4 text-white shadow-2xl"
            >
              <span className="pl-2 text-sm font-bold">
                {selectedCount} selected
              </span>

              <div className="flex gap-2">
                <button
                  onClick={handleBulkMarkRead}
                  className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold transition hover:bg-white/20"
                >
                  <CheckCheck className="size-4" />
                  Mark Read
                </button>

                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 rounded-xl bg-red-500 px-3 py-2 text-xs font-bold transition hover:bg-red-600"
                >
                  <Trash2 className="size-4" />
                  Delete
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <FilterBottomSheet
          isOpen={showFilterMenu}
          filter={filter}
          onClose={() => setShowFilterMenu(false)}
          onSelect={handleFilterSelectFromSheet}
        />

        <QuickViewPanel notification={quickViewNotif} onClose={closeQuickView} />
      </div>
    </div>
  );
}