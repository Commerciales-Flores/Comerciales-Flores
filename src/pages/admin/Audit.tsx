import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import { useRecords } from '../../contexts/RecordsContext';
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
  formattedDate: string;
};

const ACTION_OPTIONS = [
  'All',
  'CREATE',
  'UPDATE',
  'DELETE',
  'DEACTIVATE',
  'LOGIN',
  'LOGOUT',
  'SESSION_EXPIRED',
  'PAYMENT_CREATED',
  'PAYMENT_UPDATED',
  'PAYMENT_APPROVED',
  'PAYMENT_REJECTED',
  'PAYMENT_PROOF_UPLOADED',
];

const MODULE_OPTIONS = ['All', 'users', 'units', 'reservations', 'payments'];

const ACTION_STYLES: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-yellow-100 text-yellow-800',
  DELETE: 'bg-red-100 text-red-800',
  DEACTIVATE: 'bg-gray-200 text-gray-800',
  LOGIN: 'bg-blue-100 text-blue-800',
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
      <div className="bg-gray-50 p-5 rounded-3xl shadow-sm mb-4">
        <Filter className="size-10 text-blue-500" />
      </div>
      <h3 className="text-lg font-bold text-gray-900">No matching audit logs found</h3>
      <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filter settings.</p>
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
    <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4 shadow-sm relative z-10">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search logs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      <div className="hidden md:grid grid-cols-4 gap-4">
        <select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
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
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
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
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />

        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div className="hidden md:flex justify-end pt-2">
        <button
          onClick={resetFilters}
          className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1"
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
    <div className="absolute bottom-16 right-0 w-[85vw] max-w-[320px] bg-white rounded-2xl border border-gray-200 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex justify-between items-center border-b pb-2">
        <h3 className="font-bold text-gray-900 text-sm">Filters</h3>
        <button
          onClick={resetFilters}
          className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter hover:text-red-500"
        >
          Reset All
        </button>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Action</label>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full border p-2 rounded-lg text-sm bg-gray-50 outline-none"
          >
            {ACTION_OPTIONS.map((action) => (
              <option key={action} value={action}>
                {action === 'All' ? 'All Actions' : action}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Module</label>
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="w-full border p-2 rounded-lg text-sm bg-gray-50 outline-none"
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
            <label className="text-[10px] font-bold text-gray-400 uppercase">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border p-2 rounded-lg text-[10px] bg-gray-50 outline-none appearance-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border p-2 rounded-lg text-[10px] bg-gray-50 outline-none appearance-none"
            />
          </div>
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-transform"
      >
        Apply Filters
      </button>
    </div>
  );
}

export default function AdminAudit() {
  const { getUserById } = useData();
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
      if (!user) return userId;

      const fullName =
        [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email;

      return user.publicId ? `${user.publicId}` : fullName;
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
          const timestampMs = new Date(log.timestamp).getTime();

          const actorLabel = formatUserLabel(log.userId);

          const isUserTarget = log.targetTable === 'users';
          const isSelfAuthEvent =
            isUserTarget &&
            ['LOGIN', 'LOGOUT', 'SESSION_EXPIRED'].includes(log.action) &&
            log.userId === log.targetId;

          const targetLabel = isSelfAuthEvent
            ? 'Own account'
            : isUserTarget
              ? formatUserLabel(log.targetId)
              : log.targetId || '—';

          return {
            id: log.id,
            publicId: log.publicId,
            action: log.action,
            module: log.targetTable || '',
            target: targetLabel,
            performedBy: actorLabel,
            date: log.timestamp,
            details: log.notes ?? 'No additional details',
            timestampMs,
            formattedDate: Number.isNaN(timestampMs)
              ? 'Invalid date'
              : new Date(timestampMs).toLocaleString(),
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

  const handlePageInputKeyDown = useCallback(
  (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handlePageJump();
    }
  },
  [handlePageJump]
);


  const resetFilters = useCallback(() => {
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
    <div className="min-h-screen bg-gray-50">
  <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div
        className={`fixed inset-0 z-40 bg-gray-900/20 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          isMobileDropdownOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMobileDropdown}
      />

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-gray-500 text-sm">Monitor all administrative and system activities.</p>
      </div>

      {!loading && (!hasNoLogs || hasActiveFilters) && (
        <DesktopFilterBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
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
      )}

      <div className="flex-1 pb-24 relative z-10">
        <div className="hidden md:block bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {loading ? (
                            <EmptyState
                              icon={
                                <div className="flex items-center justify-center">
                                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
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
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Log ID', 'Action', 'Module', 'Target', 'Performed By', 'Date', 'Details'].map(
                      (header) => (
                        <th
                          key={header}
                          className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {hasNoSearchResults ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center">
                        <NoResultsState />
                      </td>
                    </tr>
                  ) : (
                    rows.map((log) => (
                      <tr key={log.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900 w-[220px]">
                          {log.publicId ?? log.id}
                        </td>

                        <td className="px-6 py-4 w-[140px]">
                          <span
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${getActionStyle(log.action)}`}
                          >
                            {log.action}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-600 w-[140px]">
                          {log.module || '—'}
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-700 w-[220px]">
                          {log.target || '—'}
                        </td>

                        <td className="px-6 py-4 text-sm font-semibold text-gray-900 w-[220px]">
                          {log.performedBy || '—'}
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-500 w-[200px]">
                          {log.formattedDate}
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-500 max-w-[260px] break-words">
                          {log.details || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="md:hidden space-y-4">
          {loading ? (
                            <EmptyState
                              icon={
                                <div className="flex items-center justify-center">
                                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                                </div>
                              }
                              title="Loading audit..."
                              description="Please wait while audit records are being retrieved."
                            />
                          ) : hasNoLogs ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-16 px-6">
              <EmptyState
                icon={<Inbox className="size-10 text-blue-500" />}
                title="No audit logs yet"
                description="Administrative and system activities will appear here once actions are recorded."
              />
            </div>
          ) : hasNoSearchResults ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-16 px-6">
              <NoResultsState />
            </div>
          ) : (
            rows.map((log) => (
              <div
                key={log.id}
                className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3"
              >
                <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Hash className="size-3.5 text-gray-400 shrink-0" />
                    <span className="text-xs font-mono text-gray-400 truncate">
                      {log.publicId ?? log.id}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${getActionStyle(log.action)}`}
                  >
                    {log.action}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1">
                      <Layers className="size-3" /> Module
                    </span>
                    <span className="text-sm text-gray-600">{log.module || '—'}</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1">
                      <Tag className="size-3" /> Target
                    </span>
                    <span className="text-sm text-gray-700">{log.target || '—'}</span>
                  </div>

                  <div className="flex flex-col gap-1 col-span-2">
                    <span className="text-[10px] text-gray-400 uppercase font-bold">
                      Performed By
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {log.performedBy || '—'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 col-span-2">
                    <span className="text-[10px] text-gray-400 uppercase font-bold">Date</span>
                    <span className="text-sm text-gray-500">{log.formattedDate}</span>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl">
                  <p className="text-sm text-gray-500 leading-snug">{log.details || '—'}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {!loading && !hasNoLogs && totalPages > 1 && (
          <div className="flex flex-col gap-3 mt-4 bg-white border border-gray-200 rounded-2xl shadow-sm px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages} • {totalCount} total logs
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-2 text-sm rounded-lg border border-gray-300 disabled:opacity-50"
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
                  className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handlePageJump}
                  className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  Go
                </button>
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-2 text-sm rounded-lg border border-gray-300 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="md:hidden fixed bottom-6 right-6 z-50">
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
          className={`size-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 relative ${
            isMobileDropdownOpen
              ? 'bg-gray-900 text-white rotate-90'
              : 'bg-blue-600 text-white hover:scale-105'
          }`}
        >
          {isMobileDropdownOpen ? <X size={24} /> : <Filter size={24} />}

          {!isMobileDropdownOpen && hasActiveFilters && (
            <span className="absolute -top-1 -right-1 size-5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-bold text-white">
              !
            </span>
          )}
        </button>
      </div>
    </div>
    </div>
  );
}