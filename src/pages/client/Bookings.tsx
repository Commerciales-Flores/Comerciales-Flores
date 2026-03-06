import { useState, useEffect } from 'react';
import supabase from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
// ✅ FIX: Removed the unused useData import
import type { BookingStatus, Booking, UnitType } from '../../contexts/DataContext';
import { Calendar, Clock, CreditCard, FileText } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { getPropertyTypeLabel } from '../../utils/propertyHelpers';

export default function ClientBookings() {
  const { user } = useAuth();
  
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<BookingStatus | 'all'>('all');

  useEffect(() => {
    const fetchReservations = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('reservations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const mappedBookings: Booking[] = data.map((row: any) => ({
          id: row.reservation_id,
          userId: row.user_id,
          unitId: row.unit_id,
          propertyName: row.title,
          unitType: row.unit_type as UnitType,
          startDate: row.start_date,
          endDate: row.end_date,
          duration: row.duration,
          totalAmount: Number(row.total_amount),
          status: row.status as BookingStatus,
          notes: row.notes,
          paidAmount: Number(row.paid_amount || 0),
          requestDate: row.created_at,
          paymentMethod: row.payment_method,
          paymentIntent: row.payment_intent,
          modeOfVisit: row.mode_of_visit,
          paymentCycle: row.details?.paymentCycle,
          businessType: row.details?.businessType,
          eventPurpose: row.details?.eventPurpose,
          attendees: row.details?.attendees,
          slotId: row.details?.slotId,
          slotName: row.details?.slotName,
          vehicleType: row.details?.vehicleType,
          plateNumber: row.details?.plateNumber,
          durationType: row.details?.durationType,
        }));

        setUserBookings(mappedBookings);
      } catch (error) {
        console.error('Error fetching reservations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReservations();
  }, [user?.id]);

  const handleDeleteBooking = async (bookingId: string, propertyName: string) => {
    if (window.confirm(`Are you sure you want to cancel your reservation for "${propertyName}"?`)) {
      try {
        const { error } = await supabase
          .from('reservations')
          .update({ status: 'cancelled' })
          .eq('reservation_id', bookingId);

        if (error) throw error;

        // Instantly update the UI without reloading
        setUserBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b))
        );
      } catch (error) {
        console.error('Error cancelling reservation:', error);
        alert('Failed to cancel the reservation. Please try again.');
      }
    }
  };

  const filteredBookings = filterStatus === 'all' 
    ? userBookings 
    : userBookings.filter(b => b.status === filterStatus);

  // ✅ FIX: Added 'rejected' to satisfy the Record<BookingStatus, string> requirement
  const statusColors: Record<BookingStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    approved: 'bg-blue-100 text-blue-800 border-blue-200',
    confirmed: 'bg-green-100 text-green-800 border-green-200',
    completed: 'bg-gray-100 text-gray-800 border-gray-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
    rejected: 'bg-red-100 text-red-900 border-red-300' 
  };

  // ✅ FIX: Added 'rejected' icon
  const statusIcons: Record<BookingStatus, string> = {
    pending: '⏳',
    approved: '👍',
    confirmed: '✓',
    completed: '🏁',
    cancelled: '✗',
    rejected: '🚫' 
  };

  // ✅ FIX: Also added 'rejected' to the filter tabs so users can sort by it
  const FILTER_TABS: Array<BookingStatus | 'all'> = ['all', 'pending', 'approved', 'confirmed', 'completed', 'cancelled', 'rejected'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2">My Reservations</h1>
        <p className="text-gray-600">View and manage your reservations requests</p>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 p-1 flex flex-wrap gap-1">
        {FILTER_TABS.map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filterStatus === status
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== 'all' && (
              <span className="ml-2">
                ({userBookings.filter(b => b.status === status).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {isLoading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Loading your reservations...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Calendar className="size-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-gray-600 mb-2">No reservations found</h3>
          <p className="text-sm text-gray-500">
            {filterStatus === 'all' 
              ? "You haven't made any bookings yet"
              : `No ${filterStatus} bookings`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => {
            const balance = booking.totalAmount - booking.paidAmount;
            const paymentProgress = booking.totalAmount > 0 
              ? (booking.paidAmount / booking.totalAmount) * 100 
              : 0;

            return (
              <div key={booking.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-blue-600 font-semibold tracking-wider">
                          {getPropertyTypeLabel(booking.unitType).toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${statusColors[booking.status]}`}>
                          {statusIcons[booking.status]} {booking.status.toUpperCase()}
                        </span>
                      </div>
                      <h3 className="mb-1 text-gray-900 font-medium text-lg">{booking.propertyName}</h3>
                      <p className="text-sm text-gray-500">Reservation ID: {booking.id}</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="size-4 text-gray-400" />
                        <span className="text-gray-600">Start:</span>
                        <span className="text-gray-900 font-medium">
                          {new Date(booking.startDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="size-4 text-gray-400" />
                        <span className="text-gray-600">End:</span>
                        <span className="text-gray-900 font-medium">
                          {new Date(booking.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="size-4 text-gray-400" />
                        <span className="text-gray-600">Duration:</span>
                        <span className="text-gray-900 font-medium">
                          {booking.duration} {booking.durationType || (booking.unitType === 'rental_space' ? 'months' : booking.unitType === 'function_hall' ? 'days' : 'hours')}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="size-4 text-gray-400" />
                        <span className="text-gray-600">Mode:</span>
                        <span className="text-gray-900 font-medium capitalize">
                          {booking.modeOfVisit?.replace('_', ' ') || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CreditCard className="size-4 text-gray-400" />
                        <span className="text-gray-600">Payment:</span>
                        <span className="text-gray-900 font-medium capitalize">
                          {booking.paymentMethod?.replace('_', ' ') || 'N/A'}
                        </span>
                      </div>
                      {booking.paymentCycle && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="size-4 text-gray-400" />
                          <span className="text-gray-600">Cycle:</span>
                          <span className="text-gray-900 font-medium capitalize">
                            {booking.paymentCycle}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Type-specific details */}
                  {booking.businessType && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-sm text-gray-600">Business Type: <span className="text-gray-900 font-medium">{booking.businessType}</span></p>
                    </div>
                  )}
                  {booking.eventPurpose && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-sm text-gray-600">Event Purpose: <span className="text-gray-900 font-medium">{booking.eventPurpose}</span></p>
                      {booking.attendees && (
                        <p className="text-sm text-gray-600 mt-1">Attendees: <span className="text-gray-900 font-medium">{booking.attendees}</span></p>
                      )}
                    </div>
                  )}
                  {booking.vehicleType && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-sm text-gray-600">Vehicle: <span className="text-gray-900 font-medium">{booking.vehicleType} - {booking.plateNumber}</span></p>
                      {booking.slotName && (
                        <p className="text-sm text-gray-600 mt-1">Slot: <span className="text-gray-900 font-medium">{booking.slotName}</span></p>
                      )}
                    </div>
                  )}

                  {booking.notes && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                      <p className="text-sm text-gray-600 font-medium mb-1">Notes:</p>
                      <p className="text-sm text-gray-900">{booking.notes}</p>
                    </div>
                  )}

                  {/* Payment Information */}
                  <div className="border-t border-gray-100 pt-4">
                    <div className="grid md:grid-cols-3 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-gray-500">Total Amount</p>
                        <p className="text-gray-900 font-semibold">{formatCurrency(booking.totalAmount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Paid Amount</p>
                        <p className="text-green-600 font-semibold">{formatCurrency(booking.paidAmount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Balance</p>
                        <p className={`font-semibold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(balance)}
                        </p>
                      </div>
                    </div>

                    {/* Payment Progress Bar */}
                    {(booking.status === 'approved' || booking.status === 'confirmed' || booking.status === 'completed') && (
                      <div className="mt-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span className="font-medium">Payment Progress</span>
                          <span className="font-semibold">{paymentProgress.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              paymentProgress >= 100 ? 'bg-green-600' : 'bg-blue-600'
                            }`}
                            style={{ width: `${Math.min(paymentProgress, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status Messages */}
                  {booking.status === 'pending' && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        Your reservation is pending admin approval. You will be notified once it's reviewed.
                      </p>
                    </div>
                  )}
                  {booking.status === 'approved' && balance > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        Your reservation is approved! Please proceed to the Payments section to complete your payment.
                      </p>
                    </div>
                  )}
                  {booking.status === 'confirmed' && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        Your reservation is confirmed. We look forward to serving you!
                      </p>
                    </div>
                  )}
                  {booking.status === 'cancelled' && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">
                        This reservation has been cancelled. Please contact support if you have questions.
                      </p>
                    </div>
                  )}
                  {/* ✅ FIX: Added a message for rejected status */}
                  {booking.status === 'rejected' && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">
                        This reservation was rejected by the administration. Please contact support for details.
                      </p>
                    </div>
                  )}

                  <div className="text-xs text-gray-400 mt-4">
                    Requested on {new Date(booking.requestDate).toLocaleString()}
                  </div>
                  
                  {/* Cancel Button */}
                  {booking.status === 'pending' && (
                    <div className="border-t border-gray-100 mt-4 pt-4 flex justify-end">
                      <button 
                        onClick={() => handleDeleteBooking(booking.id, booking.propertyName)}
                        className="px-4 py-2 bg-red-50 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-100 border border-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        title="Cancel Reservation"
                      >
                        Cancel Reservation
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}