import { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import {
  Search, Eye, Plus, X, Mail, Phone, MapPin,
  ShieldCheck, ShieldAlert, Hash, RotateCcw, AlertTriangle, EyeOff, Inbox, Filter
} from 'lucide-react';
import { motion } from 'framer-motion';
import EmptyState from '../../components/common/EmptyState';

export default function AdminCustomers() {

  const { users } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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

  const customers = useMemo(() => {
    return users.filter(u => u.role === 'customer' || u.role === 'client');
  }, [users]);
  

  const filteredCustomers = useMemo(() => {
  return customers.filter(c =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.publicId ?? c.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.contactNumber ?? '').includes(searchTerm)
  );
}, [customers, searchTerm]);

  const customer = selectedCustomer ? customers.find(c => c.id === selectedCustomer) : null;

  const hasNoCustomers = customers.length === 0;
  const hasNoSearchResults = customers.length > 0 && filteredCustomers.length === 0;

  const passwordStrength = useMemo(() => {
        const { password } = newCustomer;
        if (!password) return '';
        let score = 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        
        switch(score) {
            case 0: case 1: return 'Very Weak';
            case 2: return 'Weak';
            case 3: return 'Medium';
            case 4: return 'Strong';
            default: return '';
        }
    }, [newCustomer.password]);

  const handleAddCustomer = async () => {
    if (!newCustomer.first_name || !newCustomer.email) return;

    console.log('Register new customer:', newCustomer);

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
  };

  const toggleStatus = async (id: string, status: boolean) => {
      console.log('Toggle user status:', id, status);
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
      {!hasNoCustomers && (
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
      )}

      {/* Mobile Card View */}
<div className="grid grid-cols-1 gap-4 lg:hidden">
  {hasNoCustomers ? (
  <EmptyState
    icon={<Inbox className="size-10 text-blue-500" />}
    title="No active customers yet"
    description="Customer accounts will appear here once users register or are added by an administrator."
  />
)  : hasNoSearchResults ? (

    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm py-16 px-6"
    >
      <div className="flex flex-col items-center justify-center text-center">
        <div className="bg-gray-50 p-5 rounded-3xl shadow-sm mb-4">
          <Filter className="size-10 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">No matching customers found</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-sm">
          Try adjusting your search by name, email, or user ID.
        </p>
      </div>
    </motion.div>
  ) : (
    filteredCustomers.map(c => (
      <div
        key={c.id}
        className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center active:bg-gray-50 transition-colors cursor-pointer"
        onClick={() => setSelectedCustomer(c.id)}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="size-12 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0">
            {c.first_name?.[0] ?? ''}{c.last_name?.[0] ?? ''}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 leading-tight truncate">{c.first_name} {c.last_name}</p>
            <p className="text-[10px] text-gray-400 font-mono mt-0.5">{c.publicId ?? c.id}</p>
            <p className="text-xs text-gray-500 mt-1 truncate">{c.email || '—'}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3 shrink-0 ml-2">
          <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-md tracking-wider ${(c.is_active ?? true) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {(c.is_active ?? true) ? 'Active' : 'Inactive'}
          </span>
          <Eye size={20} className="text-blue-500 bg-blue-50 p-1 rounded-lg" />
        </div>
      </div>
    ))
  )}
</div>

      {/* Desktop/Tablet Table View */}
<div className="hidden lg:block bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
  {hasNoCustomers ? (
  <EmptyState
    icon={<Inbox className="size-10 text-blue-500" />}
    title="No active customers yet"
    description="Customer accounts will appear here once users register or are added by an administrator."
  />
) : (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {['Name', 'User ID', 'Email', 'Contact', 'Address', 'Status', 'Actions'].map((h) => (
              <th key={h} className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {hasNoSearchResults ? (
            <tr>
              <td colSpan={7} className="px-6 py-20 text-center">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col items-center justify-center text-center"
                >
                  <div className="bg-gray-50 p-5 rounded-3xl shadow-sm mb-4">
                    <Filter className="size-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">No matching customers found</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Try adjusting your search by name, email, or user ID.
                  </p>
                </motion.div>
              </td>
            </tr>
          ) : (
            filteredCustomers.map((c) => (
              <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                <td className="px-6 py-4 text-sm font-semibold text-gray-900 w-[220px]">
                  {c.first_name} {c.last_name}
                </td>

                <td className="px-6 py-4 text-xs font-mono text-gray-400 w-[140px]">
                  {c.publicId ?? c.id}
                </td>

                <td className="px-6 py-4 text-sm text-gray-600 w-[220px]">
                  {c.email || '—'}
                </td>

                <td className="px-6 py-4 text-sm text-gray-600 w-[160px]">
                  {c.contactNumber || '—'}
                </td>

                <td className="px-6 py-4 text-sm text-gray-500 max-w-[160px] truncate">
                  {c.address || '—'}
                </td>

                <td className="px-6 py-4 w-[120px]">
                  <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${(c.is_active ?? true) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {(c.is_active ?? true) ? 'Active' : 'Inactive'}
                  </span>
                </td>

                <td className="px-6 py-4 w-[120px]">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedCustomer(c.id)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                    >
                      <Eye size={18} />
                    </button>

                    {(c.is_active ?? true) ? (
                      <button
                        onClick={() => setConfirmDeactivateId(c.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <X size={18} />
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleStatus(c.id, true)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                      >
                        <RotateCcw size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )}
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
                 <div className="w-full h-full bg-blue-50 rounded-[1.5rem] flex items-center justify-center text-4xl font-bold text-blue-600">
                   {customer.first_name?.[0] ?? ''}{customer.last_name?.[0] ?? ''}
                 </div>
               </div>
             </div>
             <div className="pt-16 px-8 pb-8 flex-1 overflow-y-auto">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{customer.first_name} {customer.last_name}</h2>
                    <p className="text-sm font-mono text-gray-400 mt-1 flex items-center gap-1.5 uppercase">
                      <Hash size={12}/> {customer.publicId ?? customer.id}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider ${(customer.is_active ?? true) ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                    {(customer.is_active ?? true) ? <ShieldCheck size={14}/> : <ShieldAlert size={14}/>}
                    {(customer.is_active ?? true) ? 'Active' : 'Inactive'}
                  </div>
                </div>
                <div className="mt-8 space-y-5">
                   <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl">
                     <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600"><Mail size={18}/></div>
                     <div>
                       <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Email Address</p>
                       <p className="text-sm font-bold text-gray-800">{customer.email}</p>
                     </div>
                   </div>
                   <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl">
                     <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600"><Phone size={18}/></div>
                     <div>
                       <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Contact Number</p>
                        <p className="text-sm font-bold text-gray-800">{customer.contactNumber || '—'}</p>
                     </div>
                   </div>
                   <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl">
                     <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600"><MapPin size={18}/></div>
                     <div>
                       <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Physical Address</p>
                       <p className="text-sm font-bold text-gray-800 leading-relaxed">{customer.address || '—'}</p>
                     </div>
                   </div>
                </div>
                <div className="mt-10 flex flex-col sm:flex-row gap-3">
                  <button onClick={() => setSelectedCustomer(null)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold text-xs uppercase tracking-widest">Close Detail</button>
                  {customer.is_active ? (
                    <button onClick={() => setConfirmDeactivateId(customer.id)} className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl font-bold text-xs uppercase tracking-widest border border-red-100">Deactivate</button>
                  ) : (
                    <button onClick={() => toggleStatus(customer.id, true)} className="flex-1 py-4 bg-green-50 text-green-600 rounded-2xl font-bold text-xs uppercase tracking-widest border border-green-100">Reactivate</button>
                  )}
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 transition-all duration-300">
    <div className="bg-white rounded-[2rem] max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200/60 animate-in fade-in zoom-in-95 duration-300">
      
      {/* Header with Register.tsx Style */}
      <div className="bg-slate-900 p-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Add New Customer</h2>
          <p className="text-slate-400 text-xs font-medium mt-1">Create a new client profile for Comerciales Flores</p>
        </div>
        <button 
          onClick={() => setShowAddModal(false)} 
          className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 transition-all"
        >
          <X size={20}/>
        </button>
      </div>

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          
          {/* First Name */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">First Name</label>
            <input 
              type="text" 
              placeholder="John"
              value={newCustomer.first_name} 
              onChange={e => setNewCustomer({...newCustomer, first_name: e.target.value})} 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
            />
          </div>

          {/* Last Name */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
            <input 
              type="text" 
              placeholder="Doe"
              value={newCustomer.last_name} 
              onChange={e => setNewCustomer({...newCustomer, last_name: e.target.value})} 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
            />
          </div>
          
          
          {/* Email */}
          <div className="col-span-2 space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
            <input 
              type="email" 
              autoComplete="none"
              placeholder="customer@example.com"
              value={newCustomer.email} 
              onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
            />
          </div>

          {/* Contact Number */}
          <div className="col-span-2 space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
            <input 
              type="tel" 
              placeholder="+63 9xx..."
              value={newCustomer.contactNumber} 
              onChange={e => setNewCustomer({...newCustomer, contactNumber: e.target.value})} 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
            />
          </div>

          {/* Address */}
          <div className="col-span-2 space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Complete Address</label>
            <textarea 
              placeholder="House No., Street, City"
              value={newCustomer.address} 
              onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium resize-none h-20"
            />
          </div>

          {/* Password with Strength UI */}
          <div className="col-span-2 space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Set Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                autoComplete="new-password"
                placeholder="••••••••"
                value={newCustomer.password} 
                onChange={e => setNewCustomer({...newCustomer, password: e.target.value})} 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-blue-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            {/* Password Strength Indicator */}
            {newCustomer.password && (
              <div className="mt-2 space-y-1.5 px-1">
                <div className="flex gap-1 h-1">
                  {[1, 2, 3, 4].map((step) => {
                    const score = (newCustomer.password.length >= 8 ? 1 : 0) +
                                  (/[A-Z]/.test(newCustomer.password) ? 1 : 0) +
                                  (/[0-9]/.test(newCustomer.password) ? 1 : 0) +
                                  (/[^A-Za-z0-9]/.test(newCustomer.password) ? 1 : 0);
                    return (
                      <div key={step} className={`h-full flex-1 rounded-full transition-all duration-500 ${score >= step ? (score <= 2 ? 'bg-rose-500' : score === 3 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-slate-200'}`} />
                    );
                  })}
                  
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  {passwordStrength}
                </p>
              </div>
              
            )}
          </div>
        </div>

        <button 
          onClick={handleAddCustomer} 
          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          Register Customer Account
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}