import React, { useState, cloneElement } from 'react';
import { useData } from '../../contexts/DataContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { Search, Eye, CheckCircle, XCircle, X, Plus, Calendar, CreditCard, User, Building, MapPin, Clock, Tag, FileText, SlidersHorizontal } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { getPropertyTypeLabel } from '../../utils/propertyHelpers';
import AdminActionModal from './AdminActionModal';

export default function AdminReservations() {
  const { reservations, updateReservation, getUserById } = useData();
  const { sendReservationNotification } = useNotifications();
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReservation, setSelectedReservation] = useState<string | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const filteredReservations = reservations.filter(b => {
    const user = getUserById(b.userId);
    const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
    const matchesSearch =
      b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user && `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const sortedReservations = [...filteredReservations].sort(
    (a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()
  );

  const handleApprove = (reservationId: string, userId: string) => {
    updateReservation(reservationId, { status: 'confirmed' });
    sendReservationNotification(userId, reservationId, 'approved');
    setSelectedReservation(null);
  };

  const handleReject = (reservationId: string, userId: string) => {
    updateReservation(reservationId, { status: 'cancelled' });
    sendReservationNotification(userId, reservationId, 'rejected');
    setSelectedReservation(null);
  };

  const reservation = selectedReservation ? reservations.find(b => b.id === selectedReservation) : null;
  const user = reservation ? getUserById(reservation.userId) : null;

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    confirmed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
    completed: 'bg-blue-100 text-blue-700 border-blue-200'
  };

  return (
    <div className="bg-gray-50 min-h-screen p-4 md:p-6 lg:p-8 flex flex-col gap-6 pb-24 lg:pb-8">
      
      {/* HEADER: Desktop Only */}
      <div className="hidden lg:flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservation Management</h1>
          <p className="text-sm text-gray-500">Manage and audit all property bookings</p>
        </div>
        <button
          onClick={() => setIsActionModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm font-medium"
        >
          <Plus className="size-5" />
          Create Reservation
        </button>
      </div>

      {/* SEARCH & FILTERS CONTAINER */}
      <div className="space-y-4">
        {/* Mobile: Search + Filter Icon Toggle */}
        <div className="flex lg:hidden items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
            />
          </div>
          <button 
            onClick={() => setIsFilterPanelOpen(true)}
            className="p-3 bg-white border border-gray-200 rounded-2xl text-gray-600 shadow-sm relative"
          >
            <SlidersHorizontal className="size-6" />
            {filterStatus !== 'all' && (
              <span className="absolute top-2 right-2 size-2.5 bg-blue-600 rounded-full border-2 border-white" />
            )}
          </button>
        </div>

        {/* Desktop: Search Bar + Horizontal Chips (Original View) */}
        <div className="hidden lg:block bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ID, Property, or Customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-1.5 text-sm rounded-full whitespace-nowrap transition-all border font-medium ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                <span className="ml-2 text-xs opacity-60">
                  ({status === 'all' ? sortedReservations.length : reservations.filter(b => b.status === status).length})
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT: Cards (Mobile) / Table (Desktop) */}
      <div className="flex-1">
        {/* MOBILE CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4">
          {sortedReservations.map((res) => (
            <div key={res.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div className="font-mono text-[10px] text-gray-400 uppercase tracking-tighter">ID: {res.id}</div>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${statusColors[res.status as keyof typeof statusColors]}`}>
                  {res.status.toUpperCase()}
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-gray-900 leading-tight">{res.propertyName}</h3>
                <p className="text-xs text-gray-500">{getPropertyTypeLabel(res.propertyType)} • {res.location || 'N/A'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50 text-sm">
                <div>
                  <span className="block text-[10px] text-gray-400 uppercase font-bold">Progress</span>
                  <span className="font-semibold text-blue-600">{formatCurrency(res.paidAmount)}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 uppercase font-bold">Total</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(res.totalAmount)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center pt-3">
                <div className="text-xs text-gray-500">
                  <Calendar className="size-3 inline mr-1 mb-0.5" />
                  {new Date(res.startDate).toLocaleDateString()}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedReservation(res.id)} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Eye className="size-5" /></button>
                  {res.status === 'pending' && (
                    <>
                      <button onClick={() => handleApprove(res.id, res.userId)} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle className="size-5" /></button>
                      <button onClick={() => handleReject(res.id, res.userId)} className="p-2.5 bg-rose-50 text-rose-600 rounded-xl"><XCircle className="size-5" /></button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* DESKTOP TABLE (Original 9 Columns) */}
        <div className="hidden lg:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Reservation ID</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">User ID</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Property</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Date Range</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Payment Progress</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Visit Type</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedReservations.map((res) => (
                  <tr key={res.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-4 text-xs font-mono text-gray-400">{res.id}</td>
                    <td className="px-4 py-4 text-xs font-mono text-gray-400">{res.userId}</td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-semibold text-gray-900">{res.propertyName}</div>
                      <div className="text-[10px] text-gray-400 uppercase">{getPropertyTypeLabel(res.propertyType)}</div>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-600">
                      <div>{new Date(res.startDate).toLocaleDateString()}</div>
                      <div className="text-[10px] text-gray-400">to {new Date(res.endDate).toLocaleDateString()}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-emerald-600">{formatCurrency(res.paidAmount)}</div>
                      <div className="text-[10px] text-gray-400">{((res.paidAmount / res.totalAmount) * 100).toFixed(0)}% paid</div>
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-gray-900">{formatCurrency(res.totalAmount)}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${res.modeOfVisit === 'onsite' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                        {res.modeOfVisit?.toUpperCase() || 'ONLINE'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${statusColors[res.status as keyof typeof statusColors]}`}>
                        {res.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setSelectedReservation(res.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="View"><Eye className="size-4" /></button>
                        {res.status === 'pending' && (
                          <>
                            <button onClick={() => handleApprove(res.id, res.userId)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded" title="Approve"><CheckCircle className="size-4" /></button>
                            <button onClick={() => handleReject(res.id, res.userId)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded" title="Reject"><XCircle className="size-4" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MOBILE FILTER DRAWER (Blur BG) */}
      {isFilterPanelOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center lg:hidden">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md" onClick={() => setIsFilterPanelOpen(false)} />
          <div className="relative w-full bg-white rounded-t-3xl shadow-2xl p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">Filter by Status</h3>
              <button onClick={() => setIsFilterPanelOpen(false)} className="p-2 bg-gray-100 rounded-full"><X className="size-5" /></button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => { setFilterStatus(status); setIsFilterPanelOpen(false); }}
                  className={`w-full py-4 px-6 rounded-2xl text-left font-semibold border-2 transition-all ${
                    filterStatus === status ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 bg-gray-50 text-gray-600'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW DETAILS */}
      {/* VIEW DETAILS PANEL (Responsive & Full Data) */}
      {reservation && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Reservation Dossier</h2>
                <p className="text-xs text-gray-500 font-mono mt-1">{reservation.id}</p>
              </div>
              <button onClick={() => setSelectedReservation(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X className="size-6 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Primary Grid: All Table Columns + Additional */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DetailItem icon={<Building />} label="Property" value={reservation.propertyName} subValue={getPropertyTypeLabel(reservation.propertyType)} />
                <DetailItem icon={<User />} label="Customer" value={user ? `${user.first_name} ${user.last_name}` : 'Unknown'} subValue={`ID: ${reservation.userId}`} />
                <DetailItem icon={<MapPin />} label="Location" value={reservation.location || 'Not Specified'} />
                
                <DetailItem icon={<Calendar />} label="Check-In" value={new Date(reservation.startDate).toLocaleDateString()} />
                <DetailItem icon={<Calendar />} label="Check-Out" value={new Date(reservation.endDate).toLocaleDateString()} />
                <DetailItem icon={<Clock />} label="Duration" value={`${reservation.duration} ${reservation.propertyType === 'rental_space' ? 'Months' : 'Days'}`} />

                <DetailItem icon={<CreditCard />} label="Paid To Date" value={formatCurrency(reservation.paidAmount)} highlight />
                <DetailItem icon={<Tag />} label="Total Contract" value={formatCurrency(reservation.totalAmount)} />
                <DetailItem icon={<Clock />} label="Request Date" value={new Date(reservation.requestDate).toLocaleDateString()} />
              </div>

              {/* Special Conditions Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <h4 className="text-[10px] font-bold text-blue-400 uppercase mb-2 flex items-center gap-1.5"><FileText className="size-3"/> Technical Details</h4>
                  <div className="space-y-2 text-sm">
                    <p className="flex justify-between"><span>Visit Mode:</span> <span className="font-bold capitalize">{reservation.modeOfVisit}</span></p>
                    <p className="flex justify-between"><span>On-site Plan:</span> <span className="font-bold">{reservation.paymentIntent === 'pay_onsite' ? 'Pay On Arrival' : 'Decide Later'}</span></p>
                    {reservation.paymentCycle && <p className="flex justify-between"><span>Cycle:</span> <span className="font-bold capitalize">{reservation.paymentCycle}</span></p>}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-1.5"><Tag className="size-3"/> Categorization</h4>
                  <div className="space-y-2 text-sm">
                    {reservation.businessType && <p className="flex justify-between"><span>Business:</span> <span className="font-bold">{reservation.businessType}</span></p>}
                    {reservation.eventPurpose && <p className="flex justify-between"><span>Event:</span> <span className="font-bold">{reservation.eventPurpose}</span></p>}
                    {reservation.vehicleType && <p className="flex justify-between"><span>Vehicle:</span> <span className="font-bold">{reservation.vehicleType}</span></p>}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {reservation.notes && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase">Customer Notes</h4>
                  <div className="p-4 bg-amber-50 text-amber-900 text-sm rounded-lg italic border border-amber-100">
                    "{reservation.notes}"
                  </div>
                </div>
              )}
            </div>

            {/* Action Footer */}
            <div className="p-6 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex items-center">
                <span className="text-sm text-gray-500 mr-2">Current Status:</span>
                <span className={`px-3 py-1 text-xs font-bold rounded-full border ${statusColors[reservation.status as keyof typeof statusColors]}`}>
                  {reservation.status.toUpperCase()}
                </span>
              </div>
              <div className="flex gap-2">
                {reservation.status === 'pending' && (
                  <>
                    <button onClick={() => handleReject(reservation.id, reservation.userId)} className="flex-1 sm:flex-none px-6 py-2 border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-50 font-semibold">Reject</button>
                    <button onClick={() => handleApprove(reservation.id, reservation.userId)} className="flex-1 sm:flex-none px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold shadow-md">Approve</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE: FAB (Floating Action Button) */}
      <button
        onClick={() => setIsActionModalOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 size-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 border-4 border-white"
      >
        <Plus className="size-8" />
      </button>

      {isActionModalOpen && (
        <AdminActionModal actionType="reservation" onClose={() => setIsActionModalOpen(false)} />
      )}
    </div>
  );
}

function DetailItem({ icon, label, value, subValue, highlight = false }: any) {
  return (
    <div className="flex items-start gap-3">
      <div className={`mt-1 p-2 rounded-lg ${highlight ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
        {React.cloneElement(icon, { className: "size-4" })}
      </div>
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{label}</p>
        <p className={`text-sm font-semibold ${highlight ? 'text-blue-600' : 'text-gray-900'}`}>{value}</p>
        {subValue && <p className="text-[10px] text-gray-500">{subValue}</p>}
      </div>
    </div>
  );
}