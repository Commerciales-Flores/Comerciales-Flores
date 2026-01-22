import { Link } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { Building, Calendar, Users, DollarSign, ArrowRight, TrendingUp, Clock, CheckCircle } from 'lucide-react';

export default function Dashboard() {
  const { getAnalytics, bookings, inquiries, payments } = useData();
  const analytics = getAnalytics();

  const recentBookings = bookings
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const recentInquiries = inquiries
    .filter(i => i.status === 'open')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Overview of your rental business</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building className="w-6 h-6 text-blue-600" />
            </div>
            <Link to="/admin/spaces" className="text-sm text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          <p className="text-gray-600 mb-1">Total Spaces</p>
          <p className="text-gray-900">{analytics.totalSpaces}</p>
          <div className="mt-2 flex gap-4 text-sm">
            <span className="text-green-600">{analytics.availableSpaces} available</span>
            <span className="text-red-600">{analytics.occupiedSpaces} occupied</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <Link to="/admin/bookings" className="text-sm text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          <p className="text-gray-600 mb-1">Total Bookings</p>
          <p className="text-gray-900">{analytics.totalBookings}</p>
          <div className="mt-2 flex gap-4 text-sm">
            <span className="text-yellow-600">{analytics.pendingBookings} pending</span>
            <span className="text-green-600">{analytics.approvedBookings} approved</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <Link to="/admin/payments" className="text-sm text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          <p className="text-gray-600 mb-1">Total Revenue</p>
          <p className="text-gray-900">${analytics.totalRevenue.toFixed(2)}</p>
          <div className="mt-2 text-sm">
            <span className="text-yellow-600">${analytics.pendingPayments.toFixed(2)} pending</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
            <Link to="/admin/customers" className="text-sm text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          <p className="text-gray-600 mb-1">Active Inquiries</p>
          <p className="text-gray-900">{inquiries.filter(i => i.status === 'open').length}</p>
          <div className="mt-2 text-sm text-gray-600">
            {inquiries.filter(i => i.status === 'responded').length} responded
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Bookings */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-gray-900">Recent Bookings</h2>
            <Link to="/admin/bookings" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-200">
            {recentBookings.length === 0 ? (
              <div className="p-6 text-center text-gray-600">No bookings yet</div>
            ) : (
              recentBookings.map((booking) => (
                <div key={booking.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-900">{booking.spaceName}</p>
                      <p className="text-sm text-gray-600">{booking.userName}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      booking.status === 'approved' ? 'bg-green-100 text-green-800' :
                      booking.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Open Inquiries */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-gray-900">Open Inquiries</h2>
            <Link to="/admin/inquiries" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-200">
            {recentInquiries.length === 0 ? (
              <div className="p-6 text-center text-gray-600">No open inquiries</div>
            ) : (
              recentInquiries.map((inquiry) => (
                <div key={inquiry.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-gray-900">{inquiry.subject}</p>
                    <Clock className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{inquiry.message}</p>
                  <p className="text-xs text-gray-500 mt-2">From: {inquiry.userName}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
