import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import supabase from '../../supabaseClient';
import { Building, Calendar, Users, DollarSign, ArrowRight, Clock, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

interface AdminStats {
  totalUnits: number;
  availableUnits: number;
  occupiedUnits: number;
  totalBookings: number;
  pendingBookings: number;
  approvedBookings: number;
  totalRevenue: number;
  openInquiries: number;
  respondedInquiries: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<AdminStats>({
    totalUnits: 0,
    availableUnits: 0,
    occupiedUnits: 0,
    totalBookings: 0,
    pendingBookings: 0,
    approvedBookings: 0,
    totalRevenue: 0,
    openInquiries: 0,
    respondedInquiries: 0,
  });

  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [recentInquiries, setRecentInquiries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAdminDashboardData = async () => {
      try {
        // 1. Fetch Unit Stats
        // Currently, you fetch units from a mock file, but if they are in DB:
        // const { count: totalUnits } = await supabase.from('units').select('*', { count: 'exact', head: true });
        
        // 2. Fetch Booking Stats
        const { data: allBookings, error: bookingError } = await supabase
          .from('reservations')
          .select('reservation_id, status, total_amount, title, created_at')
          .order('created_at', { ascending: false });

        if (bookingError) throw bookingError;

        const totalBookings = allBookings?.length || 0;
        const pendingBookings = allBookings?.filter(b => b.status === 'pending').length || 0;
        const approvedBookings = allBookings?.filter(b => b.status === 'approved').length || 0;
        
        // Calculate Total Expected Revenue from all non-cancelled bookings
        const totalRevenue = allBookings?.reduce((sum, b) => {
           return b.status !== 'cancelled' ? sum + Number(b.total_amount || 0) : sum;
        }, 0) || 0;

        // 3. Fetch Inquiry Stats
        const { data: allInquiries, error: inquiryError } = await supabase
          .from('messages')
          .select('message_id, status, subject, message, name, date')
          .order('date', { ascending: false });

        if (inquiryError) throw inquiryError;

        const openInquiries = allInquiries?.filter(i => i.status === 'open').length || 0;
        const respondedInquiries = allInquiries?.filter(i => i.status === 'responded').length || 0;

        // 4. Update State
        setStats({
          totalUnits: 0, // Update this if you move units to Supabase!
          availableUnits: 0,
          occupiedUnits: 0,
          totalBookings,
          pendingBookings,
          approvedBookings,
          totalRevenue,
          openInquiries,
          respondedInquiries,
        });

        // Set Recent Lists
        setRecentBookings(allBookings?.slice(0, 5) || []);
        setRecentInquiries(allInquiries?.filter(i => i.status === 'open').slice(0, 3) || []);

      } catch (error) {
        console.error('Error fetching admin dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdminDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="size-8 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-500 text-lg">Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Overview of your rental business</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building className="w-6 h-6 text-blue-600" />
            </div>
            <Link to="/admin/properties" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Properties / Units</p>
          <p className="text-gray-900 text-2xl font-bold">Live Check</p>
          <div className="mt-2 flex gap-4 text-xs font-medium">
            <span className="text-green-600">See properties tab</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <Link to="/admin/bookings" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Total Bookings</p>
          <p className="text-gray-900 text-2xl font-bold">{stats.totalBookings}</p>
          <div className="mt-2 flex gap-4 text-xs font-medium">
            <span className="text-yellow-600">{stats.pendingBookings} pending</span>
            <span className="text-green-600">{stats.approvedBookings} approved</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <Link to="/admin/payments" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Total Expected Revenue</p>
          <p className="text-gray-900 text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
          <div className="mt-2 text-xs font-medium">
            <span className="text-gray-500">From all non-cancelled bookings</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
            <Link to="/admin/inquiries" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Active Inquiries</p>
          <p className="text-gray-900 text-2xl font-bold">{stats.openInquiries}</p>
          <div className="mt-2 text-xs font-medium text-gray-600">
            {stats.respondedInquiries} responded
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Bookings */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
            <Link to="/admin/bookings" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentBookings.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No bookings yet</div>
            ) : (
              recentBookings.map((booking) => (
                <div key={booking.reservation_id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-900 font-medium">{booking.title}</p>
                      <p className="text-sm text-gray-500 mt-1">Requested: {new Date(booking.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                      booking.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      booking.status === 'approved' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      booking.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-200' :
                      booking.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-gray-50 text-gray-700 border-gray-200'
                    }`}>
                      {booking.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Open Inquiries */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Open Inquiries</h2>
            <Link to="/admin/inquiries" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentInquiries.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No open inquiries</div>
            ) : (
              recentInquiries.map((inquiry) => (
                <div key={inquiry.message_id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-gray-900 font-medium line-clamp-1 pr-4">{inquiry.subject}</p>
                    <Clock className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{inquiry.message}</p>
                  <p className="text-xs text-gray-400 mt-2">From: {inquiry.name}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}