import { useData, type PropertyType } from '../../contexts/DataContext';
import { BarChart3, TrendingUp, Users, Calendar } from 'lucide-react';
import { BarChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, LineChart, Brush } from 'recharts';
import { PieChart, Pie, Cell } from 'recharts';
import { formatCurrency } from '../../utils/currency';
import { getPropertyTypeLabel } from '../../utils/propertyHelpers';
import { useState } from 'react';
import jsPDF from "jspdf";
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print'; 
import html2canvas from "html2canvas";

export default function AdminAnalytics() {
  const { reservations, payments, properties } = useData();
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

  // Property performance
  const propertyStats = properties.map(property => {
    const propReservations = reservations.filter(b => b.propertyId === property.id && b.status === 'confirmed');
    const revenue = payments.filter(p => {
      const reservation = reservations.find(b => b.id === p.reservationId && b.propertyId === property.id);
      return reservation && p.status === 'paid';
    }).reduce((sum, p) => sum + p.amount, 0);
    
    return {
      ...property,
      reservationCount: propReservations.length,
      revenue,
      occupancyRate: propReservations.length > 0 ? 85 : 0 // Mock occupancy rate
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // Overall statistics
  const totalRevenue = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalReservations = reservations.length;
  const confirmedReservations = reservations.filter(b => b.status === 'confirmed').length;
  const averageReservationValue = totalReservations > 0 ? totalRevenue / confirmedReservations : 0;
  
  
  // Average tenant stay
  const averageStay = reservations.filter(b => b.status === 'confirmed').reduce((sum, b) => sum + b.duration, 0) / (confirmedReservations || 1);

  // Peak reservation days
  const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const reservationsByDay = dayOfWeek.map((day, index) => ({
    day,
    count: reservations.filter(b => new Date(b.requestDate).getDay() === index).length
  })).sort((a, b) => b.count - a.count);

  // Property type distribution
  const typeDistributionData = [
    { name: 'Rental Space', value: reservations.filter(b => b.propertyType === 'rental_space').length, color: '#6366f1' },
    { name: 'Function Hall', value: reservations.filter(b => b.propertyType === 'function_hall').length, color: '#a78bfa' },
    { name: 'Parking Slot', value: reservations.filter(b => b.propertyType === 'parking_slot').length, color: '#f97316' },
  ];


const printRef = useRef<HTMLDivElement>(null);
const handlePrint = useReactToPrint({
  contentRef: printRef,
  documentTitle: `Comerciales-Flores-Analytics-Report-${new Date().toISOString().split('T')[0]}`,
  onAfterPrint: () => console.log('Print done!'),
});

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="mb-2">Analytics & Reports</h1>
          <p className="text-gray-600">Business insights and performance metrics</p>
        </div>

        <button
          onClick={handlePrint}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer"
        >
          Export Analytics
        </button>
      </div>

      <style>
    {`
      .pdf-export-mode {
        color: #111827 !important;
        background-color: #ffffff !important;
      }
      .pdf-export-mode * {
        border-color: #e5e7eb !important;
        outline-color: #3b82f6 !important;
      }
    `}
  </style>

    <div ref={printRef}>
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Revenue</p>
              <TrendingUp className="size-5 text-green-600" />
            </div>
            <p className="text-green-600">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-gray-500 mt-1">All-time verified payments</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Reservations</p>
              <Calendar className="size-5 text-blue-600" />
            </div>
            <p className="text-gray-900">{totalReservations}</p>
            <p className="text-xs text-gray-500 mt-1">{confirmedReservations} confirmed</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Avg reservation Value</p>
              <BarChart3 className="size-5 text-purple-600" />
            </div>
            <p className="text-gray-900">{formatCurrency(averageReservationValue)}</p>
            <p className="text-xs text-gray-500 mt-1">Per confirmed reservation</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Avg Stay Duration</p>
              <Users className="size-5 text-orange-600" />
            </div>
            <p className="text-gray-900">{averageStay.toFixed(1)}</p>
            <p className="text-xs text-gray-500 mt-1">Units (hours/days/months)</p>
          </div>
        </div>

        {/* Monthly Trends - Stacked Layout */}
  <div className="space-y-6">
    
    {/* Reservations Chart */}
  <div className="bg-white rounded-lg border border-gray-200 p-6">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-lg font-semibold">Reservations ({granularity})</h2>
      <div className="flex items-center gap-2">
        <select
          className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={granularity}
          onChange={(e) => setGranularity(e.target.value as any)}
        >
          <option value="daily">Daily (Last 30 Days)</option>
          <option value="weekly">Weekly (Last 12 Weeks)</option>
          <option value="monthly">Monthly (Last 6 Months)</option>
          <option value="yearly">Yearly (Last 5 Years)</option>
        </select>
      </div>
    </div>
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis 
            dataKey={xAxisKey} // DYNAMIC KEY
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#6b7280', fontSize: 10 }} 
          />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: '#f9fafb' }}
            formatter={(value) => [Number(value).toFixed(0), "Reservations"]}
          />
          <Bar dataKey="reservations" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={granularity === 'daily' ? 15 : 40} />
          
          {/* ZOOM FEATURE: Only shows when there's a lot of data (Daily/Weekly) */}
          {(granularity === 'daily' || granularity === 'weekly') && (
            <Brush dataKey={xAxisKey} height={30} stroke="#3b82f6" />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>

  {/* Revenue Chart */}
  <div className="bg-white rounded-lg border border-gray-200 p-6">
    <h2 className="text-lg font-semibold mb-6">Revenue Trend (₱k)</h2>
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis 
            dataKey={xAxisKey} // DYNAMIC KEY
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#6b7280', fontSize: 10 }} 
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tickFormatter={(value) => `₱${value}k`} 
          />
          <Tooltip formatter={(value) => [`₱${value}k`, "Revenue"]} />
          <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={3} dot={{ r: 4 }} />
          
          {/* ZOOM FEATURE */}
          {(granularity === 'daily' || granularity === 'weekly') && (
            <Brush dataKey={xAxisKey} height={30} stroke="#16a34a" />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>

  {/* Peak Reservations Days */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-6">Reservations by Day of Week</h2>
          <div className="h-[200px] w-full">
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

  </div>

        {/* Property Performance */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="mb-6">Property Performance Ranking</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 text-sm text-gray-600">Rank</th>
                  <th className="text-left py-3 text-sm text-gray-600">Property</th>
                  <th className="text-left py-3 text-sm text-gray-600">Type</th>
                  <th className="text-left py-3 text-sm text-gray-600">Reservations</th>
                  <th className="text-left py-3 text-sm text-gray-600">Revenue</th>
                  <th className="text-left py-3 text-sm text-gray-600">Occupancy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {propertyStats.map((property, index) => (
                  <tr key={property.id}>
                    <td className="py-3 text-gray-900">#{index + 1}</td>
                    <td className="py-3 text-gray-900">{property.name}</td>
                    <td className="py-3 text-gray-600 text-sm">{getPropertyTypeLabel(property.type)}</td>
                    <td className="py-3 text-gray-900">{property.reservationCount}</td>
                    <td className="py-3 text-green-600">{formatCurrency(property.revenue)}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2 max-w-[100px]">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${property.occupancyRate}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{property.occupancyRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

              {/* Property Type Distribution */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="mb-6">Reservations by Property Type</h2>
        
        {/* Pie Chart */}
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={typeDistributionData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                isAnimationActive={false} // Disable animation for better export
                label={false} // Hide SVG labels, we'll use a legend instead
              >
                {typeDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => {
                  const safeValue = typeof value === 'number' ? `₱${value.toLocaleString()}` : value ?? '₱0';
                  return [safeValue, name ?? ''];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Printable Legend */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {typeDistributionData.map((entry, index) => {
            const percent = ((entry.value / typeDistributionData.reduce((sum, e) => sum + e.value, 0)) * 100).toFixed(0);
            return (
              <div key={index} className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-gray-900 text-sm">
                  {entry.name}: ₱{entry.value.toLocaleString()} ({percent}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

        {/* Income Summary */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
          <h2 className="mb-4">Income Summary</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Collected</p>
              <p className="text-green-700">{formatCurrency(totalRevenue)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Pending Collection</p>
              <p className="text-yellow-700">
                {formatCurrency(reservations.filter(b => b.status === 'confirmed').reduce((sum, b) => sum + (b.totalAmount - b.paidAmount), 0))}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Expected Total</p>
              <p className="text-blue-700">
                {formatCurrency(reservations.filter(b => b.status === 'confirmed').reduce((sum, b) => sum + b.totalAmount, 0))}
              </p>
            </div>
          </div>
        </div>
    </div>

      {/* Data Privacy Notice */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-600">
          All analytics data is handled in compliance with the Philippine Data Privacy Act of 2012
        </p>
      </div>
    </div>
  );
}
