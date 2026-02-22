import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { CreditCard, Calendar, CheckCircle, Clock, AlertCircle, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export default function Payments() {
  const { payments, bookings } = useData();
  const { user } = useAuth();

  const userPayments = payments
    .filter(p => p.userId === user?.id)
    .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

  const totalPaid = userPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalPending = userPayments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  const totalOverdue = userPayments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0);

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
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-gray-600">Total Paid</span>
          </div>
          <p className="text-gray-900">${totalPaid.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="text-gray-600">Pending</span>
          </div>
          <p className="text-gray-900">${totalPending.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-gray-600">Overdue</span>
          </div>
          <p className="text-gray-900">${totalOverdue.toFixed(2)}</p>
        </div>
      </div>

      {/* Payment Records */}
      {userPayments.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-gray-900 mb-2">No payment records</h3>
          <p className="text-gray-600">Your payment history will appear here</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-gray-700">Booking</th>
                  <th className="px-6 py-3 text-left text-gray-700">Amount</th>
                  <th className="px-6 py-3 text-left text-gray-700">Due Date</th>
                  <th className="px-6 py-3 text-left text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left text-gray-700">Paid Date</th>
                  <th className="px-6 py-3 text-left text-gray-700">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {userPayments.map((payment) => {
                  const booking = getBookingInfo(payment.bookingId);
                  return (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-gray-900">{booking?.spaceName || 'Unknown'}</p>
                          <p className="text-sm text-gray-600">ID: {payment.bookingId}</p>
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
                        <div className="flex items-center gap-2">
                          {getStatusIcon(payment.status)}
                          <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(payment.status)}`}>
                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {payment.paidDate ? format(new Date(payment.paidDate), 'MMM d, yyyy') : '-'}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {payment.method || '-'}
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
