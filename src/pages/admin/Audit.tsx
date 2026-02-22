import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';

// Mock audit data (Replace with backend later)
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

  const filteredLogs = useMemo(() => {
    return logs
      .filter((log) => {
        const matchesSearch =
          log.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.performedBy.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesAction =
          selectedAction === 'All' || log.action === selectedAction;

        const matchesModule =
          selectedModule === 'All' || log.module === selectedModule;

        const logDate = new Date(log.date);
        const matchesStart =
          !startDate || logDate >= new Date(startDate);
        const matchesEnd =
          !endDate || logDate <= new Date(endDate);

        return (
          matchesSearch &&
          matchesAction &&
          matchesModule &&
          matchesStart &&
          matchesEnd
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Latest first
  }, [logs, searchTerm, selectedAction, selectedModule, startDate, endDate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="mb-2">Audit Log</h1>
        <p className="text-gray-600">
          Monitor all administrative and system activities.
        </p>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ID, action, target, or user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Action Filter */}
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="All">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DEACTIVATE">Deactivate</option>
            <option value="DELETE">Delete</option>
          </select>

          {/* Module Filter */}
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="All">All Modules</option>
            <option value="Customer">Customer</option>
            <option value="Reservation">Reservation</option>
            <option value="Payment">Payment</option>
          </select>

          {/* Start Date */}
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          />

          {/* End Date */}
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Log ID', 'Action', 'Module', 'Target', 'Performed By', 'Date', 'Details'].map((header) => (
                  <th
                    key={header}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                      {log.id}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {log.action}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {log.module}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                      {log.target}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {log.performedBy}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.date).toLocaleString()}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}