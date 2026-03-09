import { useState, useMemo } from 'react';
import { Search, Calendar, User, Tag, Layers, Info, Hash, Filter, RotateCcw, X } from 'lucide-react';

// Mock audit data
const MOCK_AUDIT_LOGS = [
  {
    id: 'LOG023',
    action: 'DEACTIVATE',
    module: 'Customer',
    target: 'USER2',
    performedBy: 'Admin1',
    date: '2026-02-22T14:05:00',
    details: 'Customer marked inactive',
  },
  {
    id: 'LOG024',
    action: 'CREATE',
    module: 'Booking',
    target: 'BOOK102',
    performedBy: 'Admin1',
    date: '2026-02-23T09:12:00',
    details: 'New reservation created',
  },
];

export default function AdminAudit() {
  const [logs] = useState(MOCK_AUDIT_LOGS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('All');
  const [selectedModule, setSelectedModule] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // State for mobile dropdown
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);

  const getActionStyle = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-800';
      case 'UPDATE': return 'bg-yellow-100 text-yellow-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      case 'DEACTIVATE': return 'bg-gray-200 text-gray-800';
      case 'LOGIN': return 'bg-blue-100 text-blue-800';
      case 'LOGOUT': return 'bg-purple-100 text-purple-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const filteredLogs = useMemo(() => {
    return logs
      .filter((log) => {
        const lower = searchTerm.toLowerCase();
        const matchesSearch =
          log.id.toLowerCase().includes(lower) ||
          log.action.toLowerCase().includes(lower) ||
          log.module.toLowerCase().includes(lower) ||
          log.target.toLowerCase().includes(lower) ||
          log.performedBy.toLowerCase().includes(lower) ||
          log.details.toLowerCase().includes(lower);

        const matchesAction = selectedAction === 'All' || log.action === selectedAction;
        const matchesModule = selectedModule === 'All' || log.module === selectedModule;
        const logDate = new Date(log.date);
        const matchesStart = !startDate || logDate >= new Date(startDate);
        const matchesEnd = !endDate || logDate <= new Date(endDate + "T23:59:59");

        return matchesSearch && matchesAction && matchesModule && matchesStart && matchesEnd;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [logs, searchTerm, selectedAction, selectedModule, startDate, endDate]);

  const modules = useMemo<string[]>(() => {
    const unique = Array.from(new Set(logs.map((log) => log.module)));
    return ['All', ...unique];
  }, [logs]);

  const resetFilters = () => {
    setSelectedAction('All');
    setSelectedModule('All');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = selectedAction !== 'All' || selectedModule !== 'All' || startDate || endDate;

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8 flex flex-col gap-6 relative">
      
      {/* BACKGROUND BLUR OVERLAY (Mobile Only) */}
      <div 
        className={`fixed inset-0 z-40 bg-gray-900/20 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          isMobileDropdownOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileDropdownOpen(false)}
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-gray-500 text-sm">Monitor all administrative and system activities.</p>
      </div>

      {/* Search & Desktop Filters */}
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

        {/* Desktop Filter Grid (Hidden on Mobile) */}
        <div className="hidden md:grid grid-cols-4 gap-4">
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="All">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DEACTIVATE">Deactivate</option>
            <option value="DELETE">Delete</option>
            <option value="LOGIN">Login</option>
            <option value="LOGOUT">Logout</option>
          </select>

          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            {modules.map((m) => (
              <option key={m} value={m}>{m === 'All' ? 'All Modules' : m}</option>
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
          <button onClick={resetFilters} className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
            <RotateCcw className="size-3" /> Clear Filters
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 pb-24 relative z-10">
        {/* Desktop Table View */}
        <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Log ID', 'Action', 'Module', 'Target', 'Performed By', 'Date', 'Details'].map((header) => (
                    <th key={header} className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLogs.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">No audit logs found</td></tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">{log.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${getActionStyle(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{log.module}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{log.target}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{log.performedBy}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(log.date).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {filteredLogs.length === 0 ? (
            <div className="bg-white p-8 rounded-lg border border-dashed border-gray-300 text-center text-gray-500">No audit logs found</div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Hash className="size-3.5 text-gray-400" />
                    <span className="text-xs font-mono font-bold text-gray-500">{log.id}</span>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-full ${getActionStyle(log.action)}`}>
                    {log.action}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1"><Layers className="size-3" /> Module</span>
                    <span className="text-gray-800 font-medium">{log.module}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1"><Tag className="size-3" /> Target</span>
                    <span className="text-gray-700 font-mono text-xs">{log.target}</span>
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg flex flex-col gap-1 text-xs text-gray-600">
                  <p className="italic leading-snug">"{log.details}"</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MOBILE FILTER BUTTON & DROPDOWN */}
      <div className="md:hidden fixed bottom-6 right-6 z-50">
        {/* Dropdown Menu */}
        {isMobileDropdownOpen && (
          <div className="absolute bottom-16 right-0 w-[85vw] max-w-[320px] bg-white rounded-2xl border border-gray-200 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-gray-900 text-sm">Filters</h3>
              <button onClick={resetFilters} className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter hover:text-red-500">Reset All</button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Action</label>
                <select 
                  value={selectedAction} 
                  onChange={(e) => setSelectedAction(e.target.value)}
                  className="w-full border p-2 rounded-lg text-sm bg-gray-50 outline-none"
                >
                  <option value="All">All Actions</option>
                  <option value="CREATE">Create</option>
                  <option value="UPDATE">Update</option>
                  <option value="DEACTIVATE">Deactivate</option>
                  <option value="DELETE">Delete</option>
                  <option value="LOGIN">Login</option>
                  <option value="LOGOUT">Logout</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Module</label>
                <select 
                  value={selectedModule} 
                  onChange={(e) => setSelectedModule(e.target.value)}
                  className="w-full border p-2 rounded-lg text-sm bg-gray-50 outline-none"
                >
                  {modules.map(m => (
                    <option key={m} value={m}>{m === 'All' ? 'All Modules' : m}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">From</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border p-2 rounded-lg text-[10px] bg-gray-50 outline-none appearance-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">To</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border p-2 rounded-lg text-[10px] bg-gray-50 outline-none appearance-none" />
                </div>
              </div>
            </div>

            <button 
              onClick={() => setIsMobileDropdownOpen(false)}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-transform"
            >
              Apply Filters
            </button>
          </div>
        )}

        {/* Floating Toggle Button */}
        <button
          onClick={() => setIsMobileDropdownOpen(!isMobileDropdownOpen)}
          className={`size-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 relative ${
            isMobileDropdownOpen ? 'bg-gray-900 text-white rotate-90' : 'bg-blue-600 text-white hover:scale-105'
          }`}
        >
          {isMobileDropdownOpen ? <X size={24} /> : <Filter size={24} />}
          
          {/* Active Filter Badge */}
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