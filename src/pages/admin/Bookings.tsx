import { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { Search, Eye, CheckCircle, XCircle, X, Plus } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { getPropertyTypeLabel } from '../../utils/propertyHelpers';
import AdminActionModal from '../../pages/admin/AdminActionModal';


export default function AdminBookings() {
  const { bookings, updateBooking, getUserById, payments } = useData();
  const { sendBookingNotification } = useNotifications();
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);

  const filteredBookings = bookings.filter(b => {
    const user = getUserById(b.userId);
    const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
    const matchesSearch =
      b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user && `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const sortedBookings = [...filteredBookings].sort(
    (a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()
  );

  const handleApprove = (bookingId: string, userId: string) => {
    updateBooking(bookingId, { status: 'approved' });
    sendBookingNotification(userId, bookingId, 'approved');
    setSelectedBooking(null);
  };

  const handleReject = (bookingId: string, userId: string) => {
    updateBooking(bookingId, { status: 'rejected' });
    sendBookingNotification(userId, bookingId, 'rejected');
    setSelectedBooking(null);
  };

  const booking = selectedBooking ? bookings.find(b => b.id === selectedBooking) : null;
  const user = booking ? getUserById(booking.userId) : null;
  
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        {/* Text container */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reservation Management</h1>
          <p className="text-gray-600">Review and manage customer reservation requests</p>
        </div>
        {/* Button container */}
        <div>
          <button
            onClick={() => setIsActionModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="size-5" />
            Create Reservation
          </button>
        </div>
      </div>
      {/* ✅ END: NEW FLEXBOX HEADER */}

      {isActionModalOpen && (
        <AdminActionModal
          actionType="booking"
          onClose={() => setIsActionModalOpen(false)}
        />
      )}

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Booking ID, Property, or Customer Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                filterStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status !== 'all' && (
                <span className="ml-2 text-xs">({bookings.filter(b => b.status === status).length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">Reservation ID</th>
                <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">User ID</th>
                <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">Property</th>
                <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">Date Range</th>
                <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">Payment Progress</th>
                <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">Visit Type</th>
                <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">Reservation Status</th>
                <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedBookings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">No bookings found</td>
                </tr>
              ) : (
                sortedBookings.map((booking) => {
                  const payment = payments.find(p => p.bookingId === booking.id);
                  return (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{booking.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{booking.userId}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="text-gray-900">{booking.propertyName}</div>
                        <div className="text-xs text-gray-500">{getPropertyTypeLabel(booking.propertyType)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div>{new Date(booking.startDate).toLocaleDateString()}</div>
                        <div className="text-xs">{new Date(booking.endDate).toLocaleDateString()}</div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="text-gray-900">{formatCurrency(booking.paidAmount)}</div>
                        <div className="text-xs text-gray-500">{((booking.paidAmount / booking.totalAmount) * 100).toFixed(0)}% paid</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(booking.totalAmount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {booking.propertyType === 'parking_slot' ? (
                          <span className="text-gray-400">N/A</span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full ${
                            booking.modeOfVisit === 'onsite' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {booking.modeOfVisit === 'onsite' ? 'On-site' : 'Online'}
                          </span>
                        )}
                      </td>   
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${statusColors[booking.status]}`}>{booking.status.toUpperCase()}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button onClick={() => setSelectedBooking(booking.id)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="View Details"><Eye className="size-4" /></button>
                          {booking.status === 'pending' && (
                            <>
                              <button onClick={() => handleApprove(booking.id, booking.userId)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Approve"><CheckCircle className="size-4" /></button>
                              <button onClick={() => handleReject(booking.id, booking.userId)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Reject"><XCircle className="size-4" /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Details Modal */}
      {booking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex justify-between items-start">
                  <div>
                      <h2 className="text-xl font-semibold">Reservation Details</h2>
                      {user && (
                          <p className="text-sm text-gray-500 mt-1">
                              User: <span className="font-medium text-gray-700">{user.first_name} {user.last_name}</span> (ID: <span className="font-mono">{user.id}</span>)
                          </p>
                      )}
                  </div>
                  <button onClick={() => setSelectedBooking(null)} className="text-gray-400 hover:text-gray-600 ml-4"><X className="size-6" /></button>
              </div>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="mb-3 font-semibold">Information</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-600">Reservation ID:</span> <span className="text-gray-900 font-mono text-xs">{booking.id}</span></div>
                    <div><span className="text-gray-600">Property:</span> <span className="text-gray-900">{booking.propertyName}</span></div>
                    <div><span className="text-gray-600">Type:</span> <span className="text-gray-900">{getPropertyTypeLabel(booking.propertyType)}</span></div>
                    <div><span className="text-gray-600">Start Date:</span> <span className="text-gray-900">{new Date(booking.startDate).toLocaleDateString()}</span></div>
                    <div><span className="text-gray-600">End Date:</span> <span className="text-gray-900">{new Date(booking.endDate).toLocaleDateString()}</span></div>
                    <div><span className="text-gray-600">Duration:</span> <span className="text-gray-900">{booking.duration} {booking.propertyType === 'rental_space' ? 'months' : booking.propertyType === 'function_hall' ? 'days' : 'hours'}</span></div>
{booking.propertyType === 'rental_space' && booking.paymentCycle && (
        <div>
          <span className="text-gray-600">Payment Cycle: </span>
          <span className="text-gray-900 capitalize">{booking.paymentCycle}</span>
        </div>
      )}                    <div><span className="text-gray-600">Mode:</span> <span className="text-gray-900 capitalize">{booking.modeOfVisit?.replace('_', ' ')}</span></div>
                    {booking.modeOfVisit === 'onsite' && (
      <div className="flex justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <span className="text-gray-600 font-semibold">On-site Plan:</span>
        <span className="text-blue-800 font-bold">
          {booking.paymentIntent === 'pay_onsite' ? 'Will Pay On-site' : 'Will Decide Later'}
        </span>
      </div>
    )}
                    <div><span className="text-gray-600">Request Date:</span> <span className="text-gray-900">{new Date(booking.requestDate).toLocaleDateString()}</span></div>
                  </div>
                </div>
              </div>

              {(booking.businessType || booking.eventPurpose || booking.vehicleType) && (
                <div>
                  <h3 className="mb-3">Additional Details</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                    {/* ... content ... */}
                  </div>
                </div>
              )}
              {booking.notes && (
                <div>
                  <h3 className="mb-2">Customer Notes</h3>
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm text-gray-700">
                    {booking.notes}
                  </div>
                </div>
              )}
              <div>
                <h3 className="mb-2">Current Status</h3>
                <span className={`inline-block px-4 py-2 rounded-lg ${statusColors[booking.status]}`}>
                  {booking.status.toUpperCase()}
                </span>
              </div>
              {booking.status === 'pending' && (
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  {/* ... buttons ... */}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}