import React, { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  CreditCard,
  AlertCircle,
  MessageSquare,
  Bell,
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/currency';

/**
 * Reused formatters outside component so they are not recreated on every render
 */
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const SECTION_TITLE_CLASS =
  'text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide';

const CARD_CLASS =
  'bg-white rounded-xl border border-gray-200 shadow-sm';

const EMPTY_STATE_CLASS =
  'text-center py-6 text-xs sm:text-sm text-gray-500';

function formatDate(value?: string | Date | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return dateFormatter.format(date);
}

function getTimestamp(value?: string | Date | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getReservationStatusClass(status?: string) {
  switch (status) {
    case 'confirmed':
      return 'bg-green-100 text-green-700';
    case 'pending':
      return 'bg-orange-100 text-orange-700';
    case 'cancelled':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

type DashboardStatCardProps = {
  label: string;
  value: number | string;
  icon: React.ReactNode;
};

const DashboardStatCard = memo(function DashboardStatCard({
  label,
  value,
  icon,
}: DashboardStatCardProps) {
  return (
    <div className={`${CARD_CLASS} p-4 sm:p-6`}>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[10px] sm:text-xs font-medium text-gray-500">{label}</p>
        {icon}
      </div>
      <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
});

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  actionTo?: string;
};

const SectionHeader = memo(function SectionHeader({
  title,
  actionLabel,
  actionTo,
}: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className={SECTION_TITLE_CLASS}>{title}</h2>

      {actionLabel && actionTo ? (
        <Link
          to={actionTo}
          className="text-[10px] sm:text-xs font-semibold text-blue-600 hover:underline"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
});

type EmptyStateProps = {
  message: string;
  actionLabel?: string;
  actionTo?: string;
};

const EmptyState = memo(function EmptyState({
  message,
  actionLabel,
  actionTo,
}: EmptyStateProps) {
  return (
    <div className="py-10 text-center">
      <p className="text-sm text-gray-400">{message}</p>
      {actionLabel && actionTo ? (
        <Link
          to={actionTo}
          className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
});

export default function ClientDashboard() {
  const { user } = useAuth();
  const { getReservationsByUserId, getPaymentsByUserId, inquiries, notifications } =
    useData();

  const userId = user?.id ?? '';
  const firstName = user?.firstName ?? 'Client';

  /**
   * These selectors are memoized.
   * This helps only if the context functions themselves are reasonably stable.
   */
  const userReservations = useMemo(
    () => (userId ? getReservationsByUserId(userId) : []),
    [getReservationsByUserId, userId]
  );

  const userPayments = useMemo(
    () => (userId ? getPaymentsByUserId(userId) : []),
    [getPaymentsByUserId, userId]
  );

  /**
   * Single memoized derived state block.
   * We do:
   * - one main loop for reservation aggregations
   * - lightweight sorted subsets only where needed
   * - user-filtered inquiries / notifications
   */
  const dashboard = useMemo(() => {
    const now = Date.now();

    let totalReservations = 0;
    let upcomingCount = 0;
    let pendingCount = 0;
    let paymentReminderCount = 0;
    let outstandingBalance = 0;

    const paymentReminderItems: typeof userReservations = [];
    const recentReservationCandidates: typeof userReservations = [];

    for (const reservation of userReservations) {
      totalReservations += 1;

      const startDateMs = getTimestamp(reservation.startDate);
      const paidAmount = Number(reservation.paidAmount ?? 0);
      const totalAmount = Number(reservation.totalAmount ?? 0);
      const balance = Math.max(totalAmount - paidAmount, 0);

      if (reservation.status === 'confirmed' && startDateMs > now) {
        upcomingCount += 1;
      }

      if (reservation.status === 'pending') {
        pendingCount += 1;
      }

      if (reservation.status === 'confirmed' && balance > 0) {
        paymentReminderCount += 1;
        outstandingBalance += balance;
        paymentReminderItems.push(reservation);
      }

      recentReservationCandidates.push(reservation);
    }

    const recentReservations = recentReservationCandidates
      .slice()
      .sort(
        (a, b) => getTimestamp(b.requestDate) - getTimestamp(a.requestDate)
      )
      .slice(0, 3);

    const topPaymentReminders = paymentReminderItems
      .slice()
      .sort((a, b) => {
        const aBalance =
          Number(a.totalAmount ?? 0) - Number(a.paidAmount ?? 0);
        const bBalance =
          Number(b.totalAmount ?? 0) - Number(b.paidAmount ?? 0);
        return bBalance - aBalance;
      })
      .slice(0, 2);

    const userMessages = (inquiries ?? [])
      .filter((inquiry) => inquiry.userId === userId && inquiry.response)
      .sort((a, b) => getTimestamp(b.date) - getTimestamp(a.date))
      .slice(0, 2);

    const userNotifications = (notifications ?? [])
      .filter((notification) => {
        if (!notification) return false;
        if (!notification.userId) return true;
        return notification.userId === userId;
      })
      .sort((a, b) => getTimestamp(b.date) - getTimestamp(a.date))
      .slice(0, 3);

    const totalPaid = userPayments.reduce(
      (sum, payment) => sum + Number(payment.amount ?? 0),
      0
    );

    return {
      totalReservations,
      upcomingCount,
      pendingCount,
      paymentReminderCount,
      outstandingBalance,
      totalPaid,
      recentReservations,
      topPaymentReminders,
      userMessages,
      userNotifications,
    };
  }, [userReservations, userPayments, inquiries, notifications, userId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        {/* HEADER */}
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
              Welcome back, {firstName}!
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-gray-500">
              Overview of your reservations, payments, and messages
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/client/properties"
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Browse Properties
            </Link>
            <Link
              to="/client/reservations"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              My Reservations
            </Link>
          </div>
        </header>

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-5">
          <DashboardStatCard
            label="Reservations"
            value={dashboard.totalReservations}
            icon={<Calendar className="size-4 sm:size-5 text-blue-600" />}
          />

          <DashboardStatCard
            label="Upcoming"
            value={dashboard.upcomingCount}
            icon={<Calendar className="size-4 sm:size-5 text-green-600" />}
          />

          <DashboardStatCard
            label="Pending"
            value={dashboard.pendingCount}
            icon={<AlertCircle className="size-4 sm:size-5 text-yellow-600" />}
          />

          <DashboardStatCard
            label="Reminders"
            value={dashboard.paymentReminderCount}
            icon={<CreditCard className="size-4 sm:size-5 text-red-600" />}
          />

          <DashboardStatCard
            label="Paid"
            value={formatCurrency(dashboard.totalPaid)}
            icon={<CreditCard className="size-4 sm:size-5 text-indigo-600" />}
          />
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-10">
          {/* LEFT */}
          <div className="space-y-6 lg:col-span-7">
            {/* PAYMENT REMINDERS */}
            <section className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 sm:p-6 shadow-sm">
              <SectionHeader
                title="Payment Reminders"
                actionLabel="Manage Payments"
                actionTo="/client/payments"
              />

              {dashboard.topPaymentReminders.length > 0 ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-yellow-300 bg-white/80 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-wide text-yellow-800 font-semibold">
                      Total Outstanding
                    </p>
                    <p className="mt-1 text-xl font-bold text-red-600">
                      {formatCurrency(dashboard.outstandingBalance)}
                    </p>
                  </div>

                  {dashboard.topPaymentReminders.map((reservation) => {
                    const balance =
                      Number(reservation.totalAmount ?? 0) -
                      Number(reservation.paidAmount ?? 0);

                    return (
                      <div
                        key={reservation.id}
                        className="flex flex-col gap-3 rounded-lg border border-yellow-300 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {reservation.unitName}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            Reservation ID: {reservation.id}
                          </p>
                          <p className="mt-1 text-[11px] text-gray-500">
                            Requested {formatDate(reservation.requestDate)}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-3 sm:block sm:text-right">
                          <p className="text-lg font-bold text-red-600">
                            {formatCurrency(balance)}
                          </p>

                          <Link
                            to="/client/payments"
                            className="mt-1 inline-block rounded bg-blue-600 px-3 py-1.5 text-[10px] text-white hover:bg-blue-700"
                          >
                            Pay Now
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-yellow-300 bg-white/50 py-6 text-center text-xs text-gray-500">
                  You are all caught up! 🎉
                </div>
              )}
            </section>

            {/* RECENT RESERVATION ACTIVITY */}
            <section className={`${CARD_CLASS} p-4 sm:p-6`}>
              <SectionHeader
                title="Recent Reservation Activity"
                actionLabel="View All"
                actionTo="/client/reservations"
              />

              {dashboard.recentReservations.length === 0 ? (
                <EmptyState
                  message="No reservations yet."
                  actionLabel="Browse Properties →"
                  actionTo="/client/properties"
                />
              ) : (
                <div className="divide-y divide-gray-100">
                  {dashboard.recentReservations.map((reservation) => (
                    <div
                      key={reservation.id}
                      className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                          <Calendar className="size-5 text-gray-400" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-semibold text-gray-900">
                            {reservation.unitName}
                          </p>
                          <p className="text-xs italic text-gray-500">
                            Requested {formatDate(reservation.requestDate)}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                        <span
                          className={`rounded-full px-4 py-1 text-[10px] font-bold uppercase tracking-tighter ${getReservationStatusClass(
                            reservation.status
                          )}`}
                        >
                          {reservation.status ?? 'unknown'}
                        </span>

                        <Link
                          to="/client/reservations"
                          className="text-[10px] font-medium text-blue-600 hover:underline"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* RIGHT */}
          <div className="space-y-6 lg:col-span-3">
            {/* ADMIN REPLIES */}
            <section className={`${CARD_CLASS} overflow-hidden`}>
              <div className="flex items-center gap-2 bg-indigo-600 p-3 text-white">
                <MessageSquare className="size-4" />
                <h2 className="text-[11px] font-bold uppercase tracking-wider">
                  Admin Replies
                </h2>
              </div>

              <div className="p-4">
                {dashboard.userMessages.length > 0 ? (
                  <div className="space-y-4">
                    {dashboard.userMessages.map((msg) => (
                      <div key={msg.id}>
                        <p className="mb-1 text-[10px] text-gray-400">
                          {formatDate(msg.date)}
                        </p>

                        <p className="text-xs font-semibold text-gray-900">
                          {msg.subject}
                        </p>

                        <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 p-3">
                          <p className="mb-1 text-[10px] font-semibold text-blue-700">
                            Admin Reply
                          </p>

                          <p className="text-[11px] leading-relaxed text-gray-700">
                            {msg.response}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center text-[11px] italic text-gray-400">
                    No new messages
                  </p>
                )}

                <Link
                  to="/client/messages"
                  className="block pt-4 text-center text-[10px] font-bold text-indigo-600 hover:underline"
                >
                  GO TO INBOX
                </Link>
              </div>
            </section>

            {/* ALERTS */}
            <section className={CARD_CLASS}>
              <div className="flex items-center gap-2 border-b border-gray-100 p-3 font-bold text-gray-700">
                <Bell className="size-4 text-purple-500" />
                <h2 className="text-[11px] uppercase tracking-wider">Alerts</h2>
              </div>

              <div className="p-4">
                {dashboard.userNotifications.length > 0 ? (
                  <div className="space-y-3">
                    {dashboard.userNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="rounded-lg border border-purple-100 bg-purple-50 p-3"
                      >
                        <p className="mb-1 text-[11px] leading-relaxed text-purple-900">
                          {notification.message}
                        </p>
                        <span className="text-[9px] text-purple-400">
                          {formatDate(notification.date)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center text-[11px] text-gray-400">
                    All clear!
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}