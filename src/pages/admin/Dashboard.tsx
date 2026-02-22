import { useData } from '../../contexts/DataContext';
import { Calendar, Users, CreditCard, TrendingUp, Clock, CheckCircle, Building2 } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
<<<<<<< HEAD
  const { reservations, payments, properties, inquiries } = useData();
=======
  const { bookings, payments, properties, inquiries } = useData();
>>>>>>> e0d15afe755cf439d3033851c6bfa0dcbf605f9f

  const today = new Date().toISOString().split('T')[0];
  
  // Stats
<<<<<<< HEAD
  const todayReservations = reservations.filter(b => b.requestDate === today);
  const pendingReservations = reservations.filter(b => b.status === 'pending');
  const approvedReservations = reservations.filter(b => b.status === 'confirmed');
=======
  const todayBookings = bookings.filter(b => b.requestDate === today);
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const approvedBookings = bookings.filter(b => b.status === 'approved');
>>>>>>> e0d15afe755cf439d3033851c6bfa0dcbf605f9f
  const totalRevenue = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const pendingPayments = payments.filter(p => p.status === 'unpaid');
  const openInquiries = inquiries.filter(i => i.status === 'open');

  // Top performing properties
<<<<<<< HEAD
  const propertyReservations = properties.map(property => ({
    ...property,
    reservationCount: reservations.filter(b => b.propertyId === property.id && b.status === 'confirmed').length,
    revenue: payments.filter(p => {
      const reservation = reservations.find(b => b.id === p.reservationId && b.propertyId === property.id);
      return reservation && p.status === 'paid';
    }).reduce((sum, p) => sum + p.amount, 0)
  })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Recent reservations
  const recentReservations = [...reservations]
=======
  const propertyBookings = properties.map(property => ({
    ...property,
    bookingCount: bookings.filter(b => b.propertyId === property.id && b.status === 'approved').length,
    revenue: payments.filter(p => {
      const booking = bookings.find(b => b.id === p.bookingId && b.propertyId === property.id);
      return booking && p.status === 'paid';
    }).reduce((sum, p) => sum + p.amount, 0)
  })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Recent bookings
  const recentBookings = [...bookings]
>>>>>>> e0d15afe755cf439d3033851c6bfa0dcbf605f9f
    .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Overview of your rental management system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Today's Reservations</p>
            <Calendar className="size-5 text-blue-600" />
          </div>
<<<<<<< HEAD
          <p className="text-gray-900">{todayReservations.length}</p>
=======
          <p className="text-gray-900">{todayBookings.length}</p>
>>>>>>> e0d15afe755cf439d3033851c6bfa0dcbf605f9f
          <p className="text-xs text-gray-500 mt-1">Requests received today</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Pending Approvals</p>
            <Clock className="size-5 text-yellow-600" />
          </div>
<<<<<<< HEAD
          <p className="text-gray-900">{pendingReservations.length}</p>
          <Link to="/admin/reservations" className="text-xs text-blue-600 hover:text-blue-700 mt-1 inline-block">
=======
          <p className="text-gray-900">{pendingBookings.length}</p>
          <Link to="/admin/bookings" className="text-xs text-blue-600 hover:text-blue-700 mt-1 inline-block">
>>>>>>> e0d15afe755cf439d3033851c6bfa0dcbf605f9f
            Review reservations →
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Revenue</p>
            <TrendingUp className="size-5 text-green-600" />
          </div>
          <p className="text-gray-900">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-gray-500 mt-1">Verified payments</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Active Properties</p>
            <Building2 className="size-5 text-purple-600" />
          </div>
          <p className="text-gray-900">{properties.filter(p => p.available).length}</p>
          <p className="text-xs text-gray-500 mt-1">Out of {properties.length} total</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-4 gap-4">
          <Link
<<<<<<< HEAD
            to="/admin/reservations"
            className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors text-center"
          >
            <div className="bg-yellow-600 text-white size-12 rounded-lg flex items-center justify-center mx-auto mb-2">
              {pendingReservations.length}
=======
            to="/admin/bookings"
            className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors text-center"
          >
            <div className="bg-yellow-600 text-white size-12 rounded-lg flex items-center justify-center mx-auto mb-2">
              {pendingBookings.length}
>>>>>>> e0d15afe755cf439d3033851c6bfa0dcbf605f9f
            </div>
            <p className="text-sm text-yellow-800">Approve Reservations</p>
          </Link>

          <Link
            to="/admin/payments"
            className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-center"
          >
            <div className="bg-blue-600 text-white size-12 rounded-lg flex items-center justify-center mx-auto mb-2">
              {pendingPayments.length}
            </div>
            <p className="text-sm text-blue-800">Verify Payments</p>
          </Link>

          <Link
            to="/admin/inquiries"
            className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors text-center"
          >
            <div className="bg-purple-600 text-white size-12 rounded-lg flex items-center justify-center mx-auto mb-2">
              {openInquiries.length}
            </div>
            <p className="text-sm text-purple-800">Answer Inquiries</p>
          </Link>

          <Link
            to="/admin/business-slots"
            className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-center"
          >
            <div className="bg-green-600 text-white size-12 rounded-lg flex items-center justify-center mx-auto mb-2">
              +
            </div>
            <p className="text-sm text-green-800">Add Slots</p>
          </Link>
        </div>
      </div>

      {/* Top Performing Properties */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="mb-4">Top Performing Units</h2>
        <div className="space-y-3">
<<<<<<< HEAD
          {propertyReservations.map((property, index) => (
=======
          {propertyBookings.map((property, index) => (
>>>>>>> e0d15afe755cf439d3033851c6bfa0dcbf605f9f
            <div key={property.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-lg text-gray-500 w-8">#{index + 1}</div>
              <img
                src={property.images[0]}
                alt={property.name}
                className="size-12 object-cover rounded"
              />
              <div className="flex-1">
                <h3 className="text-sm text-gray-900">{property.name}</h3>
<<<<<<< HEAD
                <p className="text-xs text-gray-600">{property.reservationCount} reservations</p>
=======
                <p className="text-xs text-gray-600">{property.bookingCount} reservations</p>
>>>>>>> e0d15afe755cf439d3033851c6bfa0dcbf605f9f
              </div>
              <div className="text-right">
                <p className="text-green-600">{formatCurrency(property.revenue)}</p>
                <p className="text-xs text-gray-500">Revenue</p>
              </div>
            </div>
          ))}
        </div>
      </div>

<<<<<<< HEAD
      {/* Recent Reservations */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2>Recent Reservation Requests</h2>
          <Link to="/admin/reservations" className="text-sm text-blue-600 hover:text-blue-700">
=======
      {/* Recent Bookings */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2>Recent Reservation Requests</h2>
          <Link to="/admin/bookings" className="text-sm text-blue-600 hover:text-blue-700">
>>>>>>> e0d15afe755cf439d3033851c6bfa0dcbf605f9f
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                  Reservation ID
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                  Property
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
<<<<<<< HEAD
              {recentReservations.length === 0 ? (
=======
              {recentBookings.length === 0 ? (
>>>>>>> e0d15afe755cf439d3033851c6bfa0dcbf605f9f
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No recent reservations
                  </td>
                </tr>
              ) : (
<<<<<<< HEAD
                recentReservations.map((reservation) => {
                  const statusColors = {
                    pending: 'bg-yellow-100 text-yellow-800',
                    confirmed: 'bg-green-100 text-green-800',
                    cancelled: 'bg-red-100 text-red-800',
                    completed: 'bg-blue-100 text-blue-800'
                  };

                  return (
                    <tr key={reservation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {reservation.id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {reservation.propertyName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(reservation.requestDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${statusColors[reservation.status]}`}>
                          {reservation.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(reservation.totalAmount)}
=======
                recentBookings.map((booking) => {
                  const statusColors = {
                    pending: 'bg-yellow-100 text-yellow-800',
                    approved: 'bg-green-100 text-green-800',
                    rejected: 'bg-red-100 text-red-800'
                  };

                  return (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {booking.id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {booking.propertyName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(booking.requestDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${statusColors[booking.status]}`}>
                          {booking.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(booking.totalAmount)}
>>>>>>> e0d15afe755cf439d3033851c6bfa0dcbf605f9f
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="size-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Verified Payments</p>
              <p className="text-gray-900">{payments.filter(p => p.status === 'paid').length}</p>
            </div>
          </div>
          <div className="text-green-600">
            {formatCurrency(totalRevenue)}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="size-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending Verification</p>
              <p className="text-gray-900">{pendingPayments.length}</p>
            </div>
          </div>
          <div className="text-yellow-600">
            {formatCurrency(pendingPayments.reduce((sum, p) => sum + p.amount, 0))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="size-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Reservations</p>
<<<<<<< HEAD
              <p className="text-gray-900">{approvedReservations.length}</p>
            </div>
          </div>
          <Link to="/admin/reservations" className="text-sm text-blue-600 hover:text-blue-700">
=======
              <p className="text-gray-900">{approvedBookings.length}</p>
            </div>
          </div>
          <Link to="/admin/bookings" className="text-sm text-blue-600 hover:text-blue-700">
>>>>>>> e0d15afe755cf439d3033851c6bfa0dcbf605f9f
            Manage reservations →
          </Link>
        </div>
      </div>
    </div>
  );
}
