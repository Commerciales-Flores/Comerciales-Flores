import { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import type { User } from '../../contexts/DataContext';
import { X, Search, User as UserIcon, Building, ArrowLeft, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

import AdminPaymentForm from '../../components/admin/AdminPaymentForm';
import AdminBookingForm from '../../components/admin/AdminBookingForm';

type ActionType = 'payment' | 'booking';
type Stage = 'select_user' | 'select_target' | 'fill_form' | 'success';

export default function AdminActionModal({ actionType, onClose }: { actionType: ActionType, onClose: () => void }) {
  // ✅ FIX 1: Swapped 'properties' for 'units' to match DataContext
  const { users = [], bookings = [], units = [] } = useData();

  const [stage, setStage] = useState<Stage>('select_user');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const selectableUsers = useMemo(() =>
    users.filter(u =>
      (u.role === 'client' || u.role === 'customer') && 
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    ), [users, searchTerm]);

  // Resets the whole flow if the modal is closed and reopened
  const handleResetAndClose = () => {
    setStage('select_user');
    setSelectedUser(null);
    setSelectedTargetId(null);
    setSearchTerm('');
    onClose();
  };

  const renderStageContent = () => {
    switch (stage) {
      case 'select_user':
        return (
          <div>
            <h3 className="font-semibold mb-4 text-lg text-gray-900">Select a Customer</h3>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              />
            </div>
            
            <div className="max-h-80 overflow-y-auto divide-y border border-gray-200 rounded-lg bg-white shadow-inner">
              {selectableUsers.length > 0 ? (
                selectableUsers.map(user => (
                  <div
                    key={user.id}
                    onClick={() => {
                      setSelectedUser(user);
                      setStage('select_target');
                      setSearchTerm('');
                    }}
                    className="p-3.5 hover:bg-blue-50 cursor-pointer flex items-center gap-4 transition-colors"
                  >
                    <div className="p-2 bg-gray-100 rounded-full">
                       <UserIcon className="size-5 text-gray-500 flex-shrink-0"/>
                    </div>
                    <div className="flex-grow">
                      <span className="font-medium text-gray-900">{user.first_name} {user.last_name}</span>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No customers found. (Make sure your DataContext has fetched users!)
                </div>
              )}
            </div>
          </div>
        );

      case 'select_target':
        const userBookingsWithBalance = bookings.filter(b => b.userId === selectedUser?.id && b.totalAmount > b.paidAmount);

        return (
          <div>
            <button onClick={() => setStage('select_user')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
              <ArrowLeft size={16}/> Back to user list
            </button>
            <h3 className="font-semibold mb-1 text-lg text-gray-900">
               Select a {actionType === 'payment' ? 'Reservation' : 'Property'}
            </h3>
            <p className="text-sm text-gray-500 mb-4 pb-4 border-b border-gray-100">
              For: <span className="font-bold text-gray-800">{selectedUser?.first_name} {selectedUser?.last_name}</span>
            </p>
            
            <div className="max-h-80 overflow-y-auto divide-y border border-gray-200 rounded-lg bg-white shadow-inner">
              {/* Logic for 'Create Payment' */}
              {actionType === 'payment' && (
                userBookingsWithBalance.length > 0 ? (
                  userBookingsWithBalance.map(booking => (
                    <div key={booking.id} onClick={() => { setSelectedTargetId(booking.id); setStage('fill_form'); }} className="p-4 hover:bg-blue-50 cursor-pointer transition-colors group">
                      <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{booking.propertyName}</p>
                      <p className="text-sm text-red-600 font-medium mt-1">Outstanding Balance: {formatCurrency(booking.totalAmount - booking.paidAmount)}</p>
                      <p className="text-xs text-gray-400 font-mono mt-1">ID: {booking.id.split('-')[0]}...</p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500 text-sm">This user has no reservations with an outstanding balance.</div>
                )
              )}

              {/* Logic for 'Create Reservation' */}
              {actionType === 'booking' && (
                units.length > 0 ? (
                  units.map(unit => (
                    <div key={unit.id} onClick={() => { setSelectedTargetId(unit.id); setStage('fill_form'); }} className="p-4 hover:bg-blue-50 cursor-pointer flex items-center gap-4 transition-colors group">
                      <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-blue-100 transition-colors">
                         <Building className="size-5 text-gray-600 group-hover:text-blue-600 flex-shrink-0"/>
                      </div>
                      <div>
                         <span className="font-medium text-gray-900 group-hover:text-blue-700 block transition-colors">{unit.name}</span>
                         <span className="text-xs text-gray-500 capitalize block mt-0.5">{unit.type.replace('_', ' ')}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500 text-sm">No properties available to book.</div>
                )
              )}
            </div>
          </div>
        );

      case 'fill_form':
        return (
          <div>
            <button onClick={() => setStage('select_target')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
                <ArrowLeft size={16}/> Back
            </button>
            <h3 className="font-semibold mb-4 text-lg text-gray-900">Enter Details</h3>
            
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
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
               <CheckCircle className="size-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Success!</h3>
            <p className="text-gray-600 mt-2">
              The {actionType === 'payment' ? 'payment' : 'reservation'} has been created successfully.
            </p>
            <p className="text-sm text-gray-500 mt-1">
              The customer's portal has been updated.
            </p>
            <button onClick={handleResetAndClose} className="mt-8 w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
              Done
            </button>
          </div>
        );
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900 capitalize">Create New {actionType}</h2>
          <button onClick={handleResetAndClose} className="text-gray-400 hover:text-gray-700 p-1.5 hover:bg-gray-200 rounded-lg transition-colors"><X className="size-5" /></button>
        </div>
        <div className="p-6 overflow-y-auto">
          {renderStageContent()}
        </div>
      </div>
    </div>
  );
}