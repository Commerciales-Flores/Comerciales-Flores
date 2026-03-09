// pages/admin/AdminActionModal.tsx

import { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import type { User } from '../../contexts/DataContext';
import { X, Search, User as UserIcon, Building, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import AdminPaymentForm from './forms/AdminPaymentForm';
import AdminReservationForm from './forms/AdminReservationForm';

type ActionType = 'payment' | 'reservation';
type Stage = 'select_user' | 'select_target' | 'fill_form' | 'success';

export default function AdminActionModal({ actionType, onClose }: { actionType: ActionType, onClose: () => void }) {
  const { users = [], reservations = [], properties = [], addPayment, addReservation } = useData();

  const [stage, setStage] = useState<Stage>('select_user');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Search logic optimized
  const selectableUsers = useMemo(() =>
    users.filter(u =>
      (u.role === 'client' || u.role === 'customer') &&
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    ), [users, searchTerm]);

  // Memoize reservation logic to prevent lag during typing
  const userReservationsWithBalance = useMemo(() => {
    if (!selectedUser) return [];
    return reservations.filter(r => r.userId === selectedUser.id && r.totalAmount > r.paidAmount);
  }, [reservations, selectedUser]);

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
          <div className="flex flex-col h-full">
            <div className="sticky top-0 bg-white pb-4 z-10">
              <h3 className="font-semibold text-lg text-gray-900">Select Customer</h3>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pb-4">
              {selectableUsers.length > 0 ? (
                selectableUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => {
                      setSelectedUser(user);
                      setStage('select_target');
                      setSearchTerm('');
                    }}
                    className="w-full p-4 hover:bg-blue-50 active:bg-blue-100 border border-gray-100 rounded-xl flex items-center gap-4 transition-colors text-left"
                  >
                    <div className="size-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <UserIcon className="size-5 text-blue-600"/>
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-semibold text-gray-900 truncate">{user.first_name} {user.last_name}</p>
                      <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="py-12 text-center text-gray-400">
                   <UserIcon className="size-12 mx-auto mb-3 opacity-20" />
                   <p>No customers found</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'select_target':
        return (
          <div className="flex flex-col h-full">
             <button 
              onClick={() => setStage('select_user')} 
              className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 mb-4 transition-colors"
            >
              <ArrowLeft size={18}/> Back to users
            </button>

            <h3 className="font-semibold text-lg text-gray-900 capitalize">
              Select {actionType === 'payment' ? 'Reservation' : 'Property'}
            </h3>
            <p className="text-sm text-gray-500 mb-4 italic">
              Assigning to: <span className="text-gray-900 font-medium">{selectedUser?.first_name} {selectedUser?.last_name}</span>
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 pb-4">
              {actionType === 'payment' && (
                userReservationsWithBalance.length > 0 ? (
                  userReservationsWithBalance.map(res => (
                    <button 
                      key={res.id} 
                      onClick={() => { setSelectedTargetId(res.id); setStage('fill_form'); }} 
                      className="w-full p-4 border border-gray-100 rounded-xl hover:bg-blue-50 active:bg-blue-100 transition-all text-left group"
                    >
                      <p className="font-bold text-gray-900 group-hover:text-blue-700">{res.propertyName}</p>
                      <div className="flex justify-between items-end mt-1">
                        <span className="text-xs text-gray-400">ID: {res.id.slice(0,8)}...</span>
                        <span className="text-sm font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                          {formatCurrency(res.totalAmount - res.paidAmount)} due
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="py-12 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <p className="text-gray-500">No outstanding balances found.</p>
                  </div>
                )
              )}

              {actionType === 'reservation' && properties.map(property => (
                <button 
                  key={property.id} 
                  onClick={() => { setSelectedTargetId(property.id); setStage('fill_form'); }} 
                  className="w-full p-4 border border-gray-100 rounded-xl hover:bg-blue-50 active:bg-blue-100 flex items-center gap-4 transition-all text-left"
                >
                  <div className="size-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Building className="size-5 text-gray-600"/>
                  </div>
                  <span className="font-semibold text-gray-900">{property.name}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 'fill_form':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <button onClick={() => setStage('select_target')} className="flex items-center gap-2 text-sm font-medium text-blue-600 mb-6">
                <ArrowLeft size={18}/> Back to selection
            </button>
            
            {actionType === 'payment' && selectedUser && selectedTargetId && (
              <AdminPaymentForm
                userId={selectedUser.id}
                reservationId={selectedTargetId}
                onComplete={() => setStage('success')}
              />
            )}

            {actionType === 'reservation' && selectedUser && selectedTargetId && (
              <AdminReservationForm
                userId={selectedUser.id}
                propertyId={selectedTargetId}
                onComplete={() => setStage('success')}
              />
            )}
          </div>
        );

      case 'success':
        return (
          <div className="text-center py-12 px-4 animate-in zoom-in-95 duration-300">
            <div className="size-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="size-12 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">Success!</h3>
            <p className="text-gray-600 mt-3 max-w-xs mx-auto">
              The {actionType} record has been processed and is now visible in the customer's portal.
            </p>
            <button 
              onClick={handleResetAndClose} 
              className="mt-10 w-full sm:w-auto px-12 py-3 bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95"
            >
              Done
            </button>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 transition-opacity">
      {/* Modal Container: Full height on mobile, fixed size on desktop */}
      <div className="bg-white w-full max-w-2xl h-[95vh] sm:h-auto sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-white sticky top-0 z-20">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Administrator Tools</span>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              New {actionType}
            </h2>
          </div>
          <button 
            onClick={handleResetAndClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="size-6 text-gray-500" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {renderStageContent()}
        </div>
      </div>
    </div>
  );
}