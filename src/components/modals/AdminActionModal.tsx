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
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import AdminPaymentForm from '../forms/AdminPaymentForm';
import AdminReservationForm from '../forms/AdminReservationForm';

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
      (r) =>
        r.userId === selectedUser.id &&
        r.status === 'confirmed' &&
        r.totalAmount > r.paidAmount
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
        ? 'Choose a confirmed reservation with an outstanding balance.'
        : 'Choose a unit to reserve for the selected customer.'
      : stage === 'fill_form'
      ? 'Complete the required information below.'
      : 'The record has been successfully processed.';

  const renderSummaryBar = () => {
    if (!selectedUser || stage === 'select_user' || stage === 'success') return null;

    return (
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Customer
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {selectedUser.first_name} {selectedUser.last_name}
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
              <Mail className="size-3" />
              {selectedUser.email}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {actionType === 'payment' ? 'Selected Reservation' : 'Selected Unit'}
            </p>

            {actionType === 'payment' ? (
              selectedReservation ? (
                <>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {selectedReservation.unitName}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      {selectedReservation.status?.toUpperCase() || 'CONFIRMED'}
                    </span>
                    <span className="text-xs text-slate-500">
                      Balance:{' '}
                      {formatCurrency(
                        selectedReservation.totalAmount - selectedReservation.paidAmount
                      )}
                    </span>
                  </div>
                </>
              ) : (
                <p className="mt-1 text-sm text-slate-400">Not selected yet</p>
              )
            ) : selectedUnit ? (
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {selectedUnit.name}
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-400">Not selected yet</p>
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
          <div className="flex h-full flex-col">
            <div className="sticky top-0 z-10 bg-white pb-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">Select Customer</h3>
                <p className="text-sm text-slate-500">
                  Search and choose a customer to continue.
                </p>
              </div>

              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search customer name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto pt-2">
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
                    className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition-all hover:border-blue-200 hover:bg-blue-50 active:scale-[0.99]"
                  >
                    <div className="flex size-11 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                      <UserIcon className="size-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="truncate text-sm text-slate-500">{user.email}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center">
                  <UserIcon className="mx-auto mb-3 size-12 text-slate-300" />
                  <p className="font-medium text-slate-500">No customers found</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Try a different name or email.
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case 'select_target':
        return (
          <div className="flex h-full flex-col">
            <button
              onClick={() => {
                setSelectedTargetId(null);
                setStage('select_user');
              }}
              className="mb-5 flex items-center gap-2 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
            >
              <ArrowLeft size={18} />
              Back to customers
            </button>

            <div className="mb-4">
              <h3 className="text-lg font-bold capitalize text-slate-900">
                Select {actionType === 'payment' ? 'Reservation' : 'Unit'}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Assigning to{' '}
                <span className="font-semibold text-slate-900">
                  {selectedUser?.first_name} {selectedUser?.last_name}
                </span>
              </p>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto">
              {actionType === 'payment' &&
                (userReservationsWithBalance.length > 0 ? (
                  userReservationsWithBalance.map((res) => (
                    <button
                      key={res.id}
                      onClick={() => {
                        setSelectedTargetId(res.id);
                        setStage('fill_form');
                      }}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition-all hover:border-blue-200 hover:bg-blue-50 active:scale-[0.99]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">
                            {res.unitName}
                          </p>
                          <p className="mt-1 text-xs font-mono text-slate-400">
                            ID: {res.publicId ?? res.id}
                          </p>
                        </div>

                        <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                          CONFIRMED
                        </span>
                      </div>

                      <div className="mt-3 flex items-end justify-between gap-3">
                        <span className="text-xs text-slate-500">
                          Outstanding Balance
                        </span>
                        <span className="rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600">
                          {formatCurrency(res.totalAmount - res.paidAmount)} due
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center">
                    <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-white text-slate-300">
                      <CreditCard className="size-6" />
                    </div>
                    <p className="font-medium text-slate-500">
                      No confirmed reservations with outstanding balances found.
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Only confirmed reservations can receive admin-created payments.
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
                    className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition-all hover:border-blue-200 hover:bg-blue-50 active:scale-[0.99]"
                  >
                    <div className="flex size-11 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500">
                      <Building className="size-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
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
          <div className="animate-in slide-in-from-bottom-4 fade-in duration-300">
            <button
              onClick={() => setStage('select_target')}
              className="mb-6 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft size={18} />
              Back to selection
            </button>

            {actionType === 'payment' &&
              selectedUser &&
              selectedTargetId &&
              selectedReservation?.status === 'confirmed' && (
                <AdminPaymentForm
                  userId={selectedUser.id}
                  reservationId={selectedTargetId}
                  onComplete={() => setStage('success')}
                />
              )}

            {actionType === 'payment' &&
              selectedUser &&
              selectedTargetId &&
              selectedReservation?.status !== 'confirmed' && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  Payments can only be created for confirmed reservations.
                </div>
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
          <div className="animate-in zoom-in-95 px-4 py-12 text-center duration-300">
            <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="size-12 text-emerald-600" />
            </div>

            <h3 className="text-2xl font-bold text-slate-900">Success!</h3>
            <p className="mx-auto mt-3 max-w-sm text-slate-500">
              The {actionType} record has been processed and is now visible in the
              customer portal.
            </p>

            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={resetFlow}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-6 py-3.5 font-semibold text-slate-700 transition-all hover:bg-slate-50"
              >
                <RotateCcw className="size-4" />
                Create Another
              </button>

              <button
                onClick={handleResetAndClose}
                className="rounded-2xl bg-slate-900 px-8 py-3.5 font-semibold text-white shadow-lg transition-all hover:bg-black active:scale-[0.98]"
              >
                Done
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm transition-all duration-300 sm:items-center sm:p-4">
      <div className="animate-in zoom-in-95 slide-in-from-bottom duration-300 flex h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[2rem] border border-slate-200/60 bg-white shadow-2xl sm:h-auto sm:max-h-[88vh] sm:rounded-[2rem]">
        <div className="flex items-center justify-between bg-slate-900 p-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Administrator Tools
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-white">
              New {actionType === 'payment' ? 'Payment' : 'Reservation'}
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-400">
              {stepTitle} · {stepDescription}
            </p>
          </div>

          <button
            onClick={handleResetAndClose}
            className="rounded-xl bg-white/5 p-2 text-slate-400 transition-all hover:bg-white/10"
          >
            <X className="size-5" />
          </button>
        </div>

        {actionType === 'payment' && stage !== 'select_user' && stage !== 'success' && (
          <div className="border-b border-emerald-100 bg-emerald-50/80 px-6 py-3">
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3">
              <div className="mt-0.5 rounded-xl bg-emerald-100 p-2 text-emerald-700">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  Payment eligibility check enabled
                </p>
                <p className="mt-0.5 text-xs text-emerald-700">
                  Only confirmed reservations with remaining balances can be selected.
                </p>
              </div>
            </div>
          </div>
        )}

        {renderSummaryBar()}

        <div className="flex-1 overflow-y-auto p-6 sm:p-8">{renderStageContent()}</div>
      </div>
    </div>
  );
}