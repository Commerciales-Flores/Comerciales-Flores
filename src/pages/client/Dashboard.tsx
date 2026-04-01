import React, { memo, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  CreditCard,
  AlertCircle,
  MessageSquare,
  ArrowRight,
  Clock3,
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import {
  useInquiries,
  type SupportMessage,
  type SupportTicket,
} from '../../contexts/InquiriesContext';
import { formatCurrency } from '../../utils/currency';
import { uiTypography } from '../../styles/uiTypography';
import { formatDate, formatDateTime } from '../../utils/date';

const SECTION_TITLE_CLASS = `${uiTypography.badgeLabel} text-gray-900`;
const CARD_CLASS =
  'rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md';
const EMPTY_STATE_CLASS = `text-center py-6 ${uiTypography.helperText} text-gray-500`;

function getTimestamp(value?: string | Date | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getReservationStatusClass(status?: string) {
  switch (status) {
    case 'confirmed':
      return 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200';
    case 'pending':
      return 'bg-amber-100 text-amber-700 ring-1 ring-amber-200';
    case 'cancelled':
      return 'bg-rose-100 text-rose-700 ring-1 ring-rose-200';
    default:
      return 'bg-gray-100 text-gray-600 ring-1 ring-gray-200';
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
    <div className="bg-white p-4 sm:p-5 min-h-[100px] rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        {icon}
      </div>

      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
});

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  actionTo?: string;
  subtitle?: string;
};

const SectionHeader = memo(function SectionHeader({
  title,
  actionLabel,
  actionTo,
  subtitle,
}: SectionHeaderProps) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h2 className={SECTION_TITLE_CLASS}>{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p> : null}
      </div>

      {actionLabel && actionTo ? (
        <Link
          to={actionTo}
          className={`inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-[10px] sm:text-xs ${uiTypography.buttonText} text-blue-700 transition hover:bg-blue-100`}
        >
          {actionLabel}
          <ArrowRight className="size-3.5" />
        </Link>
      ) : null}
    </div>
  );
});

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionTo?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionTo,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 py-10 text-center">
      <div className="mb-3 text-gray-400">{icon}</div>

      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>

      {description && (
        <p className="mt-1 max-w-[260px] text-xs text-gray-500">{description}</p>
      )}

      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="mt-4 text-xs font-medium text-blue-600 hover:underline"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const { getReservationsByUserId, getPaymentsByUserId, notifications } = useData();
  const { tickets, messages, fetchTickets } = useInquiries();

  const userId = user?.id ?? '';
  const firstName = user?.firstName ?? 'Client';

  useEffect(() => {
    if (userId) {
      void fetchTickets(userId);
    }
  }, [fetchTickets, userId]);

  const userReservations = useMemo(
    () => (userId ? getReservationsByUserId(userId) : []),
    [getReservationsByUserId, userId]
  );

  const userPayments = useMemo(
    () => (userId ? getPaymentsByUserId(userId) : []),
    [getPaymentsByUserId, userId]
  );

  const userTickets = useMemo(
    () => (tickets ?? []).filter((ticket: SupportTicket) => ticket.userId === userId),
    [tickets, userId]
  );

  const userSupportReplies = useMemo(() => {
    const userTicketIds = new Set(userTickets.map((ticket) => ticket.id));

    return (messages ?? [])
      .filter(
        (message: SupportMessage) =>
          userTicketIds.has(message.ticketId) &&
          message.senderType === 'support' &&
          !message.isInternal
      )
      .sort(
        (a: SupportMessage, b: SupportMessage) =>
          getTimestamp(b.createdAt) - getTimestamp(a.createdAt)
      )
      .slice(0, 2);
  }, [messages, userTickets]);

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
      .sort((a, b) => getTimestamp(b.requestDate) - getTimestamp(a.requestDate))
      .slice(0, 3);

    const topPaymentReminders = paymentReminderItems
      .slice()
      .sort((a, b) => {
        const aBalance = Number(a.totalAmount ?? 0) - Number(a.paidAmount ?? 0);
        const bBalance = Number(b.totalAmount ?? 0) - Number(b.paidAmount ?? 0);
        return bBalance - aBalance;
      })
      .slice(0, 2);

    const userNotifications = (notifications ?? [])
      .filter((notification: any) => {
        if (!notification) return false;
        if (!notification.userId) return true;
        return notification.userId === userId;
      })
      .sort((a: any, b: any) => getTimestamp(b.date) - getTimestamp(a.date))
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
      userMessages: userSupportReplies,
      userNotifications,
    };
  }, [userReservations, userPayments, notifications, userId, userSupportReplies]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className={uiTypography.pageTitle}>Welcome back, {firstName}!</h1>
            <p className={uiTypography.pageDescription}>
              Overview of your reservations, payments, and messages
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/client/properties"
              className={`rounded-xl bg-blue-600 px-4 py-2.5 text-xs ${uiTypography.buttonText} text-white shadow-sm transition hover:bg-blue-700`}
            >
              Browse Properties
            </Link>
            <Link
              to="/client/reservations"
              className={`rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs ${uiTypography.buttonText} text-gray-700 transition hover:bg-gray-50`}
            >
              My Reservations
            </Link>
          </div>
        </header>

        <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-5">
          <DashboardStatCard
            label="Reservations"
            value={dashboard.totalReservations}
            icon={<Calendar className="size-5 text-purple-500" />}
          />
          <DashboardStatCard
            label="Upcoming"
            value={dashboard.upcomingCount}
            icon={<Clock3 className="size-5 text-green-500" />}
          />
          <DashboardStatCard
            label="Pending"
            value={dashboard.pendingCount}
            icon={<AlertCircle className="size-5 text-red-500" />}
          />
          <DashboardStatCard
            label="Reminders"
            value={dashboard.paymentReminderCount}
            icon={<CreditCard className="size-5 text-orange-500" />}
          />
          <DashboardStatCard
            label="Paid"
            value={formatCurrency(dashboard.totalPaid)}
            icon={<CreditCard className="size-5 text-blue-500" />}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-10">
          <div className="space-y-6 lg:col-span-7">
            <section className="overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-yellow-50 to-white shadow-sm">
              <div className="border-b border-amber-100 px-4 py-4 sm:px-6 sm:py-5">
                <SectionHeader
                  title="Payment Reminders"
                  subtitle="Balances that may need your attention"
                  actionLabel="Manage Payments"
                  actionTo="/client/payments"
                />
              </div>

              <div className="p-4 pt-3 sm:p-6 sm:pt-4">
                {dashboard.topPaymentReminders.length > 0 ? (
                  <div className="space-y-3">
                    {dashboard.topPaymentReminders.map((reservation) => {
                      const balance =
                        Number(reservation.totalAmount ?? 0) -
                        Number(reservation.paidAmount ?? 0);

                      return (
                        <div
                          key={reservation.id}
                          className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p
                                  className={`${uiTypography.infoBlockValue} truncate text-gray-900`}
                                >
                                  {reservation.unitName}
                                </p>
                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                  Balance Due
                                </span>
                              </div>

                              <p className="mt-1 text-[11px] text-gray-500">
                                Reservation ID: {reservation?.publicId || '—'}
                              </p>
                              <p className="mt-1 text-[11px] text-gray-500">
                                Requested {formatDate(reservation.requestDate)}
                              </p>
                            </div>

                            <div className="flex items-center justify-between gap-3 sm:block sm:text-right">
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                                  Outstanding
                                </p>
                                <p className="mt-1 text-lg font-bold text-rose-600">
                                  {formatCurrency(balance)}
                                </p>
                              </div>

                              <Link
                                to="/client/payments"
                                className={`mt-3 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-[10px] ${uiTypography.buttonText} text-white transition hover:bg-blue-700`}
                              >
                                Pay Now
                                <ArrowRight className="size-3.5" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    className={`rounded-2xl border border-dashed border-amber-300 bg-white/70 ${EMPTY_STATE_CLASS}`}
                  >
                    You are all caught up! 🎉
                  </div>
                )}
              </div>
            </section>

            <section className={CARD_CLASS}>
              <div className="border-b border-gray-100 px-4 py-4 sm:px-6 sm:py-5">
                <SectionHeader
                  title="Recent Reservation Activity"
                  subtitle="Your latest booking updates"
                  actionLabel="View All"
                  actionTo="/client/reservations"
                />
              </div>

              <div className="p-4 pt-3 sm:p-6 sm:pt-4">
                {dashboard.recentReservations.length === 0 ? (
                  <EmptyState
                    icon={<Calendar className="size-5" />}
                    title="No reservations yet"
                    description="Start by booking a property."
                    actionLabel="Browse properties"
                    actionTo="/client/properties"
                  />
                ) : (
                  <div className="space-y-3">
                    {dashboard.recentReservations.map((reservation) => (
                      <div
                        key={reservation.id}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 transition hover:border-gray-200 hover:bg-white"
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-gray-200">
                            <Calendar className="size-5 text-blue-600" />
                          </div>

                          <div className="min-w-0">
                            <p
                              className={`${uiTypography.infoBlockValue} truncate text-gray-900`}
                            >
                              {reservation.unitName}
                            </p>
                            <p
                              className={`${uiTypography.helperText} mt-1 italic text-gray-500`}
                            >
                              Requested {formatDate(reservation.requestDate)}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                          <span
                            className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${getReservationStatusClass(
                              reservation.status
                            )}`}
                          >
                            {reservation.status ?? 'unknown'}
                          </span>

                          <Link
                            to="/client/reservations"
                            className={`inline-flex items-center gap-1 ${uiTypography.buttonText} text-[10px] text-blue-600 hover:underline`}
                          >
                            View Details
                            <ArrowRight className="size-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6 lg:col-span-3">
            <section className={`${CARD_CLASS} overflow-hidden`}>
              <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-3 text-white">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15">
                  <MessageSquare className="size-4" />
                </div>
                <h2 className={uiTypography.badgeLabel}>Admin Replies</h2>
              </div>

              <div className="p-4">
                {dashboard.userMessages.length > 0 ? (
                  <div className="space-y-4">
                    {dashboard.userMessages.map((msg: SupportMessage) => {
                      const relatedTicket = userTickets.find(
                        (ticket: SupportTicket) => ticket.id === msg.ticketId
                      );

                      return (
                        <div
                          key={msg.id}
                          className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4"
                        >
                          <p className="mb-1 text-[10px] text-gray-400">
                            {formatDate(msg.createdAt)}
                          </p>

                          <p className={`${uiTypography.infoBlockValue} text-gray-900`}>
                            {relatedTicket?.subject ?? 'Support Reply'}
                          </p>

                          <div className="mt-3 rounded-xl border border-blue-100 bg-white p-3">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                              Admin Reply
                            </p>

                            <p className="text-[11px] leading-relaxed text-gray-700">
                              {msg.body}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-8 text-center">
                    <p className="text-[11px] italic text-gray-400">No new messages</p>
                  </div>
                )}

                <Link
                  to="/client/messages"
                  className={`mt-4 block text-center text-[10px] ${uiTypography.buttonTextBold} text-indigo-600 hover:underline`}
                >
                  GO TO INBOX
                </Link>
              </div>
            </section>

            <section className="rounded-2xl bg-gray-900 p-4 text-white shadow-sm">
              <div className="mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                  ALERTS
                </p>
                <h2 className="mt-1 text-sm font-semibold text-white">
                  Notifications & Updates
                </h2>
                <p className="mt-1 text-xs text-gray-400">
                  Important updates about your reservations and payments.
                </p>
              </div>

              <div className="space-y-3">
                {dashboard.userNotifications.length > 0 ? (
                  <div className="space-y-3">
                    {dashboard.userNotifications.slice(0, 2).map((notification: any) => (
                      <div
                        key={notification.id}
                        className="rounded-2xl border border-gray-800 bg-white/5 p-3"
                      >
                        <p className="text-[12px] leading-relaxed text-white">
                          {notification.message}
                        </p>

                        <p className="mt-2 text-[11px] text-gray-500">
                          {formatDateTime(notification.date)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-700 bg-white/5 py-8 text-center">
                    <p className="text-[12px] font-medium text-gray-300">
                      You're all caught up 🎉
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      No new alerts at the moment.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}