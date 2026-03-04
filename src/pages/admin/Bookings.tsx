import { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { Search, Eye, CheckCircle, XCircle, X, Plus, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { getPropertyTypeLabel } from '../../utils/propertyHelpers';
import AdminActionModal from '../../pages/admin/AdminActionModal';

export default function AdminBookings() {
  // ✅ 100% Clean: Fetching directly from the global context
  const { bookings, updateBooking, getUserById, payments } = useData(); 
  const { sendBookingNotification } = useNotifications();
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);

  // Filter bookings based on UI state
  const filteredBookings = bookings.filter(b => {
    const user = getUserById(b.userId);
    const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
    const matchesSearch =
      b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user && `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const sortedBookings = [...filteredBookings]; // DataContext already sorts them by creation date

  // ✅ Context handles Supabase update and local state simultaneously
  const handleApprove = async (bookingId: string, userId: string) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await updateBooking(bookingId, { status: 'approved' });
      await sendBookingNotification(userId, bookingId, 'approved');
      setSelectedBooking(null);
    } catch (error) {
      alert("Failed to approve reservation.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReject = async (bookingId: string, userId: string) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await updateBooking(bookingId, { status: 'rejected' });
      await sendBookingNotification(userId, bookingId, 'rejected');
      setSelectedBooking(null);
    } catch (error) {
      alert("Failed to reject reservation.");
    } finally {
      setIsUpdating(false);
    }
  };

  const booking = selectedBooking ? bookings.find(b => b.id === selectedBooking) : null;
  const user = booking ? getUserById(booking.userId) : null;
  
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    approved: 'bg-blue-100 text-blue-800 border-blue-200',
    confirmed: 'bg-green-100 text-green-800 border-green-200',
    completed: 'bg-gray-100 text-gray-800 border-gray-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
    rejected: 'bg-red-100 text-red-800 border-red-200'
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Reservation Management</h1>
          <p className="text-gray-600">Review and manage customer reservation requests</p>
        </div>
        <div>
          <button
            onClick={() => setIsActionModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="size-5" />
            Create Reservation
          </button>
        </div>
      </div>

      {isActionModalOpen && (
        <AdminActionModal
          actionType="booking"
          onClose={() => setIsActionModalOpen(false)}
        />
      )}

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Booking ID, Property, or Customer Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filterStatus === status
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status !== 'all' && (
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-md ${filterStatus === status ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
                  {bookings.filter(b => b.status === status).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">User ID</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Property</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Date Range</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Visit Type</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {sortedBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">No bookings found matching your criteria.</td>
                </tr>
              ) : (
                sortedBookings.map((b) => {
                  return (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                        {b.id.split('-')[0]}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                        {b.userId.split('-')[0]}...
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="text-gray-900 font-medium">{b.propertyName}</div>
                        <div className="text-xs text-gray-500">{getPropertyTypeLabel(b.unitType as any)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div className="font-medium">{new Date(b.startDate).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-400">{new Date(b.endDate).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(b.totalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {b.unitType === 'parking_slot' ? (
                          <span className="text-gray-400 font-medium">N/A</span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${
                            b.modeOfVisit === 'onsite' 
                              ? 'bg-blue-50 text-blue-700 border-blue-200' 
                              : 'bg-gray-50 text-gray-700 border-gray-200'
                          }`}>
                            {b.modeOfVisit === 'onsite' ? 'On-site' : 'Online'}
                          </span>
                        )}
                      </td>   
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${statusColors[b.status as keyof typeof statusColors]}`}>
                           {b.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setSelectedBooking(b.id)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors" title="View Details">
                             <Eye className="size-4" />
                          </button>
                          {b.status === 'pending' && (
                            <>
                              <button onClick={() => handleApprove(b.id, b.userId)} disabled={isUpdating} className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors disabled:opacity-50" title="Approve">
                                 <CheckCircle className="size-4" />
                              </button>
                              <button onClick={() => handleReject(b.id, b.userId)} disabled={isUpdating} className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50" title="Reject">
                                 <XCircle className="size-4" />
                              </button>
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
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-white">
              <div className="flex justify-between items-start">
                  <div>
                      <h2 className="text-xl font-bold text-gray-900">Reservation Details</h2>
                      {user && (
                          <p className="text-sm text-gray-500 mt-1">
                              Client: <span className="font-semibold text-gray-800">{user.first_name} {user.last_name}</span> 
                              <span className="font-mono text-xs ml-2 text-gray-400">(ID: {user.id})</span>
                          </p>
                      )}
                  </div>
                  <button onClick={() => setSelectedBooking(null)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"><X className="size-6" /></button>
              </div>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto bg-gray-50">
              
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <h3 className="mb-4 font-bold text-gray-900 border-b pb-2">Core Information</h3>
                <div className="grid grid-cols-2 gap-y-4 text-sm">
                  <div><span className="text-gray-500 block mb-1 uppercase text-xs font-semibold">Reservation ID</span> <span className="text-gray-900 font-mono text-xs bg-gray-100 px-2 py-1 rounded">{booking.id}</span></div>
                  <div><span className="text-gray-500 block mb-1 uppercase text-xs font-semibold">Request Date</span> <span className="text-gray-900 font-medium">{new Date(booking.requestDate).toLocaleString()}</span></div>
                  <div><span className="text-gray-500 block mb-1 uppercase text-xs font-semibold">Property</span> <span className="text-gray-900 font-medium">{booking.propertyName}</span></div>
                  <div><span className="text-gray-500 block mb-1 uppercase text-xs font-semibold">Type</span> <span className="text-gray-900 font-medium">{getPropertyTypeLabel(booking.unitType as any)}</span></div>
                  <div><span className="text-gray-500 block mb-1 uppercase text-xs font-semibold">Start Date</span> <span className="text-gray-900 font-medium">{new Date(booking.startDate).toLocaleDateString()}</span></div>
                  <div><span className="text-gray-500 block mb-1 uppercase text-xs font-semibold">End Date</span> <span className="text-gray-900 font-medium">{new Date(booking.endDate).toLocaleDateString()}</span></div>
                  <div><span className="text-gray-500 block mb-1 uppercase text-xs font-semibold">Total Duration</span> <span className="text-gray-900 font-medium">{booking.duration} {booking.unitType === 'rental_space' ? 'years' : booking.unitType === 'function_hall' ? 'days' : booking.durationType || 'hours'}</span></div>
                  
                  {booking.unitType === 'rental_space' && booking.paymentCycle && (
                    <div><span className="text-gray-500 block mb-1 uppercase text-xs font-semibold">Payment Cycle</span> <span className="text-blue-700 font-bold capitalize bg-blue-50 px-2 py-1 rounded">{booking.paymentCycle}</span></div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-5">
                 <h3 className="mb-4 font-bold text-gray-900 border-b pb-2">Financial & Visit Details</h3>
                 <div className="grid grid-cols-2 gap-y-4 text-sm">
                    <div>
                      <span className="text-gray-500 block mb-1 uppercase text-xs font-semibold">Total Contract Value</span> 
                      <span className="text-green-700 font-bold text-lg">{formatCurrency(booking.totalAmount)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-1 uppercase text-xs font-semibold">Proposed Payment Method</span> 
                      <span className="text-gray-900 font-medium capitalize">{booking.paymentMethod?.replace('_', ' ') || 'N/A'}</span>
                    </div>
                    {booking.unitType !== 'parking_slot' && (
                       <>
                          <div>
                            <span className="text-gray-500 block mb-1 uppercase text-xs font-semibold">Visit Mode</span> 
                            <span className="text-gray-900 font-medium capitalize">{booking.modeOfVisit?.replace('_', ' ')}</span>
                          </div>
                          {booking.modeOfVisit === 'onsite' && (
                             <div>
                                <span className="text-gray-500 block mb-1 uppercase text-xs font-semibold">On-site Plan</span> 
                                <span className="text-blue-700 font-bold bg-blue-50 px-2 py-1 rounded border border-blue-100">
                                   {booking.paymentIntent === 'pay_onsite' ? 'Will Pay On-site' : 'Will Decide Later'}
                                </span>
                             </div>
                          )}
                       </>
                    )}
                 </div>
              </div>

              {(booking.businessType || booking.eventPurpose || booking.vehicleType) && (
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                  <h3 className="mb-4 font-bold text-gray-900 border-b pb-2">Specific Requirements</h3>
                  <div className="grid grid-cols-2 gap-y-4 text-sm">
                    {booking.businessType && (
                       <div><span className="text-gray-500 block mb-1 uppercase text-xs font-semibold">Business Type</span> <span className="text-gray-900 font-medium">{booking.businessType}</span></div>
                    )}
                    {booking.eventPurpose && (
                       <div><span className="text-gray-500 block mb-1 uppercase text-xs font-semibold">Event Purpose</span> <span className="text-gray-900 font-medium">{booking.eventPurpose}</span></div>
                    )}
                    {booking.attendees && (
                       <div><span className="text-gray-500 block mb-1 uppercase text-xs font-semibold">Expected Attendees</span> <span className="text-gray-900 font-medium">{booking.attendees} pax</span></div>
                    )}
                    {booking.vehicleType && (
                       <div><span className="text-gray-500 block mb-1 uppercase text-xs font-semibold">Vehicle Type</span> <span className="text-gray-900 font-medium">{booking.vehicleType}</span></div>
                    )}
                    {booking.plateNumber && (
                       <div><span className="text-gray-500 block mb-1 uppercase text-xs font-semibold">Plate Number</span> <span className="text-gray-900 font-mono font-bold bg-gray-100 px-2 py-1 rounded">{booking.plateNumber}</span></div>
                    )}
                    {booking.slotName && (
                       <div><span className="text-gray-500 block mb-1 uppercase text-xs font-semibold">Requested Slot</span> <span className="text-blue-700 font-bold bg-blue-50 px-2 py-1 rounded">{booking.slotName}</span></div>
                    )}
                  </div>
                </div>
              )}

              {booking.notes && (
                <div>
                  <h3 className="mb-2 font-bold text-gray-900">Customer Notes</h3>
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-sm text-gray-800 shadow-inner">
                    {booking.notes}
                  </div>
                </div>
              )}

              <div className="bg-white border border-gray-200 rounded-lg p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Current Status</h3>
                  <p className="text-xs text-gray-500">Update the status below to notify the client.</p>
                </div>
                <span className={`px-4 py-2 rounded-lg font-bold border ${statusColors[booking.status as keyof typeof statusColors]}`}>
                  {booking.status.toUpperCase()}
                </span>
              </div>

              {booking.status === 'pending' && (
                <div className="flex gap-3 pt-2">
                  <button onClick={() => handleReject(booking.id, booking.userId)} disabled={isUpdating} className="flex-1 px-4 py-3 border-2 border-red-200 text-red-700 font-bold rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
                     Reject Request
                  </button>
                  <button onClick={() => handleApprove(booking.id, booking.userId)} disabled={isUpdating} className="flex-1 px-4 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
                     {isUpdating ? <Loader2 className="size-5 animate-spin" /> : <CheckCircle className="size-5" />}
                     Approve Reservation
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}