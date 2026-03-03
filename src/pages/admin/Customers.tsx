import { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { 
  Search, Eye, Plus, X, Mail, Phone, MapPin, 
  ShieldCheck, ShieldAlert, Hash, Trash2, RotateCcw, AlertTriangle 
} from 'lucide-react';

// Mock users data
const MOCK_CUSTOMERS = [
  {
    id: 'USER2',
    first_name: 'John',
    last_name: 'Doe',
    email: 'client@example.com',
    contactNumber: '+63 918 765 4321',
    address: '123 Business Avenue, Manila, Philippines 1000',
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
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(null);

  const [newCustomer, setNewCustomer] = useState({
    first_name: '',
    last_name: '',
    email: '',
    contactNumber: '',
    address: '',
    password: '',
    role: 'customer',
    is_active: true,
  });

  const filteredCustomers = useMemo(() => {
    return customers.filter(c =>
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contactNumber.includes(searchTerm)
    );
  }, [customers, searchTerm]);

  const customer = selectedCustomer ? customers.find(c => c.id === selectedCustomer) : null;

  const handleAddCustomer = () => {
    if (!newCustomer.first_name || !newCustomer.email) return;
    const newId = `USER${(Math.random() * 1000).toFixed(0)}`;
    setCustomers([...customers, { ...newCustomer, id: newId }]);
    setShowAddModal(false);
    setNewCustomer({ first_name: '', last_name: '', email: '', contactNumber: '', address: '', password: '', role: 'customer', is_active: true });
  };

  const toggleStatus = (id: string, status: boolean) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, is_active: status } : c));
    setConfirmDeactivateId(null);
    if (!status) setSelectedCustomer(null); 
  };

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8 flex flex-col gap-6 pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Customer Management</h1>
          <p className="text-gray-500 text-sm">Monitor and manage user accounts and profiles.</p>
        </div>
        
        {/* Desktop Only Add Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="hidden lg:flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-100 transition-all text-sm font-bold active:scale-95"
        >
          <Plus size={18} /> Add Customer
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-2 rounded-2xl border border-gray-200 shadow-sm sticky top-0 z-20">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm outline-none transition-all"
          />
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-4 lg:hidden">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400 text-sm font-medium">No customers found</div>
        ) : (
          filteredCustomers.map(c => (
            <div 
              key={c.id} 
              className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center active:bg-gray-50 transition-colors cursor-pointer" 
              onClick={() => setSelectedCustomer(c.id)}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="size-12 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0">
                  {c.first_name[0]}{c.last_name[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 leading-tight truncate">{c.first_name} {c.last_name}</p>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">{c.id}</p>
                  <p className="text-xs text-gray-500 mt-1 truncate">{c.email}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-3 shrink-0 ml-2">
                <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-md tracking-wider ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {c.is_active ? 'Active' : 'Inactive'}
                </span>
                <Eye size={20} className="text-blue-500 bg-blue-50 p-1 rounded-lg" /> 
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop/Tablet Table View (Original View) */}
      <div className="hidden lg:block bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Name', 'User ID', 'Email', 'Contact', 'Address', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.map((c) => (
                <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900">{c.first_name} {c.last_name}</td>
                  <td className="px-6 py-4 text-xs font-mono text-gray-400">{c.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{c.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{c.contactNumber}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-[160px] truncate">{c.address}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${c.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelectedCustomer(c.id)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"><Eye size={18}/></button>
                      {c.is_active ? (
                        <button onClick={() => setConfirmDeactivateId(c.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><X size={18}/></button>
                      ) : (
                        <button onClick={() => toggleStatus(c.id, true)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg"><RotateCcw size={18}/></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MOBILE: FAB (Floating Action Button) */}
      <button
        onClick={() => setShowAddModal(true)}
        className="lg:hidden fixed bottom-6 right-6 size-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 border-4 border-white"
      >
        <Plus size={32} strokeWidth={3} />
      </button>

      {/* Confirmation Modal */}
      {confirmDeactivateId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="size-14 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                <AlertTriangle size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Confirm Deactivation</h3>
                <p className="text-sm text-gray-500 mt-1">Are you sure you want to deactivate this user? They will no longer be able to log in.</p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <button onClick={() => setConfirmDeactivateId(null)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold transition-all">Cancel</button>
                <button onClick={() => toggleStatus(confirmDeactivateId, false)} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-200 transition-all">Deactivate</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Customer Profile Modal */}
      {customer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2.5rem] max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
             <div className="relative h-28 bg-gradient-to-br from-blue-600 to-blue-800 flex items-end px-8 pb-4 shrink-0">
               <button onClick={() => setSelectedCustomer(null)} className="absolute top-5 right-5 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"><X size={20}/></button>
               <div className="absolute -bottom-12 left-8 size-28 bg-white p-2 rounded-[2rem] shadow-xl">
                 <div className="w-full h-full bg-blue-50 rounded-[1.5rem] flex items-center justify-center text-4xl font-black text-blue-600">
                   {customer.first_name[0]}{customer.last_name[0]}
                 </div>
               </div>
             </div>
             <div className="pt-16 px-8 pb-8 flex-1 overflow-y-auto">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">{customer.first_name} {customer.last_name}</h2>
                    <p className="text-sm font-mono text-gray-400 mt-1 flex items-center gap-1.5 uppercase">
                      <Hash size={12}/> {customer.id}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${customer.is_active ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                    {customer.is_active ? <ShieldCheck size={14}/> : <ShieldAlert size={14}/>}
                    {customer.is_active ? 'Active' : 'Inactive'}
                  </div>
                </div>
                <div className="mt-8 space-y-5">
                   <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl">
                     <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600"><Mail size={18}/></div>
                     <div>
                       <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Email Address</p>
                       <p className="text-sm font-bold text-gray-800">{customer.email}</p>
                     </div>
                   </div>
                   <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl">
                     <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600"><Phone size={18}/></div>
                     <div>
                       <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Contact Number</p>
                       <p className="text-sm font-bold text-gray-800">{customer.contactNumber}</p>
                     </div>
                   </div>
                   <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl">
                     <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600"><MapPin size={18}/></div>
                     <div>
                       <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Physical Address</p>
                       <p className="text-sm font-bold text-gray-800 leading-relaxed">{customer.address}</p>
                     </div>
                   </div>
                </div>
                <div className="mt-10 flex flex-col sm:flex-row gap-3">
                  <button onClick={() => setSelectedCustomer(null)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-black text-xs uppercase tracking-widest">Close Detail</button>
                  {customer.is_active ? (
                    <button onClick={() => setConfirmDeactivateId(customer.id)} className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest border border-red-100">Deactivate</button>
                  ) : (
                    <button onClick={() => toggleStatus(customer.id, true)} className="flex-1 py-4 bg-green-50 text-green-600 rounded-2xl font-black text-xs uppercase tracking-widest border border-green-100">Reactivate</button>
                  )}
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl space-y-6 animate-in slide-in-from-bottom-5 duration-300">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Add Customer</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-all"><X size={20}/></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="First Name" value={newCustomer.first_name} onChange={e => setNewCustomer({...newCustomer, first_name: e.target.value})} className="col-span-1 border-gray-200 border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 transition-all" />
              <input type="text" placeholder="Last Name" value={newCustomer.last_name} onChange={e => setNewCustomer({...newCustomer, last_name: e.target.value})} className="col-span-1 border-gray-200 border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 transition-all" />
              <input type="email" placeholder="Email Address" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} className="col-span-2 border-gray-200 border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 transition-all" />
              <input type="text" placeholder="Contact Number" value={newCustomer.contactNumber} onChange={e => setNewCustomer({...newCustomer, contactNumber: e.target.value})} className="col-span-2 border-gray-200 border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 transition-all" />
              <textarea placeholder="Complete Address" value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} className="col-span-2 border-gray-200 border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 resize-none h-24 transition-all" />
              <input type="password" placeholder="Set Password" value={newCustomer.password} onChange={e => setNewCustomer({...newCustomer, password: e.target.value})} className="col-span-2 border-gray-200 border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 transition-all" />
            </div>
            <button onClick={handleAddCustomer} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">Register Account</button>
          </div>
        </div>
      )}
    </div>
  );
}