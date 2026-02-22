import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { DollarSign, Calendar, CheckCircle, Clock, AlertCircle, Edit2 } from 'lucide-react';
import { format } from 'date-fns';

export default function PaymentManagement() {
  const { payments, bookings, updatePayment } = useData();
  const [editingPayment, setEditingPayment] = useState<string | null>(null);

  const sortedPayments = payments.sort((a, b) => {
    // Pending first
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    // Then overdue
    if (a.status === 'overdue' && b.status !== 'overdue') return -1;
    if (a.status !== 'overdue' && b.status === 'overdue') return 1;
    // Then by due date
    return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
  });

  const totalRevenue = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  const overdueAmount = payments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0);

  const getBookingInfo = (bookingId: string) => {
    return bookings.find(b => b.id === bookingId);
  };

  const handleMarkAsPaid = (paymentId: string) => {
    updatePayment(paymentId, {
      status: 'paid',
      paidDate: new Date().toISOString(),
      method: 'Bank Transfer', // Default method
    });
    setEditingPayment(null);
  };

  const handleUpdateStatus = (paymentId: string, status: 'pending' | 'paid' | 'overdue') => {
    if (status === 'paid') {
      updatePayment(paymentId, {
        status,
        paidDate: new Date().toISOString(),
        method: 'Bank Transfer',
      });
    } else {
      updatePayment(paymentId, { status });
    }
    setEditingPayment(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'overdue':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Payment Management</h1>
        <p className="text-gray-600">Manage payment records and statuses</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-gray-600">Total Revenue</span>
          </div>
          <p className="text-gray-900">${totalRevenue.toFixed(2)}</p>
          <p className="text-sm text-gray-600 mt-1">{payments.filter(p => p.status === 'paid').length} payments</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="text-gray-600">Pending</span>
          </div>
          <p className="text-gray-900">${pendingAmount.toFixed(2)}</p>
          <p className="text-sm text-gray-600 mt-1">{payments.filter(p => p.status === 'pending').length} payments</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-gray-600">Overdue</span>
          </div>
          <p className="text-gray-900">${overdueAmount.toFixed(2)}</p>
          <p className="text-sm text-gray-600 mt-1">{payments.filter(p => p.status === 'overdue').length} payments</p>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-gray-700">Booking</th>
                <th className="px-6 py-3 text-left text-gray-700">Customer</th>
                <th className="px-6 py-3 text-left text-gray-700">Amount</th>
                <th className="px-6 py-3 text-left text-gray-700">Due Date</th>
                <th className="px-6 py-3 text-left text-gray-700">Status</th>
                <th className="px-6 py-3 text-left text-gray-700">Paid Date</th>
                <th className="px-6 py-3 text-right text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedPayments.map((payment) => {
                const booking = getBookingInfo(payment.bookingId);
                const isEditing = editingPayment === payment.id;
                
                return (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-gray-900">{booking?.spaceName || 'Unknown'}</p>
                        <p className="text-sm text-gray-600">ID: {payment.bookingId}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-gray-900">{booking?.userName || 'Unknown'}</p>
                        <p className="text-sm text-gray-600">{booking?.userEmail}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">{payment.amount.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(payment.dueDate), 'MMM d, yyyy')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <select
                          value={payment.status}
                          onChange={(e) => handleUpdateStatus(payment.id, e.target.value as any)}
                          className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="overdue">Overdue</option>
                        </select>
                      ) : (
                        <div className="flex items-center gap-2">
                          {getStatusIcon(payment.status)}
                          <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(payment.status)}`}>
                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {payment.paidDate ? format(new Date(payment.paidDate), 'MMM d, yyyy') : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {payment.status !== 'paid' && (
                        <div className="flex items-center justify-end gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleMarkAsPaid(payment.id)}
                                className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                              >
                                Mark Paid
                              </button>
                              <button
                                onClick={() => setEditingPayment(null)}
                                className="px-3 py-1 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setEditingPayment(payment.id)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {payments.length === 0 && (
          <div className="p-12 text-center">
            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No payment records yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
