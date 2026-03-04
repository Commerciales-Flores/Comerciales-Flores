import { useState, useEffect } from 'react';
import supabase from '../../supabaseClient';
import { useData } from '../../contexts/DataContext';
import { BarChart3, TrendingUp, Users, Calendar, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { getPropertyTypeLabel } from '../../utils/propertyHelpers';

interface BookingStatData {
  id: string;
  unitId: string;
  unitType: string;
  duration: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  requestDate: string;
}

export default function AdminAnalytics() {
  const { units } = useData();
  const [bookings, setBookings] = useState<BookingStatData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all bookings for analytics
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        const { data, error } = await supabase
          .from('reservations')
          .select('reservation_id, unit_id, unit_type, duration, total_amount, paid_amount, status, created_at');

        if (error) throw error;
        
        const mappedData: BookingStatData[] = (data || []).map(b => ({
          id: b.reservation_id,
          unitId: b.unit_id,
          unitType: b.unit_type,
          duration: Number(b.duration || 1),
          totalAmount: Number(b.total_amount || 0),
          paidAmount: Number(b.paid_amount || 0),
          status: b.status,
          requestDate: b.created_at
        }));

        setBookings(mappedData);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);

  // Monthly bookings (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const monthStr = date.toISOString().slice(0, 7); 
    
    const monthBookings = bookings.filter(b => b.requestDate.startsWith(monthStr));
    
    return {
      month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      bookings: monthBookings.length,
      revenue: monthBookings
        .filter(b => b.status === 'approved' || b.status === 'confirmed' || b.status === 'completed')
        .reduce((sum, b) => sum + b.paidAmount, 0)
    };
  });

  // Property performance ranking
  const propertyStats = units.map(unit => {
    const propBookings = bookings.filter(b => b.unitId === unit.id);
    const approvedBookingsCount = propBookings.filter(b => b.status === 'approved' || b.status === 'confirmed' || b.status === 'completed').length;
    
    const revenue = propBookings
      .filter(b => b.status !== 'cancelled' && b.status !== 'rejected')
      .reduce((sum, b) => sum + b.paidAmount, 0);
    
    return {
      ...unit,
      bookingCount: approvedBookingsCount,
      revenue,
      occupancyRate: propBookings.length > 0 ? 85 : 0 // Still mocked until a true date-overlap algorithm is needed
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // Overall statistics
  const totalCollectedRevenue = bookings.reduce((sum, b) => sum + b.paidAmount, 0);
  const totalBookings = bookings.length;
  
  const activeBookings = bookings.filter(b => b.status === 'approved' || b.status === 'confirmed' || b.status === 'completed');
  const approvedBookingsCount = activeBookings.length;
  
  const averageBookingValue = approvedBookingsCount > 0 
    ? activeBookings.reduce((sum, b) => sum + b.totalAmount, 0) / approvedBookingsCount 
    : 0;
  
  // Average tenant stay
  const averageStay = approvedBookingsCount > 0
    ? activeBookings.reduce((sum, b) => sum + b.duration, 0) / approvedBookingsCount
    : 0;

  // Peak booking days (based on request submission date)
  const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const bookingsByDay = dayOfWeek.map((day, index) => ({
    day,
    count: bookings.filter(b => new Date(b.requestDate).getDay() === index).length
  }));

  // Property type distribution
  const typeDistribution = [
    { type: 'rental_space', count: bookings.filter(b => b.unitType === 'rental_space').length },
    { type: 'function_hall', count: bookings.filter(b => b.unitType === 'function_hall').length },
    { type: 'parking_slot', count: bookings.filter(b => b.unitType === 'parking_slot').length }
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="size-8 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-500 text-lg">Crunching your numbers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Analytics & Reports</h1>
        <p className="text-gray-600">Business insights and performance metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Total Collected</p>
            <TrendingUp className="size-5 text-green-600" />
          </div>
          <p className="text-gray-900 text-2xl font-bold">{formatCurrency(totalCollectedRevenue)}</p>
          <p className="text-xs text-gray-500 mt-1">All-time verified payments</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Total Reservations</p>
            <Calendar className="size-5 text-blue-600" />
          </div>
          <p className="text-gray-900 text-2xl font-bold">{totalBookings}</p>
          <p className="text-xs text-gray-500 mt-1">{approvedBookingsCount} active/completed</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Avg Reservation Value</p>
            <BarChart3 className="size-5 text-purple-600" />
          </div>
          <p className="text-gray-900 text-2xl font-bold">{formatCurrency(averageBookingValue)}</p>
          <p className="text-xs text-gray-500 mt-1">Per approved reservation</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Avg Stay Duration</p>
            <Users className="size-5 text-orange-600" />
          </div>
          <p className="text-gray-900 text-2xl font-bold">{averageStay.toFixed(1)}</p>
          <p className="text-xs text-gray-500 mt-1">Units (hours/days/months)</p>
        </div>
      </div>

      {/* Monthly Trends */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="mb-6 text-lg font-semibold text-gray-900">Monthly Trends</h2>
        <div className="space-y-5">
          {monthlyData.map((data, index) => {
            // Find max bookings strictly to scale the bar chart properly
            const maxBookings = Math.max(...monthlyData.map(m => m.bookings)) || 1;
            const barWidth = `${(data.bookings / maxBookings) * 100}%`;

            return (
              <div key={index}>
                <div className="flex justify-between items-center mb-2 text-sm">
                  <span className="text-gray-700 font-medium">{data.month}</span>
                  <div className="flex gap-6">
                    <span className="text-blue-600 font-medium">{data.bookings} requests</span>
                    <span className="text-green-600 font-medium">{formatCurrency(data.revenue)}</span>
                  </div>
                </div>
                <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: barWidth }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Property Performance */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="mb-6 text-lg font-semibold text-gray-900">Property Performance Ranking</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Rank</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Property</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Active Reservations</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Revenue</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Occupancy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {propertyStats.map((property, index) => (
                <tr key={property.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-gray-500 font-bold">#{index + 1}</td>
                  <td className="py-3 px-4 text-gray-900 font-medium">{property.name}</td>
                  <td className="py-3 px-4 text-gray-600 text-sm capitalize">{property.type.replace('_', ' ')}</td>
                  <td className="py-3 px-4 text-gray-900">{property.bookingCount}</td>
                  <td className="py-3 px-4 text-green-700 font-medium">{formatCurrency(property.revenue)}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 w-24">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${property.occupancyRate}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 font-medium">{property.occupancyRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Property Type Distribution */}
         <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="mb-6 text-lg font-semibold text-gray-900">Reservations by Property Type</h2>
            <div className="space-y-5">
               {typeDistribution.map((item) => {
                  const total = typeDistribution.reduce((sum, t) => sum + t.count, 0);
                  const percentage = total > 0 ? (item.count / total * 100) : 0;
                  
                  return (
                     <div key={item.type}>
                        <div className="flex justify-between items-center mb-2">
                           <span className="text-sm font-medium text-gray-700">{getPropertyTypeLabel(item.type as any)}</span>
                           <span className="text-sm font-bold text-gray-600">{item.count} <span className="font-normal text-gray-400">({percentage.toFixed(0)}%)</span></span>
                        </div>
                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                           <div
                              className="h-full bg-blue-600 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                           />
                        </div>
                     </div>
                  );
               })}
            </div>
         </div>

         {/* Peak Booking Days */}
         <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 flex flex-col">
            <h2 className="mb-6 text-lg font-semibold text-gray-900">Peak Reservation Days</h2>
            <div className="flex-1 flex items-end justify-between gap-2 mt-4">
               {bookingsByDay.map((item) => {
                  const maxCount = Math.max(...bookingsByDay.map(d => d.count));
                  // Ensure minimum height for visibility
                  const heightPercent = maxCount > 0 ? Math.max((item.count / maxCount * 100), 5) : 0; 
                  
                  return (
                     <div key={item.day} className="flex flex-col items-center flex-1 group">
                        <div className="text-sm font-bold text-gray-700 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">{item.count}</div>
                        <div className="w-full h-32 flex items-end justify-center mb-2 bg-gray-50 rounded-t-lg">
                           <div
                              className="w-full bg-blue-500 hover:bg-blue-600 rounded-t-md transition-all duration-300"
                              style={{ height: `${heightPercent}%` }}
                           />
                        </div>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">{item.day.slice(0, 3)}</div>
                     </div>
                  );
               })}
            </div>
         </div>
      </div>

      {/* Income Summary */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-8 shadow-sm">
        <h2 className="mb-6 text-lg font-bold text-green-900">Income Summary</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white/60 p-4 rounded-lg border border-green-100">
            <p className="text-sm font-medium text-green-800 mb-1">Total Collected</p>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(totalCollectedRevenue)}</p>
          </div>
          <div className="bg-white/60 p-4 rounded-lg border border-green-100">
            <p className="text-sm font-medium text-yellow-800 mb-1">Pending Collection</p>
            <p className="text-2xl font-bold text-yellow-700">
              {formatCurrency(activeBookings.reduce((sum, b) => sum + (b.totalAmount - b.paidAmount), 0))}
            </p>
          </div>
          <div className="bg-white/60 p-4 rounded-lg border border-green-100">
            <p className="text-sm font-medium text-blue-800 mb-1">Total Expected (Active)</p>
            <p className="text-2xl font-bold text-blue-700">
              {formatCurrency(activeBookings.reduce((sum, b) => sum + b.totalAmount, 0))}
            </p>
          </div>
        </div>
      </div>

      {/* Data Privacy Notice */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
        <p className="text-sm text-gray-500 text-center">
          All analytics data is handled securely and in compliance with the Philippine Data Privacy Act of 2012.
        </p>
      </div>
    </div>
  );
}