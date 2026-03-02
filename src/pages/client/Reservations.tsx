import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Calendar, Clock, MapPin, CreditCard, FileText, X } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { getPropertyTypeLabel } from '../../utils/propertyHelpers';

export default function ClientReservations() {
  const { user } = useAuth();
  const { getReservationsByUserId, properties, deleteReservation } = useData();
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const handleDeleteReservation = (reservationId: string, propertyName: string) => {
    if (window.confirm(`Are you sure you want to cancel your reservation for "${propertyName}"?`)) {
      deleteReservation(reservationId);
    }
  };

  const userReservations = getReservationsByUserId(user?.id || '');
  
  const filteredReservations = filterStatus === 'all' 
    ? userReservations 
    : userReservations.filter(b => b.status === filterStatus);

  const sortedReservations = [...filteredReservations].sort(
    (a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()
  );

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    confirmed: 'bg-green-100 text-green-800 border-green-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
    completed: 'bg-blue-100 text-blue-800 border-blue-200'
  };

  const statusIcons = {
    pending: '⏳',
    approved: '✓',
    rejected: '✗',
    confirmed: '✓',
    cancelled: '✗',
    completed: '✓'
  };

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8 flex flex-col gap-6">

      <div>
          <h1 className="text-2xl font-bold text-gray-900">My Reservations</h1>
          <p className="text-gray-500">View and manage your reservations requests</p>
        </div>

      {/* Filter Navigation (Matches Admin Style) */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => {
          // We calculate count based on the full user list so the numbers are stable
          const count = status === 'all' 
            ? userReservations.length 
            : userReservations.filter(b => b.status === status).length;

          return (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                filterStatus === status
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'
              }`}
            >
              <span className="capitalize">{status}</span>
              <span className={`text-xs ${
                filterStatus === status ? 'text-blue-100' : 'text-gray-400'
              }`}>
                ({count})
              </span>
            </button>
          );
        })}
      </div>
      

      {/* Reservations List */}
      {sortedReservations.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Calendar className="size-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-gray-600 mb-2">No reservations found</h3>
          <p className="text-sm text-gray-500">
            {filterStatus === 'all' 
              ? "You haven't made any reservations yet"
              : `No ${filterStatus} reservations`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedReservations.map((reservation) => {
            const property = properties.find(p => p.id === reservation.propertyId);
            const balance = reservation.totalAmount - reservation.paidAmount;
            const paymentProgress = (reservation.paidAmount / reservation.totalAmount) * 100;

            return (
  <div key={reservation.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
    <div className="p-6">
      {/* This is the target container */}
      <div className="flex justify-between items-start mb-4">
        {/* This is the left side with the title */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-blue-600">
              {getPropertyTypeLabel(reservation.propertyType)}
            </span>
            <span className={`px-2 py-1 text-xs rounded-full border ${statusColors[reservation.status]}`}>
              {statusIcons[reservation.status]} {reservation.status.toUpperCase()}
            </span>
          </div>
          <h3 className="mb-1">{reservation.propertyName}</h3>
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <MapPin className="size-4 text-blue-600" /> {property?.location || 'N/A'}
          </p>
          <p className="text-sm text-gray-500">Reservation ID: {reservation.id}</p>
        </div>
      </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="size-4 text-gray-400" />
                        <span className="text-gray-600">Start:</span>
                        <span className="text-gray-900">
                          {new Date(reservation.startDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="size-4 text-gray-400" />
                        <span className="text-gray-600">End:</span>
                        <span className="text-gray-900">
                          {new Date(reservation.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="size-4 text-gray-400" />
                        <span className="text-gray-600">Duration:</span>
                        <span className="text-gray-900">
                          {reservation.duration}{' '}
                          {reservation.propertyType === 'rental_space' ? 'months' : 
                           reservation.propertyType === 'function_hall' ? 'days' : 'hours'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="size-4 text-gray-400" />
                        <span className="text-gray-600">Mode:</span>
                        <span className="text-gray-900 capitalize">
                          {reservation.modeOfVisit.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CreditCard className="size-4 text-gray-400" />
                        <span className="text-gray-600">Payment:</span>
                        <span className="text-gray-900 capitalize">
                          {reservation.paymentMethod?.replace('_', ' ') || 'N/A'}
                        </span>
                      </div>
                      {reservation.paymentCycle && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="size-4 text-gray-400" />
                          <span className="text-gray-600">Cycle:</span>
                          <span className="text-gray-900 capitalize">
                            {reservation.paymentCycle}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Type-specific details */}
                  {reservation.businessType && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Business Type: <span className="text-gray-900">{reservation.businessType}</span></p>
                    </div>
                  )}
                  {reservation.eventPurpose && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Event Purpose: <span className="text-gray-900">{reservation.eventPurpose}</span></p>
                      {reservation.attendees && (
                        <p className="text-sm text-gray-600 mt-1">Attendees: <span className="text-gray-900">{reservation.attendees}</span></p>
                      )}
                    </div>
                  )}
                  {reservation.vehicleType && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Vehicle: <span className="text-gray-900">{reservation.vehicleType} - {reservation.plateNumber}</span></p>
                    </div>
                  )}

                  {reservation.notes && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-gray-600">Notes:</p>
                      <p className="text-sm text-gray-900 mt-1">{reservation.notes}</p>
                    </div>
                  )}

                  {/* Payment Information */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="grid md:grid-cols-3 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-gray-600">Total Amount</p>
                        <p className="text-gray-900">{formatCurrency(reservation.totalAmount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Paid Amount</p>
                        <p className="text-green-600">{formatCurrency(reservation.paidAmount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Balance</p>
                        <p className={balance > 0 ? 'text-red-600' : 'text-green-600'}>
                          {formatCurrency(balance)}
                        </p>
                      </div>
                    </div>

                    {/* Payment Progress Bar */}
                    {reservation.status === 'confirmed' && (
                      <div>
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Payment Progress</span>
                          <span>{paymentProgress.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              paymentProgress === 100 ? 'bg-green-600' : 'bg-blue-600'
                            }`}
                            style={{ width: `${paymentProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status Messages */}
                  {reservation.status === 'pending' && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        Your reservation is pending admin approval. You will be notified once it's reviewed.
                      </p>
                    </div>
                  )}
                  {reservation.status === 'confirmed' && balance > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        Your reservation is approved! Please proceed to the Payments section to complete your payment.
                      </p>
                    </div>
                  )}
                  {reservation.status === 'cancelled' && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">
                        This reservation has been rejected. Please contact support for more information.
                      </p>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mt-4">
                    Requested on {new Date(reservation.requestDate).toLocaleString()}
                  </div>
{/* ✅ START: NEW, CORRECTLY PLACED ACTIONS FOOTER */}
                  {reservation.status === 'pending' && (
                    <div className="border-t border-gray-200 mt-4 pt-4 flex justify-end">
                      <button 
                        onClick={() => handleDeleteReservation(reservation.id, reservation.propertyName)}
                        className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        title="Cancel Reservation"
                      >
                        Cancel Reservation
                      </button>
                    </div>
                  )}
                  {/* ✅ END: NEW, CORRECTLY PLACED ACTIONS FOOTER */}
                  
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
