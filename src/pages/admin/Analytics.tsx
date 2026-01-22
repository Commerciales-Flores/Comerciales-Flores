import { useData } from '../../contexts/DataContext';
import { BarChart3, TrendingUp, Users, Calendar } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { getPropertyTypeLabel } from '../../utils/propertyHelpers';

export default function AdminAnalytics() {
  const { bookings, payments, properties } = useData();

  // Monthly bookings (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const monthStr = date.toISOString().slice(0, 7);
    
    return {
      month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      bookings: bookings.filter(b => b.requestDate.startsWith(monthStr)).length,
      revenue: payments.filter(p => p.date.startsWith(monthStr) && p.status === 'paid').reduce((sum, p) => sum + p.amount, 0)
    };
  });

  // Property performance
  const propertyStats = properties.map(property => {
    const propBookings = bookings.filter(b => b.propertyId === property.id && b.status === 'approved');
    const revenue = payments.filter(p => {
      const booking = bookings.find(b => b.id === p.bookingId && b.propertyId === property.id);
      return booking && p.status === 'paid';
    }).reduce((sum, p) => sum + p.amount, 0);
    
    return {
      ...property,
      bookingCount: propBookings.length,
      revenue,
      occupancyRate: propBookings.length > 0 ? 85 : 0 // Mock occupancy rate
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // Overall statistics
  const totalRevenue = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalBookings = bookings.length;
  const approvedBookings = bookings.filter(b => b.status === 'approved').length;
  const averageBookingValue = totalBookings > 0 ? totalRevenue / approvedBookings : 0;
  
  // Average tenant stay
  const averageStay = bookings.filter(b => b.status === 'approved').reduce((sum, b) => sum + b.duration, 0) / (approvedBookings || 1);

  // Peak booking days
  const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const bookingsByDay = dayOfWeek.map((day, index) => ({
    day,
    count: bookings.filter(b => new Date(b.requestDate).getDay() === index).length
  })).sort((a, b) => b.count - a.count);

  // Property type distribution
  const typeDistribution = [
    { type: 'rental_space', count: bookings.filter(b => b.propertyType === 'rental_space').length },
    { type: 'function_hall', count: bookings.filter(b => b.propertyType === 'function_hall').length },
    { type: 'parking_slot', count: bookings.filter(b => b.propertyType === 'parking_slot').length }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2">Analytics & Reports</h1>
        <p className="text-gray-600">Business insights and performance metrics</p>
      </div>

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
          <p className="text-gray-900">{totalBookings}</p>
          <p className="text-xs text-gray-500 mt-1">{approvedBookings} approved</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Avg reservation Value</p>
            <BarChart3 className="size-5 text-purple-600" />
          </div>
          <p className="text-gray-900">{formatCurrency(averageBookingValue)}</p>
          <p className="text-xs text-gray-500 mt-1">Per approved reservation</p>
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

      {/* Monthly Trends */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="mb-6">Monthly Trends</h2>
        <div className="space-y-4">
          {monthlyData.map((data, index) => (
            <div key={index}>
              <div className="flex justify-between items-center mb-2 text-sm">
                <span className="text-gray-600">{data.month}</span>
                <div className="flex gap-6">
                  <span className="text-blue-600">{data.bookings} bookings</span>
                  <span className="text-green-600">{formatCurrency(data.revenue)}</span>
                </div>
              </div>
              <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-blue-500"
                  style={{ width: `${(data.bookings / Math.max(...monthlyData.map(m => m.bookings)) || 1) * 100}%` }}
                />
              </div>
            </div>
          ))}
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
                  <td className="py-3 text-gray-900">{property.bookingCount}</td>
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
        <div className="space-y-4">
          {typeDistribution.map((item) => {
            const total = typeDistribution.reduce((sum, t) => sum + t.count, 0);
            const percentage = total > 0 ? (item.count / total * 100) : 0;
            
            return (
              <div key={item.type}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-700">{getPropertyTypeLabel(item.type)}</span>
                  <span className="text-sm text-gray-600">{item.count} ({percentage.toFixed(0)}%)</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Peak Booking Days */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="mb-6">Peak Reservation Days</h2>
        <div className="grid grid-cols-7 gap-2">
          {bookingsByDay.map((item) => {
            const maxCount = Math.max(...bookingsByDay.map(d => d.count));
            const heightPercent = maxCount > 0 ? (item.count / maxCount * 100) : 0;
            
            return (
              <div key={item.day} className="text-center">
                <div className="h-32 flex items-end justify-center mb-2">
                  <div
                    className="w-full bg-blue-600 rounded-t"
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <div className="text-xs text-gray-600 mb-1">{item.day.slice(0, 3)}</div>
                <div className="text-sm text-gray-900">{item.count}</div>
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
              {formatCurrency(bookings.filter(b => b.status === 'approved').reduce((sum, b) => sum + (b.totalAmount - b.paidAmount), 0))}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Expected Total</p>
            <p className="text-blue-700">
              {formatCurrency(bookings.filter(b => b.status === 'approved').reduce((sum, b) => sum + b.totalAmount, 0))}
            </p>
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
