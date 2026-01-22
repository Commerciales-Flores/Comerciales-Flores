import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Calendar, CreditCard, AlertCircle, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { Link } from 'react-router-dom';

export default function ClientDashboard() {
  const { user } = useAuth();
  const { getBookingsByUserId, getPaymentsByUserId, properties } = useData();

  const userBookings = getBookingsByUserId(user?.id || '');
  const userPayments = getPaymentsByUserId(user?.id || '');

  // Calculate stats
  const totalBookings = userBookings.length;
  const upcomingBookings = userBookings.filter(b => {
    const startDate = new Date(b.startDate);
    const today = new Date();
    return startDate > today && b.status === 'approved';
  });
  const pendingBookings = userBookings.filter(b => b.status === 'pending');
  
  // Payment reminders - bookings with outstanding balance
  const paymentReminders = userBookings.filter(b => {
    return b.status === 'approved' && b.paidAmount < b.totalAmount;
  });

  // Recent activity
  const recentBookings = [...userBookings]
    .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2">Welcome back, {user?.name}!</h1>
        <p className="text-gray-600">Here's an overview of your reservations and payments</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Reservations</p>
            <Calendar className="size-5 text-blue-600" />
          </div>
          <p className="text-gray-900">{totalBookings}</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Upcoming</p>
            <TrendingUp className="size-5 text-green-600" />
          </div>
          <p className="text-gray-900">{upcomingBookings.length}</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Pending Approval</p>
            <AlertCircle className="size-5 text-yellow-600" />
          </div>
          <p className="text-gray-900">{pendingBookings.length}</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Payment Reminders</p>
            <CreditCard className="size-5 text-red-600" />
          </div>
          <p className="text-gray-900">{paymentReminders.length}</p>
        </div>
      </div>

      {/* Payment Reminders */}
      {paymentReminders.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="mb-4">Payment Reminders</h2>
          <div className="space-y-3">
            {paymentReminders.map(booking => {
              const property = properties.find(p => p.id === booking.propertyId);
              const balance = booking.totalAmount - booking.paidAmount;
              return (
                <div key={booking.id} className="bg-white p-4 rounded-lg border border-yellow-300">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-gray-900">{booking.propertyName}</h3>
                      <p className="text-sm text-gray-600">Reservation ID: {booking.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Balance</p>
                      <p className="text-red-600">{formatCurrency(balance)}</p>
                    </div>
                  </div>
                  <Link
                    to="/client/payments"
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Make Payment →
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Bookings */}
      {upcomingBookings.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="mb-4">Upcoming Reservations</h2>
          <div className="space-y-3">
            {upcomingBookings.map(booking => (
              <div key={booking.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="text-gray-900">{booking.propertyName}</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  to="/client/bookings"
                  className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  View Details
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="mb-4">Recent Activity</h2>
        {recentBookings.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No Reservations yet</p>
            <Link
              to="/client/properties"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Properties
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentBookings.map(booking => {
              const statusColors = {
                pending: 'bg-yellow-100 text-yellow-800',
                approved: 'bg-green-100 text-green-800',
                rejected: 'bg-red-100 text-red-800'
              };
              
              return (
                <div key={booking.id} className="flex justify-between items-center p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <h3 className="text-gray-900">{booking.propertyName}</h3>
                    <p className="text-sm text-gray-600">
                      Requested on {new Date(booking.requestDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 text-sm rounded-full ${statusColors[booking.status]}`}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <Link
          to="/client/properties"
          className="p-6 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-center"
        >
          <h3 className="text-blue-700 mb-2">Browse Properties</h3>
          <p className="text-sm text-blue-600">Find your perfect rental space</p>
        </Link>
        <Link
          to="/client/bookings"
          className="p-6 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-center"
        >
          <h3 className="text-green-700 mb-2">My Reservations</h3>
          <p className="text-sm text-green-600">Manage your reservations</p>
        </Link>
        <Link
          to="/client/payments"
          className="p-6 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors text-center"
        >
          <h3 className="text-purple-700 mb-2">Payments</h3>
          <p className="text-sm text-purple-600">View payment history</p>
        </Link>
      </div>
    </div>
  );
}
