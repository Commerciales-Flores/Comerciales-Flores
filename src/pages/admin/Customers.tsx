import { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Search, Eye, Plus, X } from 'lucide-react';

// Mock users data
const MOCK_CUSTOMERS = [
  {
    id: 'USER2',
    first_name: 'John',
    last_name: 'Doe',
    email: 'client@example.com',
    contactNumber: '+63 918 765 4321',
    address: '123 Business Avenue, Manila, Philippines 1000', // Added address
    role: 'customer',
    is_active: true,
  },
];

export default function AdminCustomers() {
  const { reservations } = useData();
  const [customers, setCustomers] = useState(MOCK_CUSTOMERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  // ✅ UPDATED newCustomer STATE
const [newCustomer, setNewCustomer] = useState({
  first_name: '',
  last_name: '',
  email: '',
  contactNumber: '',
  address: '', // Added address field
  password: '',
  role: 'customer',
  is_active: true,
});


  const filteredCustomers = customers.filter(c =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const customer = selectedCustomer ? customers.find(c => c.id === selectedCustomer) : null;
  const customerReservations = customer ? reservations.filter(b => b.userId === customer.id) : [];



  const handleAddCustomer = () => {
    const newId = (Math.random() * 10000).toFixed(0); // mock ID
    setCustomers([...customers, { ...newCustomer, id: newId }]);
    setShowAddModal(false);
    setNewCustomer({
      first_name: '',
      last_name: '',
      email: '',
      contactNumber: '',
      address: '',
      password: '',
      role: 'customer',
      is_active: true,
    });
    // TODO: call backend CREATE API & log in AuditLog
  };

  const handleDeactivate = (id: string) => {
  setCustomers(prevCustomers =>
    prevCustomers.map(c => 
      c.id === id ? { ...c, is_active: false } : c
    )
  );
  // TODO: call backend to update user status and log changes in AuditLog
};

  // --- Render ---
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="mb-2">Customer Management</h1>
          <p className="text-gray-600">View and manage customer accounts</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded"
        >
          <Plus size={16} /> Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* ✅ UPDATED TABLE HEADER */}
<thead className="bg-gray-50 border-b border-gray-200">
  <tr>
    <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
      Name
    </th>
    {/* I'll add the User ID here as well, as it's useful for admins to see at a glance */}
    <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
      User ID
    </th>
    <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
      Email
    </th>
    <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
      Contact
    </th>
    {/* --- This is the new column --- */}
    <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
      Address
    </th>
    {/* ----------------------------- */}
    <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
      Status
    </th>
    <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">
      Actions
    </th>
  </tr>
</thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No customers found
                  </td>
                </tr>
              ) : (

filteredCustomers.map((c) => (
  <tr key={c.id} className="hover:bg-gray-50">
    <td className="px-6 py-4 whitespace-nowrap">
      {c.first_name} {c.last_name}
    </td>
    {/* Added User ID cell */}
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
      {c.id}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
      {c.email}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
      {c.contactNumber}
    </td>
    {/* --- This is the new data cell --- */}
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 max-w-xs truncate" title={c.address}>
      {c.address}
    </td>
    {/* ---------------------------------- */}
    <td className="px-6 py-4 whitespace-nowrap">
      <span
        className={`px-2 py-1 text-xs rounded-full ${
          c.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}
      >
        {c.is_active ? 'Active' : 'Inactive'}
      </span>
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm flex gap-2">
      <button
        onClick={() => setSelectedCustomer(c.id)}
        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
        title="View Details"
      >
        <Eye className="size-4" />
      </button>
      {c.is_active && (
        <button
          onClick={() => handleDeactivate(c.id)}
          className="p-1 text-red-600 hover:bg-red-50 rounded"
          title="Deactivate Customer"
        >
          <X className="size-4" />
        </button>
      )}
    </td>
  </tr>
))

              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2>Add Customer</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="First Name"
                value={newCustomer.first_name}
                onChange={(e) => setNewCustomer({...newCustomer, first_name: e.target.value})}
                className="w-full border px-2 py-1 rounded"
              />
              <input
                type="text"
                placeholder="Last Name"
                value={newCustomer.last_name}
                onChange={(e) => setNewCustomer({...newCustomer, last_name: e.target.value})}
                className="w-full border px-2 py-1 rounded"
              />
              <input
                type="email"
                placeholder="Email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                className="w-full border px-2 py-1 rounded"
              />
              <input
                type="text"
                placeholder="Contact Number"
                value={newCustomer.contactNumber}
                onChange={(e) => setNewCustomer({...newCustomer, contactNumber: e.target.value})}
                className="w-full border px-2 py-1 rounded"
              />
              <input
    type="text"
    placeholder="Address"
    value={newCustomer.address}
    onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
    className="w-full border px-2 py-1 rounded"
  />
              <input
                type="password"
                placeholder="Password"
                value={newCustomer.password}
                onChange={(e) => setNewCustomer({...newCustomer, password: e.target.value})}
                className="w-full border px-2 py-1 rounded"
              />
              <button
                onClick={handleAddCustomer}
                className="w-full py-2 bg-blue-600 text-white rounded"
              >
                Add Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ START: NEW READ-ONLY CUSTOMER DETAILS MODAL */}
{customer && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] flex flex-col">
      {/* --- Modal Header --- */}
      <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
        <h2 className="text-lg font-semibold">Customer Details</h2>
        <button
          onClick={() => setSelectedCustomer(null)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="size-6" />
        </button>
      </div>

      {/* --- Modal Body --- */}
      <div className="p-6 space-y-6 overflow-y-auto">
        {/* Read-Only Customer Info */}
        {/* ✅ UPDATED MODAL WITH ADDRESS */}
<div className="space-y-4 text-sm">
  {/* User ID, First Name, Last Name... */}
  <div className="flex justify-between py-2 border-b border-gray-100">
    <span className="text-gray-600">Email:</span>
    <span className="font-medium text-gray-900">{customer.email}</span>
  </div>
  <div className="flex justify-between py-2 border-b border-gray-100">
    <span className="text-gray-600">Contact Number:</span>
    <span className="font-medium text-gray-900">{customer.contactNumber}</span>
  </div>

  {/* --- This is the new field --- */}
  <div className="flex justify-between py-2 border-b border-gray-100">
    <span className="text-gray-600">Address:</span>
    <span className="font-medium text-gray-900 text-right">{customer.address}</span>
  </div>
  {/* ----------------------------- */}

  <div className="flex justify-between py-2 border-b border-gray-100">
    <span className="text-gray-600">Status:</span>
    <span
      className={`px-2 py-1 text-xs rounded-full ${
        customer.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}
    >
      {customer.is_active ? 'Active' : 'Inactive'}
    </span>
  </div>
</div>

      </div>
    </div>
  </div>
)}
{/* ✅ END: NEW READ-ONLY CUSTOMER DETAILS MODAL */}
    </div>
  );
}
