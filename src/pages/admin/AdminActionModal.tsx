import { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import type { User } from '../../contexts/DataContext';
import {
  X,
  Search,
  User as UserIcon,
  Building,
  ArrowLeft,
  CheckCircle2,
  RotateCcw,
  Mail,
} from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import AdminPaymentForm from './forms/AdminPaymentForm';
import AdminReservationForm from './forms/AdminReservationForm';

type ActionType = 'payment' | 'reservation';
type Stage = 'select_user' | 'select_target' | 'fill_form' | 'success';

export default function AdminActionModal({
  actionType,
  onClose,
}: {
  actionType: ActionType;
  onClose: () => void;
}) {
  const { users = [], reservations = [], units = [] } = useData();

  const [stage, setStage] = useState<Stage>('select_user');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const selectableUsers = useMemo(
    () =>
      users.filter(
        (u) =>
          (u.role === 'client' || u.role === 'customer') &&
          `${u.first_name} ${u.last_name} ${u.email}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      ),
    [users, searchTerm]
  );

  const userReservationsWithBalance = useMemo(() => {
    if (!selectedUser) return [];
    return reservations.filter(
      (r) => r.userId === selectedUser.id && r.totalAmount > r.paidAmount
    );
  }, [reservations, selectedUser]);

  const selectedReservation =
    actionType === 'payment' && selectedTargetId
      ? reservations.find((r) => r.id === selectedTargetId) ?? null
      : null;

  const selectedUnit =
    actionType === 'reservation' && selectedTargetId
      ? units.find((u) => u.id === selectedTargetId) ?? null
      : null;

  const resetFlow = () => {
    setStage('select_user');
    setSelectedUser(null);
    setSelectedTargetId(null);
    setSearchTerm('');
  };

  const handleResetAndClose = () => {
    resetFlow();
    onClose();
  };

  const stepTitle =
    stage === 'select_user'
      ? 'Select Customer'
      : stage === 'select_target'
      ? actionType === 'payment'
        ? 'Select Reservation'
        : 'Select Unit'
      : stage === 'fill_form'
      ? actionType === 'payment'
        ? 'Payment Details'
        : 'Reservation Details'
      : 'Completed';

  const stepDescription =
    stage === 'select_user'
      ? 'Choose a customer account to continue.'
      : stage === 'select_target'
      ? actionType === 'payment'
        ? 'Choose a reservation with an outstanding balance.'
        : 'Choose a unit to reserve for the selected customer.'
      : stage === 'fill_form'
      ? 'Complete the required information below.'
      : 'The record has been successfully processed.';

  const renderSummaryBar = () => {
    if (!selectedUser || stage === 'select_user' || stage === 'success') return null;

    return (
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              Customer
            </p>
            <p className="text-sm font-semibold text-slate-900 mt-1">
              {selectedUser.first_name} {selectedUser.last_name}
            </p>
            <p className="text-xs text-slate-500 mt-1 inline-flex items-center gap-1">
              <Mail className="size-3" />
              {selectedUser.email}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              {actionType === 'payment' ? 'Selected Reservation' : 'Selected Unit'}
            </p>

            {actionType === 'payment' ? (
              selectedReservation ? (
                <>
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {selectedReservation.unitName}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Balance:{' '}
                    {formatCurrency(
                      selectedReservation.totalAmount - selectedReservation.paidAmount
                    )}
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-400 mt-1">Not selected yet</p>
              )
            ) : selectedUnit ? (
              <p className="text-sm font-semibold text-slate-900 mt-1">
                {selectedUnit.name}
              </p>
            ) : (
              <p className="text-sm text-slate-400 mt-1">Not selected yet</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderStageContent = () => {
    switch (stage) {
      case 'select_user':
        return (
          <div className="flex flex-col h-full">
            <div className="sticky top-0 bg-white pb-4 z-10">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">Select Customer</h3>
                <p className="text-sm text-slate-500">
                  Search and choose a customer to continue.
                </p>
              </div>

              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search customer name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pt-2">
              {selectableUsers.length > 0 ? (
                selectableUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      setSelectedUser(user);
                      setSelectedTargetId(null);
                      setStage('select_target');
                      setSearchTerm('');
                    }}
                    className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 active:scale-[0.99] flex items-center gap-4 transition-all text-left"
                  >
                    <div className="size-11 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <UserIcon className="size-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-sm text-slate-500 truncate">{user.email}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="py-14 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">
                  <UserIcon className="size-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-500 font-medium">No customers found</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Try a different name or email.
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case 'select_target':
        return (
          <div className="flex flex-col h-full">
            <button
              onClick={() => {
                setSelectedTargetId(null);
                setStage('select_user');
              }}
              className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 mb-5 transition-colors"
            >
              <ArrowLeft size={18} />
              Back to customers
            </button>

            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-900 capitalize">
                Select {actionType === 'payment' ? 'Reservation' : 'Unit'}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Assigning to{' '}
                <span className="font-semibold text-slate-900">
                  {selectedUser?.first_name} {selectedUser?.last_name}
                </span>
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {actionType === 'payment' &&
                (userReservationsWithBalance.length > 0 ? (
                  userReservationsWithBalance.map((res) => (
                    <button
                      key={res.id}
                      onClick={() => {
                        setSelectedTargetId(res.id);
                        setStage('fill_form');
                      }}
                      className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 active:scale-[0.99] transition-all text-left"
                    >
                      <p className="font-semibold text-slate-900">{res.unitName}</p>

                      <div className="flex justify-between items-end mt-2 gap-3">
                        <span className="text-xs text-slate-400 font-mono">
                          ID: {res.id.slice(0, 8)}...
                        </span>
                        <span className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-full">
                          {formatCurrency(res.totalAmount - res.paidAmount)} due
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="py-14 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">
                    <p className="text-slate-500 font-medium">
                      No outstanding balances found.
                    </p>
                  </div>
                ))}

              {actionType === 'reservation' &&
                units.map((unit) => (
                  <button
                    key={unit.id}
                    onClick={() => {
                      setSelectedTargetId(unit.id);
                      setStage('fill_form');
                    }}
                    className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 active:scale-[0.99] flex items-center gap-4 transition-all text-left"
                  >
                    <div className="size-11 rounded-2xl bg-white border border-slate-200 text-slate-500 flex items-center justify-center flex-shrink-0">
                      <Building className="size-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {unit.name}
                      </p>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        );

      case 'fill_form':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <button
              onClick={() => setStage('select_target')}
              className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 mb-6"
            >
              <ArrowLeft size={18} />
              Back to selection
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
                unitId={selectedTargetId}
                onComplete={() => setStage('success')}
              />
            )}
          </div>
        );

      case 'success':
        return (
          <div className="text-center py-12 px-4 animate-in zoom-in-95 duration-300">
            <div className="size-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="size-12 text-emerald-600" />
            </div>

            <h3 className="text-2xl font-bold text-slate-900">Success!</h3>
            <p className="text-slate-500 mt-3 max-w-sm mx-auto">
              The {actionType} record has been processed and is now visible in the
              customer portal.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={resetFlow}
                className="px-6 py-3.5 border border-slate-200 text-slate-700 rounded-2xl font-semibold hover:bg-slate-50 transition-all inline-flex items-center justify-center gap-2"
              >
                <RotateCcw className="size-4" />
                Create Another
              </button>

              <button
                onClick={handleResetAndClose}
                className="px-8 py-3.5 bg-slate-900 hover:bg-black text-white font-semibold rounded-2xl shadow-lg transition-all active:scale-[0.98]"
              >
                Done
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4 transition-all duration-300">
      <div className="bg-white w-full max-w-2xl h-[95vh] sm:h-auto sm:max-h-[88vh] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl border border-slate-200/60 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="bg-slate-900 p-6 flex justify-between items-center">
          <div>
            <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-widest">
              Administrator Tools
            </p>
            <h2 className="text-xl font-bold text-white tracking-tight mt-1">
              New {actionType === 'payment' ? 'Payment' : 'Reservation'}
            </h2>
            <p className="text-slate-400 text-xs font-medium mt-1">
              {stepTitle} · {stepDescription}
            </p>
          </div>

          <button
            onClick={handleResetAndClose}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 transition-all"
          >
            <X className="size-5" />
          </button>
        </div>

        {renderSummaryBar()}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          {renderStageContent()}
        </div>
      </div>
    </div>
  );
}