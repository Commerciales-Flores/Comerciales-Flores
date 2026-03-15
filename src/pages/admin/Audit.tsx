import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
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
  searchableText: string;
  formattedDate: string;
};

const ACTION_OPTIONS = ['All', 'CREATE', 'UPDATE', 'DEACTIVATE', 'DELETE', 'LOGIN', 'LOGOUT'];

const ACTION_STYLES: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-yellow-100 text-yellow-800',
  DELETE: 'bg-red-100 text-red-800',
  DEACTIVATE: 'bg-gray-200 text-gray-800',
  LOGIN: 'bg-blue-100 text-blue-800',
  LOGOUT: 'bg-purple-100 text-purple-800',
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
              {action === 'All' ? 'All Actions' : action.charAt(0) + action.slice(1).toLowerCase()}
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
              {m === 'All' ? 'All Modules' : m}
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
                {action === 'All' ? 'All Actions' : action.charAt(0) + action.slice(1).toLowerCase()}
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
                {m === 'All' ? 'All Modules' : m}
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
  const { auditLogs } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('All');
  const [selectedModule, setSelectedModule] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);

  const debouncedSearchTerm = useDebouncedValue(searchTerm, 250);

  const logs = useMemo<AuditRow[]>(() => {
    return auditLogs.map((log) => {
      const timestampMs = new Date(log.timestamp).getTime();
      return {
        id: log.id,
        publicId: log.publicId,
        action: log.action,
        module: log.targetTable || '',
        target: log.targetId || '',
        performedBy: log.userId || '',
        date: log.timestamp,
        details: log.notes ?? 'No additional details',
        timestampMs,
        formattedDate: Number.isNaN(timestampMs)
          ? 'Invalid date'
          : new Date(timestampMs).toLocaleString(),
        searchableText: [
          log.id,
          log.publicId,
          log.action,
          log.targetTable,
          log.targetId,
          log.userId,
          log.notes,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase(),
      };
    });
  }, [auditLogs]);

  const modules = useMemo<string[]>(() => {
    const unique = Array.from(new Set(logs.map((log) => log.module).filter(Boolean))).sort();
    return ['All', ...unique];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const lower = debouncedSearchTerm.trim().toLowerCase();
    const startMs = startDate ? new Date(startDate).getTime() : null;
    const endMs = endDate ? new Date(`${endDate}T23:59:59`).getTime() : null;

    return logs
      .filter((log) => {
        const matchesSearch = !lower || log.searchableText.includes(lower);
        const matchesAction = selectedAction === 'All' || log.action === selectedAction;
        const matchesModule = selectedModule === 'All' || log.module === selectedModule;
        const matchesStart = startMs === null || log.timestampMs >= startMs;
        const matchesEnd = endMs === null || log.timestampMs <= endMs;

        return matchesSearch && matchesAction && matchesModule && matchesStart && matchesEnd;
      })
      .sort((a, b) => b.timestampMs - a.timestampMs);
  }, [logs, debouncedSearchTerm, selectedAction, selectedModule, startDate, endDate]);

  const hasNoLogs = logs.length === 0;
  const hasNoSearchResults = logs.length > 0 && filteredLogs.length === 0;

  const hasActiveFilters =
    selectedAction !== 'All' || selectedModule !== 'All' || Boolean(startDate) || Boolean(endDate);

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
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8 flex flex-col gap-6 relative">
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

      {!hasNoLogs && (
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
          modules={modules}
          resetFilters={resetFilters}
        />
      )}

      <div className="flex-1 pb-24 relative z-10">
        <div className="hidden md:block bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {hasNoLogs ? (
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
                          className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest"
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
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900 w-[220px]">
                          {log.publicId ?? log.id}
                        </td>

                        <td className="px-6 py-4 w-[120px]">
                          <span
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${getActionStyle(log.action)}`}
                          >
                            {log.action}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-600 w-[140px]">
                          {log.module || '—'}
                        </td>

                        <td className="px-6 py-4 text-xs font-mono text-gray-400 w-[140px]">
                          {log.target || '—'}
                        </td>

                        <td className="px-6 py-4 text-sm font-semibold text-gray-900 w-[180px]">
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
          {hasNoLogs ? (
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
            filteredLogs.map((log) => (
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
                    <span className="text-xs font-mono text-gray-400">{log.target || '—'}</span>
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
          modules={modules}
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
  );
}