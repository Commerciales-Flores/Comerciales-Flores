import { useData } from '../../context/DataContext';
import { TrendingUp, DollarSign, Calendar, Building, Users, BarChart3, PieChart } from 'lucide-react';

export default function Analytics() {
  const { getAnalytics, spaces, bookings, payments } = useData();
  const analytics = getAnalytics();

  // Calculate additional metrics
  const occupancyRate = ((analytics.occupiedSpaces / analytics.totalSpaces) * 100).toFixed(1);
  const approvalRate = analytics.totalBookings > 0 
    ? ((analytics.approvedBookings / analytics.totalBookings) * 100).toFixed(1)
    : '0';
  
  const averageBookingValue = bookings.length > 0
    ? (bookings.reduce((sum, b) => sum + b.totalAmount, 0) / bookings.length).toFixed(2)
    : '0';

  // Space type distribution
  const spacesByType = {
    unit: spaces.filter(s => s.type === 'unit').length,
    'function-hall': spaces.filter(s => s.type === 'function-hall').length,
    parking: spaces.filter(s => s.type === 'parking').length,
  };

  // Booking status distribution
  const bookingsByStatus = {
    pending: bookings.filter(b => b.status === 'pending').length,
    approved: bookings.filter(b => b.status === 'approved').length,
    rejected: bookings.filter(b => b.status === 'rejected').length,
    completed: bookings.filter(b => b.status === 'completed').length,
  };

  // Most booked spaces
  const spaceBookingCounts = spaces.map(space => ({
    name: space.name,
    type: space.type,
    count: bookings.filter(b => b.spaceId === space.id).length,
    revenue: bookings
      .filter(b => b.spaceId === space.id && b.status === 'approved')
      .reduce((sum, b) => sum + b.totalAmount, 0),
  })).sort((a, b) => b.count - a.count);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Analytics Dashboard</h1>
        <p className="text-gray-600">Comprehensive business insights and trends</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-gray-600">Occupancy Rate</span>
          </div>
          <p className="text-gray-900">{occupancyRate}%</p>
          <p className="text-sm text-gray-600 mt-1">
            {analytics.occupiedSpaces} of {analytics.totalSpaces} spaces
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-gray-600">Total Revenue</span>
          </div>
          <p className="text-gray-900">${analytics.totalRevenue.toFixed(2)}</p>
          <p className="text-sm text-gray-600 mt-1">
            ${analytics.pendingPayments.toFixed(2)} pending
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-gray-600">Approval Rate</span>
          </div>
          <p className="text-gray-900">{approvalRate}%</p>
          <p className="text-sm text-gray-600 mt-1">
            {analytics.approvedBookings} of {analytics.totalBookings} bookings
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-gray-600">Avg Booking Value</span>
          </div>
          <p className="text-gray-900">${averageBookingValue}</p>
          <p className="text-sm text-gray-600 mt-1">
            Based on {bookings.length} bookings
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Space Type Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="w-5 h-5 text-blue-600" />
            <h2 className="text-gray-900">Space Distribution</h2>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-700">Office Units</span>
                </div>
                <span className="text-gray-900">{spacesByType.unit}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${(spacesByType.unit / analytics.totalSpaces) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-green-600" />
                  <span className="text-gray-700">Function Halls</span>
                </div>
                <span className="text-gray-900">{spacesByType['function-hall']}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${(spacesByType['function-hall'] / analytics.totalSpaces) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-purple-600" />
                  <span className="text-gray-700">Parking</span>
                </div>
                <span className="text-gray-900">{spacesByType.parking}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: `${(spacesByType.parking / analytics.totalSpaces) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Booking Status Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h2 className="text-gray-900">Booking Status</h2>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700">Pending</span>
                <span className="text-yellow-600">{bookingsByStatus.pending}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-600 h-2 rounded-full"
                  style={{ width: bookings.length > 0 ? `${(bookingsByStatus.pending / bookings.length) * 100}%` : '0%' }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700">Approved</span>
                <span className="text-green-600">{bookingsByStatus.approved}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: bookings.length > 0 ? `${(bookingsByStatus.approved / bookings.length) * 100}%` : '0%' }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700">Completed</span>
                <span className="text-blue-600">{bookingsByStatus.completed}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: bookings.length > 0 ? `${(bookingsByStatus.completed / bookings.length) * 100}%` : '0%' }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700">Rejected</span>
                <span className="text-red-600">{bookingsByStatus.rejected}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full"
                  style={{ width: bookings.length > 0 ? `${(bookingsByStatus.rejected / bookings.length) * 100}%` : '0%' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performing Spaces */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h2 className="text-gray-900">Top Performing Spaces</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-gray-700">Rank</th>
                <th className="px-6 py-3 text-left text-gray-700">Space Name</th>
                <th className="px-6 py-3 text-left text-gray-700">Type</th>
                <th className="px-6 py-3 text-left text-gray-700">Total Bookings</th>
                <th className="px-6 py-3 text-left text-gray-700">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {spaceBookingCounts.slice(0, 10).map((space, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600">{index + 1}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-900">{space.name}</td>
                  <td className="px-6 py-4 text-gray-600 capitalize">{space.type.replace('-', ' ')}</td>
                  <td className="px-6 py-4 text-gray-900">{space.count}</td>
                  <td className="px-6 py-4 text-gray-900">${space.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {spaceBookingCounts.length === 0 && (
          <div className="text-center py-8 text-gray-600">
            No booking data available yet
          </div>
        )}
      </div>
    </div>
  );
}
