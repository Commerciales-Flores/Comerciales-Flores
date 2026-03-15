import { useMemo, useRef, useState, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  Printer,
  ShieldCheck,
  FileSpreadsheet,
  ChevronDown,
  PieChartIcon,
} from 'lucide-react';
import {
  BarChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Brush,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useReactToPrint } from 'react-to-print';
import { useData, type UnitType } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/currency';
import { getUnitTypeLabel } from '../../utils/propertyHelpers';

type Granularity = 'daily' | 'weekly' | 'monthly' | 'yearly';

type ChartPoint = {
  reservations: number;
  revenue: number;
  day?: string;
  week?: string;
  month?: string;
  year?: string;
};

export default function AdminAnalytics() {
  const { reservations, payments, units } = useData();
  const [granularity, setGranularity] = useState<Granularity>('monthly');
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Comerciales-Flores-Analytics-Report-${new Date().toISOString().split('T')[0]}`,
  });
  

  const paidPayments = useMemo(
    () => payments.filter((p) => p.status === 'paid'),
    [payments]
  );

  const reservationById = useMemo(() => {
    const map = new Map<string, (typeof reservations)[number]>();
    for (const reservation of reservations) {
      map.set(reservation.id, reservation);
    }
    return map;
  }, [reservations]);

  const paidRevenueByUnitId = useMemo(() => {
    const revenueMap = new Map<string, number>();

    for (const payment of paidPayments) {
      const reservation = reservationById.get(payment.reservationId);
      if (!reservation) continue;

      const current = revenueMap.get(reservation.unitId) ?? 0;
      revenueMap.set(reservation.unitId, current + payment.amount);
    }

    return revenueMap;
  }, [paidPayments, reservationById]);

  const confirmedReservations = useMemo(
    () =>
      reservations.filter(
        (r) => r.status === 'confirmed' || r.status === 'approved'
      ),
    [reservations]
  );

  const fullyConfirmedReservations = useMemo(
    () => reservations.filter((r) => r.status === 'confirmed'),
    [reservations]
  );

  const totalRevenue = useMemo(
    () => paidPayments.reduce((sum, p) => sum + p.amount, 0),
    [paidPayments]
  );

  const totalReservations = reservations.length;

  const averageReservationValue = useMemo(() => {
    return confirmedReservations.length > 0
      ? totalRevenue / confirmedReservations.length
      : 0;
  }, [confirmedReservations.length, totalRevenue]);

  const averageStay = useMemo(() => {
    if (fullyConfirmedReservations.length === 0) return 0;
    const totalDuration = fullyConfirmedReservations.reduce(
      (sum, r) => sum + r.duration,
      0
    );
    return totalDuration / fullyConfirmedReservations.length;
  }, [fullyConfirmedReservations]);

  const reservationsByDay = useMemo(() => {
    const dayOfWeek = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    return dayOfWeek
      .map((day, index) => ({
        day,
        count: reservations.filter(
          (r) => new Date(r.requestDate).getDay() === index
        ).length,
      }))
      .sort((a, b) => b.count - a.count);
  }, [reservations]);

  const typeDistributionData = useMemo(
    () => [
      {
        name: 'Rental Space',
        value: reservations.filter((r) => r.unitType === 'rental_space').length,
        color: '#6366f1',
      },
      {
        name: 'Function Hall',
        value: reservations.filter((r) => r.unitType === 'function_hall').length,
        color: '#a78bfa',
      },
      {
        name: 'Parking Slot',
        value: reservations.filter((r) => r.unitType === 'parking_slot').length,
        color: '#f97316',
      },
    ],
    [reservations]
  );

  const unitStats = useMemo(() => {
  const now = new Date();

  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const startOfCurrentYear = new Date(now.getFullYear(), 0, 1);
  const endOfCurrentYear = new Date(now.getFullYear(), 11, 31);

  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  const getOverlapDays = (
    rangeStart: Date,
    rangeEnd: Date,
    windowStart: Date,
    windowEnd: Date
  ) => {
    const start = new Date(
      Math.max(rangeStart.getTime(), windowStart.getTime())
    );
    const end = new Date(
      Math.min(rangeEnd.getTime(), windowEnd.getTime())
    );

    if (start > end) return 0;

    return Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
  };

  const getOverlapMonths = (
    rangeStart: Date,
    rangeEnd: Date,
    windowStart: Date,
    windowEnd: Date
  ) => {
    const start = new Date(
      Math.max(rangeStart.getTime(), windowStart.getTime())
    );
    const end = new Date(
      Math.min(rangeEnd.getTime(), windowEnd.getTime())
    );

    if (start > end) return 0;

    return (
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth()) +
      1
    );
  };

  const daysInCurrentMonth = endOfCurrentMonth.getDate();
  const monthsInCurrentYear = 12;

  return units
    .map((unit) => {
      const unitReservations = reservations.filter(
        (r) =>
          r.unitId === unit.id &&
          ['approved', 'confirmed', 'completed'].includes(r.status)
      );

      const revenue = paidRevenueByUnitId.get(unit.id) ?? 0;

      let bookedSlots = 0;
      let totalSlots = 0;

      for (const reservation of unitReservations) {
        const start = new Date(reservation.startDate);
        const end = new Date(reservation.endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;

        if (unit.type === 'rental_space') {
          bookedSlots += getOverlapMonths(
            start,
            end,
            startOfCurrentYear,
            endOfCurrentYear
          );
        } else {
          bookedSlots += getOverlapDays(
            start,
            end,
            startOfCurrentMonth,
            endOfCurrentMonth
          );
        }
      }

      if (unit.type === 'rental_space') {
        totalSlots = monthsInCurrentYear;
      } else {
        totalSlots = daysInCurrentMonth;
      }

      const occupancyRate =
        totalSlots > 0 ? Math.min((bookedSlots / totalSlots) * 100, 100) : 0;

      return {
        ...unit,
        reservationCount: unitReservations.length,
        revenue,
        occupancyRate: Number(occupancyRate.toFixed(1)),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}, [units, reservations, paidRevenueByUnitId]);

  const pendingTotal = useMemo(() => {
    return fullyConfirmedReservations.reduce(
      (sum, r) => sum + (r.totalAmount - r.paidAmount),
      0
    );
  }, [fullyConfirmedReservations]);

  const expectedTotal = useMemo(() => {
    return fullyConfirmedReservations.reduce((sum, r) => sum + r.totalAmount, 0);
  }, [fullyConfirmedReservations]);

  const monthlyData = useMemo<ChartPoint[]>(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));

      const monthStr = date.toISOString().slice(0, 7);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthReservations = reservations.filter((r) =>
        r.requestDate.startsWith(monthStr)
      ).length;

      const monthRevenue = paidPayments
        .filter((p) => {
          const paymentDate = new Date(p.date);
          return paymentDate >= startOfMonth && paymentDate <= endOfMonth;
        })
        .reduce((sum, p) => sum + p.amount, 0);

      return {
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        reservations: monthReservations,
        revenue: Number((monthRevenue / 1000).toFixed(1)),
      };
    });
  }, [reservations, paidPayments]);

  const dailyData = useMemo<ChartPoint[]>(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));

      const dateStr = date.toISOString().slice(0, 10);

      const dayReservations = reservations.filter((r) =>
        r.requestDate.startsWith(dateStr)
      ).length;

      const dayRevenue = paidPayments
        .filter((p) => p.date.startsWith(dateStr))
        .reduce((sum, p) => sum + p.amount, 0);

      return {
        day: date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        reservations: dayReservations,
        revenue: Number((dayRevenue / 1000).toFixed(1)),
      };
    });
  }, [reservations, paidPayments]);

  const weeklyData = useMemo<ChartPoint[]>(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const start = new Date();
      start.setDate(start.getDate() - 7 * (11 - i));

      const end = new Date(start);
      end.setDate(end.getDate() + 6);

      const weekReservations = reservations.filter((r) => {
        const d = new Date(r.requestDate);
        return d >= start && d <= end;
      }).length;

      const weekRevenue = paidPayments
        .filter((p) => {
          const d = new Date(p.date);
          return d >= start && d <= end;
        })
        .reduce((sum, p) => sum + p.amount, 0);

      return {
        week: `${start.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })} - ${end.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })}`,
        reservations: weekReservations,
        revenue: Number((weekRevenue / 1000).toFixed(1)),
      };
    });
  }, [reservations, paidPayments]);

  const yearlyData = useMemo<ChartPoint[]>(() => {
    const currentYear = new Date().getFullYear();

    return Array.from({ length: 5 }, (_, i) => {
      const year = currentYear - (4 - i);

      const yearReservations = reservations.filter(
        (r) => new Date(r.requestDate).getFullYear() === year
      ).length;

      const yearRevenue = paidPayments
        .filter((p) => new Date(p.date).getFullYear() === year)
        .reduce((sum, p) => sum + p.amount, 0);

      return {
        year: year.toString(),
        reservations: yearReservations,
        revenue: Number((yearRevenue / 1000).toFixed(1)),
      };
    });
  }, [reservations, paidPayments]);

  const chartData = useMemo(() => {
    return {
      daily: dailyData,
      weekly: weeklyData,
      monthly: monthlyData,
      yearly: yearlyData,
    }[granularity];
  }, [granularity, dailyData, weeklyData, monthlyData, yearlyData]);

  const xAxisKey = useMemo(() => {
    if (granularity === 'daily') return 'day';
    if (granularity === 'weekly') return 'week';
    if (granularity === 'monthly') return 'month';
    return 'year';
  }, [granularity]);

  const hasReservations = reservations.length > 0;
  const hasPaidPayments = paidPayments.length > 0;
  const hasUnits = units.length > 0;
  const hasUnitStats = unitStats.length > 0;
  const hasTypeDistribution = typeDistributionData.some((entry) => entry.value > 0);
  const hasReservationsByDay = reservationsByDay.some((entry) => entry.count > 0);
  const hasChartData = chartData.some(
    (point) => point.reservations > 0 || point.revenue > 0
  );

  const exportToCsv = useCallback((filename: string, rows: Record<string, unknown>[]) => {
    if (!rows.length) return;

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        headers.map((field) => `"${String(row[field] ?? '')}"`).join(',')
      ),
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const handleExportReservationsCsv = useCallback(() => {
    const data = chartData.map((d) => {
      let period = '';

      if ('day' in d && d.day) period = d.day;
      else if ('week' in d && d.week) period = d.week;
      else if ('month' in d && d.month) period = d.month;
      else if ('year' in d && d.year) period = d.year;

      return {
        Period: period,
        Reservations: d.reservations,
        Revenue: formatCurrency(d.revenue * 1000),
      };
    });

    exportToCsv(
      `Reservations-${granularity}-${new Date().toISOString().split('T')[0]}.csv`,
      data
    );
  }, [chartData, granularity, exportToCsv]);

  const handleExportUnitPerformanceCsv = useCallback(() => {
    const data = unitStats.map((unit, index) => ({
      Rank: index + 1,
      Unit: unit.name,
      Type: getUnitTypeLabel(unit.type as UnitType),
      Reservations: unit.reservationCount,
      Revenue: formatCurrency(unit.revenue),
      Occupancy: `${unit.occupancyRate}%`,
    }));

    exportToCsv(
      `UnitPerformance-${new Date().toISOString().split('T')[0]}.csv`,
      data
    );
  }, [unitStats, exportToCsv]);

  const handleExportUnitTypeCsv = useCallback(() => {
    const total = typeDistributionData.reduce((sum, entry) => sum + entry.value, 0);

    const data = typeDistributionData.map((entry) => ({
      Type: entry.name,
      Reservations: entry.value,
      Percentage: `${total > 0 ? ((entry.value / total) * 100).toFixed(0) : 0}%`,
    }));

    exportToCsv(
      `UnitTypeDistribution-${new Date().toISOString().split('T')[0]}.csv`,
      data
    );
  }, [typeDistributionData, exportToCsv]);

  return (
    <div className="bg-gray-50 min-h-screen p-3 sm:p-6 lg:p-8 flex flex-col gap-4 sm:gap-6">
      <div className="flex flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            Analytics
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Business performance & insights
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="bg-blue-600 text-white p-2.5 sm:px-4 sm:py-2 rounded-xl hover:bg-blue-700 transition-all shadow-sm flex items-center gap-2 active:scale-95"
          title="Print Report"
        >
          <Printer className="size-5" />
          <span className="hidden sm:inline font-medium">Print Analytics</span>
        </button>
      </div>

      <style>
        {`
          @media print {
            .no-print { display: none !important; }
            body { background: white; }
          }
          .pdf-export-mode {
            color: #111827 !important;
            background-color: #ffffff !important;
          }
        `}
      </style>

      <div ref={printRef} className="flex flex-col gap-4 sm:gap-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard
            label="Revenue"
            value={formatCurrency(totalRevenue)}
            subtext="Verified"
            icon={<TrendingUp className="size-4 sm:size-5 text-green-600" />}
            valueClassName="text-green-600"
          />

          <MetricCard
            label="Reservations"
            value={totalReservations}
            subtext={`${confirmedReservations.length} confirmed`}
            icon={<Calendar className="size-4 sm:size-5 text-blue-600" />}
          />

          <MetricCard
            label="Avg Value"
            value={formatCurrency(averageReservationValue)}
            subtext="Per reservation"
            icon={<BarChart3 className="size-4 sm:size-5 text-purple-600" />}
          />

          <MetricCard
            label="Avg Stay"
            value={averageStay.toFixed(1)}
            subtext="Units"
            icon={<Users className="size-4 sm:size-5 text-orange-600" />}
          />
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-sm">
  <div className="flex flex-row items-center justify-between mb-6">
    <h2 className="text-sm sm:text-lg font-bold text-gray-800 flex items-center gap-2">
      Reservations
    </h2>

    <div className="flex items-center gap-2">
      <div className="relative">
        <select
          className="appearance-none bg-gray-50 border border-gray-200 text-[10px] sm:text-sm rounded-lg pl-2 pr-7 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 font-medium cursor-pointer"
          value={granularity}
          onChange={(e) => setGranularity(e.target.value as Granularity)}
        >
          <option value="daily">Daily (Last 30 Days)</option>
          <option value="weekly">Weekly (Last 12 Weeks)</option>
          <option value="monthly">Monthly (Last 6 Months)</option>
          <option value="yearly">Yearly (Last 5 Years)</option>
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3 text-gray-400 pointer-events-none" />
      </div>

      {hasChartData ? (
        <button
          onClick={handleExportReservationsCsv}
          className="bg-green-600 text-white p-1.5 sm:px-3 sm:py-1.5 rounded-lg hover:bg-green-700 transition-colors shadow-sm flex items-center gap-1.5"
        >
          <FileSpreadsheet className="size-4" />
          <span className="hidden sm:inline text-sm font-medium">
            Export CSV
          </span>
        </button>
      ) : (
        <DisabledExportButton>
          <FileSpreadsheet className="size-4" />
          <span className="hidden sm:inline text-sm font-medium">
            Export CSV
          </span>
        </DisabledExportButton>
      )}
    </div>
  </div>

  {hasChartData ? (
    <div className="h-[220px] sm:h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis
            dataKey={xAxisKey}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
            }}
            cursor={{ fill: '#f1f5f9' }}
          />
          <Bar
            dataKey="reservations"
            fill="#2563eb"
            activeBar={{ fill: '#1d4ed8' }}
            radius={[4, 4, 0, 0]}
            barSize={granularity === 'daily' ? 12 : 32}
          />
          {(granularity === 'daily' || granularity === 'weekly') && (
            <Brush
              dataKey={xAxisKey}
              height={20}
              stroke="#3b82f6"
              fill="#eff6ff"
              travellerWidth={10}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  ) : (
    <AnalyticsEmptyState
      icon={<Calendar className="size-7" />}
      title="No reservation trend yet"
      description="Reservation activity will appear here once bookings start coming in."
      hint="Create or confirm reservations to populate this chart."
    />
  )}
</div>

          <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-sm">
  <h2 className="text-sm sm:text-lg font-bold text-gray-800 flex items-center gap-2">
    Revenue Trend (₱k)
  </h2>

  {hasPaidPayments ? (
    <div className="h-[220px] sm:h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis
            dataKey={xAxisKey}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `₱${value}k`}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
          />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#16a34a"
            strokeWidth={3}
            dot={{ r: 3, fill: '#16a34a' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  ) : (
    <AnalyticsEmptyState
      icon={<TrendingUp className="size-7" />}
      title="No verified revenue yet"
      description="Revenue analytics will appear once payments are verified and recorded."
      hint="Mark payments as paid to unlock revenue insights."
    />
  )}
</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
  <h2 className="text-sm sm:text-lg font-bold text-gray-800 flex items-center gap-2">Reservations by Day of Week</h2>

  {hasReservationsByDay ? (
    <div className="h-[180px] sm:h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={reservationsByDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis
            dataKey="day"
            tickFormatter={(val) => val.slice(0, 3)}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6b7280', fontSize: 12 }}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6b7280', fontSize: 12 }}
          />
          <Tooltip cursor={{ fill: '#f9fafb' }} />
          <Bar dataKey="count" name="Reservations" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  ) : (
    <AnalyticsEmptyState
      icon={<BarChart3 className="size-7" />}
      title="No weekday pattern yet"
      description="We need reservation history before we can identify your busiest days."
      hint="Once bookings accumulate, this section will highlight demand patterns."
    />
  )}
</div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm sm:text-lg font-bold text-gray-800 flex items-center gap-2">Unit Ranking</h2>
            {hasUnitStats ? (
                <button
                  onClick={handleExportUnitPerformanceCsv}
                  className="bg-purple-600 text-white p-1.5 sm:px-3 sm:py-1.5 rounded-lg hover:bg-purple-700 transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="size-4" />
                  <span className="hidden sm:inline text-sm font-medium">Export CSV</span>
                </button>
              ) : (
                <DisabledExportButton>
                  <FileSpreadsheet className="size-4" />
                  <span className="hidden sm:inline text-sm font-medium">Export CSV</span>
                </DisabledExportButton>
              )}
          </div>

          {hasUnitStats ? (
  <div className="overflow-x-auto -mx-4 sm:mx-0">
    <table className="w-full min-w-[500px] sm:min-w-full">
      <thead className="bg-gray-50 sm:bg-transparent">
        <tr className="border-b border-gray-100">
          <th className="px-4 sm:px-0 py-3 text-left text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">
            Rank
          </th>
          <th className="py-3 text-left text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">
            Unit
          </th>
          <th className="hidden md:table-cell py-3 text-left text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">
            Type
          </th>
          <th className="py-3 text-right text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">
            Revenue
          </th>
          <th className="py-3 text-right text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest px-4 sm:px-0">
            Occupancy
          </th>
        </tr>
      </thead>

      <tbody className="divide-y divide-gray-50">
        {unitStats.map((unit, index) => (
          <tr key={unit.id} className="hover:bg-gray-50/50 transition-colors">
            <td className="px-4 sm:px-0 py-4 text-xs sm:text-sm text-gray-400 font-medium">
              #{index + 1}
            </td>
            <td className="py-4">
              <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate max-w-[120px] sm:max-w-xs">
                {unit.name}
              </p>
              <p className="md:hidden text-[10px] text-gray-400">
                {getUnitTypeLabel(unit.type as UnitType)}
              </p>
            </td>
            <td className="hidden md:table-cell py-4 text-xs text-gray-500">
              {getUnitTypeLabel(unit.type as UnitType)}
            </td>
            <td className="py-4 text-right text-xs sm:text-sm font-bold text-green-600">
              {formatCurrency(unit.revenue)}
            </td>
            <td className="py-4 text-right px-4 sm:px-0">
              <div className="inline-flex items-center justify-end gap-2 w-full">
                <span className="text-[10px] sm:text-xs font-medium text-gray-600">
                  {unit.occupancyRate}%
                </span>
                <div className="hidden xs:block w-12 bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full"
                    style={{ width: `${unit.occupancyRate}%` }}
                  />
                </div>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
) : (
  <AnalyticsEmptyState
    icon={<Users className="size-7" />}
    title="No unit performance data yet"
    description="Unit rankings will appear once units start generating reservations and revenue."
    hint="Add units and complete bookings to compare performance."
  />
)}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm sm:text-lg font-bold text-gray-800 flex items-center gap-2">
              Distribution
            </h2>
            {hasTypeDistribution ? (
              <button
                onClick={handleExportUnitTypeCsv}
                className="bg-blue-600 text-white p-2 sm:px-3 sm:py-1.5 rounded-lg hover:bg-blue-700 transition-all shadow-sm flex items-center gap-2 active:scale-95"
                title="Export CSV"
              >
                <FileSpreadsheet className="size-4" />
                <span className="hidden sm:inline text-sm font-medium">Export CSV</span>
              </button>
            ) : (
              <DisabledExportButton>
                <FileSpreadsheet className="size-4" />
                <span className="hidden sm:inline text-sm font-medium">Export CSV</span>
              </DisabledExportButton>
            )}
          </div>

          {hasTypeDistribution ? (
  <div className="flex flex-col lg:flex-row items-center gap-8">
    <div className="h-[220px] w-full sm:w-1/2">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={typeDistributionData}
            dataKey="value"
            cx="50%"
            cy="50%"
            outerRadius={80}
            innerRadius={60}
            paddingAngle={5}
            isAnimationActive={false}
          >
            {typeDistributionData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>

    <div className="w-full sm:w-1/2 grid grid-cols-1 gap-2">
      {typeDistributionData.map((entry, index) => {
        const total = typeDistributionData.reduce((sum, e) => sum + e.value, 0);
        const percent = total > 0 ? ((entry.value / total) * 100).toFixed(0) : '0';

        return (
          <div
            key={index}
            className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100"
          >
            <div className="flex items-center gap-2">
              <div
                className="size-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs font-medium text-gray-700 truncate max-w-[100px]">
                {entry.name}
              </span>
            </div>
            <span className="text-xs font-bold text-gray-900">
              {entry.value.toLocaleString()} ({percent}%)
            </span>
          </div>
        );
      })}
    </div>
  </div>
) : (
  <AnalyticsEmptyState
    icon={<PieChartIcon className="size-7" />}
    title="No distribution data yet"
    description="Unit type distribution will appear once reservations are recorded."
    hint="Rental spaces, halls, and parking slots will be compared here."
  />
)}
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-4 sm:p-8 text-white shadow-lg shadow-emerald-900/10">
          <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-emerald-50/90 flex items-center gap-2 mb-6">
            Financial Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <OverviewCard 
              label="Total Collected" 
              value={formatCurrency(totalRevenue)} 
              // Ensure these props inside your component use font-bold for values
            />
            <OverviewCard label="Pending" value={formatCurrency(pendingTotal)} />
            <OverviewCard label="Expected Total" value={formatCurrency(expectedTotal)} />
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center gap-2 text-gray-400 bg-white/50 border border-gray-200 rounded-xl p-3">
        <ShieldCheck className="size-4" />
        <p className="text-[10px] sm:text-xs font-medium text-center">
          Compliant with Philippine Data Privacy Act of 2012
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtext,
  icon,
  valueClassName = 'text-gray-900',
}: {
  label: string;
  value: string | number;
  subtext: string;
  icon: React.ReactNode;
  valueClassName?: string;
}) {
  const isZero =
    value === 0 || value === '0' || value === '0.0' || value === '₱0.00';

  return (
    <div className="bg-white p-3 sm:p-6 rounded-2xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-1 sm:mb-2">
        <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase">
          {label}
        </p>
        {icon}
      </div>
      <p
        className={`text-base sm:text-xl font-bold truncate ${
          isZero ? 'text-gray-400' : valueClassName
        }`}
      >
        {value}
      </p>
      <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
        {isZero ? 'Waiting for data' : subtext}
      </p>
    </div>
  );
}

function OverviewCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/15 transition">
      <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider opacity-70 mb-1">
        {label}
      </p>
      <p className="text-lg sm:text-2xl font-black">{value}</p>
    </div>
  );
}

function AnalyticsEmptyState({
  icon,
  title,
  description,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  hint?: string;
}) {
  return (
    <div className="h-full min-h-[220px] sm:min-h-[280px] flex items-center justify-center">
      <div className="max-w-md mx-auto text-center px-6 py-10">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-gray-50 border border-gray-100 text-gray-400">
          {icon}
        </div>
        <h3 className="text-base sm:text-lg font-bold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-500 leading-relaxed">{description}</p>
        {hint && (
          <p className="mt-3 text-xs text-gray-400">{hint}</p>
        )}
      </div>
    </div>
  );
}

function DisabledExportButton({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <button
      disabled
      className="bg-gray-200 text-gray-500 p-1.5 sm:px-3 sm:py-1.5 rounded-lg cursor-not-allowed shadow-sm flex items-center gap-1.5"
    >
      {children}
    </button>
  );
}