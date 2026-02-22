import { useData } from '../../context/DataContext';
import { CheckCircle, XCircle, Calendar, User, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export default function BookingManagement() {
  const { bookings, updateBooking } = useData();

  const sortedBookings = bookings.sort((a, b) => {
    // Pending first
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    // Then by creation date
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleApprove = (bookingId: string) => {
    updateBooking(bookingId, { status: 'approved' });
  };

  const handleReject = (bookingId: string) => {
    updateBooking(bookingId, { status: 'rejected' });
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
        <h1 className="text-gray-900 mb-2">Booking Management</h1>
        <p className="text-gray-600">Approve or reject booking requests</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-gray-600 mb-2">Total Bookings</p>
          <p className="text-gray-900">{bookings.length}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow-sm p-6">
          <p className="text-gray-600 mb-2">Pending</p>
          <p className="text-gray-900">{bookings.filter(b => b.status === 'pending').length}</p>
        </div>
        <div className="bg-green-50 rounded-lg shadow-sm p-6">
          <p className="text-gray-600 mb-2">Approved</p>
          <p className="text-gray-900">{bookings.filter(b => b.status === 'approved').length}</p>
        </div>
        <div className="bg-red-50 rounded-lg shadow-sm p-6">
          <p className="text-gray-600 mb-2">Rejected</p>
          <p className="text-gray-900">{bookings.filter(b => b.status === 'rejected').length}</p>
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {sortedBookings.map((booking) => (
          <div key={booking.id} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-gray-900 mb-2">{booking.spaceName}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{booking.userName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(new Date(booking.startDate), 'MMM d')} - {format(new Date(booking.endDate), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        <span>${booking.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(booking.status)}`}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                </div>

                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <p className="text-gray-900">{booking.userEmail}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Booking Date:</span>
                      <p className="text-gray-900">{format(new Date(booking.createdAt), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Booking ID:</span>
                      <p className="text-gray-900">{booking.id}</p>
                    </div>
                  </div>
                </div>

                {booking.status === 'pending' && (
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => handleApprove(booking.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(booking.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {bookings.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No bookings yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
