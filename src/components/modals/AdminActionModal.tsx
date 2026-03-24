import React, {
  lazy,
  memo,
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';
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
  Loader2,
} from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

const AdminPaymentForm = lazy(() => import('../forms/AdminPaymentForm'));
const AdminReservationForm = lazy(() => import('../forms/AdminReservationForm'));

type ActionType = 'payment' | 'reservation';
type Stage = 'select_user' | 'select_target' | 'fill_form' | 'success';

type ReservationLike = {
  id: string;
  userId: string;
  status?: string | null;
  unitName?: string | null;
  totalAmount?: number | null;
  paidAmount?: number | null;
  minimumPaymentPercentSnapshot?: number | null;
};

type UnitLike = {
  id: string;
  name?: string | null;
  type?: string | null;
  price?: number | null;
};

const PAYMENT_ELIGIBLE_STATUSES = new Set(['approved', 'confirmed', 'completed']);

function isPaymentEligibleStatus(status?: string | null) {
  return PAYMENT_ELIGIBLE_STATUSES.has((status ?? '').toLowerCase());
}

function getRemainingBalance(totalAmount?: number | null, paidAmount?: number | null) {
  return Math.max(Number(totalAmount || 0) - Number(paidAmount || 0), 0);
}

function getUserLabel(user: User) {
  return `${user.firstName} ${user.lastName}`.trim();
}

const SearchInput = memo(function SearchInput({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-2xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
      />
    </div>
  );
});

const EmptyState = memo(function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
      <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
        {icon}
      </div>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
    </div>
  );
});

const UserRow = memo(function UserRow({
  user,
  onSelect,
}: {
  user: User;
  onSelect: (user: User) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(user)}
      className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/50"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <UserIcon className="size-4" />
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">
          {getUserLabel(user)}
        </p>
        <p className="truncate text-sm text-slate-500">{user.email}</p>
      </div>
    </button>
  );
});

const ReservationRow = memo(function ReservationRow({
  reservation,
  remaining,
  onSelect,
}: {
  reservation: ReservationLike;
  remaining: number;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(reservation.id)}
      className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition-colors hover:border-emerald-200 hover:bg-emerald-50/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {reservation.unitName || 'Reservation'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {formatCurrency(reservation.paidAmount || 0)} paid of{' '}
            {formatCurrency(reservation.totalAmount || 0)}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
            {String(reservation.status || '').toUpperCase()}
          </span>
          <p className="mt-2 text-sm font-semibold text-rose-600">
            {formatCurrency(remaining)} left
          </p>
        </div>
      </div>
    </button>
  );
});

const UnitRow = memo(function UnitRow({
  unit,
  onSelect,
}: {
  unit: UnitLike;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(unit.id)}
      className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition-colors hover:border-violet-200 hover:bg-violet-50/50"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-500">
        <Building className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">
          {unit.name || 'Unit'}
        </p>
        <p className="truncate text-sm text-slate-500">
          {String(unit.type || '').replaceAll('_', ' ') || 'Property'} •{' '}
          {formatCurrency(unit.price || 0)}
        </p>
      </div>
    </button>
  );
});

const StepBackButton = memo(function StepBackButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600"
    >
      <ArrowLeft className="size-4" />
      Back
    </button>
  );
});

const SelectUserStep = memo(function SelectUserStep({
  users,
  searchTerm,
  onSearchChange,
  onSelectUser,
}: {
  users: User[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSelectUser: (user: User) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">Select customer</h3>
        <p className="mt-1 text-sm text-slate-500">Choose a client to continue.</p>
      </div>

      <div className="mb-4">
        <SearchInput
          value={searchTerm}
          placeholder="Search name or email"
          onChange={onSearchChange}
        />
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {users.length > 0 ? (
          users.map((user) => (
            <UserRow key={user.id} user={user} onSelect={onSelectUser} />
          ))
        ) : (
          <EmptyState
            icon={<UserIcon className="size-5" />}
            title="No customers found"
            subtitle="Try another name or email."
          />
        )}
      </div>
    </div>
  );
});

const SelectTargetStep = memo(function SelectTargetStep({
  actionType,
  searchTerm,
  onSearchChange,
  onBack,
  reservations,
  units,
  onSelectReservation,
  onSelectUnit,
}: {
  actionType: ActionType;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onBack: () => void;
  reservations: ReservationLike[];
  units: UnitLike[];
  onSelectReservation: (id: string) => void;
  onSelectUnit: (id: string) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <StepBackButton onClick={onBack} />

      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">
          {actionType === 'payment' ? 'Select reservation' : 'Select unit'}
        </h2>
      </div>

      <div className="mb-4">
        <SearchInput
          value={searchTerm}
          placeholder={
            actionType === 'payment'
              ? 'Search reservation or unit'
              : 'Search unit name or type'
          }
          onChange={onSearchChange}
        />
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {actionType === 'payment' ? (
          reservations.length > 0 ? (
            reservations.map((reservation) => (
              <ReservationRow
                key={reservation.id}
                reservation={reservation}
                remaining={getRemainingBalance(
                  reservation.totalAmount,
                  reservation.paidAmount
                )}
                onSelect={onSelectReservation}
              />
            ))
          ) : (
            <EmptyState
              icon={<CreditCard className="size-5" />}
              title="No reservations available"
              subtitle="Nothing eligible for payment."
            />
          )
        ) : units.length > 0 ? (
          units.map((unit) => (
            <UnitRow key={unit.id} unit={unit} onSelect={onSelectUnit} />
          ))
        ) : (
          <EmptyState
            icon={<Building className="size-5" />}
            title="No units found"
            subtitle="Try another search."
          />
        )}
      </div>
    </div>
  );
});

const FormLoader = memo(function FormLoader() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="size-4 animate-spin" />
        Loading form...
      </div>
    </div>
  );
});

const FillFormStep = memo(function FillFormStep({
  actionType,
  selectedUser,
  selectedReservation,
  selectedTargetId,
  onBack,
  onComplete,
}: {
  actionType: ActionType;
  selectedUser: User | null;
  selectedReservation: ReservationLike | null;
  selectedTargetId: string | null;
  onBack: () => void;
  onComplete: () => void;
}) {
  const remaining = selectedReservation
    ? getRemainingBalance(
        selectedReservation.totalAmount,
        selectedReservation.paidAmount
      )
    : 0;

  return (
    <div>
      <StepBackButton onClick={onBack} />

      <Suspense fallback={<FormLoader />}>
        {actionType === 'payment' &&
          selectedUser &&
          selectedTargetId &&
          selectedReservation &&
          isPaymentEligibleStatus(selectedReservation.status) &&
          remaining > 0 && (
            <>
            <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800">
        {Number(selectedReservation.paidAmount || 0) <= 0 &&
        selectedReservation.minimumPaymentPercentSnapshot ? (
          <>
            First payment must be at least{' '}
            {selectedReservation.minimumPaymentPercentSnapshot}% of total.
          </>
        ) : (
          <>Subsequent payments must be at least ₱500.</>
        )}
      </div>
            <AdminPaymentForm
              userId={selectedUser.id}
              reservationId={selectedTargetId}
              onComplete={onComplete}
            />
            </>
          )}

        {actionType === 'payment' &&
          selectedUser &&
          selectedTargetId &&
          (!selectedReservation ||
            !isPaymentEligibleStatus(selectedReservation.status) ||
            remaining <= 0) && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Reservation is no longer eligible for payment.
            </div>
          )}

        {actionType === 'reservation' && selectedUser && selectedTargetId && (
          <AdminReservationForm
            userId={selectedUser.id}
            unitId={selectedTargetId}
            onComplete={onComplete}
          />
        )}
      </Suspense>
    </div>
  );
});

const SuccessStep = memo(function SuccessStep({
  actionType,
  onCreateAnother,
  onDone,
}: {
  actionType: ActionType;
  onCreateAnother: () => void;
  onDone: () => void;
}) {
  return (
    <div className="px-4 py-12 text-center">
      <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-emerald-100">
        <CheckCircle2 className="size-9 text-emerald-600" />
      </div>

      <h3 className="text-xl font-semibold text-slate-900">Saved</h3>
      <p className="mt-2 text-sm text-slate-500">
        The {actionType} has been created successfully.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onCreateAnother}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <RotateCcw className="size-4" />
          Create another
        </button>

        <button
          type="button"
          onClick={onDone}
          className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-black"
        >
          Done
        </button>
      </div>
    </div>
  );
});

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

  const deferredSearch = useDeferredValue(searchTerm);
  const normalizedSearch = deferredSearch.trim().toLowerCase();

  useEffect(() => {
    return () => {
      setStage('select_user');
      setSelectedUser(null);
      setSelectedTargetId(null);
      setSearchTerm('');
    };
  }, []);

  const reservationsById = useMemo(() => {
    return new Map(
      reservations.map((reservation) => [reservation.id, reservation])
    );
  }, [reservations]);

  const unitsById = useMemo(() => {
    return new Map(units.map((unit) => [unit.id, unit]));
  }, [units]);

  const selectableUsers = useMemo(() => {
    const clientUsers = users.filter((u) => u.role === 'client');

    if (!normalizedSearch) return clientUsers;

    return clientUsers.filter((u) =>
      `${u.firstName} ${u.lastName} ${u.email}`
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [users, normalizedSearch]);

  const selectableUnits = useMemo(() => {
    if (actionType !== 'reservation') return [];

    if (!normalizedSearch) return units;

    return units.filter((unit) =>
      `${unit.name} ${unit.type}`.toLowerCase().includes(normalizedSearch)
    );
  }, [actionType, units, normalizedSearch]);

  const userReservationsWithBalance = useMemo(() => {
    if (!selectedUser || actionType !== 'payment') return [];

    const filtered = reservations.filter((reservation) => {
      if (reservation.userId !== selectedUser.id) return false;
      if (!isPaymentEligibleStatus(reservation.status)) return false;

      const remaining = getRemainingBalance(
        reservation.totalAmount,
        reservation.paidAmount
      );

      if (remaining <= 0) return false;

      if (!normalizedSearch) return true;

      return `${reservation.unitName ?? ''} ${reservation.status ?? ''}`
        .toLowerCase()
        .includes(normalizedSearch);
    });

    filtered.sort((a, b) => {
      const remainingA = getRemainingBalance(a.totalAmount, a.paidAmount);
      const remainingB = getRemainingBalance(b.totalAmount, b.paidAmount);
      return remainingB - remainingA;
    });

    return filtered;
  }, [actionType, reservations, selectedUser, normalizedSearch]);

  const selectedReservation = useMemo(() => {
    if (actionType !== 'payment' || !selectedTargetId) return null;
    return (reservationsById.get(selectedTargetId) as ReservationLike | null) ?? null;
  }, [actionType, reservationsById, selectedTargetId]);

  const selectedUnit = useMemo(() => {
    if (actionType !== 'reservation' || !selectedTargetId) return null;
    return (unitsById.get(selectedTargetId) as UnitLike | null) ?? null;
  }, [actionType, unitsById, selectedTargetId]);

  const resetFlow = useCallback(() => {
    setStage('select_user');
    setSelectedUser(null);
    setSelectedTargetId(null);
    setSearchTerm('');
  }, []);

  const handleClose = useCallback(() => {
    resetFlow();
    onClose();
  }, [onClose, resetFlow]);

  const handleSelectUser = useCallback((user: User) => {
    setSelectedUser(user);
    setSelectedTargetId(null);
    setSearchTerm('');
    setStage('select_target');
  }, []);

  const handleBackToUsers = useCallback(() => {
    setSelectedTargetId(null);
    setSearchTerm('');
    setStage('select_user');
  }, []);

  const handleSelectReservation = useCallback((id: string) => {
    setSelectedTargetId(id);
    setStage('fill_form');
  }, []);

  const handleSelectUnit = useCallback((id: string) => {
    setSelectedTargetId(id);
    setStage('fill_form');
  }, []);

  const handleBackToTargets = useCallback(() => {
    setStage('select_target');
  }, []);

  const handleComplete = useCallback(() => {
    setStage('success');
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4 transition-all duration-300">
          <div className="bg-white w-full sm:max-w-4xl h-[92vh] sm:h-auto sm:max-h-[92vh] rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden shadow-xl border border-slate-200/60 animate-in fade-in zoom-in-95 slide-in-from-bottom duration-300 flex flex-col">
            <div className="bg-slate-900 p-6 flex justify-between items-center">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Administrator Tools
            </h2>
            <p className="text-slate-400 text-xs font-medium mt-1">
              New {actionType === 'payment' ? 'Payment' : 'Reservation'}
            </p>
          </div>


          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-white/10"
          >
            <X className="size-5" />
          </button>
        </div>

        {actionType === 'payment' && stage !== 'select_user' && stage !== 'success' ? (
          <div className="border-b border-emerald-100 bg-emerald-50 px-5 py-2.5">
            <p className="text-xs font-medium text-emerald-800">
              Only approved, confirmed, or completed reservations with remaining
              balance can receive payments.
            </p>
          </div>
        ) : null}

        {selectedUser && stage !== 'select_user' && stage !== 'success' ? (
          <div className="border-b border-slate-200 px-5 py-3 text-sm text-slate-600">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold text-slate-800">
                {getUserLabel(selectedUser)}
              </span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1">
                <Mail className="size-3.5" />
                {selectedUser.email}
              </span>

              {selectedReservation ? (
                <>
                  <span className="text-slate-300">•</span>
                  <span>{selectedReservation.unitName}</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-semibold text-rose-600">
                    {formatCurrency(
                      getRemainingBalance(
                        selectedReservation.totalAmount,
                        selectedReservation.paidAmount
                      )
                    )}{' '}
                    left
                  </span>
                </>
              ) : null}

              {selectedUnit ? (
                <>
                  <span className="text-slate-300">•</span>
                  <span>{selectedUnit.name}</span>
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto p-5">
          {stage === 'select_user' && (
            <SelectUserStep
              users={selectableUsers}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onSelectUser={handleSelectUser}
            />
          )}

          {stage === 'select_target' && (
            <SelectTargetStep
              actionType={actionType}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onBack={handleBackToUsers}
              reservations={userReservationsWithBalance}
              units={selectableUnits}
              onSelectReservation={handleSelectReservation}
              onSelectUnit={handleSelectUnit}
            />
          )}

          {stage === 'fill_form' && (
            <FillFormStep
              actionType={actionType}
              selectedUser={selectedUser}
              selectedReservation={selectedReservation}
              selectedTargetId={selectedTargetId}
              onBack={handleBackToTargets}
              onComplete={handleComplete}
            />
          )}

          {stage === 'success' && (
            <SuccessStep
              actionType={actionType}
              onCreateAnother={resetFlow}
              onDone={handleClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}