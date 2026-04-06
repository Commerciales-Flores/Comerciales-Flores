import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAdminData } from '../../contexts/AdminDataContext';
import { useRecords } from '../../contexts/RecordsContext';
import { useUsers } from '../../contexts/UsersContext';
import { DataTable, DataCell } from '../../components/common/DataTable';
import TableBadge from '../../components/common/TableBadge';
import AdminFilterBar, {
  FILTER_BUTTON_CLASS,
  FILTER_SELECT_CLASS,
} from '../../components/common/AdminFilterBar';
import { AdminFilterGroup } from '../../components/common/AdminFilterGroup';
import {
  Search,
  Tag,
  Layers,
  Hash,
  Filter,
  RotateCcw,
  X,
  Inbox,
} from 'lucide-react';
import EmptyState from '../../components/common/EmptyState';

type AuditFormattedDate =
  | string
  | {
      date: string;
      time: string;
    };

type AuditRow = {
  id: string;
  publicId?: string;
  action: string;
  module: string;
  target: string;
  performedBy: string;
  date: string;
  details: string;
  timestampMs: number;
  formattedDate: AuditFormattedDate;
};

const ACTION_OPTIONS = [
  'All',
  'CREATE',
  'UPDATE',
  'DELETE',

  'DEACTIVATE',

  'LOGIN',
  'LOGIN_FAILED',
  'LOGIN_APPROVED',
  'LOGOUT',
  'SESSION_EXPIRED',

  'DEVICE_VERIFIED',
  'DEVICE_REMOVED',

  'PAYMENT_CREATED',
  'PAYMENT_UPDATED',
  'PAYMENT_APPROVED',
  'PAYMENT_REJECTED',
  'PAYMENT_PROOF_UPLOADED',

  'ACCOUNT_DELETION_REQUESTED',
  'ACCOUNT_DELETION_APPROVED',
];

const MODULE_OPTIONS = [
  'All',
  'users',
  'units',
  'reservations',
  'payments',
  'ledger',
  'trusted_devices',
  'support_tickets',
  'support_messages',
];

const ACTION_STYLES: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-yellow-100 text-yellow-800',
  DELETE: 'bg-red-100 text-red-800',
  DEACTIVATE: 'bg-gray-200 text-gray-800',
  LOGIN: 'bg-blue-100 text-blue-800',
  LOGIN_FAILED: 'bg-rose-100 text-rose-800',
  LOGIN_APPROVED: 'bg-emerald-100 text-emerald-800',
  LOGOUT: 'bg-purple-100 text-purple-800',
  SESSION_EXPIRED: 'bg-orange-100 text-orange-800',
  PAYMENT_CREATED: 'bg-sky-100 text-sky-800',
  PAYMENT_UPDATED: 'bg-amber-100 text-amber-800',
  PAYMENT_APPROVED: 'bg-emerald-100 text-emerald-800',
  PAYMENT_REJECTED: 'bg-rose-100 text-rose-800',
  PAYMENT_PROOF_UPLOADED: 'bg-indigo-100 text-indigo-800',
  DEFAULT: 'bg-blue-100 text-blue-800',
};

function useDebouncedValue<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function getActionStyle(action: string) {
  return ACTION_STYLES[action] ?? ACTION_STYLES.DEFAULT;
}

function NoResultsState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center justify-center text-center"
    >
      <div className="mb-4 rounded-3xl bg-gray-50 p-5 shadow-sm">
        <Filter className="size-10 text-blue-500" />
      </div>
      <h3 className="text-lg font-bold text-gray-900">No matching audit logs found</h3>
      <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter settings.</p>
    </motion.div>
  );
}

function DesktopFilterBar({
  searchTerm,
  setSearchTerm,
  selectedAction,
  setSelectedAction,
  selectedModule,
  setSelectedModule,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  modules,
  resetFilters,
}: {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedAction: string;
  setSelectedAction: (value: string) => void;
  selectedModule: string;
  setSelectedModule: (value: string) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  modules: string[];
  resetFilters: () => void;
}) {
  return (
    <div className="relative z-10 space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search logs..."
          value={searchTerm}
          maxLength={100}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="hidden grid-cols-4 gap-4 md:grid">
        <select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          {ACTION_OPTIONS.map((action) => (
            <option key={action} value={action}>
              {action === 'All' ? 'All Actions' : action}
            </option>
          ))}
        </select>

        <select
          value={selectedModule}
          onChange={(e) => setSelectedModule(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          {modules.map((m) => (
            <option key={m} value={m}>
              {m === 'All' ? 'All Modules' : m.charAt(0).toUpperCase() + m.slice(1)}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="hidden justify-end pt-2 md:flex">
        <button
          onClick={resetFilters}
          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
        >
          <RotateCcw className="size-3" /> Clear Filters
        </button>
      </div>
    </div>
  );
}

function MobileFilterMenu({
  isOpen,
  onClose,
  selectedAction,
  setSelectedAction,
  selectedModule,
  setSelectedModule,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  modules,
  resetFilters,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedAction: string;
  setSelectedAction: (value: string) => void;
  selectedModule: string;
  setSelectedModule: (value: string) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  modules: string[];
  resetFilters: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="absolute bottom-16 right-0 w-[85vw] max-w-[320px] animate-in space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between border-b pb-2">
        <h3 className="text-sm font-bold text-gray-900">Filters</h3>
        <button
          onClick={resetFilters}
          className="text-[10px] font-bold uppercase tracking-tighter text-blue-600 hover:text-red-500"
        >
          Reset All
        </button>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-gray-400">Action</label>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full rounded-lg border bg-gray-50 p-2 text-sm outline-none"
          >
            {ACTION_OPTIONS.map((action) => (
              <option key={action} value={action}>
                {action === 'All' ? 'All Actions' : action}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-gray-400">Module</label>
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="w-full rounded-lg border bg-gray-50 p-2 text-sm outline-none"
          >
            {modules.map((m) => (
              <option key={m} value={m}>
                {m === 'All' ? 'All Modules' : m.charAt(0).toUpperCase() + m.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-gray-400">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full appearance-none rounded-lg border bg-gray-50 p-2 text-[10px] outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-gray-400">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full appearance-none rounded-lg border bg-gray-50 p-2 text-[10px] outline-none"
            />
          </div>
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg transition-transform active:scale-95"
      >
        Apply Filters
      </button>
    </div>
  );
}

export default function AdminAudit() {
  const { getUserById, getUnitById } = useAdminData();
  const { fetchAuditLogsPage } = useRecords();

  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('All');
  const [selectedModule, setSelectedModule] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);

  const debouncedSearchTerm = useDebouncedValue(searchTerm, 250);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const [pageInput, setPageInput] = useState('1');

  const { refreshUsers } = useUsers();

  useEffect(() => {
    void refreshUsers();
  }, [refreshUsers]);

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  const handlePageJump = useCallback(() => {
    const parsed = parseInt(pageInput, 10);

    if (Number.isNaN(parsed)) {
      setPageInput(String(page));
      return;
    }

    const nextPage = Math.min(Math.max(parsed, 1), totalPages);
    setPage(nextPage);
    setPageInput(String(nextPage));
  }, [pageInput, page, totalPages]);

  const formatUserLabel = useCallback(
  (userId?: string) => {
    if (!userId) return '—';

    const user = getUserById(userId);

    if (!user) {
      return `USR-${userId.slice(0, 8).toUpperCase()}`;
    }

    if (user.publicId) return user.publicId;

    return `USR-${userId.slice(0, 8).toUpperCase()}`;
  },
  [getUserById]
);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm, selectedAction, selectedModule, startDate, endDate]);

  useEffect(() => {
    let cancelled = false;

    const loadAuditLogs = async () => {
      setLoading(true);

      try {
        const result = await fetchAuditLogsPage({
          searchTerm: debouncedSearchTerm,
          action: selectedAction,
          module: selectedModule,
          startDate,
          endDate,
          page,
          pageSize,
        });

        if (cancelled) return;

        const mapped: AuditRow[] = result.data.map((log) => {
          const safeTimestamp = log.timestamp?.includes('T')
            ? log.timestamp
            : log.timestamp?.replace(' ', 'T');

          const parsedDate = safeTimestamp ? new Date(safeTimestamp) : null;
          const timestampMs = parsedDate?.getTime() ?? Number.NaN;

          const actorLabel = formatUserLabel(log.userId);

          const isUserTarget = log.targetTable === 'users';
          const isUnitTarget = log.targetTable === 'units';
          const isReservationTarget = log.targetTable === 'reservations';

          const unitTarget =
            isUnitTarget && log.targetId ? getUnitById(log.targetId) : undefined;

          const reservationPublicIdFromNotes =
            log.notes?.match(/\bRSV-[A-Z0-9]+\b/i)?.[0] ?? null;

          const targetLabel = isUserTarget
            ? formatUserLabel(log.targetId)
            : isUnitTarget
              ? log.targetPublicId || unitTarget?.propertyId || log.targetId || '—'
              : isReservationTarget
                ? log.targetPublicId || reservationPublicIdFromNotes || log.targetId || '—'
                : log.targetPublicId || log.targetId || '—';


          const paymentPublicIdFromNotes =
            log.notes?.match(/\bPAY-[A-Z0-9]+\b/i)?.[0] ?? null;

          let detailsText = log.notes ?? 'No additional details';

          if (log.targetTable === 'reservations' && reservationPublicIdFromNotes) {
            detailsText = detailsText.replace(
              /reservation\s+[a-f0-9-]{36}/i,
              `reservation ${reservationPublicIdFromNotes}`
            );
          }

          if (log.targetTable === 'payments') {
            if (paymentPublicIdFromNotes) {
              detailsText = detailsText.replace(
                /payment\s+[a-f0-9-]{36}/i,
                `payment ${paymentPublicIdFromNotes}`
              );
            }

            if (reservationPublicIdFromNotes) {
              detailsText = detailsText.replace(
                /reservation\s+[a-f0-9-]{36}/i,
                `reservation ${reservationPublicIdFromNotes}`
              );
            }
          }

          return {
            id: log.id,
            publicId: log.publicId,
            action: log.action,
            module: log.targetTable || '',
            target: targetLabel,
            performedBy: actorLabel,
            date: log.timestamp,
            details: detailsText,
            timestampMs,
            formattedDate: Number.isNaN(timestampMs)
              ? 'Invalid date'
              : {
                  date: parsedDate!.toLocaleDateString('en-PH', {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit',
                  }),
                  time: parsedDate!.toLocaleTimeString('en-PH', {
                    hour: 'numeric',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                  }),
                },
          };
        });

        setRows(mapped);
        setTotalCount(result.count);
      } catch (error) {
        console.error('Failed to load audit logs:', error);
        if (!cancelled) {
          setRows([]);
          setTotalCount(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadAuditLogs();

    return () => {
      cancelled = true;
    };
  }, [
    fetchAuditLogsPage,
    formatUserLabel,
    getUnitById,
    debouncedSearchTerm,
    selectedAction,
    selectedModule,
    startDate,
    endDate,
    page,
    pageSize,
  ]);

  const hasActiveSearch = Boolean(debouncedSearchTerm.trim());
  const hasActiveFilters =
    hasActiveSearch ||
    selectedAction !== 'All' ||
    selectedModule !== 'All' ||
    Boolean(startDate) ||
    Boolean(endDate);

  const hasNoLogs = !loading && totalCount === 0 && !hasActiveFilters;
  const hasNoSearchResults = !loading && totalCount === 0 && hasActiveFilters;

  const shouldShowFilters =
  !loading && (!hasNoLogs || hasActiveFilters);

  const handlePageInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handlePageJump();
      }
    },
    [handlePageJump]
  );

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedAction('All');
    setSelectedModule('All');
    setStartDate('');
    setEndDate('');
  }, []);

  const closeMobileDropdown = useCallback(() => {
    setIsMobileDropdownOpen(false);
  }, []);

  const toggleMobileDropdown = useCallback(() => {
    setIsMobileDropdownOpen((prev) => !prev);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <div
          className={`fixed inset-0 z-40 bg-gray-900/20 transition-opacity duration-300 md:hidden ${
            isMobileDropdownOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          onClick={closeMobileDropdown}
        />

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500">
            Monitor all administrative and system activities.
          </p>
        </div>

        {shouldShowFilters && (
  <AdminFilterBar
    searchTerm={searchTerm}
    onSearchChange={setSearchTerm}
    placeholder="Search logs..."
    showMobileFilters={isMobileDropdownOpen}
    onToggleMobileFilters={toggleMobileDropdown}
    filters={
      <AdminFilterGroup align="between">
        <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className={FILTER_SELECT_CLASS}
          >
            {ACTION_OPTIONS.map((action) => (
              <option key={action} value={action}>
                {action === 'All' ? 'All Actions' : action}
              </option>
            ))}
          </select>

          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className={FILTER_SELECT_CLASS}
          >
            {MODULE_OPTIONS.map((module) => (
              <option key={module} value={module}>
                {module === 'All'
                  ? 'All Modules'
                  : module.charAt(0).toUpperCase() + module.slice(1)}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={FILTER_SELECT_CLASS}
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={FILTER_SELECT_CLASS}
          />
        </div>

        {hasActiveFilters && (
          <div className="flex w-full justify-end lg:w-auto">
            <button
              type="button"
              onClick={() => {
                resetFilters();
                setIsMobileDropdownOpen(false);
              }}
              className={FILTER_BUTTON_CLASS}
            >
              Clear
            </button>
          </div>
        )}
      </AdminFilterGroup>
    }
  />
)}

        <div className="relative z-10 flex-1 pb-24">
          <div className="hidden md:block">
  {loading ? (
    <EmptyState
      icon={
        <div className="flex items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        </div>
      }
      title="Loading audit..."
      description="Please wait while audit records are being retrieved."
    />
  ) : hasNoLogs ? (
    <EmptyState
      icon={<Inbox className="size-10 text-blue-500" />}
      title="No audit logs yet"
      description="Administrative and system activities will appear here once actions are recorded."
    />
  ) : hasNoSearchResults ? (
    <div className="rounded-2xl border border-gray-200 bg-white px-6 py-20 shadow-sm">
      <NoResultsState />
    </div>
  ) : (
    <DataTable
      headers={[
        <span className="block w-[120px]">Log ID</span>,
        <span className="block w-[120px]">Action</span>,
        <span className="block w-[100px]">Module</span>,
        <span className="block w-[120px]">Target</span>,
        <span className="block w-[120px]">Performed By</span>,
        <span className="block w-[130px]">Date</span>,
        <span className="block">Details</span>,
      ]}
    >
      {rows.map((log) => (
        <tr key={log.id} className="transition-colors hover:bg-gray-50/70">
          <DataCell value={log.publicId ?? log.id} mono />
          <DataCell
            nowrap
            value={
              <TableBadge className={getActionStyle(log.action)}>
                {log.action}
              </TableBadge>
            }
          />
          <DataCell value={log.module} />
          <DataCell value={log.target} mono />
          <DataCell value={log.performedBy} mono />
          <DataCell
            value={
              typeof log.formattedDate === 'string' ? (
                log.formattedDate
              ) : (
                <div className="leading-tight">
                  <div className="font-medium text-gray-900">
                    {log.formattedDate.date}
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    {log.formattedDate.time}
                  </div>
                </div>
              )
            }
          />
          <DataCell
            value={
              <div className="whitespace-normal break-words leading-snug text-gray-600">
                {log.details}
              </div>
            }
            className="align-top"
          />
        </tr>
      ))}
    </DataTable>
  )}
</div>

          <div className="space-y-4 md:hidden">
            {loading ? (
              <EmptyState
                icon={
                  <div className="flex items-center justify-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                  </div>
                }
                title="Loading audit..."
                description="Please wait while audit records are being retrieved."
              />
            ) : hasNoLogs ? (
              <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 shadow-sm">
                <EmptyState
                  icon={<Inbox className="size-10 text-blue-500" />}
                  title="No audit logs yet"
                  description="Administrative and system activities will appear here once actions are recorded."
                />
              </div>
            ) : hasNoSearchResults ? (
              <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 shadow-sm">
                <NoResultsState />
              </div>
            ) : (
              rows.map((log) => (
                <div
                  key={log.id}
                  className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between border-b border-gray-100 pb-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Hash className="size-3.5 shrink-0 text-gray-400" />
                      <span className="truncate font-mono text-xs text-gray-400">
                        {log.publicId ?? log.id}
                      </span>
                    </div>

                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${getActionStyle(log.action)}`}
                    >
                      {log.action}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-2 gap-y-3 text-sm">
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-gray-400">
                        <Layers className="size-3" /> Module
                      </span>
                      <span className="text-sm text-gray-600">{log.module || '—'}</span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-gray-400">
                        <Tag className="size-3" /> Target
                      </span>
                      <span className="text-sm text-gray-700">{log.target || '—'}</span>
                    </div>

                    <div className="col-span-2 flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase text-gray-400">
                        Performed By
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {log.performedBy || '—'}
                      </span>
                    </div>

                    <div className="col-span-2 flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase text-gray-400">
                        Date
                      </span>
                      {typeof log.formattedDate === 'string' ? (
                        <span className="text-sm text-gray-500">{log.formattedDate}</span>
                      ) : (
                        <div className="leading-tight">
                          <div className="text-sm font-medium text-gray-900">
                            {log.formattedDate.date}
                          </div>
                          <div className="mt-1 text-xs text-gray-400">
                            {log.formattedDate.time}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-sm leading-snug text-gray-500">
                      {log.details || '—'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {!loading && !hasNoLogs && totalPages > 1 && (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} • {totalCount} total logs
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
                >
                  Previous
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Go to</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    onKeyDown={handlePageInputKeyDown}
                    className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handlePageJump}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                  >
                    Go
                  </button>
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="fixed bottom-6 right-6 z-50 md:hidden">
          <MobileFilterMenu
            isOpen={isMobileDropdownOpen}
            onClose={closeMobileDropdown}
            selectedAction={selectedAction}
            setSelectedAction={setSelectedAction}
            selectedModule={selectedModule}
            setSelectedModule={setSelectedModule}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            modules={MODULE_OPTIONS}
            resetFilters={resetFilters}
          />

          <button
            onClick={toggleMobileDropdown}
            className={`relative flex size-14 items-center justify-center rounded-full shadow-2xl transition-all duration-300 ${
              isMobileDropdownOpen
                ? 'rotate-90 bg-gray-900 text-white'
                : 'bg-blue-600 text-white hover:scale-105'
            }`}
          >
            {isMobileDropdownOpen ? <X size={24} /> : <Filter size={24} />}

            {!isMobileDropdownOpen && hasActiveFilters && (
              <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full border-2 border-white bg-red-500 text-[10px] font-bold text-white">
                !
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}