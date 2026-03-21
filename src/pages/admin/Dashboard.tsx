import { useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useReviews } from '../../contexts/ReviewsContext';
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
    <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-gray-500">{title}</p>
        {icon}
      </div>

      <p className="text-xl font-bold text-gray-900">{value}</p>

      {typeof change === 'number' && (
        <span className={`text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
          {icon} {title}
        </h3>
        <Link to={viewAllTo} className="text-xs text-blue-600">
          View All
        </Link>
      </div>

      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className="flex justify-between items-center bg-gray-50 p-2 rounded gap-3"
            >
              <div className="min-w-0 flex-1">{valueRenderer(item)}</div>
              <span className={`text-[10px] px-2 py-0.5 rounded uppercase ${badgeClassName}`}>
                {badgeText}
              </span>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center bg-gray-50 p-3 rounded text-xs text-gray-500">
            {emptyText}
          </div>
        )}
      </div>
    </div>
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
    <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <p className="text-xs font-medium text-gray-500">{title}</p>
        {icon}
      </div>

      <div className="flex items-end gap-2 mb-2">
        <span className="text-2xl font-bold">{value}</span>
      </div>

      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <Line type="monotone" dataKey={lineDataKey} stroke={stroke} strokeWidth={2} dot={false} />
            <Tooltip
              contentStyle={{ fontSize: 10 }}
              formatter={(value: number | undefined) => formatter(value)}
              labelFormatter={(label) => `Month: ${label}`}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const EmptyPanel = ({ text }: { text: string }) => (
  <div className="flex items-center justify-center p-4 text-xs text-gray-500">{text}</div>
);

export default function AdminDashboard() {
  const { reservations, payments, units, inquiries, auditLogs } = useData();
  const { reviews } = useReviews();

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
    const recentInquiries = inquiries.filter((i) => i.status === 'open').slice(0, 3);
    const recentReviews = (reviews ?? []).slice(0, 3);

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

      const monthOccupancy = units.length > 0 ? (monthReservations.length / units.length) * 100 : 0;

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

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500">Overview of your rental management system</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
            <div className="bg-red-50 px-4 sm:px-6 py-4 border-b border-red-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-700 font-semibold">
                <AlertCircle className="size-5" />
                <h2>Urgent Alerts</h2>
              </div>
              <span className="bg-red-200 text-red-800 text-xs px-2 py-1 rounded-full font-bold">
                {dashboardData.overdueReservations.length} Overdue
              </span>
            </div>

            <div className="p-4 sm:p-6">
              {dashboardData.overdueReservations.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {dashboardData.overdueReservations.map((res) => (
                    <div
                      key={res.id}
                      className="py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2"
                    >
                      <div>
                        <p className="font-medium text-gray-900 truncate">{res.unitName}</p>
                        <p className="text-xs text-gray-500 font-mono">
                          Overdue since {new Date(res.requestDate).toLocaleDateString()}
                        </p>
                      </div>

                      <Link
                        to="/admin/reservations"
                        className="text-sm text-red-600 font-semibold hover:underline flex items-center gap-1"
                      >
                        Resolve <ArrowRight className="size-3" />
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-2 text-gray-500 flex items-center justify-center gap-2 text-sm">
                  <CheckCircle2 className="size-5 text-green-500" />
                  No overdue items.
                </div>
              )}
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MiniListCard
              title="Pending Reservations"
              icon={<Clock className="size-4 text-orange-500" />}
              viewAllTo="/admin/reservations"
              items={dashboardData.pendingReservations}
              emptyText="No pending reservations"
              badgeText="Pending"
              badgeClassName="bg-orange-100 text-orange-700"
              valueRenderer={(res) => (
                <span className="text-xs font-medium text-gray-700 truncate block">{res.unitName}</span>
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
                <span className="text-xs font-medium text-gray-700">{formatCurrency(pay.amount)}</span>
              )}
            />
          </div>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Health Metrics</h2>
            <p className="text-xs text-gray-500 mb-2">Overall occupancy and revenue trends</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        <div className="space-y-6">
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2 font-semibold text-indigo-900">
              <MessageSquare className="size-4" />
              <h2 className="text-sm">Recent Inquiries</h2>
            </div>

            <div className="divide-y divide-gray-100">
              {dashboardData.recentInquiries.length > 0 ? (
                dashboardData.recentInquiries.map((inq) => (
                  <div key={inq.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <p className="text-xs font-semibold text-gray-900 truncate">
                      {inq.subject || 'General Inquiry'}
                    </p>
                    <p className="text-[11px] text-gray-500 line-clamp-1">{inq.message}</p>
                    <Link
                      to="/admin/inquiries"
                      className="text-[10px] text-indigo-600 font-bold mt-2 inline-block"
                    >
                      REPLY
                    </Link>
                  </div>
                ))
              ) : (
                <EmptyPanel text="No new inquiries" />
              )}
            </div>
          </section>

          <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6 font-semibold text-gray-900">
              <Award className="size-5 text-yellow-500" />
              <h2 className="text-sm">Top Performing Units</h2>
            </div>

            <div className="space-y-4">
              {dashboardData.topUnits.length > 0 ? (
                dashboardData.topUnits.map((unit, i) => (
                  <div key={unit.id} className="flex items-center gap-3 group">
                    <div className="relative">
                      <img
                        src={unit.images?.[0] || '/fallback-property.webp'}
                        alt={unit.name}
                        loading="lazy"
                        decoding="async"
                        className="size-10 object-cover rounded-lg border border-gray-100"
                      />
                      <div className="absolute -top-1 -left-1 size-4 bg-gray-900 text-white text-[8px] rounded-full flex items-center justify-center font-bold">
                        {i + 1}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{unit.name}</p>
                      <p className="text-[10px] text-green-600 font-semibold">
                        {formatCurrency(unit.revenue)}
                      </p>
                    </div>

                    <ArrowRight className="size-3 text-gray-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                ))
              ) : (
                <EmptyPanel text="No unit performance data yet" />
              )}
            </div>
          </section>

          <section className="relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white p-6 shadow-sm">
  <div className="absolute top-0 right-0 h-24 w-24 bg-amber-100 rounded-full blur-2xl opacity-60" />

  <div className="relative z-10">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-amber-100 p-2.5 text-amber-600">
          <MessageSquare className="size-5" />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-900">Reviews</h2>
          <p className="text-[11px] text-gray-500">
            Client feedback & ratings
          </p>
        </div>
      </div>

      <Link
        to="/admin/reviews"
        className="text-xs font-semibold text-amber-600 hover:text-amber-700 transition"
      >
        View All
      </Link>
    </div>

    <div className="rounded-lg border border-amber-100 bg-white p-4 mb-4">
      <p className="text-sm text-gray-700 leading-relaxed">
        Monitor client feedback, identify low-rated units, and stay updated with
        the latest reviews across your properties.
      </p>
    </div>

    <Link
      to="/admin/reviews"
      className="group flex items-center justify-between rounded-lg bg-amber-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700"
    >
      <span>Go to Reviews</span>
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
    </Link>
  </div>
</section>

          <section className="rounded-xl bg-gray-900 p-8 text-white shadow-lg">
            <h2 className="mb-4 text-sm font-semibold tracking-widest text-gray-400">
              SYSTEM STATUS
            </h2>

  <div className="space-y-4">
    <div>
      <p className="text-xs text-gray-400">Latest Admin Action</p>

      {dashboardData.latestActivity ? (
        <>
          <p className="text-sm font-medium">
            {dashboardData.latestActivity.publicId || 'No public ID'}
          </p>
          <p className="text-sm font-medium">{dashboardData.latestActivity.action}</p>
          <p className="text-[11px] text-gray-500">
            {new Date(dashboardData.latestActivity.timestamp).toLocaleString()}
          </p>
        </>
      ) : (
        <p className="text-sm text-gray-500">No recent admin activity found.</p>
      )}
    </div>

    <div className="border-t border-gray-800 pt-4">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs">Database Connection</span>
        <span className="size-2 rounded-full bg-green-500 animate-pulse" />
      </div>

      <Link to="/admin/audit" className="text-[11px] text-blue-400 hover:underline">
        Open Audit Logs
      </Link>
    </div>
  </div>
</section>
        </div>
      </div>
    </div>
  );
}