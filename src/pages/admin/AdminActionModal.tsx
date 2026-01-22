// pages/admin/AdminActionModal.tsx

import { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import type { User } from '../../contexts/DataContext';
import { X, Search, User as UserIcon, Building, ArrowLeft } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

// ✅ STEP 1: IMPORT THE NEW FORM COMPONENTS
import AdminPaymentForm from '../../components/admin/AdminPaymentForm';
import AdminBookingForm from '../../components/admin/AdminBookingForm';

type ActionType = 'payment' | 'booking';
type Stage = 'select_user' | 'select_target' | 'fill_form' | 'success';

export default function AdminActionModal({ actionType, onClose }: { actionType: ActionType, onClose: () => void }) {
  const { users = [], bookings = [], properties = [], addPayment, addBooking } = useData();

  // ... (all other state remains the same: stage, selectedUser, etc.)
  const [stage, setStage] = useState<Stage>('select_user');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const selectableUsers = useMemo(() =>
    users.filter(u =>
      (u.role === 'client' || u.role === 'customer') && // Only show customers/clients
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    ), [users, searchTerm]);

  // This resets the whole flow if the modal is closed and reopened
  const handleResetAndClose = () => {
    setStage('select_user');
    setSelectedUser(null);
    setSelectedTargetId(null);
    setSearchTerm('');
    onClose();
  };

  const renderStageContent = () => {
    switch (stage) {
      // STAGE 1 & 2 are unchanged...
      case 'select_user':
        return (
          <div>
            <h3 className="font-semibold mb-4 text-lg">Select a User</h3>
            {/* Search Bar for Users */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search for a customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {/* List of Users */}
            <div className="max-h-80 overflow-y-auto divide-y border rounded-lg">
              {selectableUsers.length > 0 ? (
                selectableUsers.map(user => (
                  <div
                    key={user.id}
                    onClick={() => {
                      setSelectedUser(user);
                      setStage('select_target');
                      setSearchTerm(''); // Reset search for the next stage if needed
                    }}
                    className="p-3 hover:bg-blue-50 cursor-pointer flex items-center gap-3 transition-colors"
                  >
                    <UserIcon className="size-5 text-gray-500 flex-shrink-0"/>
                    <div className="flex-grow">
                      <span className="font-medium text-gray-800">{user.first_name} {user.last_name}</span>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No customers found.
                </div>
              )}
            </div>
          </div>
        );
      // ✅ END: RESTORE MISSING JSX FOR STAGE 1

      // ✅ START: RESTORE MISSING JSX FOR STAGE 2
      case 'select_target':
        const userBookingsWithBalance = bookings.filter(b => b.userId === selectedUser?.id && b.totalAmount > b.paidAmount);

        return (
          <div>
            <button onClick={() => setStage('select_user')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-4">
              <ArrowLeft size={16}/> Back to user list
            </button>
            <h3 className="font-semibold mb-4 text-lg">Select a {actionType === 'payment' ? 'Booking' : 'Property'}</h3>
            <p className="text-sm text-gray-600 mb-4">
              For: <span className="font-bold text-gray-800">{selectedUser?.first_name} {selectedUser?.last_name}</span>
            </p>
            <div className="max-h-80 overflow-y-auto divide-y border rounded-lg">
              {/* Logic for 'Create Payment' */}
              {actionType === 'payment' && (
                userBookingsWithBalance.length > 0 ? (
                  userBookingsWithBalance.map(booking => (
                    <div key={booking.id} onClick={() => { setSelectedTargetId(booking.id); setStage('fill_form'); }} className="p-3 hover:bg-blue-50 cursor-pointer transition-colors">
                      <p className="font-semibold text-gray-800">{booking.propertyName}</p>
                      <p className="text-sm text-red-600">Balance: {formatCurrency(booking.totalAmount - booking.paidAmount)}</p>
                      <p className="text-xs text-gray-500">ID: {booking.id}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500">This user has no bookings with an outstanding balance.</div>
                )
              )}
              {/* Logic for 'Create Reservation' */}
              {actionType === 'booking' && (
                properties.map(property => (
                 <div key={property.id} onClick={() => { setSelectedTargetId(property.id); setStage('fill_form'); }} className="p-3 hover:bg-blue-50 cursor-pointer flex items-center gap-3 transition-colors">
                   <Building className="size-5 text-gray-500 flex-shrink-0"/>
                   <span className="font-medium text-gray-800">{property.name}</span>
                 </div>
                ))
              )}
            </div>
          </div>
        );
      // ✅ END: RESTORE MISSING JSX FOR STAGE 2

      // ✅ STEP 2: REPLACE THE PLACEHOLDER WITH THE REAL FORMS
      case 'fill_form':
        return (
          <div>
            <button onClick={() => setStage('select_target')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-4">
                <ArrowLeft size={16}/> Back
            </button>
            <h3 className="font-semibold mb-4 text-lg">Enter Details</h3>
            
            {actionType === 'payment' && selectedUser && selectedTargetId && (
              <AdminPaymentForm
                userId={selectedUser.id}
                bookingId={selectedTargetId}
                onComplete={() => setStage('success')}
              />
            )}

            {actionType === 'booking' && selectedUser && selectedTargetId && (
              <AdminBookingForm
                userId={selectedUser.id}
                propertyId={selectedTargetId}
                onComplete={() => setStage('success')}
              />
            )}
          </div>
        );

      case 'success':
        return (
          <div className="text-center p-8">
            <h3 className="text-xl font-semibold text-green-600">Success!</h3>
            <p className="text-gray-700 mt-2">
              The {actionType === 'payment' ? 'payment has' : 'reservation has'} been created successfully.
            </p>
            <p className="text-sm text-gray-500 mt-1">
              The customer's portal has been updated.
            </p>
            <button onClick={handleResetAndClose} className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg">
              Done
            </button>
          </div>
        );
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold capitalize">Admin: Create {actionType}</h2>
          <button onClick={handleResetAndClose}><X /></button>
        </div>
        <div className="p-6 overflow-y-auto">
          {renderStageContent()}
        </div>
      </div>
    </div>
  );
}
