import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Calendar, CreditCard, AlertCircle, MessageSquare, Bell } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function ClientDashboard() {
  const { user } = useAuth();
  
  const { getReservationsByUserId, getPaymentsByUserId, properties, inquiries, notifications } = useData();



  const userReservations = getReservationsByUserId(user?.id || '');
  const userPayments = getPaymentsByUserId(user?.id || '');

  // --- Stats ---
  const totalReservations = userReservations.length;
  const upcomingReservations = userReservations.filter(b => new Date(b.startDate) > new Date() && b.status === 'confirmed');
  const pendingReservations = userReservations.filter(b => b.status === 'pending');
  const paymentReminders = userReservations.filter(b => b.status === 'confirmed' && b.paidAmount < b.totalAmount);

  const recentReservations = [...userReservations]
    .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())
    .slice(0, 2);

  // --- Recent Messages from Admin ---
  const recentMessages = inquiries
    ?.filter(i => i.userId === user?.id && i.response)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 1);

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name}!</h1>
        <p className="text-sm text-gray-500">Overview of your reservations, payments, and messages</p>
      </header>

      {/* --- KPI Cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Reservations */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500">Total Reservations</p>
            <Calendar className="size-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalReservations}</p>
        </div>

        {/* Upcoming */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500">Upcoming</p>
            <Calendar className="size-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{upcomingReservations.length}</p>
        </div>

        {/* Pending */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500">Pending Approval</p>
            <AlertCircle className="size-5 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{pendingReservations.length}</p>
        </div>

        {/* Payment Reminders */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500">Payment Reminders</p>
            <CreditCard className="size-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{paymentReminders.length}</p>
        </div>
      </div>

      {/* --- MAIN CONTENT GRID --- */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
        
        {/* LEFT COLUMN: Payment Reminders & Activity (Takes 3/4 width) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 1. Payment Reminders (Expanded) */}
          <section className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
               <h2 className="text-sm font-bold text-yellow-900 uppercase tracking-wide">Payment Reminders</h2>
               <Link to="/client/payments" className="text-xs text-blue-600 font-semibold hover:underline">Manage All Payments</Link>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {paymentReminders.length > 0 ? paymentReminders
                .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()) // newest first
                .slice(0, 1)  // latest only, change to 2 if you want two
                .map(reservation => {
                  const balance = reservation.totalAmount - reservation.paidAmount;
                  return (
                    <div key={reservation.id} className="bg-white p-4 rounded-lg border border-yellow-300 flex justify-between items-center shadow-sm">
                      <div>
                        <p className="font-bold text-gray-900">{reservation.propertyName}</p>
                        <p className="text-[10px] text-gray-500">ID: {reservation.id}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-600">{formatCurrency(balance)}</p>
                        <Link to="/client/payments" className="inline-block mt-1 px-3 py-1 bg-blue-600 text-white text-[10px] rounded hover:bg-blue-700 transition-colors">
                          Pay Now
                        </Link>
                      </div>
                    </div>
                  );
                })
              : (
                <div className="col-span-2 text-center py-6 bg-white/50 rounded-lg border border-dashed border-yellow-300 text-xs text-gray-500">
                  You are all caught up! No pending payments found.
                </div>
              )}
            </div>
          </section>

          {/* 2. Recent Activity (Expanded) */}
          <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">Recent Reservation Activity</h2>
            {recentReservations.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-gray-400">No reservations yet.</p>
                <Link to="/client/properties" className="mt-4 inline-block text-blue-600 text-sm font-medium">Browse Properties →</Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentReservations.map(reservation => (
                  <div key={reservation.id} className="flex justify-between items-center py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-4">
                      <div className="size-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Calendar className="size-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{reservation.propertyName}</p>
                        <p className="text-xs text-gray-500 italic">Requested {new Date(reservation.requestDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <span className={`px-4 py-1 text-[10px] font-bold rounded-full uppercase tracking-tighter
                        ${reservation.status === 'confirmed' ? 'bg-green-100 text-green-700' : 
                          reservation.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                        {reservation.status}
                      </span>
                      <Link to="/client/reservations" className="text-[10px] text-blue-600 hover:underline font-medium">View Details</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN: Messages & Notifications (Takes 1/4 width) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* 3. Recent Messages (Narrow) */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-indigo-600 text-white flex items-center gap-2">
              <MessageSquare className="size-4" />
              <h2 className="text-xs font-bold uppercase tracking-wider">Latest admin replies</h2>
            </div>
            <div className="p-4 space-y-4">
              {recentMessages && recentMessages.length > 0 ? (
                recentMessages.map(msg => (
                  <div key={msg.id} className="pb-3 border-b border-gray-50 last:border-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{new Date(msg.date).toLocaleDateString()}</p>
                    </div>
                    <p className="text-xs font-bold text-gray-900 truncate">{msg.subject}</p>
                    <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg p-3">
                      <p className="text-[10px] font-semibold text-blue-700 mb-1">
                        Admin Reply
                      </p>
                      <p className="text-[11px] text-gray-700 leading-relaxed line-clamp-2">
                        {msg.response}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-gray-400 text-center py-4 italic">No new messages</p>
              )}
              <Link to="/client/messages" className="block text-center text-[10px] font-bold text-indigo-600 hover:text-indigo-800 pt-2">
                GO TO INBOX
              </Link>
            </div>
          </section>

          {/* 4. Notifications (Narrow) */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2 font-bold text-gray-700">
              <Bell className="size-4 text-purple-500" />
              <h2 className="text-xs uppercase tracking-wider">Alerts</h2>
            </div>
            <div className="p-4 space-y-3">
              {notifications && notifications.length > 0 ? (
                notifications.slice(0, 1).map(n => (
                  <div key={n.id} className="p-3 bg-purple-50/50 rounded-lg border border-purple-100">
                    <p className="text-[11px] text-purple-900 leading-tight mb-1">{n.message}</p>
                    <span className="text-[9px] text-purple-400 font-medium italic">{new Date(n.date).toLocaleDateString()}</span>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-gray-400 text-center py-4">All clear!</p>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}   