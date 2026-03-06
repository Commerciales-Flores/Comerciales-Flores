import { useState, useEffect } from 'react';
import supabase from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import type { BookingStatus, Booking, UnitType } from '../../contexts/DataContext';
import { Calendar, CreditCard, AlertCircle, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { Link } from 'react-router-dom';

// ✅ Pulled outside the component so it isn't re-created on every single loop iteration
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-blue-100 text-blue-800 border-blue-200',
  confirmed: 'bg-green-100 text-green-800 border-green-200',
  completed: 'bg-gray-100 text-gray-800 border-gray-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200'
};

export default function ClientDashboard() {
  const { user } = useAuth();
  
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // ✅ Fix: Only attempt to fetch if user exists. If no user, stop loading so ProtectedRoutes can handle redirection.
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setIsLoading(true); // Ensure loading is true when we start a fresh fetch
        
        const { data, error } = await supabase
          .from('reservations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // ✅ Fix: Wrapped data in a fallback array (data || []) to prevent .map crashes if the DB returns null
        const mappedBookings: Booking[] = (data || []).map((row: any) => ({
          id: row.reservation_id,
          userId: row.user_id,
          unitId: row.unit_id,
          propertyName: row.title || 'Unknown Property', // Fallback if title is missing
          unitType: row.unit_type as UnitType,
          startDate: row.start_date,
          endDate: row.end_date,
          duration: row.duration,
          totalAmount: Number(row.total_amount) || 0, // Fallback to 0 if null
          status: (row.status || 'pending') as BookingStatus, // Fallback to prevent charAt() crashes later
          notes: row.notes,
          paidAmount: Number(row.paid_amount) || 0,
          requestDate: row.created_at || new Date().toISOString(),
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
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.id]); // Safely depends on user.id

  const totalBookings = userBookings.length;
  const upcomingBookings = userBookings.filter(b => {
    if (!b.startDate) return false;
    const startDate = new Date(b.startDate);
    const today = new Date();
    // ✅ Optional tweak: Zero out today's time so bookings starting *today* show up as upcoming
    today.setHours(0, 0, 0, 0); 
    return startDate >= today && (b.status === 'approved' || b.status === 'confirmed');
  });
  const pendingBookings = userBookings.filter(b => b.status === 'pending');
  
  const paymentReminders = userBookings.filter(b => {
    return (b.status === 'approved' || b.status === 'confirmed') && b.paidAmount < b.totalAmount;
  });

  const recentBookings = [...userBookings]
    .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500 text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Welcome back, {user?.firstName || 'Guest'}!</h1>
        <p className="text-gray-600">Here's an overview of your reservations and payments</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Reservations</p>
            <Calendar className="size-5 text-blue-600" />
          </div>
          <p className="text-gray-900 text-2xl font-semibold">{totalBookings}</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Upcoming</p>
            <TrendingUp className="size-5 text-green-600" />
          </div>
          <p className="text-gray-900 text-2xl font-semibold">{upcomingBookings.length}</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Pending Approval</p>
            <AlertCircle className="size-5 text-yellow-600" />
          </div>
          <p className="text-gray-900 text-2xl font-semibold">{pendingBookings.length}</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Payment Reminders</p>
            <CreditCard className="size-5 text-red-600" />
          </div>
          <p className="text-gray-900 text-2xl font-semibold">{paymentReminders.length}</p>
        </div>
      </div>

      {/* Payment Reminders */}
      {paymentReminders.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="mb-4 text-lg font-semibold text-yellow-900">Payment Reminders</h2>
          <div className="space-y-3">
            {paymentReminders.map(booking => {
              const balance = booking.totalAmount - booking.paidAmount;
              
              return (
                <div key={booking.id} className="bg-white p-4 rounded-lg border border-yellow-300 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-gray-900 font-medium">{booking.propertyName}</h3>
                      <p className="text-sm text-gray-600">Reservation ID: {booking.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Balance</p>
                      <p className="text-red-600 font-semibold">{formatCurrency(balance)}</p>
                    </div>
                  </div>
                  <Link
                    to="/client/payments"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mt-2 w-fit"
                  >
                    Make Payment <TrendingUp className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Bookings */}
        {upcomingBookings.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 flex-1 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Upcoming Reservations</h2>
            <div className="space-y-3">
              {upcomingBookings.map(booking => (
                <div key={booking.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div>
                    <h3 className="text-gray-900 font-medium">{booking.propertyName}</h3>
                    <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    to="/client/bookings"
                    className="px-4 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors font-medium border border-blue-100"
                  >
                    View Details
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 flex-1 shadow-sm h-fit">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Activity</h2>
          {recentBookings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No Reservations yet</p>
              <Link
                to="/client/properties"
                className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
              >
                Browse Properties
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentBookings.map(booking => {
                const currentStatus = booking.status || 'pending';
                const statusColorClass = STATUS_COLORS[currentStatus] || STATUS_COLORS.pending;
                
                return (
                  <div key={booking.id} className="flex justify-between items-center p-4 bg-gray-50 border border-gray-100 rounded-lg">
                    <div className="flex-1">
                      <h3 className="text-gray-900 font-medium">{booking.propertyName}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Requested on {new Date(booking.requestDate).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${statusColorClass}`}>
                      {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <Link
          to="/client/properties"
          className="p-6 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-center group"
        >
          <h3 className="text-blue-700 mb-2 font-medium">Browse Properties</h3>
          <p className="text-sm text-blue-600 group-hover:text-blue-800">Find your perfect rental space</p>
        </Link>
        <Link
          to="/client/bookings"
          className="p-6 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-center group"
        >
          <h3 className="text-green-700 mb-2 font-medium">My Reservations</h3>
          <p className="text-sm text-green-600 group-hover:text-green-800">Manage your reservations</p>
        </Link>
        <Link
          to="/client/payments"
          className="p-6 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors text-center group"
        >
          <h3 className="text-purple-700 mb-2 font-medium">Payments</h3>
          <p className="text-sm text-purple-600 group-hover:text-purple-800">View payment history</p>
        </Link>
      </div>
    </div>
  );
}