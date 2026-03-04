import { useData } from '../../contexts/DataContext';
import type { PaymentStatus } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { CreditCard, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

export default function Payments() {
  const { payments, bookings } = useData();
  const { user } = useAuth();

  // ✅ FIX 1: Sort by `date` instead of `dueDate`
  const userPayments = payments
    .filter(p => p.userId === user?.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // ✅ FIX 2: Updated to match PaymentStatus ('paid' | 'partial' | 'unpaid')
  const totalPaid = userPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalPartial = userPayments.filter(p => p.status === 'partial').reduce((sum, p) => sum + p.amount, 0);
  const totalUnpaid = userPayments.filter(p => p.status === 'unpaid').reduce((sum, p) => sum + p.amount, 0);

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'partial':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'unpaid':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'unpaid':
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getBookingInfo = (bookingId: string) => {
    return bookings.find(b => b.id === bookingId);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Payment Records</h1>
        <p className="text-gray-600">Track your payment history and status</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-gray-600 font-medium">Total Paid</span>
          </div>
          {/* ✅ FIX 3: Used formatCurrency */}
          <p className="text-gray-900 text-2xl font-bold">{formatCurrency(totalPaid)}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="text-gray-600 font-medium">Partial Payments</span>
          </div>
          <p className="text-gray-900 text-2xl font-bold">{formatCurrency(totalPartial)}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-gray-600 font-medium">Unpaid / Billed</span>
          </div>
          <p className="text-gray-900 text-2xl font-bold">{formatCurrency(totalUnpaid)}</p>
        </div>
      </div>

      {/* Payment Records */}
      {userPayments.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
          <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-gray-900 mb-2 font-medium">No payment records</h3>
          <p className="text-gray-500">Your payment history will appear here once you make a transaction.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {userPayments.map((payment) => {
                  const booking = getBookingInfo(payment.bookingId);
                  return (
                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          {/* ✅ FIX 4: Changed spaceName to propertyName */}
                          <p className="text-gray-900 font-medium">{booking?.propertyName || 'Unknown Property'}</p>
                          <p className="text-xs text-gray-500 mt-1">Ref: {payment.bookingId}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-900 font-medium">{formatCurrency(payment.amount)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-600 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {/* ✅ FIX 5: Replaced date-fns with native JS formatting */}
                          <span>{new Date(payment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                            {getStatusIcon(payment.status)}
                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-600 text-sm capitalize">
                          {payment.method.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-500 text-sm line-clamp-1 max-w-xs" title={payment.notes}>
                          {payment.notes || '-'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}