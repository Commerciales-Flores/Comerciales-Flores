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
import { useAdminData } from '../../contexts/AdminDataContext';
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
  Building2,
  Loader2,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

const AdminReservationForm = lazy(
  () => import('../forms/AdminReservationForm')
);

type ActionType = 'reservation';
type Stage = 'select_user' | 'select_target' | 'fill_form' | 'success';
type UnitFilter = 'all' | 'rental_space' | 'function_hall' | 'parking_slot';

type UnitLike = {
  id: string;
  name?: string | null;
  type?: string | null;
  price?: number | null;
  category?: string | null;
  subtype?: string | null;
  unitCategory?: string | null;
  unitSubtype?: string | null;
  unit_category?: string | null;
  unit_subtype?: string | null;
};

function getUserLabel(user: User) {
  const label = `${user.firstName} ${user.lastName}`.trim();
  return label || user.email || 'Unnamed Customer';
}

function getStageLabel(stage: Stage) {
  switch (stage) {
    case 'select_user':
      return 'Step 1 of 3';
    case 'select_target':
      return 'Step 2 of 3';
    case 'fill_form':
      return 'Step 3 of 3';
    case 'success':
      return 'Completed';
    default:
      return '';
  }
}

function getUnitTypeLabel(type?: string | null) {
  switch (type) {
    case 'rental_space':
      return 'Rental Space';
    case 'function_hall':
      return 'Function Unit';
    case 'parking_slot':
      return 'Parking';
    default:
      return type ? type.replaceAll('_', ' ') : 'Property';
  }
}

function getUnitCategory(unit: UnitLike) {
  return unit.category ?? unit.unitCategory ?? unit.unit_category ?? null;
}

function getUnitSubtype(unit: UnitLike) {
  return unit.subtype ?? unit.unitSubtype ?? unit.unit_subtype ?? null;
}

function formatTaxonomy(value?: string | null) {
  if (!value) return '';
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getUnitTone(type?: string | null) {
  switch (type) {
    case 'rental_space':
      return {
        border: 'hover:border-blue-200',
        bg: 'hover:bg-blue-50/50',
        iconBg: 'bg-blue-50',
        iconText: 'text-blue-600',
        iconHoverBg: 'group-hover:bg-blue-100',
        chevron: 'group-hover:text-blue-500',
        badge: 'border-blue-200 bg-blue-50 text-blue-700',
        selected: 'border-blue-100 bg-blue-50 text-blue-700',
      };
    case 'parking_slot':
      return {
        border: 'hover:border-orange-200',
        bg: 'hover:bg-orange-50/50',
        iconBg: 'bg-orange-50',
        iconText: 'text-orange-600',
        iconHoverBg: 'group-hover:bg-orange-100',
        chevron: 'group-hover:text-orange-500',
        badge: 'border-orange-200 bg-orange-50 text-orange-700',
        selected: 'border-orange-100 bg-orange-50 text-orange-700',
      };
    case 'function_hall':
      return {
        border: 'hover:border-purple-200',
        bg: 'hover:bg-purple-50/50',
        iconBg: 'bg-purple-50',
        iconText: 'text-purple-600',
        iconHoverBg: 'group-hover:bg-purple-100',
        chevron: 'group-hover:text-purple-500',
        badge: 'border-purple-200 bg-purple-50 text-purple-700',
        selected: 'border-purple-100 bg-purple-50 text-purple-700',
      };
    default:
      return {
        border: 'hover:border-slate-200',
        bg: 'hover:bg-slate-50',
        iconBg: 'bg-slate-50',
        iconText: 'text-slate-500',
        iconHoverBg: 'group-hover:bg-slate-100',
        chevron: 'group-hover:text-slate-500',
        badge: 'border-slate-200 bg-slate-50 text-slate-700',
        selected: 'border-slate-200 bg-white text-slate-700',
      };
  }
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
        maxLength={100}
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

      {subtitle ? (
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      ) : null}
    </div>
  );
});

const FilterPill = memo(function FilterPill({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? 'border-blue-200 bg-blue-50 text-blue-700'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
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
      className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">
        <UserIcon className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">
          {getUserLabel(user)}
        </p>
        <p className="truncate text-sm text-slate-500">{user.email}</p>
      </div>

      <ChevronRight className="size-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500" />
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
  const tone = getUnitTone(unit.type);
  const category = formatTaxonomy(getUnitCategory(unit));
  const subtype = formatTaxonomy(getUnitSubtype(unit));

  return (
    <button
      type="button"
      onClick={() => onSelect(unit.id)}
      className={`group flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${tone.border} ${tone.bg}`}
    >
      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-2xl transition-colors ${tone.iconBg} ${tone.iconText} ${tone.iconHoverBg}`}
      >
        <Building className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-slate-900">
            {unit.name || 'Unit'}
          </p>

          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${tone.badge}`}>
            {getUnitTypeLabel(unit.type)}
          </span>
        </div>

        <p className="mt-1 truncate text-sm text-slate-500 capitalize">
          {formatCurrency(unit.price || 0)}
        </p>

        {(category || subtype) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {category && (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                {category}
              </span>
            )}

            {subtype && (
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                {subtype}
              </span>
            )}
          </div>
        )}
      </div>

      <ChevronRight className={`size-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 ${tone.chevron}`} />
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
      className="mb-4 inline-flex items-center gap-2 rounded-full px-1 text-sm font-medium text-blue-600 transition hover:text-blue-700"
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
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 bg-white pb-4">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-slate-900">
            Select customer
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Choose the client account that will own this reservation.
          </p>
        </div>

        <SearchInput
          value={searchTerm}
          placeholder="Search name or email"
          onChange={onSearchChange}
        />
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
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
  searchTerm,
  onSearchChange,
  onBack,
  units,
  unitFilter,
  onUnitFilterChange,
  onSelectUnit,
}: {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onBack: () => void;
  units: UnitLike[];
  unitFilter: UnitFilter;
  onUnitFilterChange: (filter: UnitFilter) => void;
  onSelectUnit: (id: string) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 bg-white pb-4">
        <StepBackButton onClick={onBack} />

        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-900">
            Select unit
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Choose the property or slot to reserve for this customer.
          </p>
        </div>

        <div className="space-y-3">
          <SearchInput
            value={searchTerm}
            placeholder="Search unit name, type, category, or subtype"
            onChange={onSearchChange}
          />

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
              <Filter className="size-3.5" />
              Filter
            </span>

            <FilterPill
              active={unitFilter === 'all'}
              onClick={() => onUnitFilterChange('all')}
            >
              All
            </FilterPill>

            <FilterPill
              active={unitFilter === 'rental_space'}
              onClick={() => onUnitFilterChange('rental_space')}
            >
              Rental Spaces
            </FilterPill>

            <FilterPill
              active={unitFilter === 'function_hall'}
              onClick={() => onUnitFilterChange('function_hall')}
            >
              Function Units
            </FilterPill>

            <FilterPill
              active={unitFilter === 'parking_slot'}
              onClick={() => onUnitFilterChange('parking_slot')}
            >
              Parking
            </FilterPill>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {units.length > 0 ? (
          units.map((unit) => (
            <UnitRow key={unit.id} unit={unit} onSelect={onSelectUnit} />
          ))
        ) : (
          <EmptyState
            icon={<Building className="size-5" />}
            title="No units found"
            subtitle="Try another search or filter."
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
  selectedUser,
  selectedTargetId,
  onBack,
  onComplete,
}: {
  selectedUser: User | null;
  selectedTargetId: string | null;
  onBack: () => void;
  onComplete: () => void;
}) {
  return (
    <div>
      <StepBackButton onClick={onBack} />

      <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <Suspense fallback={<FormLoader />}>
          {selectedUser && selectedTargetId && (
            <AdminReservationForm
              userId={selectedUser.id}
              unitId={selectedTargetId}
              onComplete={onComplete}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
});

const SuccessStep = memo(function SuccessStep({
  selectedUser,
  selectedUnit,
  onCreateAnother,
  onDone,
}: {
  selectedUser: User | null;
  selectedUnit: UnitLike | null;
  onCreateAnother: () => void;
  onDone: () => void;
}) {
  return (
    <div className="px-4 py-12 text-center">
      <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-emerald-100 shadow-sm">
        <CheckCircle2 className="size-9 text-emerald-600" />
      </div>

      <h3 className="text-2xl font-bold text-slate-900">
        Reservation Created
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
        The reservation has been created successfully and is now approved.
      </p>

      {(selectedUser || selectedUnit) && (
        <div className="mx-auto mt-5 max-w-md rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm">
          {selectedUser ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Customer</span>
              <span className="truncate font-semibold text-slate-900">
                {getUserLabel(selectedUser)}
              </span>
            </div>
          ) : null}

          {selectedUnit ? (
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-slate-500">Unit</span>
              <span className="truncate font-semibold text-slate-900">
                {selectedUnit.name || 'Selected Unit'}
              </span>
            </div>
          ) : null}
        </div>
      )}

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
  const { users = [], units = [] } = useAdminData();

  const [stage, setStage] = useState<Stage>('select_user');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [unitFilter, setUnitFilter] = useState<UnitFilter>('all');

  const deferredSearch = useDeferredValue(searchTerm);
  const normalizedSearch = deferredSearch.trim().toLowerCase();

  useEffect(() => {
    return () => {
      setStage('select_user');
      setSelectedUser(null);
      setSelectedTargetId(null);
      setSearchTerm('');
      setUnitFilter('all');
    };
  }, []);

  const unitsById = useMemo(() => {
    return new Map(units.map((unit) => [unit.id, unit]));
  }, [units]);

  const selectableUsers = useMemo(() => {
    const clientUsers = users.filter((user) => user.role === 'client');

    if (!normalizedSearch) return clientUsers;

    return clientUsers.filter((user) =>
      `${user.firstName} ${user.lastName} ${user.email}`
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [users, normalizedSearch]);

  const selectableUnits = useMemo(() => {
    const filteredByType = unitFilter === 'all'
      ? units
      : units.filter((unit) => unit.type === unitFilter);

    if (!normalizedSearch) return filteredByType;

    return filteredByType.filter((unit) =>
      `${unit.name ?? ''} ${unit.type ?? ''} ${getUnitCategory(unit) ?? ''} ${getUnitSubtype(unit) ?? ''}`
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [units, normalizedSearch, unitFilter]);

  const selectedUnit = useMemo(() => {
    if (!selectedTargetId) return null;
    return (unitsById.get(selectedTargetId) as UnitLike | null) ?? null;
  }, [unitsById, selectedTargetId]);

  const resetFlow = useCallback(() => {
    setStage('select_user');
    setSelectedUser(null);
    setSelectedTargetId(null);
    setSearchTerm('');
    setUnitFilter('all');
  }, []);

  const handleClose = useCallback(() => {
    resetFlow();
    onClose();
  }, [onClose, resetFlow]);

  const handleSelectUser = useCallback((user: User) => {
    setSelectedUser(user);
    setSelectedTargetId(null);
    setSearchTerm('');
    setUnitFilter('all');
    setStage('select_target');
  }, []);

  const handleBackToUsers = useCallback(() => {
    setSelectedTargetId(null);
    setSearchTerm('');
    setUnitFilter('all');
    setStage('select_user');
  }, []);

  const handleSelectUnit = useCallback((id: string) => {
    setSelectedTargetId(id);
    setSearchTerm('');
    setStage('fill_form');
  }, []);

  const handleBackToTargets = useCallback(() => {
    setStage('select_target');
  }, []);

  const handleComplete = useCallback(() => {
    setStage('success');
  }, []);

  const selectedUnitTone = selectedUnit ? getUnitTone(selectedUnit.type) : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/60 p-0 transition-all duration-300 sm:items-center sm:p-4">
      <div className="flex h-[92vh] w-full flex-col overflow-hidden rounded-t-[2rem] border border-slate-200/60 bg-white shadow-xl animate-in fade-in zoom-in-95 slide-in-from-bottom duration-300 sm:h-auto sm:max-h-[92vh] sm:max-w-5xl sm:rounded-[2rem]">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-600 p-3 text-white shadow-sm">
              <Building2 className="size-5" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
                  Administrator Tools
                </p>

                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                  {getStageLabel(stage)}
                </span>
              </div>

              <h2 className="mt-1 text-lg font-bold tracking-tight text-gray-900 sm:text-xl">
                New Reservation
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Create a new reservation for a client.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="rounded-2xl border border-gray-300 bg-white p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
            aria-label="Close modal"
          >
            <X className="size-5" />
          </button>
        </div>

        {selectedUser && stage !== 'select_user' && stage !== 'success' ? (
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-600">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-800">
                {getUserLabel(selectedUser)}
              </span>

              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">
                <Mail className="size-3.5" />
                {selectedUser.email}
              </span>

              {selectedUnit ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 font-medium ${
                    selectedUnitTone?.selected ?? 'border-blue-100 bg-blue-50 text-blue-700'
                  }`}
                >
                  <Building className="size-3.5" />
                  {selectedUnit.name || 'Selected Unit'}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
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
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onBack={handleBackToUsers}
              units={selectableUnits}
              unitFilter={unitFilter}
              onUnitFilterChange={setUnitFilter}
              onSelectUnit={handleSelectUnit}
            />
          )}

          {stage === 'fill_form' && (
  <div className="min-h-full pr-1">
              <FillFormStep
                selectedUser={selectedUser}
                selectedTargetId={selectedTargetId}
                onBack={handleBackToTargets}
                onComplete={handleComplete}
              />
            </div>
          )}

          {stage === 'success' && (
            <div className="min-h-full">
              <SuccessStep
                selectedUser={selectedUser}
                selectedUnit={selectedUnit}
                onCreateAnother={resetFlow}
                onDone={handleClose}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
