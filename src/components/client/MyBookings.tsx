import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export default function MyBookings() {
  const { bookings } = useData();
  const { user } = useAuth();

  const userBookings = bookings
    .filter(b => b.userId === user?.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">My Reservations</h1>
        <p className="text-gray-600">View and manage your space Reservations</p>
      </div>

      {userBookings.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-gray-900 mb-2">No bookings yet</h3>
          <p className="text-gray-600">Start by browsing available spaces</p>
        </div>
      ) : (
        <div className="space-y-4">
          {userBookings.map((booking) => (
            <div key={booking.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-gray-900 mb-1">{booking.spaceName}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {format(new Date(booking.startDate), 'MMM d, yyyy')} - {format(new Date(booking.endDate), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(booking.status)}
                  <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(booking.status)}`}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span>Total Amount</span>
                  </div>
                  <p className="text-gray-900">${booking.totalAmount.toFixed(2)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span>Booking Date</span>
                  </div>
                  <p className="text-gray-900">{format(new Date(booking.createdAt), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>Status</span>
                  </div>
                  <p className="text-gray-900 capitalize">{booking.status}</p>
                </div>
              </div>

              {booking.status === 'pending' && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Your booking is pending approval from the administrator. You will receive a notification once it's reviewed.
                  </p>
                </div>
              )}

              {booking.status === 'approved' && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    Your booking has been approved! Please proceed with the payment.
                  </p>
                </div>
              )}

              {booking.status === 'rejected' && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    Unfortunately, your booking request was not approved. Please contact us for more information.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
