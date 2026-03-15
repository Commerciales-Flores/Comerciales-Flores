import { useData, type UnitType } from '../../contexts/DataContext';
import { BarChart3, TrendingUp, Users, Calendar, Download, Printer, ShieldCheck, FileSpreadsheet, ChevronDown, PieChartIcon } from 'lucide-react';
import { BarChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, LineChart, Brush } from 'recharts';
import { PieChart, Pie, Cell } from 'recharts';
import { formatCurrency } from '../../utils/currency';
import { getUnitTypeLabel } from '../../utils/propertyHelpers';
import { useState } from 'react';
import jsPDF from "jspdf";
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print'; 
import html2canvas from "html2canvas";
import { saveAs } from 'file-saver';

export default function AdminAnalytics() {
  const { reservations, payments, units } = useData();
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');

  // Monthly reservations (last 6 months)
    const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const monthStr = date.toISOString().slice(0, 7);

    const monthReservations = reservations.filter(b => b.requestDate.startsWith(monthStr)).length;
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const monthRevenue = payments
      .filter(p => {
        const pDate = new Date(p.date);
        return pDate >= startOfMonth && pDate <= endOfMonth && p.status === 'paid';
      })
      .reduce((sum, p) => sum + p.amount, 0);
    

    return {
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      reservations: monthReservations,
      revenue: Number((monthRevenue / 1000).toFixed(1)), // display in 'k' for simplicity
    };
  });

    const dailyData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const dateStr = date.toISOString().slice(0, 10); // "YYYY-MM-DD"

    const dayReservations = reservations.filter(b => b.requestDate.startsWith(dateStr)).length;
    const dayRevenue = payments
      .filter(p => p.date.startsWith(dateStr) && p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), // e.g. "Feb 22"
      reservations: dayReservations,
      revenue: Number((dayRevenue / 1000).toFixed(1)),
    };
  });

  const weeklyData = Array.from({ length: 12 }, (_, i) => {
    const start = new Date();
    start.setDate(start.getDate() - (7 * (11 - i))); // start of the week
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const weekReservations = reservations.filter(b => {
      const d = new Date(b.requestDate);
      return d >= start && d <= end;
    }).length;

    const weekRevenue = payments.filter(p => {
      const d = new Date(p.date);
      return d >= start && d <= end && p.status === 'paid';
    }).reduce((sum, p) => sum + p.amount, 0);

    return {
      week: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      reservations: weekReservations,
      revenue: Number((weekRevenue / 1000).toFixed(1)),
    };
  });

    const currentYear = new Date().getFullYear();
    const yearlyData = Array.from({ length: 5 }, (_, i) => {
    const year = currentYear - (4 - i);

    const yearReservations = reservations.filter(b => new Date(b.requestDate).getFullYear() === year).length;
    const yearRevenue = payments
      .filter(p => new Date(p.date).getFullYear() === year && p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      year: year.toString(),
      reservations: yearReservations,
      revenue: Number((yearRevenue / 1000).toFixed(1)),
    };
  });

      // 1. Determine which data array to use and what the X-Axis key is
    const chartData = {
      daily: dailyData,
      weekly: weeklyData,
      monthly: monthlyData,
      yearly: yearlyData,
    }[granularity];

    const xAxisKey = granularity === 'daily' ? 'day' : granularity === 'weekly' ? 'week' : granularity === 'monthly' ? 'month' : 'year';

  // Unit performance
  const UnitStats = units.map(Unit => {
    const propReservations = reservations.filter(b => b.unitId === Unit.id && b.status === 'confirmed');
    const revenue = payments.filter(p => {
      const reservation = reservations.find(b => b.id === p.reservationId && b.unitId === Unit.id);
      return reservation && p.status === 'paid';
    }).reduce((sum, p) => sum + p.amount, 0);
    
    return {
      ...Unit,
      reservationCount: propReservations.length,
      revenue,
      occupancyRate: propReservations.length > 0 ? 85 : 0 // Mock occupancy rate
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // Overall statistics
  const totalRevenue = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalReservations = reservations.length;
  const confirmedReservations = reservations.filter(
    b => b.status === 'confirmed' || b.status === 'approved'
  ).length;
  const averageReservationValue =
  confirmedReservations > 0 ? totalRevenue / confirmedReservations : 0;
  
  
  // Average tenant stay
  const averageStay = reservations.filter(b => b.status === 'confirmed').reduce((sum, b) => sum + b.duration, 0) / (confirmedReservations || 1);

  // Peak reservation days
  const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const reservationsByDay = dayOfWeek.map((day, index) => ({
    day,
    count: reservations.filter(b => new Date(b.requestDate).getDay() === index).length
  })).sort((a, b) => b.count - a.count);

  // Unit type distribution
  const typeDistributionData = [
    { name: 'Rental Space', value: reservations.filter(b => b.unitType === 'rental_space').length, color: '#6366f1' },
    { name: 'Function Hall', value: reservations.filter(b => b.unitType === 'function_hall').length, color: '#a78bfa' },
    { name: 'Parking Slot', value: reservations.filter(b => b.unitType === 'parking_slot').length, color: '#f97316' },
  ];


const printRef = useRef<HTMLDivElement>(null);
const handlePrint = useReactToPrint({
  contentRef: printRef,
  documentTitle: `Comerciales-Flores-Analytics-Report-${new Date().toISOString().split('T')[0]}`,
  onAfterPrint: () => console.log('Print done!'),
});

// Helper function to convert array of objects to CSV and trigger download
const exportToCsv = (filename: string, rows: any[]) => {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);

  const csv = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(field => `"${row[field]}"`).join(',')
    ),
  ].join('\r\n');

  // 👇 Add BOM for Excel UTF-8 support
  const blob = new Blob(
    ['\uFEFF' + csv],
    { type: 'text/csv;charset=utf-8;' }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const handleExportReservationsCsv = () => {
  const data = chartData.map(d => {
    let period: string;

    if (granularity === 'daily' && 'day' in d) {
      period = d.day;
    } else if (granularity === 'weekly' && 'week' in d) {
      period = d.week;
    } else if (granularity === 'monthly' && 'month' in d) {
      period = d.month;
    } else if (granularity === 'yearly' && 'year' in d) {
      period = d.year;
    } else {
      period = ''; // fallback safety
    }

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
};

// -----------------------
// Unit Performance CSV
// -----------------------
const handleExportUnitPerformanceCsv = () => {
  const data = UnitStats.map((p, index) => ({
    Rank: index + 1,
    Unit: p.name,
    Type: getUnitTypeLabel(p.type),
    Reservations: p.reservationCount,
    Revenue: formatCurrency(p.revenue),
    Occupancy: `${p.occupancyRate}%`,
  }));

  exportToCsv(`UnitPerformance-${new Date().toISOString().split('T')[0]}.csv`, data);
};

// -----------------------
// Unit Type Distribution CSV
// -----------------------
const handleExportUnitTypeCsv = () => {
  const total = typeDistributionData.reduce((sum, e) => sum + e.value, 0);
  const data = typeDistributionData.map(entry => {
    const percent = ((entry.value / total) * 100).toFixed(0);
    return {
      Type: entry.name,
      Reservations: entry.value,
      Percentage: `${percent}%`,
    };
  });

  exportToCsv(`UnitTypeDistribution-${new Date().toISOString().split('T')[0]}.csv`, data);
};


return (
    <div className="bg-gray-50 min-h-screen p-3 sm:p-6 lg:p-8 flex flex-col gap-4 sm:gap-6">
      {/* Header Section */}
      <div className="flex flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Analytics</h1>
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

      {/* Scoped Styles for PDF/Print */}
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
        {/* Key Metrics Grid - 2x2 on Mobile, 4x1 on Desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-3 sm:p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase">Revenue</p>
              <TrendingUp className="size-4 sm:size-5 text-green-600" />
            </div>
            <p className="text-base sm:text-xl font-bold text-green-600 truncate">{formatCurrency(totalRevenue)}</p>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Verified</p>
          </div>

          <div className="bg-white p-3 sm:p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase">Reservations</p>
              <Calendar className="size-4 sm:size-5 text-blue-600" />
            </div>
            <p className="text-base sm:text-xl font-bold text-gray-900">{totalReservations}</p>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">{confirmedReservations} confirmed</p>
          </div>

          <div className="bg-white p-3 sm:p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase">Avg Value</p>
              <BarChart3 className="size-4 sm:size-5 text-purple-600" />
            </div>
            <p className="text-base sm:text-xl font-bold text-gray-900 truncate">{formatCurrency(averageReservationValue)}</p>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Per reservation</p>
          </div>

          <div className="bg-white p-3 sm:p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase">Avg Stay</p>
              <Users className="size-4 sm:size-5 text-orange-600" />
            </div>
            <p className="text-base sm:text-xl font-bold text-gray-900">{averageStay.toFixed(1)}</p>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Units</p>
          </div>
        </div>

        {/* Charts Stack */}
        <div className="space-y-4 sm:space-y-6">
          {/* Reservations Chart */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-sm">
            <div className="flex flex-row items-center justify-between mb-6">
              <h2 className="text-sm sm:text-lg font-bold text-gray-800">Reservations</h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    className="appearance-none bg-gray-50 border border-gray-200 text-[10px] sm:text-sm rounded-lg pl-2 pr-7 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 font-medium cursor-pointer"
                    value={granularity}
                    onChange={(e) => setGranularity(e.target.value as typeof granularity)}
                  >
                    <option value="daily">Daily (Last 30 Days)</option>
                    <option value="weekly">Weekly (Last 12 Weeks)</option>
                    <option value="monthly">Monthly (Last 6 Months)</option>
                    <option value="yearly">Yearly (Last 5 Years)</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3 text-gray-400 pointer-events-none" />
                </div>
                <button
                  onClick={handleExportReservationsCsv}
                  className="bg-green-600 text-white p-1.5 sm:px-3 sm:py-1.5 rounded-lg hover:bg-green-700 transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="size-4" />
                  <span className="hidden sm:inline text-sm font-medium">Export CSV</span>
            </button>
              </div>
            </div>
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
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                  }}
                  cursor={{ fill: '#f1f5f9' }} // Light blue-gray hover background
                />
                <Bar 
                  dataKey="reservations" 
                  fill="#2563eb" // Deeper Blue (Blue-600)
                  activeBar={{ fill: '#1d4ed8' }} // Darker Blue on Hover (Blue-700)
                  radius={[4, 4, 0, 0]} 
                  barSize={granularity === 'daily' ? 12 : 32} 
                />
                
                {(granularity === 'daily' || granularity === 'weekly') && (
                  <Brush 
                    dataKey={xAxisKey} 
                    height={20} 
                    stroke="#3b82f6" // Blue stroke for the zoom bar
                    fill="#eff6ff"   // Very light blue fill for the zoom bar
                    travellerWidth={10}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-sm">
            <h2 className="text-sm sm:text-lg font-bold text-gray-800 mb-6">Revenue Trend (₱k)</h2>
            <div className="h-[220px] sm:h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey={xAxisKey} axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `₱${value}k`} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={3} dot={{ r: 3, fill: '#16a34a' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Peak Reservations Days */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-6">Reservations by Day of Week</h2>
          <div className="h-[180px] sm:h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reservationsByDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="day" 
                  tickFormatter={(val) => val.slice(0, 3)} // Show "Sun", "Mon", etc.
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="count" name="Reservations" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Unit Performance Table */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm sm:text-lg font-bold text-gray-800">Unit Ranking</h2>
            <button
              onClick={handleExportUnitPerformanceCsv}
              className="bg-purple-600 text-white p-1.5 sm:px-3 sm:py-1.5 rounded-lg hover:bg-purple-700 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <FileSpreadsheet className="size-4" />
              <span className="hidden sm:inline text-sm font-medium">Export CSV</span>
            </button>
          </div>
          
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[500px] sm:min-w-full">
              <thead className="bg-gray-50 sm:bg-transparent">
                <tr className="border-b border-gray-100">
                  <th className="px-4 sm:px-0 py-3 text-left text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">Rank</th>
                  <th className="py-3 text-left text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">Unit</th>
                  <th className="hidden md:table-cell py-3 text-left text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">Type</th>
                  <th className="py-3 text-right text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">Revenue</th>
                  <th className="py-3 text-right text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest px-4 sm:px-0">Occ%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {UnitStats.map((Unit, index) => (
                  <tr key={Unit.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 sm:px-0 py-4 text-xs sm:text-sm text-gray-400 font-medium">#{index + 1}</td>
                    <td className="py-4">
                      <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate max-w-[120px] sm:max-w-xs">{Unit.name}</p>
                      <p className="md:hidden text-[10px] text-gray-400">{getUnitTypeLabel(Unit.type)}</p>
                    </td>
                    <td className="hidden md:table-cell py-4 text-xs text-gray-500">{getUnitTypeLabel(Unit.type)}</td>
                    <td className="py-4 text-right text-xs sm:text-sm font-bold text-green-600">{formatCurrency(Unit.revenue)}</td>
                    <td className="py-4 text-right px-4 sm:px-0">
                      <div className="inline-flex items-center justify-end gap-2 w-full">
                        <span className="text-[10px] sm:text-xs font-medium text-gray-600">{Unit.occupancyRate}%</span>
                        <div className="hidden xs:block w-12 bg-gray-100 rounded-full h-1.5">
                          <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${Unit.occupancyRate}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Unit Type Distribution */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm sm:text-lg font-bold text-gray-800 flex items-center gap-2">
              <PieChartIcon className="size-4 text-blue-500" />
              Distribution
            </h2>
            <button
              onClick={handleExportUnitTypeCsv}
              className="bg-blue-600 text-white p-2 sm:px-3 sm:py-1.5 rounded-lg hover:bg-blue-700 transition-all shadow-sm flex items-center gap-2 active:scale-95"
              title="Export CSV"
            >
              <FileSpreadsheet className="size-4" />
              <span className="hidden sm:inline text-sm font-medium">Export CSV</span>
            </button>
          </div>
          
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="h-[220px] w-full sm:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeDistributionData}
                    dataKey="value"
                    cx="50%" cy="50%"
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
                const percent = ((entry.value / total) * 100).toFixed(0);
                return (
                  <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="size-3 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-xs font-medium text-gray-700 truncate max-w-[100px]">{entry.name}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-900">₱{entry.value.toLocaleString()} ({percent}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Income Summary - Gradient Card */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-4 sm:p-8 text-white shadow-lg shadow-emerald-900/10">
          <h2 className="text-base sm:text-xl font-bold mb-6 opacity-90">Financial Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/15 transition">
              <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider opacity-70 mb-1">Total Collected</p>
              <p className="text-lg sm:text-2xl font-black">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/15 transition">
              <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider opacity-70 mb-1">Pending</p>
              <p className="text-lg sm:text-2xl font-black">
                {formatCurrency(reservations.filter(b => b.status === 'confirmed').reduce((sum, b) => sum + (b.totalAmount - b.paidAmount), 0))}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/15 transition">
              <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider opacity-70 mb-1">Expected Total</p>
              <p className="text-lg sm:text-2xl font-black">
                {formatCurrency(reservations.filter(b => b.status === 'confirmed').reduce((sum, b) => sum + b.totalAmount, 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Data Privacy */}
      <div className="mt-2 flex items-center justify-center gap-2 text-gray-400 bg-white/50 border border-gray-200 rounded-xl p-3">
        <ShieldCheck className="size-4" />
        <p className="text-[10px] sm:text-xs font-medium text-center">
          Compliant with Philippine Data Privacy Act of 2012
        </p>
      </div>
    </div>
  );
}

