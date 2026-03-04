import { useState, useEffect } from 'react';
import supabase from '../../supabaseClient';
import { useData } from '../../contexts/DataContext';
import { Search, Eye, Plus, X, Loader2 } from 'lucide-react';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  contactNumber: string;
  address: string;
  role: string;
  is_active: boolean;
}

export default function AdminCustomers() {
  const { bookings } = useData();
  
  // ✅ NEW: Replaced mock data with dynamic state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [newCustomer, setNewCustomer] = useState({
    first_name: '',
    last_name: '',
    email: '',
    contactNumber: '',
    address: '',
    password: '',
    role: 'client', // Defaulting to client role as per AuthContext
    is_active: true,
  });

  // ✅ NEW: Fetch customers from Supabase on component mount
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('role', 'client') // Only fetch clients/customers
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Map database columns to our frontend interface
        const mappedCustomers: Customer[] = data.map((row: any) => ({
          id: row.user_id,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          contactNumber: row.phone || '',
          address: row.address || '',
          role: row.role,
          is_active: row.is_active,
        }));

        setCustomers(mappedCustomers);
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(c =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const customer = selectedCustomer ? customers.find(c => c.id === selectedCustomer) : null;
  
  // Note: If bookings aren't loaded in DataContext, you may want to fetch this directly later too!
  const customerBookings = customer ? bookings.filter(b => b.userId === customer.id) : [];

  // ✅ NEW: Insert directly into Supabase Database
  const handleAddCustomer = async () => {
    if (!newCustomer.first_name || !newCustomer.email || !newCustomer.password) {
        alert("Please fill in the required fields (First Name, Email, Password).");
        return;
    }

    setIsSubmitting(true);

    try {
      // 1. Check if email already exists
      const { data: existing } = await supabase
        .from('users')
        .select('user_id')
        .eq('email', newCustomer.email)
        .single();

      if (existing) {
          alert("A user with this email already exists!");
          setIsSubmitting(false);
          return;
      }

      // 2. Insert new user
      const { data, error } = await supabase
        .from('users')
        .insert([{
          first_name: newCustomer.first_name,
          last_name: newCustomer.last_name,
          email: newCustomer.email,
          password_hash: newCustomer.password, // Matches AuthContext schema
          role: 'client',
          phone: newCustomer.contactNumber,
          address: newCustomer.address,
          is_active: true,
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;

      // 3. Update local state to reflect the new addition immediately
      const addedCustomer: Customer = {
        id: data.user_id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        contactNumber: data.phone || '',
        address: data.address || '',
        role: data.role,
        is_active: data.is_active,
      };

      setCustomers([addedCustomer, ...customers]);
      setShowAddModal(false);
      setNewCustomer({
        first_name: '',
        last_name: '',
        email: '',
        contactNumber: '',
        address: '',
        password: '',
        role: 'client',
        is_active: true,
      });

    } catch (error) {
      console.error("Error adding customer:", error);
      alert("Failed to create customer. Please check the console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ NEW: Update database to set user inactive
  const handleDeactivate = async (id: string) => {
    if (!window.confirm('Are you sure you want to deactivate this customer? They will not be able to log in.')) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('user_id', id);

      if (error) throw error;

      setCustomers(prevCustomers =>
        prevCustomers.map(c => 
          c.id === id ? { ...c, is_active: false } : c
        )
      );
    } catch (error) {
      console.error("Error deactivating customer:", error);
      alert("Failed to deactivate the customer.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="size-8 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-500 text-lg">Loading customers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Customer Management</h1>
          <p className="text-gray-600">View and manage customer accounts</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="size-5" /> Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">User ID</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Address</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No customers found matching your search.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {c.first_name} {c.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {c.id.split('-')[0]}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {c.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {c.contactNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate" title={c.address}>
                      {c.address || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${
                        c.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm flex gap-2 justify-end">
                      <button
                        onClick={() => setSelectedCustomer(c.id)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="View Details"
                      >
                        <Eye className="size-4" />
                      </button>
                      {c.is_active && (
                        <button
                          onClick={() => handleDeactivate(c.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Add New Customer</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="size-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={newCustomer.first_name}
                    onChange={(e) => setNewCustomer({...newCustomer, first_name: e.target.value})}
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={newCustomer.last_name}
                    onChange={(e) => setNewCustomer({...newCustomer, last_name: e.target.value})}
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                <input
                  type="text"
                  value={newCustomer.contactNumber}
                  onChange={(e) => setNewCustomer({...newCustomer, contactNumber: e.target.value})}
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Complete Address</label>
                <textarea
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                  rows={2}
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password *</label>
                <input
                  type="password"
                  required
                  value={newCustomer.password}
                  onChange={(e) => setNewCustomer({...newCustomer, password: e.target.value})}
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomer}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70"
              >
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                Save Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* READ-ONLY CUSTOMER DETAILS MODAL */}
      {customer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
              <h2 className="text-xl font-bold text-gray-900">Customer Details</h2>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="size-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto bg-gray-50">
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4 text-sm">
                
                <div className="flex flex-col border-b border-gray-100 pb-3">
                  <span className="text-xs text-gray-500 font-medium uppercase mb-1">Full Name</span>
                  <span className="font-semibold text-gray-900 text-base">{customer.first_name} {customer.last_name}</span>
                </div>

                <div className="flex flex-col border-b border-gray-100 pb-3">
                  <span className="text-xs text-gray-500 font-medium uppercase mb-1">User ID</span>
                  <span className="font-mono text-gray-700">{customer.id}</span>
                </div>

                <div className="flex flex-col border-b border-gray-100 pb-3">
                  <span className="text-xs text-gray-500 font-medium uppercase mb-1">Email Address</span>
                  <span className="text-gray-900">{customer.email}</span>
                </div>

                <div className="flex flex-col border-b border-gray-100 pb-3">
                  <span className="text-xs text-gray-500 font-medium uppercase mb-1">Contact Number</span>
                  <span className="text-gray-900">{customer.contactNumber || 'Not provided'}</span>
                </div>

                <div className="flex flex-col border-b border-gray-100 pb-3">
                  <span className="text-xs text-gray-500 font-medium uppercase mb-1">Registered Address</span>
                  <span className="text-gray-900">{customer.address || 'Not provided'}</span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-gray-500 font-medium uppercase">Account Status</span>
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                      customer.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                    }`}
                  >
                    {customer.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

              </div>
              
              <div className="mt-6 text-center">
                 <p className="text-xs text-gray-500">
                    This user currently has <strong>{customerBookings.length}</strong> active bookings on record.
                 </p>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}