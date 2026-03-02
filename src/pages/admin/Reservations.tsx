import { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { Search, Eye, CheckCircle, XCircle, X, Plus, MapPin } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { getPropertyTypeLabel } from '../../utils/propertyHelpers';
import AdminActionModal from './AdminActionModal';


export default function AdminReservations() {
  const { reservations, updateReservation, getUserById, payments } = useData();
  const { sendReservationNotification } = useNotifications();
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReservation, setSelectedReservation] = useState<string | null>(null);
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);

  const filteredReservations = reservations.filter(b => {
    const user = getUserById(b.userId);
    const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
    const matchesSearch =
      b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user && `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const sortedReservations = [...filteredReservations].sort(
    (a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()
  );

  const handleApprove = (reservationId: string, userId: string) => {
    updateReservation(reservationId, { status: 'confirmed' });
    sendReservationNotification(userId, reservationId, 'approved');
    setSelectedReservation(null);
  };

  const handleReject = (reservationId : string, userId: string) => {
    updateReservation(reservationId, { status: 'cancelled' });
    sendReservationNotification(userId, reservationId, 'rejected');
    setSelectedReservation(null);
  };

  const reservation = selectedReservation ? reservations.find(b => b.id === selectedReservation) : null;
  const user = reservation ? getUserById(reservation.userId) : null;
  
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-blue-100 text-blue-800'
  };

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
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
          actionType="reservation"
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
              placeholder="Search by Reservation ID, Property, or Customer Name..."
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
                <span className="ml-2 text-xs">({sortedReservations.filter(b => b.status === status).length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Reservations Table */}
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
              {sortedReservations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">No reservations found</td>
                </tr>
              ) : (
                sortedReservations.map((reservation) => {
                  const payment = payments.find(p => p.reservationId === reservation.id);
                  return (
                    <tr key={reservation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{reservation.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{reservation.userId}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="text-gray-900">{reservation.propertyName}</div>
                        <div className="text-xs text-gray-500">{getPropertyTypeLabel(reservation.propertyType)}</div>
                        <div className="text-xs text-gray-400 flex items-center gap-1">
                          Location: {reservation.location || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div>{new Date(reservation.startDate).toLocaleDateString()}</div>
                        <div className="text-xs">{new Date(reservation.endDate).toLocaleDateString()}</div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="text-gray-900">{formatCurrency(reservation.paidAmount)}</div>
                        <div className="text-xs text-gray-500">{((reservation.paidAmount / reservation.totalAmount) * 100).toFixed(0)}% paid</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(reservation.totalAmount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {reservation.propertyType === 'parking_slot' ? (
                          <span className="text-gray-400">N/A</span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full ${
                            reservation.modeOfVisit === 'onsite' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {reservation.modeOfVisit === 'onsite' ? 'On-site' : 'Online'}
                          </span>
                        )}
                      </td>   
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${statusColors[reservation.status]}`}>{reservation.status.toUpperCase()}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button onClick={() => setSelectedReservation(reservation.id)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="View Details"><Eye className="size-4" /></button>
                          {reservation.status === 'pending' && (
                            <>
                              <button onClick={() => handleApprove(reservation.id, reservation.userId)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Approve"><CheckCircle className="size-4" /></button>
                              <button onClick={() => handleReject(reservation.id, reservation.userId)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Reject"><XCircle className="size-4" /></button>
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

      {/* Reservation Details Modal */}
      {reservation && (
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
                  <button onClick={() => setSelectedReservation(null)} className="text-gray-400 hover:text-gray-600 ml-4"><X className="size-6" /></button>
              </div>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="mb-3 font-semibold">Information</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-600">Reservation ID:</span> <span className="text-gray-900 font-mono text-xs">{reservation.id}</span></div>
                    <div><span className="text-gray-600">Property:</span> <span className="text-gray-900">{reservation.propertyName}</span></div>
                    <div><span className="text-gray-600">Type:</span> <span className="text-gray-900">{getPropertyTypeLabel(reservation.propertyType)}</span></div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600">Location:</span>
                      <span className="text-gray-900">{reservation.location || 'N/A'}</span>
                    </div>
                    <div><span className="text-gray-600">Start Date:</span> <span className="text-gray-900">{new Date(reservation.startDate).toLocaleDateString()}</span></div>
                    <div><span className="text-gray-600">End Date:</span> <span className="text-gray-900">{new Date(reservation.endDate).toLocaleDateString()}</span></div>
                    <div><span className="text-gray-600">Duration:</span> <span className="text-gray-900">{reservation.duration} {reservation.propertyType === 'rental_space' ? 'months' : reservation.propertyType === 'function_hall' ? 'days' : 'hours'}</span></div>
{reservation.propertyType === 'rental_space' && reservation.paymentCycle && (
        <div>
          <span className="text-gray-600">Payment Cycle: </span>
          <span className="text-gray-900 capitalize">{reservation.paymentCycle}</span>
        </div>
      )}                    <div><span className="text-gray-600">Mode:</span> <span className="text-gray-900 capitalize">{reservation.modeOfVisit?.replace('_', ' ')}</span></div>
                    {reservation.modeOfVisit === 'onsite' && (
      <div className="flex justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <span className="text-gray-600 font-semibold">On-site Plan:</span>
        <span className="text-blue-800 font-bold">
          {reservation.paymentIntent === 'pay_onsite' ? 'Will Pay On-site' : 'Will Decide Later'}
        </span>
      </div>
    )}
                    <div><span className="text-gray-600">Request Date:</span> <span className="text-gray-900">{new Date(reservation.requestDate).toLocaleDateString()}</span></div>
                  </div>
                </div>
              </div>

              {(reservation.businessType || reservation.eventPurpose || reservation.vehicleType) && (
                <div>
                  <h3 className="mb-3">Additional Details</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                    {/* ... content ... */}
                  </div>
                </div>
              )}
              {reservation.notes && (
                <div>
                  <h3 className="mb-2">Customer Notes</h3>
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm text-gray-700">
                    {reservation.notes}
                  </div>
                </div>
              )}
              <div>
                <h3 className="mb-2">Current Status</h3>
                <span className={`inline-block px-4 py-2 rounded-lg ${statusColors[reservation.status]}`}>
                  {reservation.status.toUpperCase()}
                </span>
              </div>
              {reservation.status === 'pending' && (
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