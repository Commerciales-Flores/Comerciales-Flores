import { useState, useEffect } from 'react';
import supabase from '../../supabaseClient';
import { useData } from '../../contexts/DataContext';
import { TrendingUp, DollarSign, Calendar, Building, BarChart3, PieChart, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

interface BookingStats {
  id: string;
  unit_id: string;
  status: string;
  total_amount: number;
}

export default function Analytics() {
  // Use the global context for the base unit details
  const { units } = useData();
  
  const [bookings, setBookings] = useState<BookingStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all bookings for analytical calculations
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        const { data, error } = await supabase
          .from('reservations')
          .select('reservation_id, unit_id, status, total_amount');

        if (error) throw error;
        
        // Map the data into a cleaner format for math
        const mappedData = (data || []).map(b => ({
          id: b.reservation_id,
          unit_id: b.unit_id,
          status: b.status,
          total_amount: Number(b.total_amount || 0)
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

  // --- Calculate Metrics ---
  const totalUnits = units.length;
  const occupiedUnits = units.filter(u => u.available === false).length;
  const occupancyRate = totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(1) : '0.0';

  const totalBookings = bookings.length;
  const approvedBookingsCount = bookings.filter(b => b.status === 'approved' || b.status === 'confirmed' || b.status === 'completed').length;
  const approvalRate = totalBookings > 0 
    ? ((approvedBookingsCount / totalBookings) * 100).toFixed(1)
    : '0.0';
  
  const totalRevenue = bookings
    .filter(b => b.status !== 'cancelled' && b.status !== 'rejected')
    .reduce((sum, b) => sum + b.total_amount, 0);

  const averageBookingValue = totalBookings > 0
    ? totalRevenue / totalBookings
    : 0;

  // --- Distribution Maps ---
  const unitsByType = {
    rental_space: units.filter(u => u.type === 'rental_space').length,
    function_hall: units.filter(u => u.type === 'function_hall').length,
    parking_slot: units.filter(u => u.type === 'parking_slot').length,
  };

  const bookingsByStatus = {
    pending: bookings.filter(b => b.status === 'pending').length,
    approved: bookings.filter(b => b.status === 'approved').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  };

  // --- Top Performing Units ---
  const unitBookingCounts = units.map(unit => {
    const unitBookings = bookings.filter(b => b.unit_id === unit.id);
    const revenue = unitBookings
      .filter(b => b.status !== 'cancelled' && b.status !== 'rejected')
      .reduce((sum, b) => sum + b.total_amount, 0);

    return {
      name: unit.name,
      type: unit.type,
      count: unitBookings.length,
      revenue: revenue,
    };
  }).sort((a, b) => b.revenue - a.revenue); // Sorted by Revenue instead of count for better business insight

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="size-8 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-500 text-lg">Crunching your numbers...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
        <p className="text-gray-600">Comprehensive business insights and financial trends</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Occupancy Rate</span>
          </div>
          <p className="text-gray-900 text-2xl font-bold">{occupancyRate}%</p>
          <p className="text-sm text-gray-500 mt-1">
            {occupiedUnits} of {totalUnits} units
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Total Expected Revenue</span>
          </div>
          <p className="text-gray-900 text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
          <p className="text-sm text-gray-500 mt-1">
            From all active bookings
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Approval Rate</span>
          </div>
          <p className="text-gray-900 text-2xl font-bold">{approvalRate}%</p>
          <p className="text-sm text-gray-500 mt-1">
            {approvedBookingsCount} of {totalBookings} requests
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Avg Booking Value</span>
          </div>
          <p className="text-gray-900 text-2xl font-bold">{formatCurrency(averageBookingValue)}</p>
          <p className="text-sm text-gray-500 mt-1">
            Across {totalBookings} total bookings
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Space Type Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
            <PieChart className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Property Distribution</h2>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Commercial / Office Units</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{unitsByType.rental_space}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${totalUnits > 0 ? (unitsByType.rental_space / totalUnits) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">Function Halls</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{unitsByType.function_hall}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${totalUnits > 0 ? (unitsByType.function_hall / totalUnits) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">Parking Slots</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{unitsByType.parking_slot}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${totalUnits > 0 ? (unitsByType.parking_slot / totalUnits) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Booking Status Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Booking Status</h2>
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Pending</span>
                <span className="text-sm font-bold text-yellow-600">{bookingsByStatus.pending}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full transition-all" style={{ width: totalBookings > 0 ? `${(bookingsByStatus.pending / totalBookings) * 100}%` : '0%' }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Approved / Confirmed</span>
                <span className="text-sm font-bold text-green-600">{bookingsByStatus.approved + bookingsByStatus.confirmed}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: totalBookings > 0 ? `${((bookingsByStatus.approved + bookingsByStatus.confirmed) / totalBookings) * 100}%` : '0%' }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Completed</span>
                <span className="text-sm font-bold text-blue-600">{bookingsByStatus.completed}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: totalBookings > 0 ? `${(bookingsByStatus.completed / totalBookings) * 100}%` : '0%' }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Cancelled / Rejected</span>
                <span className="text-sm font-bold text-red-600">{bookingsByStatus.cancelled}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full transition-all" style={{ width: totalBookings > 0 ? `${(bookingsByStatus.cancelled / totalBookings) * 100}%` : '0%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performing Spaces */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
          <DollarSign className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">Highest Earning Units</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-3 pt-2 px-4 text-sm font-semibold text-gray-600">Rank</th>
                <th className="pb-3 pt-2 px-4 text-sm font-semibold text-gray-600">Property Name</th>
                <th className="pb-3 pt-2 px-4 text-sm font-semibold text-gray-600">Type</th>
                <th className="pb-3 pt-2 px-4 text-sm font-semibold text-gray-600 text-center">Total Bookings</th>
                <th className="pb-3 pt-2 px-4 text-sm font-semibold text-gray-600 text-right">Generated Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {unitBookingCounts.slice(0, 10).map((unit, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="w-8 h-8 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{unit.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 capitalize">{unit.type.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-center font-medium text-gray-900">{unit.count}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-700">{formatCurrency(unit.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {unitBookingCounts.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            No booking data available yet
          </div>
        )}
      </div>
    </div>
  );
}