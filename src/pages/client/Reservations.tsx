import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
Calendar, Clock, MapPin, CreditCard, FileText,
X, Filter, ChevronRight, ChevronDown, Inbox, Notebook
} from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { getUnitTypeLabel } from '../../utils/propertyHelpers';

type FilterStatus = 'all' | 'pending' | 'confirmed' | 'cancelled';

export default function ClientReservations() {
const { user } = useAuth();
const { getReservationsByUserId, units, deleteReservation } = useData();
const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
const [expandedId, setExpandedId] = useState<string | null>(null);
const [showFilterMenu, setShowFilterMenu] = useState(false);

const handleDeleteReservation = (reservationId: string, unitName: string) => {
if (window.confirm("Are you sure you want to cancel your reservation for \"" + unitName + "\"?")) {
  deleteReservation(reservationId);
  }
};

const userReservations = getReservationsByUserId(user?.id || '');
const [isMobile, setIsMobile] = useState(false);

  // Check for mobile screen size to handle responsive collapse logic
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

const filteredReservations = filterStatus === 'all'
? userReservations
: userReservations.filter(b => b.status === filterStatus);

const sortedReservations = [...filteredReservations].sort(
(a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()
);

const toggleExpand = (id: string) => {
    if (!isMobile) return;
    setExpandedId(expandedId === id ? null : id);
  };

const statusColors = {
pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
approved: 'bg-green-100 text-green-800 border-green-200',
rejected: 'bg-red-100 text-red-800 border-red-200',
confirmed: 'bg-green-100 text-green-800 border-green-200',
cancelled: 'bg-red-100 text-red-800 border-red-200',
completed: 'bg-blue-100 text-blue-800 border-blue-200'
};

const statusIcons = {
pending: '⏳', approved: '✓', rejected: '✗',
confirmed: '✓', cancelled: '✗', completed: '✓'
};

const filterOptions: FilterStatus[] = ['all', 'pending', 'confirmed', 'cancelled'];

return (
<div className="bg-gray-50 min-h-screen">
  <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">

  {/* Header */}
  <div className="flex justify-between items-end">
    <header>

        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          My Reservations
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
          View and manage your reservations requests
        </p>
      </header>

    {/* Mobile Filter Trigger */}
    {userReservations.length > 0 && (
      <button
        onClick={() => setShowFilterMenu(true)}
        className="md:hidden p-3 bg-white border border-gray-200 rounded-2xl shadow-sm active:scale-95 transition"
      >
        <Filter className="size-5 text-gray-600" />
      </button>
    )}
  </div>

  {/* Desktop Filter Tabs (Glass Effect) */}
  {userReservations.length > 0 && (
  <div className="hidden md:flex gap-1 p-1 bg-gray-200/50 backdrop-blur-md rounded-2xl w-fit border border-white/50 shadow-inner">
    {filterOptions.map((status) => {
      const count = status === 'all' 
        ? userReservations.length 
        : userReservations.filter(b => b.status === status).length;

      return (
        <button
          key={status}
          onClick={() => setFilterStatus(status)}
          className={`px-6 py-2.5 text-sm font-medium capitalize rounded-xl transition-all flex items-center gap-2 ${
            filterStatus === status 
            ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' 
            : 'text-gray-500 hover:text-gray-700 hover:bg-white/40'
          }`}
        >
          {status}
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            filterStatus === status ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'
          }`}>
            ({count})
          </span>
        </button>
      );
    })}
  </div>
  )}

  {/* List Content */}
  <div className="space-y-4">
   {sortedReservations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="bg-blue-50 p-6 rounded-3xl shadow-sm mb-4">
              <Notebook className="size-12 text-blue-500" />
            </div>

            <h3 className="text-lg font-bold text-gray-900">
              No reservations found
            </h3>

            <p className="text-gray-500 max-w-xs text-sm mt-1">
              {filterStatus === 'all'
                ? "You haven't made any reservations yet."
                : `No ${filterStatus} reservations found.`}
            </p>
          </motion.div>
        )  : (
      <div className="grid gap-4">
            {sortedReservations.map((reservation) => {
              const unit = units.find(p => p.id === reservation.unitId);
              const balance = reservation.totalAmount - reservation.paidAmount;
              const paymentProgress = (reservation.paidAmount / reservation.totalAmount) * 100;
              const isCardExpanded = !isMobile || expandedId === reservation.id;

              return (
                <motion.div 
                  layout
                  key={reservation.id} 
                  className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  {/* Card Header & Quick View Info (Always Visible) */}
                  <div 
                    className={`p-5 sm:p-6 ${isMobile ? 'cursor-pointer' : ''}`}
                    onClick={() => toggleExpand(reservation.id)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] sm:text-xs text-blue-600 font-medium">
                            {getUnitTypeLabel(reservation.unitType)}
                          </span>
                          <span className={`px-2 py-0.5 text-[9px] sm:text-[10px] font-bold rounded-full border shadow-sm ${statusColors[reservation.status as keyof typeof statusColors]}`}>
                             {statusIcons[reservation.status as keyof typeof statusIcons]} {reservation.status.toUpperCase()}
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">{reservation.unitName}</h3>
                        <div className="flex items-center gap-1.5 text-gray-500 mt-1">
                          <MapPin className="size-4 text-blue-600" />
                          <span className="text-xs sm:text-sm truncate">{unit?.location || 'N/A'}</span>
                        </div>
                      </div>
                      
                      {isMobile && (
                        <motion.div 
                          animate={{ rotate: isCardExpanded ? 180 : 0 }}
                          className="p-1 bg-gray-50 rounded-lg ml-2"
                        >
                          <ChevronDown className="size-5 text-gray-400" />
                        </motion.div>
                      )}
                    </div>

                    {/* Quick Info Grid (Always Visible) */}
                    <div className="grid grid-cols-3 gap-2 bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                      <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Start</p>
                        <p className="text-[11px] sm:text-xs font-semibold text-gray-900">{new Date(reservation.startDate).toLocaleDateString()}</p>
                      </div>
                      <div className="border-x border-gray-200 px-2">
                        <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">End</p>
                        <p className="text-[11px] sm:text-xs font-semibold text-gray-900">{new Date(reservation.endDate).toLocaleDateString()}</p>
                      </div>
                      <div className="pl-1">
                        <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Duration</p>
                        <p className="text-[11px] sm:text-xs font-semibold text-gray-900">
                          {reservation.duration} {reservation.unitType === 'rental_space' ? 'mos' : 
                           reservation.unitType === 'function_hall' ? 'days' : 'hrs'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Collapsible Content */}
                  <AnimatePresence>
                    {isCardExpanded && (
                      <motion.div
                        initial={isMobile ? { height: 0, opacity: 0 } : false}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-5 pb-5 sm:px-6 sm:pb-6 space-y-4">
                          {/* Secondary Details */}
                          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-xs sm:text-sm">
                                <FileText className="size-3.5 text-gray-400" />
                                <span className="text-gray-500">Mode:</span>
                                <span className="text-gray-900 capitalize">{reservation.modeOfVisit.replace('_', ' ')}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs sm:text-sm">
                                <CreditCard className="size-3.5 text-gray-400" />
                                <span className="text-gray-500">Payment:</span>
                                <span className="text-gray-900 capitalize">{reservation.paymentMethod?.replace('_', ' ') || 'N/A'}</span>
                              </div>
                            </div>
                            <div className="space-y-3">
                              {reservation.paymentCycle && (
                                <div className="flex items-center gap-2 text-xs sm:text-sm">
                                  <Clock className="size-3.5 text-gray-400" />
                                  <span className="text-gray-500">Cycle:</span>
                                  <span className="text-gray-900 capitalize">{reservation.paymentCycle}</span>
                                </div>
                              )}
                              <p className="text-[10px] text-gray-400">ID: {reservation.id}</p>
                            </div>
                          </div>

                          {/* Specifics (Notes, Business, etc) */}
                          <div className="space-y-2">
                            {reservation.businessType && (
                              <div className="p-3 bg-white border border-gray-100 rounded-xl">
                                <p className="text-xs text-gray-600">Business Type: <span className="text-gray-900 font-medium">{reservation.businessType}</span></p>
                              </div>
                            )}
                            {reservation.eventPurpose && (
                              <div className="p-3 bg-white border border-gray-100 rounded-xl">
                                <p className="text-xs text-gray-600">Event Purpose: <span className="text-gray-900 font-medium">{reservation.eventPurpose}</span></p>
                                {reservation.attendees && (
                                  <p className="text-[11px] text-gray-500 mt-1">Attendees: <span className="text-gray-900">{reservation.attendees}</span></p>
                                )}
                              </div>
                            )}
                            {reservation.vehicleType && (
                              <div className="p-3 bg-white border border-gray-100 rounded-xl">
                                <p className="text-xs text-gray-600">Vehicle: <span className="text-gray-900 font-medium">{reservation.vehicleType} - {reservation.plateNumber}</span></p>
                              </div>
                            )}
                            {reservation.notes && (
                              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                                <p className="text-[11px] text-blue-700 font-bold uppercase mb-1">Notes</p>
                                <p className="text-xs text-gray-700">{reservation.notes}</p>
                              </div>
                            )}
                          </div>

                          {/* Financials */}
                          <div className="border-t border-gray-100 pt-4">
                            <div className="grid grid-cols-3 gap-2 mb-4">
                              <div className="text-center sm:text-left">
                                <p className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Total</p>
                                <p className="text-xs sm:text-sm font-bold text-gray-900">{formatCurrency(reservation.totalAmount)}</p>
                              </div>
                              <div className="text-center sm:text-left">
                                <p className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Paid</p>
                                <p className="text-xs sm:text-sm font-bold text-green-600">{formatCurrency(reservation.paidAmount)}</p>
                              </div>
                              <div className="text-center sm:text-left">
                                <p className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Balance</p>
                                <p className={`text-xs sm:text-sm font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {formatCurrency(balance)}
                                </p>
                              </div>
                            </div>

                            {reservation.status === 'confirmed' && (
                              <div className="mb-4">
                                <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                  <span>Payment Progress</span>
                                  <span>{paymentProgress.toFixed(0)}%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${paymentProgress}%` }}
                                    className={`h-full transition-all ${paymentProgress === 100 ? 'bg-green-600' : 'bg-blue-600'}`}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Status Alerts */}
                          {reservation.status === 'pending' && (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-xs text-yellow-800">
                              Pending admin approval. You will be notified once reviewed.
                            </div>
                          )}
                          {reservation.status === 'confirmed' && balance > 0 && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
                              Approved! Please go to Payments to complete your transaction.
                            </div>
                          )}

                          <div className="flex flex-col sm:flex-row justify-between items-center pt-2 gap-3">
                            <span className="text-[10px] text-gray-400">
                              Requested {new Date(reservation.requestDate).toLocaleDateString()}
                            </span>
                            {reservation.status === 'pending' && (
                              <button
                                onClick={() => handleDeleteReservation(reservation.id, reservation.unitName)}
                                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-red-600 text-white text-sm sm:text-base font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-sm"
                              >
                                Cancel Reservation
                              </button>
                            )}
                            
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
    )}
  </div>

  {/* MOBILE FILTER BOTTOM SHEET */}
  <AnimatePresence>
    {showFilterMenu && userReservations.length > 0 && (
      <>
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => setShowFilterMenu(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80] md:hidden"
        />
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed inset-x-0 bottom-0 max-h-[70vh] bg-white rounded-t-[40px] z-[90] shadow-2xl md:hidden flex flex-col"
        >
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Filter Status</h2>
            <button onClick={() => setShowFilterMenu(false)} className="p-2 bg-gray-100 rounded-full">
               <X className="size-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6 space-y-3">
            {filterOptions.map(t => (
              <button
                key={t}
                onClick={() => { setFilterStatus(t); setShowFilterMenu(false); }}
                className={`w-full p-4 rounded-2xl text-left font-bold capitalize transition-all flex justify-between items-center ${
                  filterStatus === t
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-50 text-gray-600'
                }`}
              >
                {t}
                {filterStatus === t && <ChevronRight className="size-5" />}
              </button>
            ))}
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
</div>
</div>
);
}