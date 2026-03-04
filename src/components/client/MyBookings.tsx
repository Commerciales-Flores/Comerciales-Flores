import { useState, useEffect } from 'react';
import supabase from '../../supabaseClient';
import type { BookingStatus, Booking, UnitType } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '../../utils/currency';

export default function MyBookings() {
  const { user } = useAuth();
  
  // ✅ NEW: Added local state for live Supabase data
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ NEW: Fetch directly from Supabase on mount
  useEffect(() => {
    const fetchReservations = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('reservations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }); // Sorts newest first

        if (error) throw error;

        // Map the snake_case DB columns to your camelCase frontend interface
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
          // Unpack JSONB
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

  const getStatusIcon = (status: BookingStatus) => {
    switch (status) {
      case 'approved':
      case 'confirmed':
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'pending':
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

      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-500">Loading your reservations...</p>
        </div>
      ) : userBookings.length === 0 ? (
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
                  <h3 className="text-gray-900 mb-1">{booking.propertyName}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {format(new Date(booking.startDate), 'MMM d, yyyy')} - {format(new Date(booking.endDate), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(booking.status)}
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <CreditCard className="w-4 h-4" />
                    <span>Total Amount</span>
                  </div>
                  <p className="text-gray-900 font-medium">{formatCurrency(booking.totalAmount)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span>Requested On</span>
                  </div>
                  <p className="text-gray-900">{format(new Date(booking.requestDate), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>Status</span>
                  </div>
                  <p className="text-gray-900 capitalize font-medium">{booking.status}</p>
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
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Your booking has been approved! Please proceed with the payment.
                  </p>
                </div>
              )}

              {booking.status === 'confirmed' && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    Your reservation is confirmed. We look forward to having you!
                  </p>
                </div>
              )}

              {booking.status === 'cancelled' && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    This booking has been cancelled. Please contact us if you need more information.
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