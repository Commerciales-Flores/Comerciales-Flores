import { useState, useMemo, useEffect, useCallback } from 'react';
import { useUsers } from '../../contexts/UsersContext';
import {
  Search,
  Eye,
  Plus,
  X,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Hash,
  RotateCcw,
  AlertTriangle,
  EyeOff,
  Inbox,
  Filter,
} from 'lucide-react';
import { motion } from 'framer-motion';
import EmptyState from '../../components/common/EmptyState';

type CustomerRow = {
  id: string;
  publicId?: string;
  firstName: string;
  lastName: string;
  email: string;
  contactNumber?: string;
  address?: string;
  is_active?: boolean;
  initials: string;
  searchableText: string;
};

type NewCustomerForm = {
  first_name: string;
  last_name: string;
  email: string;
  contactNumber: string;
  address: string;
  password: string;
  role: 'customer';
  is_active: boolean;
};

const INITIAL_CUSTOMER_FORM: NewCustomerForm = {
  first_name: '',
  last_name: '',
  email: '',
  contactNumber: '',
  address: '',
  password: '',
  role: 'customer',
  is_active: true,
};

function useDebouncedValue<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function getPasswordScore(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

function getPasswordStrengthLabel(score: number) {
  switch (score) {
    case 0:
    case 1:
      return 'Very Weak';
    case 2:
      return 'Weak';
    case 3:
      return 'Medium';
    case 4:
      return 'Strong';
    default:
      return '';
  }
}

function NoCustomerResults() {
  return (
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
      <p className="text-sm text-gray-500 mt-1 max-w-sm">
        Try adjusting your search by name, email, or user ID.
      </p>
    </motion.div>
  );
}

function CustomerDetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl">
      <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600">{icon}</div>
      <div>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{label}</p>
        <p className="text-sm font-bold text-gray-800 leading-relaxed">{value || '—'}</p>
      </div>
    </div>
  );
}

export default function AdminCustomers() {
  const { fetchUsersPage } = useUsers();

  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [newCustomer, setNewCustomer] = useState<NewCustomerForm>(INITIAL_CUSTOMER_FORM);

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

const handlePageInputKeyDown = useCallback(
  (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handlePageJump();
    }
  },
  [handlePageJump]
);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    let cancelled = false;

    const loadUsers = async () => {
      setLoading(true);
      try {
        const result = await fetchUsersPage({
          page,
          pageSize,
          searchTerm: debouncedSearchTerm,
        });

        if (cancelled) return;

        const mapped: CustomerRow[] = result.data.map((u) => {
          const first = u.firstName ?? '';
          const last = u.lastName ?? '';
          const publicId = u.publicId ?? u.id;
          const contact = u.phone ?? '';
          const address = u.address ?? '';
          const email = u.email ?? '';

          return {
            id: u.id,
            publicId: u.publicId,
            firstName: first,
            lastName: last,
            email,
            contactNumber: contact,
            address,
            is_active: u.isActive,
            initials: `${first[0] ?? ''}${last[0] ?? ''}`,
            searchableText: [first, last, email, publicId, contact, address]
              .filter(Boolean)
              .join(' ')
              .toLowerCase(),
          };
        });

        setRows(mapped);
        setTotalCount(result.count);
      } catch (error) {
        console.error('Failed to load users page:', error);
        if (!cancelled) {
          setRows([]);
          setTotalCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [fetchUsersPage, page, pageSize, debouncedSearchTerm]);

  const customer = useMemo(
    () => (selectedCustomer ? rows.find((c) => c.id === selectedCustomer) ?? null : null),
    [rows, selectedCustomer]
  );

  const hasNoCustomers = !loading && totalCount === 0;
  const hasNoSearchResults = !loading && totalCount > 0 && rows.length === 0;

  const passwordScore = useMemo(
    () => getPasswordScore(newCustomer.password),
    [newCustomer.password]
  );

  const passwordStrength = useMemo(
    () => getPasswordStrengthLabel(passwordScore),
    [passwordScore]
  );

  const canSubmitNewCustomer = useMemo(() => {
    return (
      newCustomer.first_name.trim() !== '' &&
      newCustomer.email.trim() !== '' &&
      newCustomer.password.trim() !== ''
    );
  }, [newCustomer.first_name, newCustomer.email, newCustomer.password]);

  const handleAddCustomer = useCallback(async () => {
    if (!canSubmitNewCustomer) return;

    console.log('Register new customer:', newCustomer);

    setShowAddModal(false);
    setNewCustomer(INITIAL_CUSTOMER_FORM);
    setShowPassword(false);
  }, [canSubmitNewCustomer, newCustomer]);

  const toggleStatus = useCallback(async (id: string, status: boolean) => {
    console.log('Toggle user status:', id, status);
    setConfirmDeactivateId(null);
    if (!status) setSelectedCustomer(null);
  }, []);

  const closeCustomerModal = useCallback(() => {
    setSelectedCustomer(null);
  }, []);

  const closeAddModal = useCallback(() => {
    setShowAddModal(false);
    setShowPassword(false);
  }, []);

  const updateNewCustomerField = useCallback(
    <K extends keyof NewCustomerForm>(key: K, value: NewCustomerForm[K]) => {
      setNewCustomer((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8 flex flex-col gap-6 pb-24 lg:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Customer Management</h1>
          <p className="text-gray-500 text-sm">Monitor and manage user accounts and profiles.</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white p-2.5 sm:px-4 sm:py-2 rounded-xl cursor-pointer hover:bg-blue-700 transition-all shadow-sm flex items-center gap-2 active:scale-95 font-semibold text-sm"
        >
          <Plus size={18} /> Add Customer
        </button>
      </div>

      {!loading && !hasNoCustomers && (
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

      <div className="grid grid-cols-1 gap-4 lg:hidden">
        {loading ? (
                  <EmptyState
                    icon={
                      <div className="flex items-center justify-center">
                        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                      </div>
                    }
                    title="Loading customers..."
                    description="Please wait while customers records are being retrieved."
                  />
                ) : hasNoCustomers ? (
          <EmptyState
            icon={<Inbox className="size-10 text-blue-500" />}
            title="No active customers yet"
            description="Customer accounts will appear here once users register or are added by an administrator."
          />
        ) : hasNoSearchResults ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-16 px-6">
            <NoCustomerResults />
          </div>
        ) : (
          rows.map((c) => (
            <div
              key={c.id}
              className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center active:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => setSelectedCustomer(c.id)}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="size-12 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0">
                  {c.initials}
                </div>

                <div className="min-w-0">
                  <p className="font-bold text-gray-900 leading-tight truncate">
                    {c.firstName} {c.lastName}
                  </p>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                    {c.publicId ?? c.id}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 truncate">{c.email || '—'}</p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-3 shrink-0 ml-2">
                <span
                  className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-md tracking-wider ${
                    (c.is_active ?? true)
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {(c.is_active ?? true) ? 'Active' : 'Inactive'}
                </span>
                <Eye size={20} className="text-blue-500 bg-blue-50 p-1 rounded-lg" />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden lg:block bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
                  <EmptyState
                    icon={
                      <div className="flex items-center justify-center">
                        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                      </div>
                    }
                    title="Loading customers..."
                    description="Please wait while customers records are being retrieved."
                  />
                ) : hasNoCustomers ? (
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
                  {['Name', 'User ID', 'Email', 'Contact', 'Address', 'Status', 'Actions'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {hasNoSearchResults ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center">
                      <NoCustomerResults />
                    </td>
                  </tr>
                ) : (
                  rows.map((c) => (
                    <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 w-[220px]">
                        {c.firstName} {c.lastName}
                      </td>

                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 w-[220px]">
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
                        <span
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${
                            (c.is_active ?? true)
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
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

      {!loading && !hasNoCustomers && totalPages > 1 && (
  <div className="flex flex-col gap-3 px-4 py-4 bg-white border border-gray-200 rounded-2xl shadow-sm sm:flex-row sm:items-center sm:justify-between">
    <p className="text-sm text-gray-500">
      Page {page} of {totalPages} • {totalCount} total customers
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

      <button
        onClick={() => setShowAddModal(true)}
        className="lg:hidden fixed bottom-6 right-6 size-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 border-4 border-white"
      >
        <Plus size={32} strokeWidth={3} />
      </button>

      {confirmDeactivateId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="size-14 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                <AlertTriangle size={32} />
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900">Confirm Deactivation</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Are you sure you want to deactivate this user? They will no longer be able to
                  log in.
                </p>
              </div>

              <div className="flex gap-3 w-full mt-2">
                <button
                  onClick={() => setConfirmDeactivateId(null)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => toggleStatus(confirmDeactivateId, false)}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-200 transition-all"
                >
                  Deactivate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {customer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2.5rem] max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="relative h-28 bg-gradient-to-br from-blue-600 to-blue-800 flex items-end px-8 pb-4 shrink-0">
              <button
                onClick={closeCustomerModal}
                className="absolute top-5 right-5 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
              >
                <X size={20} />
              </button>

              <div className="absolute -bottom-12 left-8 size-28 bg-white p-2 rounded-[2rem] shadow-xl">
                <div className="w-full h-full bg-blue-50 rounded-[1.5rem] flex items-center justify-center text-4xl font-bold text-blue-600">
                  {customer.initials}
                </div>
              </div>
            </div>

            <div className="pt-16 px-8 pb-8 flex-1 overflow-y-auto">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                    {customer.firstName} {customer.lastName}
                  </h2>
                  <p className="text-sm font-mono text-gray-400 mt-1 flex items-center gap-1.5 uppercase">
                    <Hash size={12} /> {customer.publicId ?? customer.id}
                  </p>
                </div>

                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider ${
                    (customer.is_active ?? true)
                      ? 'text-green-600 bg-green-50'
                      : 'text-red-600 bg-red-50'
                  }`}
                >
                  {(customer.is_active ?? true) ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                  {(customer.is_active ?? true) ? 'Active' : 'Inactive'}
                </div>
              </div>

              <div className="mt-8 space-y-5">
                <CustomerDetailItem
                  icon={<Mail size={18} />}
                  label="Email Address"
                  value={customer.email || '—'}
                />
                <CustomerDetailItem
                  icon={<Phone size={18} />}
                  label="Contact Number"
                  value={customer.contactNumber || '—'}
                />
                <CustomerDetailItem
                  icon={<MapPin size={18} />}
                  label="Physical Address"
                  value={customer.address || '—'}
                />
              </div>

              <div className="mt-10 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={closeCustomerModal}
                  className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold text-xs uppercase tracking-widest"
                >
                  Close Detail
                </button>

                {(customer.is_active ?? true) ? (
                  <button
                    onClick={() => setConfirmDeactivateId(customer.id)}
                    className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl font-bold text-xs uppercase tracking-widest border border-red-100"
                  >
                    Deactivate
                  </button>
                ) : (
                  <button
                    onClick={() => toggleStatus(customer.id, true)}
                    className="flex-1 py-4 bg-green-50 text-green-600 rounded-2xl font-bold text-xs uppercase tracking-widest border border-green-100"
                  >
                    Reactivate
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 transition-all duration-300">
          <div className="bg-white rounded-[2rem] max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200/60 animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-slate-900 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Add New Customer</h2>
                <p className="text-slate-400 text-xs font-medium mt-1">
                  Create a new client profile for Comerciales Flores
                </p>
              </div>

              <button
                onClick={closeAddModal}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    placeholder="John"
                    value={newCustomer.first_name}
                    onChange={(e) => updateNewCustomerField('first_name', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    placeholder="Doe"
                    value={newCustomer.last_name}
                    onChange={(e) => updateNewCustomerField('last_name', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
                  />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    autoComplete="off"
                    placeholder="customer@example.com"
                    value={newCustomer.email}
                    onChange={(e) => updateNewCustomerField('email', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
                  />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                    Contact Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+63 9xx..."
                    value={newCustomer.contactNumber}
                    onChange={(e) => updateNewCustomerField('contactNumber', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
                  />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                    Complete Address
                  </label>
                  <textarea
                    placeholder="House No., Street, City"
                    value={newCustomer.address}
                    onChange={(e) => updateNewCustomerField('address', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium resize-none h-20"
                  />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                    Set Password
                  </label>

                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={newCustomer.password}
                      onChange={(e) => updateNewCustomerField('password', e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {newCustomer.password && (
                    <div className="mt-2 space-y-1.5 px-1">
                      <div className="flex gap-1 h-1">
                        {[1, 2, 3, 4].map((step) => (
                          <div
                            key={step}
                            className={`h-full flex-1 rounded-full transition-all duration-500 ${
                              passwordScore >= step
                                ? passwordScore <= 2
                                  ? 'bg-rose-500'
                                  : passwordScore === 3
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                : 'bg-slate-200'
                            }`}
                          />
                        ))}
                      </div>

                      <p className="text-[10px] text-slate-400 italic">{passwordStrength}</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleAddCustomer}
                disabled={!canSubmitNewCustomer}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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