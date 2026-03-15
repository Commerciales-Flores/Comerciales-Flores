import React, { useState, cloneElement } from 'react';
import { useData } from '../../contexts/DataContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { Search, Eye, CheckCircle, XCircle, X, Plus, Calendar, CreditCard, User, Building, MapPin, Clock, Tag, FileText, SlidersHorizontal } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { getUnitTypeLabel } from '../../utils/propertyHelpers';
import AdminActionModal from './AdminActionModal';
import { motion } from 'framer-motion';
import EmptyState from '../../components/common/EmptyState';

export default function AdminReservations() {
  const { reservations, updateReservation, getUserById } = useData();
  const { sendReservationNotification } = useNotifications();
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReservation, setSelectedReservation] = useState<string | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const filteredReservations = reservations.filter((b) => {
  const user = getUserById(b.userId);
  const matchesStatus = filterStatus === 'all' || b.status === filterStatus;

  const matchesSearch =
    (b.publicId ?? b.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user?.publicId ?? user?.id ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.unitName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.toLowerCase().includes(searchTerm.toLowerCase());

  return matchesStatus && matchesSearch;
});

  const sortedReservations = [...filteredReservations].sort(
    (a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()
  );

  const hasNoReservations = reservations.length === 0;
  const hasNoSearchResults = reservations.length > 0 && sortedReservations.length === 0;

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

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    confirmed: 'bg-green-100 text-green-700 border-green-200',
    completed: 'bg-blue-100 text-blue-700 border-blue-200',
    cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <div className="bg-gray-50 min-h-screen p-4 md:p-6 lg:p-8 flex flex-col gap-6 pb-24 lg:pb-8">
      
      {/* HEADER: Desktop Only */}
      <div className="hidden lg:flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservation Management</h1>
          <p className="text-sm text-gray-500">Manage and audit all Unit bookings</p>
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
{!hasNoReservations && (
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

    {/* Desktop: Search Bar + Horizontal Chips */}
    <div className="hidden lg:block bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by ID, Unit, or Customer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {(['all', 'pending', 'confirmed', 'cancelled'] as const).map((status) => (
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
              ({status === 'all'
                ? reservations.length
                : reservations.filter((b) => b.status === status).length})
            </span>
          </button>
        ))}
      </div>
    </div>
  </div>
)}

      {/* MAIN CONTENT: Cards (Mobile) / Table (Desktop) */}
<div className="flex-1">
    {hasNoReservations ? (
    <EmptyState
      icon={<Calendar className="size-10 text-blue-500" />}
      title="No reservations yet"
      description="Reservations will appear here once customers submit bookings or an administrator creates one."
    />
  ) : hasNoSearchResults ? (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="bg-gray-50 p-6 rounded-3xl shadow-sm mb-4">
        <Search className="size-12 text-blue-500" />
      </div>

      <h3 className="text-lg font-bold text-gray-900">
        No matching reservations found
      </h3>

      <p className="text-gray-500 max-w-xs text-sm mt-1">
        Try adjusting your search term or status filter.
      </p>
    </motion.div>
  ) : (
    <>
      {/* MOBILE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4">
        {sortedReservations.map((res) => (
          <div key={res.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div className="font-mono text-[10px] text-gray-400 uppercase tracking-tighter">
                ID: {res.publicId ?? res.id}
              </div>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${statusColors[res.status as keyof typeof statusColors]}`}>
                {res.status.toUpperCase()}
              </span>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-gray-900 leading-tight">{res.unitName}</h3>
              <p className="text-xs text-gray-500">{getUnitTypeLabel(res.unitType)} • {res.location || 'N/A'}</p>
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

      {/* DESKTOP TABLE */}
      <div className="hidden lg:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
              {['Reservation ID', 'User ID', 'Unit', 'Date Range', 'Payment Progress', 'Amount', 'Visit Type', 'Status'
                ,'Actions'
              ].map((h) => (
                <th key={h} className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  {h}
                </th>
              ))}
            </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedReservations.map((res) => (
                <tr key={res.id} className="hover:bg-blue-50/30 transition-colors">
                <td className="px-6 py-4 text-xs font-mono text-gray-400 w-[140px]">
                  {res.publicId ?? res.id}
                </td>

                <td className="px-6 py-4 text-xs font-mono text-gray-400 w-[140px]">
                  {getUserById(res.userId)?.publicId ?? res.userId}
                </td>

                <td className="px-6 py-4 w-[220px]">
                  <div className="text-sm font-semibold text-gray-900">{res.unitName}</div>
                  <div className="text-[10px] text-gray-400 uppercase">{getUnitTypeLabel(res.unitType)}</div>
                </td>

                <td className="px-6 py-4 text-sm text-gray-500 w-[180px]">
                  <div>{new Date(res.startDate).toLocaleDateString()}</div>
                  <div className="text-[10px] text-gray-400">to {new Date(res.endDate).toLocaleDateString()}</div>
                </td>

                <td className="px-6 py-4 w-[150px]">
                  <div className="text-sm font-medium text-emerald-600">{formatCurrency(res.paidAmount)}</div>
                  <div className="text-[10px] text-gray-400">
                    {res.totalAmount > 0 ? `${((res.paidAmount / res.totalAmount) * 100).toFixed(0)}% paid` : '0% paid'}
                  </div>
                </td>

                <td className="px-6 py-4 text-sm font-semibold text-gray-900 w-[140px]">
                  {formatCurrency(res.totalAmount)}
                </td>

                <td className="px-6 py-4 w-[120px]">
                  <span
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${
                      res.modeOfVisit === 'onsite'
                        ? 'bg-blue-50 text-blue-700 border-blue-100'
                        : 'bg-gray-50 text-gray-600 border-gray-100'
                    }`}
                  >
                    {res.modeOfVisit?.toUpperCase() || 'ONLINE'}
                  </span>
                </td>

                <td className="px-6 py-4 w-[120px]">
                  <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${statusColors[res.status as keyof typeof statusColors]}`}>
                    {res.status.toUpperCase()}
                  </span>
                </td>

                <td className="px-6 py-4 text-right w-[120px]">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => setSelectedReservation(res.id)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                      title="View"
                    >
                      <Eye className="size-4" />
                    </button>

                    {res.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(res.id, res.userId)}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                          title="Approve"
                        >
                          <CheckCircle className="size-4" />
                        </button>

                        <button
                          onClick={() => handleReject(res.id, res.userId)}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                          title="Reject"
                        >
                          <XCircle className="size-4" />
                        </button>
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
    </>
  )}
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
              {((['all', 'pending', 'confirmed', 'cancelled'] as const)).map((status) => (
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
  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all duration-300">
    <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-[2rem] shadow-2xl border border-slate-200/60 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      
      {/* Header */}
      <div className="bg-slate-900 p-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Reservation Dossier
          </h2>
          <p className="text-slate-400 text-xs font-medium mt-1 font-mono">
            {reservation.id}
          </p>
        </div>

        <button
          onClick={() => setSelectedReservation(null)}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 transition-all"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
        {/* Main Info Grid */}
        <div>
          <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3 ml-1">
            Reservation Overview
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <DetailItem
              icon={<Building className="size-4" />}
              label="Unit"
              value={reservation.unitName}
              subValue={getUnitTypeLabel(reservation.unitType)}
            />

            <DetailItem
              icon={<User className="size-4" />}
              label="Customer"
              value={user ? `${user.first_name} ${user.last_name}` : 'Unknown'}
              subValue={`ID: ${reservation.userId}`}
            />

            <DetailItem
              icon={<MapPin className="size-4" />}
              label="Location"
              value={reservation.location || 'Not Specified'}
            />

            <DetailItem
              icon={<Calendar className="size-4" />}
              label="Check-In"
              value={new Date(reservation.startDate).toLocaleDateString()}
            />

            <DetailItem
              icon={<Calendar className="size-4" />}
              label="Check-Out"
              value={new Date(reservation.endDate).toLocaleDateString()}
            />

            <DetailItem
              icon={<Clock className="size-4" />}
              label="Duration"
              value={`${reservation.duration} ${
                reservation.unitType === 'rental_space' ? 'Months' : 'Days'
              }`}
            />

            <DetailItem
              icon={<CreditCard className="size-4" />}
              label="Paid To Date"
              value={formatCurrency(reservation.paidAmount)}
              highlight
            />

            <DetailItem
              icon={<Tag className="size-4" />}
              label="Total Contract"
              value={formatCurrency(reservation.totalAmount)}
            />

            <DetailItem
              icon={<Clock className="size-4" />}
              label="Request Date"
              value={new Date(reservation.requestDate).toLocaleDateString()}
            />
          </div>
        </div>

        {/* Secondary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
            <h4 className="text-[11px] font-semibold text-blue-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <FileText className="size-4" />
              Technical Details
            </h4>

            <div className="space-y-3">
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-slate-500">Visit Mode</span>
                <span className="font-semibold text-slate-900 capitalize">
                  {reservation.modeOfVisit}
                </span>
              </div>

              <div className="flex justify-between gap-4 text-sm">
                <span className="text-slate-500">On-site Plan</span>
                <span className="font-semibold text-slate-900">
                  {reservation.paymentIntent === 'pay_onsite'
                    ? 'Pay On Arrival'
                    : 'Decide Later'}
                </span>
              </div>

              {reservation.paymentCycle && (
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-slate-500">Cycle</span>
                  <span className="font-semibold text-slate-900 capitalize">
                    {reservation.paymentCycle}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Tag className="size-4" />
              Categorization
            </h4>

            <div className="space-y-3">
              {reservation.businessType && (
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-slate-500">Business</span>
                  <span className="font-semibold text-slate-900">
                    {reservation.businessType}
                  </span>
                </div>
              )}

              {reservation.eventPurpose && (
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-slate-500">Event</span>
                  <span className="font-semibold text-slate-900">
                    {reservation.eventPurpose}
                  </span>
                </div>
              )}

              {reservation.vehicleType && (
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-slate-500">Vehicle</span>
                  <span className="font-semibold text-slate-900">
                    {reservation.vehicleType}
                  </span>
                </div>
              )}

              {!reservation.businessType &&
                !reservation.eventPurpose &&
                !reservation.vehicleType && (
                  <p className="text-sm text-slate-400 italic">
                    No categorization details provided.
                  </p>
                )}
            </div>
          </div>
        </div>

        {/* Notes */}
        {reservation.notes && (
          <div>
            <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3 ml-1">
              Customer Notes
            </h3>

            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 text-sm text-amber-900 italic leading-relaxed">
              “{reservation.notes}”
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 bg-white/95 backdrop-blur px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">Current Status</span>
          <span
            className={`px-3 py-1 text-[11px] font-bold rounded-full border uppercase tracking-wide ${
              statusColors[reservation.status as keyof typeof statusColors]
            }`}
          >
            {reservation.status}
          </span>
        </div>

        <div className="flex gap-2">
          {reservation.status === 'pending' && (
            <>
              <button
                onClick={() => handleReject(reservation.id, reservation.userId)}
                className="px-5 py-2.5 border border-rose-200 text-rose-600 rounded-xl hover:bg-rose-50 font-semibold transition-all"
              >
                Reject
              </button>

              <button
                onClick={() => handleApprove(reservation.id, reservation.userId)}
                className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-semibold shadow-lg shadow-emerald-600/20 transition-all"
              >
                Approve
              </button>
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

function DetailItem({
  icon,
  label,
  value,
  subValue,
  highlight = false,
}: any) {
  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-2xl border transition-all
      ${highlight
        ? "bg-blue-50 border-blue-100"
        : "bg-slate-50 border-slate-200"}
      `}
    >
      {/* Icon */}
      <div
        className={`mt-0.5 p-2 rounded-xl flex items-center justify-center
        ${highlight
          ? "bg-blue-100 text-blue-600"
          : "bg-white border border-slate-200 text-slate-500"}
        `}
      >
        {React.cloneElement(icon, { className: "size-4" })}
      </div>

      {/* Content */}
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
          {label}
        </p>

        <p
          className={`text-sm font-semibold mt-0.5 break-words
          ${highlight ? "text-blue-600" : "text-slate-900"}
          `}
        >
          {value}
        </p>

        {subValue && (
          <p className="text-[11px] text-slate-500 mt-0.5">{subValue}</p>
        )}
      </div>
    </div>
  );
}