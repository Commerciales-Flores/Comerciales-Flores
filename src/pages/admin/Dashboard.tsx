import { useMemo, useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useReviews } from '../../contexts/ReviewsContext';
import { useUsers } from '../../contexts/UsersContext';
import {
  AlertCircle,
  TrendingUp,
  Award,
  Activity,
  ArrowRight,
  CheckCircle2,
  MessageSquare,
  CreditCard,
  Clock,
  ShieldAlert,
  Star,
  Calendar,
} from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';

type TrendPoint = {
  label: string;
  value: number;
};

type TopUnit = {
  id: string;
  name: string;
  images: string[];
  revenue: number;
};

type WatchlistItem = {
  id: string;
  name: string;
  reason: 'Deletion Pending' | 'Deactivation Restricted' | 'Recently Active';
  publicId?: string;
};

type ReviewRow = {
  review_id: string;
  user_id: string | null;
  unit_id: string | null;
  rating: number | null;
  comment: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const StatCard = ({
  title,
  value,
  icon,
  change,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: number;
}) => {
  return (
    <div className="flex min-h-[112px] flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</p>
        {icon}
      </div>

      <p className="text-2xl font-bold text-gray-900">{value}</p>

      {typeof change === 'number' && (
        <span className={`mt-2 text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
        </span>
      )}
    </div>
  );
};

const MiniListCard = ({
  title,
  icon,
  viewAllTo,
  items,
  emptyText,
  valueRenderer,
  badgeText,
  badgeClassName,
}: {
  title: string;
  icon: React.ReactNode;
  viewAllTo: string;
  items: any[];
  emptyText: string;
  valueRenderer: (item: any) => React.ReactNode;
  badgeText: string;
  badgeClassName: string;
}) => {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          {icon}
          {title}
        </h3>

        <Link
          to={viewAllTo}
          className="text-xs font-semibold text-blue-600 transition hover:text-blue-700"
        >
          View All
        </Link>
      </div>

      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-3"
            >
              <div className="min-w-0 flex-1">{valueRenderer(item)}</div>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${badgeClassName}`}>
                {badgeText}
              </span>
            </div>
          ))
        ) : (
          <div className="flex min-h-[88px] items-center justify-center rounded-xl bg-gray-50 px-4 text-center text-xs text-gray-500">
            {emptyText}
          </div>
        )}
      </div>
    </section>
  );
};

const TrendCard = ({
  title,
  value,
  icon,
  data,
  lineDataKey,
  stroke,
  formatter,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  data: TrendPoint[];
  lineDataKey: 'value';
  stroke: string;
  formatter: (value: number | undefined) => [string, string];
}) => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</p>
        {icon}
      </div>

      <div className="mb-4">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
      </div>

      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <Line
              type="monotone"
              dataKey={lineDataKey}
              stroke={stroke}
              strokeWidth={2.5}
              dot={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 10, borderRadius: 12 }}
              formatter={(value: number | undefined) => formatter(value)}
              labelFormatter={(label) => `Month: ${label}`}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const EmptyPanel = ({
  text,
  compact = false,
}: {
  text: string;
  compact?: boolean;
}) => (
  <div
    className={`flex items-center justify-center rounded-xl bg-gray-50 px-4 text-center text-xs text-gray-500 ${
      compact ? 'min-h-[88px]' : 'min-h-[120px]'
    }`}
  >
    {text}
  </div>
);

const getWatchlistBadgeClass = (reason: WatchlistItem['reason']) => {
  switch (reason) {
    case 'Deletion Pending':
      return 'bg-purple-100 text-purple-800';
    case 'Deactivation Restricted':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-blue-100 text-blue-800';
  }
};

export default function AdminDashboard() {
  const { reservations, payments, units, inquiries, auditLogs } = useData();
  const { reviews } = useReviews();
  const { fetchUsersPage } = useUsers();
  const [watchlistUsers, setWatchlistUsers] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadWatchlistUsers = async () => {
      try {
        const result = await fetchUsersPage({
          page: 1,
          pageSize: 100,
          searchTerm: '',
        });

        if (!cancelled) {
          setWatchlistUsers(result.data ?? []);
        }
      } catch (error) {
        console.error('Failed to load watchlist users:', error);
        if (!cancelled) {
          setWatchlistUsers([]);
        }
      }
    };

    void loadWatchlistUsers();

    return () => {
      cancelled = true;
    };
  }, [fetchUsersPage]);

  const pendingVisitRequests = reservations
  .filter(
    (r) =>
      r.modeOfVisit === 'onsite' &&
      (r.visitStatus ?? 'requested') === 'requested'
  )
  .slice(0, 4);

  const dashboardData = useMemo(() => {
    const now = new Date();
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const pendingReservationsAll = reservations.filter((r) => r.status === 'pending');
    const confirmedReservationsCount = reservations.filter((r) => r.status === 'confirmed').length;
    const cancelledReservationsCount = reservations.filter((r) => r.status === 'cancelled').length;

    const paidPayments = payments.filter((p) => p.status === 'paid');
    const paidPaymentsCount = paidPayments.length;
    const pendingPayments = payments.filter(
      (p) => p.status === 'unpaid' || p.status === 'partial'
    );

    const recentInquiries = inquiries.filter((i) => i.status === 'open').slice(0, 4);

    const recentReviews: Array<
      ReviewRow & {
        unitName: string;
      }
    > = (reviews ?? [])
      .slice(0, 4)
      .map((review: ReviewRow) => {
        const matchedUnit = units.find((unit) => unit.id === review.unit_id);

        return {
          ...review,
          unitName: matchedUnit?.name || 'Unit Review',
        };
      });

    const overdueReservations = pendingReservationsAll.filter(
      (r) => new Date(r.requestDate) < fortyEightHoursAgo
    );

    const monthlyData = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));

      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });

      const monthReservations = reservations.filter((r) => r.requestDate.startsWith(yearMonth));
      const monthRevenue = paidPayments
        .filter((p) => p.date.startsWith(yearMonth))
        .reduce((sum, p) => sum + p.amount, 0);

      const monthOccupancy =
        units.length > 0 ? (monthReservations.length / units.length) * 100 : 0;

      return {
        month: monthLabel,
        occupancy: monthOccupancy,
        revenue: monthRevenue,
      };
    });

    const occupancyTrend: TrendPoint[] = monthlyData.map((d) => ({
      label: d.month,
      value: d.occupancy,
    }));

    const revenueTrend: TrendPoint[] = monthlyData.map((d) => ({
      label: d.month,
      value: d.revenue,
    }));

    const activeUnitsCount = units.filter((u) => u.available).length;
    const occupancyRate = units.length > 0 ? (activeUnitsCount / units.length) * 100 : 0;
    const totalRevenue = paidPayments.reduce((sum, p) => sum + p.amount, 0);

    const lastMonthReservations = reservations.filter((r) => {
      const resDate = new Date(r.requestDate);
      const lastMonth = new Date();
      lastMonth.setMonth(now.getMonth() - 1);

      return (
        resDate.getMonth() === lastMonth.getMonth() &&
        resDate.getFullYear() === lastMonth.getFullYear()
      );
    }).length;

    const reservationsChange =
      lastMonthReservations > 0
        ? ((reservations.length - lastMonthReservations) / lastMonthReservations) * 100
        : 0;

    const reservationById = new Map(reservations.map((r) => [r.id, r]));
    const revenueByUnitId = new Map<string, number>();

    for (const payment of paidPayments) {
      const reservation = reservationById.get(payment.reservationId);
      if (!reservation?.unitId) continue;

      revenueByUnitId.set(
        reservation.unitId,
        (revenueByUnitId.get(reservation.unitId) ?? 0) + payment.amount
      );
    }

    const topUnits: TopUnit[] = units
      .map((unit) => ({
        id: unit.id,
        name: unit.name,
        images: unit.images,
        revenue: revenueByUnitId.get(unit.id) ?? 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);

    const latestActivity =
      auditLogs?.[0] || {
        id: '—',
        action: 'No recent activity',
        timestamp: new Date().toISOString(),
      };

    return {
      overdueReservations,
      pendingReservations: pendingReservationsAll.slice(0, 3),
      pendingVisitRequests,
      pendingPayments: pendingPayments.slice(0, 3),
      recentInquiries,
      recentReviews,
      confirmedReservationsCount,
      cancelledReservationsCount,
      paidPaymentsCount,
      occupancyRate,
      totalRevenue,
      reservationsChange,
      occupancyTrend,
      revenueTrend,
      topUnits,
      latestActivity,
    };
  }, [reservations, payments, units, inquiries, auditLogs, reviews]);

  const customerWatchlist = useMemo<WatchlistItem[]>(() => {
    const now = Date.now();
    const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

    const list: WatchlistItem[] = [];

    for (const user of watchlistUsers) {
      const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Customer';

      if (user.deletionStatus === 'pending') {
        list.push({
          id: user.id,
          publicId: user.publicId,
          name,
          reason: 'Deletion Pending',
        });
        continue;
      }

      if (user.deactivationBlocked) {
        list.push({
          id: user.id,
          publicId: user.publicId,
          name,
          reason: 'Deactivation Restricted',
        });
        continue;
      }

      if (user.lastLogin) {
        const lastLogin = new Date(user.lastLogin);

        if (!Number.isNaN(lastLogin.getTime()) && now - lastLogin.getTime() < THREE_DAYS) {
          list.push({
            id: user.id,
            publicId: user.publicId,
            name,
            reason: 'Recently Active',
          });
        }
      }
    }

    return list.slice(0, 5);
  }, [watchlistUsers]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">
            Overview of your rental management system
          </p>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Reservations"
            value={reservations.length}
            icon={<Activity className="size-5 text-purple-500" />}
            change={dashboardData.reservationsChange}
          />

          <StatCard
            title="Confirmed"
            value={dashboardData.confirmedReservationsCount}
            icon={<CheckCircle2 className="size-5 text-green-500" />}
          />

          <StatCard
            title="Cancelled"
            value={dashboardData.cancelledReservationsCount}
            icon={<AlertCircle className="size-5 text-red-500" />}
          />

          <StatCard
            title="Paid Payments"
            value={dashboardData.paidPaymentsCount}
            icon={<CreditCard className="size-5 text-blue-500" />}
          />
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <section className="overflow-hidden rounded-2xl border border-red-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-red-100 bg-red-50 px-4 py-4 sm:px-6">
                <div className="flex items-center gap-2 font-semibold text-red-700">
                  <AlertCircle className="size-5" />
                  <h2>Urgent Alerts</h2>
                </div>

                <span className="rounded-full bg-red-200 px-2.5 py-1 text-xs font-bold text-red-800">
                  {dashboardData.overdueReservations.length} Overdue
                </span>
              </div>

              <div className="p-4 sm:p-6">
                {dashboardData.overdueReservations.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {dashboardData.overdueReservations.map((res) => (
                      <div
                        key={res.id}
                        className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900">{res.unitName}</p>
                          <p className="font-mono text-xs text-gray-500">
                            Overdue since {new Date(res.requestDate).toLocaleDateString()}
                          </p>
                        </div>

                        <Link
                          to="/admin/reservations"
                          className="inline-flex items-center gap-1 text-sm font-semibold text-red-600 hover:underline"
                        >
                          Resolve <ArrowRight className="size-3" />
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 py-2 text-sm text-gray-500">
                    <CheckCircle2 className="size-5 text-green-500" />
                    No overdue items.
                  </div>
                )}
              </div>
            </section>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
  <MiniListCard
    title="Pending Reservations"
    icon={<Clock className="size-4 text-orange-500" />}
    viewAllTo="/admin/reservations"
    items={dashboardData.pendingReservations}
    emptyText="No pending reservations"
    badgeText="Pending"
    badgeClassName="bg-orange-100 text-orange-700"
    valueRenderer={(res) => (
      <div className="min-w-0">
        <span className="block truncate text-sm font-medium text-gray-800">
          {res.unitName}
        </span>
        <span className="block text-xs text-gray-500">
          {new Date(res.requestDate).toLocaleDateString()}
        </span>
      </div>
    )}
  />

  <MiniListCard
    title="Pending Payments"
    icon={<CreditCard className="size-4 text-blue-500" />}
    viewAllTo="/admin/payments"
    items={dashboardData.pendingPayments}
    emptyText="No pending or partial payments"
    badgeText="Review"
    badgeClassName="bg-blue-100 text-blue-700"
    valueRenderer={(pay) => (
      <div className="min-w-0">
        <span className="block text-sm font-medium text-gray-800">
          {formatCurrency(pay.amount)}
        </span>
        <span className="block text-xs text-gray-500 capitalize">
          {pay.status}
        </span>
      </div>
    )}
  />

  <div className="md:col-span-2">
    <MiniListCard
      title="Pending Visit Requests"
      icon={<Calendar className="size-4 text-indigo-500" />}
      viewAllTo="/admin/reservations"
      items={dashboardData.pendingVisitRequests}
      emptyText="No pending visit requests"
      badgeText="Visit"
      badgeClassName="bg-indigo-100 text-indigo-700"
      valueRenderer={(res) => (
        <div className="min-w-0">
          <span className="block truncate text-sm font-medium text-gray-800">
            {res.unitName}
          </span>
          <span className="block text-xs text-gray-500">
            {res.appointmentDate
              ? new Date(res.appointmentDate).toLocaleDateString()
              : 'No preferred date'}
            {res.appointmentTime ? ` • ${res.appointmentTime}` : ''}
          </span>
        </div>
      )}
    />
  </div>
</div>

            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Health Metrics</h2>
                <p className="mt-1 text-xs text-gray-500">
                  Overall occupancy and revenue trends
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <TrendCard
                  title="Occupancy Rate"
                  value={`${dashboardData.occupancyRate.toFixed(1)}%`}
                  icon={<Activity className="size-5 text-purple-500" />}
                  data={dashboardData.occupancyTrend}
                  lineDataKey="value"
                  stroke="#7c3aed"
                  formatter={(value) => [`${(value ?? 0).toFixed(1)}%`, 'Occupancy']}
                />

                <TrendCard
                  title="Total Revenue"
                  value={formatCurrency(dashboardData.totalRevenue)}
                  icon={<TrendingUp className="size-5 text-green-500" />}
                  data={dashboardData.revenueTrend}
                  lineDataKey="value"
                  stroke="#16a34a"
                  formatter={(value) => [`₱${((value ?? 0) / 1000).toFixed(1)}k`, 'Revenue']}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-amber-100 p-2.5 text-amber-600">
                    <Star className="size-5" />
                  </div>

                  <div>
                    <h2 className="text-base font-semibold text-gray-900">Reviews</h2>
                    <p className="text-xs text-gray-500">Recent client feedback and ratings</p>
                  </div>
                </div>

                <Link
                  to="/admin/reviews"
                  className="text-xs font-semibold text-amber-600 transition hover:text-amber-700"
                >
                  View All
                </Link>
              </div>

              {dashboardData.recentReviews.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {dashboardData.recentReviews.map((review) => (
                    <div
                      key={review.review_id}
                      className="rounded-xl border border-amber-100 bg-white p-4 shadow-sm"
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {review.unitName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {review.created_at
                              ? new Date(review.created_at).toLocaleDateString()
                              : 'Recently submitted'}
                          </p>
                        </div>

                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                          {review.rating ? `${review.rating}/5` : '—'}
                        </span>
                      </div>

                      <p className="line-clamp-3 text-sm leading-relaxed text-gray-600">
                        {review.comment || 'No written review provided.'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-amber-100 bg-white p-4">
                    <p className="text-sm leading-relaxed text-gray-700">
                      Monitor client feedback, identify low-rated units, and stay updated
                      with the latest reviews across your properties.
                    </p>
                  </div>

                  <Link
                    to="/admin/reviews"
                    className="group inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700"
                  >
                    Go to Reviews
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6 lg:col-span-4">
            <section className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-violet-100 bg-violet-50 px-5 py-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="size-4 text-violet-700" />
                  <h2 className="text-sm font-semibold text-violet-900">
                    Customer Activity Watchlist
                  </h2>
                </div>

                <Link
                  to="/admin/customers"
                  className="text-xs font-semibold text-violet-600 transition hover:text-violet-700"
                >
                  View All
                </Link>
              </div>

              <div className="p-5">
                {customerWatchlist.length > 0 ? (
                  <div className="space-y-3">
                    {customerWatchlist.map((customer) => (
                      <Link
                        key={customer.id}
                        to={`/admin/customers?customer=${encodeURIComponent(
                          customer.publicId || customer.id
                        )}`}
                        className="block rounded-xl border border-gray-100 bg-gray-50 p-4 transition hover:border-violet-200 hover:bg-white"
                      >
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">
                              {customer.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {customer.publicId || customer.id}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${getWatchlistBadgeClass(
                              customer.reason
                            )}`}
                          >
                            {customer.reason}
                          </span>
                        </div>

                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600">
                          Open Customer
                          <ArrowRight className="size-3" />
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyPanel text="No customer activity requiring attention" />
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-indigo-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-indigo-100 bg-indigo-50 px-5 py-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="size-4 text-indigo-700" />
                  <h2 className="text-sm font-semibold text-indigo-900">Recent Inquiries</h2>
                </div>

                <Link
                  to="/admin/inquiries"
                  className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-700"
                >
                  View All
                </Link>
              </div>

              <div className="p-5">
                {dashboardData.recentInquiries.length > 0 ? (
                  <div className="space-y-3">
                    {dashboardData.recentInquiries.map((inq) => (
                      <div
                        key={inq.id}
                        className="rounded-xl border border-gray-100 bg-gray-50 p-4 transition hover:border-indigo-100 hover:bg-white"
                      >
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">
                              {inq.subject || 'General Inquiry'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {inq.email || 'No email provided'}
                            </p>
                          </div>

                          <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[10px] font-bold uppercase text-indigo-700">
                            Open
                          </span>
                        </div>

                        <p className="line-clamp-3 text-sm leading-relaxed text-gray-600">
                          {inq.message}
                        </p>

                        <Link
                          to="/admin/inquiries"
                          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                        >
                          Reply
                          <ArrowRight className="size-3" />
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyPanel text="No new inquiries" />
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-2 font-semibold text-gray-900">
                <Award className="size-5 text-yellow-500" />
                <h2 className="text-sm">Top Performing Units</h2>
              </div>

              <div className="space-y-4">
                {dashboardData.topUnits.length > 0 ? (
                  dashboardData.topUnits.map((unit, i) => (
                    <div
                      key={unit.id}
                      className="group flex items-center gap-3 rounded-xl bg-gray-50 p-3 transition hover:bg-gray-100"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={unit.images?.[0] || '/fallback-property.webp'}
                          alt={unit.name}
                          loading="lazy"
                          decoding="async"
                          className="size-12 rounded-xl border border-gray-100 object-cover"
                        />
                        <div className="absolute -left-1 -top-1 flex size-5 items-center justify-center rounded-full bg-gray-900 text-[9px] font-bold text-white">
                          {i + 1}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {unit.name}
                        </p>
                        <p className="text-xs font-semibold text-green-600">
                          {formatCurrency(unit.revenue)}
                        </p>
                      </div>

                      <ArrowRight className="size-4 text-gray-300 transition-colors group-hover:text-blue-500" />
                    </div>
                  ))
                ) : (
                  <EmptyPanel text="No unit performance data yet" compact />
                )}
              </div>
            </section>

            <section className="rounded-2xl bg-gray-900 p-6 text-white shadow-lg">
              <h2 className="mb-4 text-sm font-semibold tracking-widest text-gray-400">
                SYSTEM STATUS
              </h2>

              <div className="space-y-5">
                <div>
                  <p className="text-xs text-gray-400">Latest Admin Action</p>

                  {dashboardData.latestActivity ? (
                    <div className="mt-2 space-y-1">
                      <p className="text-sm font-medium text-white">
                        {dashboardData.latestActivity.publicId || 'No public ID'}
                      </p>
                      <p className="text-sm font-medium text-white">
                        {dashboardData.latestActivity.action}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {new Date(dashboardData.latestActivity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">
                      No recent admin activity found.
                    </p>
                  )}
                </div>

                <div className="border-t border-gray-800 pt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-gray-300">Database Connection</span>
                    <span className="size-2 animate-pulse rounded-full bg-green-500" />
                  </div>

                  <Link
                    to="/admin/audit"
                    className="text-[11px] font-medium text-blue-400 hover:underline"
                  >
                    Open Audit Logs
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}