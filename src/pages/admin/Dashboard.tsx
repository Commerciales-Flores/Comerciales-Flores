import { useData } from '../../contexts/DataContext';
import { 
  AlertCircle, TrendingUp, Award, Activity, ArrowRight, 
  CheckCircle2, MessageSquare, CreditCard, Clock 
} from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis
} from 'recharts';

export default function AdminDashboard() {
  const { reservations, payments, units, inquiries, auditLogs } = useData();

  // --- Time helpers ---
  const now = new Date();
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  // --- URGENT ALERTS ---
  const overdueReservations = reservations.filter(r => 
    r.status === 'pending' && new Date(r.requestDate) < fortyEightHoursAgo
  );

  // --- Monthly Data ---
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    
    // Create a YYYY-MM string for accurate filtering
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });

    // Filter data for this specific month
    const monthReservations = reservations.filter(r => r.requestDate.startsWith(yearMonth));
    const monthRevenue = payments.filter(p => p.date.startsWith(yearMonth) && p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    // Calculate occupancy for this month: (Active Bookings / Total units) * 100
    const monthOccupancy = units.length > 0 
      ? (monthReservations.length / units.length) * 100 
      : 0;

    return {
      month: monthLabel,
      occupancy: monthOccupancy,
      revenue: monthRevenue,
    };
  });

  const occupancyTrend = monthlyData.map(d => ({
    label: d.month, 
    occupancy: d.occupancy,
  }));

  const revenueTrend = monthlyData.map(d => ({
    label: d.month,
    revenue: d.revenue,
  }));

  // --- Pending Data ---
  const pendingReservations = reservations.filter(r => r.status === 'pending').slice(0, 3);
  const pendingPayments = payments.filter(p => p.status === 'unpaid' || p.status === 'partial').slice(0, 3);
  const recentInquiries = inquiries.filter(i => i.status === 'open').slice(0, 3);

  // --- Health Metrics ---
  const activeunits = units.filter(p => p.available).length;
  const occupancyRate = units.length > 0 ? (activeunits / units.length) * 100 : 0;
  const totalRevenue = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);

  // --- KPI Cards Δ% vs Last Month ---
  const lastMonthReservations = reservations.filter(r => {
    const resDate = new Date(r.requestDate);
    const lastMonth = new Date();
    lastMonth.setMonth(now.getMonth() - 1);
    return resDate.getMonth() === lastMonth.getMonth() && resDate.getFullYear() === lastMonth.getFullYear();
  }).length;

  const reservationsChange = lastMonthReservations > 0 
    ? ((reservations.length - lastMonthReservations) / lastMonthReservations) * 100
    : 0;

  // --- Top units ---
  const topunits = units.map(unit => ({
    ...unit,
    revenue: payments.filter(p => {
      const res = reservations.find(r => r.id === p.reservationId && r.unitId === unit.id);
      return res && p.status === 'paid';
    }).reduce((sum, p) => sum + p.amount, 0)
  })).sort((a, b) => b.revenue - a.revenue).slice(0, 3);

  const latestActivity = auditLogs?.[0] || { action: 'No recent activity', timestamp: new Date() };

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500">Overview of your rental management system</p>
      </header>

      {/* --- KPI Cards --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total Reservations */}
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500">Total Reservations</p>
            <Activity className="size-5 text-purple-500" />
          </div>
          <p className="text-xl font-bold text-gray-900">{reservations.length}</p>
          <span className={`text-sm ${reservationsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {reservationsChange >= 0 ? '↑' : '↓'} {Math.abs(reservationsChange).toFixed(1)}%
          </span>
        </div>

        {/* Confirmed Reservations */}
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500">Confirmed</p>
            <CheckCircle2 className="size-5 text-green-500" />
          </div>
          <p className="text-xl font-bold text-gray-900">
            {reservations.filter(r => r.status === 'confirmed').length}
          </p>
        </div>

        {/* Cancelled Reservations */}
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">  
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500">Cancelled</p>
            <AlertCircle className="size-5 text-red-500" />
          </div>
          <p className="text-xl font-bold text-gray-900">
            {reservations.filter(r => r.status === 'cancelled').length}
          </p>
        </div>

        {/* Total Paid Payments */}
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500">Paid Payments</p>
            <CreditCard className="size-5 text-blue-500" />
          </div>
          <p className="text-xl font-bold text-gray-900">
            {payments.filter(p => p.status === 'paid').length}
          </p>
        </div>
      </div>

      {/* --- Main Dashboard Grid --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MAIN COLUMN */}
        <div className="lg:col-span-2 space-y-6">
          {/* URGENT ALERTS */}
          <section className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
            <div className="bg-red-50 px-4 sm:px-6 py-4 border-b border-red-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-700 font-semibold">
                <AlertCircle className="size-5" />
                <h2>Urgent Alerts</h2>
              </div>
              <span className="bg-red-200 text-red-800 text-xs px-2 py-1 rounded-full font-bold">
                {overdueReservations.length} Overdue
              </span>
            </div>
            <div className="p-4 sm:p-6">
              {overdueReservations.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {overdueReservations.map(res => (
                    <div key={res.id} className="py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <div>
                        <p className="font-medium text-gray-900 truncate">{res.unitName}</p>
                        <p className="text-xs text-gray-500 font-mono">Overdue since {new Date(res.requestDate).toLocaleDateString()}</p>
                      </div>
                      <Link to="/admin/reservations" className="text-sm text-red-600 font-semibold hover:underline flex items-center gap-1">
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

          {/* PENDING REVIEW GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pending Reservations Card */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
                  <Clock className="size-4 text-orange-500" /> Pending Reservations
                </h3>
                <Link to="/admin/reservations" className="text-xs text-blue-600">View All</Link>
              </div>
              <div className="space-y-3">
                {pendingReservations.length > 0 ? (
                  pendingReservations.map(res => (
                    <div key={res.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                      <span className="text-xs font-medium text-gray-700 truncate w-32">{res.unitName}</span>
                      <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded uppercase">Pending</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center bg-gray-50 p-3 rounded text-xs text-gray-500">
                    No pending reservations
                  </div>
                )}
              </div>
            </div>

            {/* Pending Payments Card */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
                  <CreditCard className="size-4 text-blue-500" /> Pending Payments
                </h3>
                <Link to="/admin/payments" className="text-xs text-blue-600">View All</Link>
              </div>
              <div className="space-y-3">
                {pendingPayments.length > 0 ? (
                  pendingPayments.map(pay => (
                    <div key={pay.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                      <span className="text-xs font-medium text-gray-700">{formatCurrency(pay.amount)}</span>
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase">Review</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center bg-gray-50 p-3 rounded text-xs text-gray-500">
                    No pending or partial payments
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* HEALTH METRICS */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Health Metrics</h2>
            <p className="text-xs text-gray-500 mb-2">Overall occupancy and revenue trends</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Occupancy Rate */}
              <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-medium text-gray-500">Occupancy Rate</p>
                  <Activity className="size-5 text-purple-500" />
                </div>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-2xl font-bold">{occupancyRate.toFixed(1)}%</span> {/* smaller font */}
                </div>
                <div className="h-32"> {/* taller chart for bigger card */}
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={occupancyTrend}>
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} /> {/* smaller X-axis font */}
                      <Line type="monotone" dataKey="occupancy" stroke="#7c3aed" strokeWidth={2} dot={false} />
                      <Tooltip 
                    contentStyle={{ fontSize: 10 }} 
                    formatter={(value: number | undefined) => [
                      `${(value ?? 0).toFixed(1)}%`,
                      "Occupancy"
                    ]}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Total Revenue */}
              <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-medium text-gray-500">Total Revenue</p>
                  <TrendingUp className="size-5 text-green-500" />
                </div>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-2xl font-bold">{formatCurrency(totalRevenue)}</span> {/* smaller font */}
                </div>
                <div className="h-32"> {/* taller chart for bigger card */}
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueTrend}>
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} /> {/* smaller X-axis font */}
                      <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} dot={false} />
                      <Tooltip 
                      contentStyle={{ fontSize: 10 }} 
                      formatter={(value: number | undefined) => [
                        `₱${((value ?? 0) / 1000).toFixed(1)}k`,
                        "Revenue"
                      ]}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* SIDEBAR */}
        <div className="space-y-6">
          {/* Recent Inquiries */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2 font-semibold text-indigo-900">
              <MessageSquare className="size-4" />
              <h2 className="text-sm">Recent Inquiries</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {recentInquiries.length > 0 ? (
                recentInquiries.map(inq => (
                  <div key={inq.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <p className="text-xs font-semibold text-gray-900 truncate">{inq.subject || "General Inquiry"}</p>
                    <p className="text-[11px] text-gray-500 line-clamp-1">{inq.message}</p>
                    <Link to="/admin/inquiries" className="text-[10px] text-indigo-600 font-bold mt-2 inline-block">REPLY</Link>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center p-4 text-xs text-gray-500">
                  No new inquiries
                </div>
              )}
            </div>
          </section>

          {/* Top units */}
          <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6 font-semibold text-gray-900">
              <Award className="size-5 text-yellow-500" />
              <h2 className="text-sm">Top Performing Units</h2>
            </div>
            <div className="space-y-4">
              {topunits.map((prop, i) => (
                <div key={prop.id} className="flex items-center gap-3 group">
                  <div className="relative">
                    <img 
                      src={prop.images?.[0] || 'https://via.placeholder.com/40'} 
                      alt={prop.name} 
                      className="size-10 object-cover rounded-lg border border-gray-100"
                    />
                    <div className="absolute -top-1 -left-1 size-4 bg-gray-900 text-white text-[8px] rounded-full flex items-center justify-center font-bold">
                      {i + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{prop.name}</p>
                    <p className="text-[10px] text-green-600 font-semibold">{formatCurrency(prop.revenue)}</p>
                  </div>
                  <ArrowRight className="size-3 text-gray-300 group-hover:text-blue-500 transition-colors" />
                </div>
              ))}
            </div>
          </section>

          {/* SYSTEM STATUS */}
          <section className="bg-gray-900 text-white p-8 rounded-xl shadow-lg">
            <h2 className="text-sm font-uppercase tracking-widest text-gray-400 mb-4">SYSTEM STATUS</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-400">Latest Admin Action</p>
                <p className="text-sm font-medium">{latestActivity.id}</p>
                <p className="text-sm font-medium">{latestActivity.action}</p>
                <p className="text-[10px] text-gray-500">{new Date(latestActivity.timestamp).toLocaleString()}</p>
              </div>
              <div className="pt-4 border-t border-gray-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs">Database Connection</span>
                  <span className="size-2 bg-green-500 rounded-full animate-pulse"></span>
                </div>
                <Link to="/admin/audit-log" className="text-[10px] text-blue-400 hover:underline">
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
