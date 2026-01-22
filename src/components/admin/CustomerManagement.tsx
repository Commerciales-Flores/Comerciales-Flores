import { useData } from '../../context/DataContext';
import { Users, Mail, Phone, Calendar, DollarSign } from 'lucide-react';

export default function CustomerManagement() {
  const { bookings, payments } = useData();

  // Extract unique customers from bookings
  const customers = Array.from(
    new Map(
      bookings.map(booking => [
        booking.userId,
        {
          id: booking.userId,
          name: booking.userName,
          email: booking.userEmail,
        }
      ])
    ).values()
  );

  const getCustomerStats = (userId: string) => {
    const customerBookings = bookings.filter(b => b.userId === userId);
    const customerPayments = payments.filter(p => p.userId === userId);
    
    return {
      totalBookings: customerBookings.length,
      activeBookings: customerBookings.filter(b => b.status === 'approved').length,
      totalSpent: customerPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
      pendingPayments: customerPayments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
    };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Customer Management</h1>
        <p className="text-gray-600">View and manage customer database</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-blue-600" />
          <div>
            <p className="text-gray-600">Total Customers</p>
            <p className="text-gray-900">{customers.length}</p>
          </div>
        </div>
      </div>

      {/* Customers List */}
      <div className="space-y-4">
        {customers.map((customer) => {
          const stats = getCustomerStats(customer.id);
          const customerBookings = bookings.filter(b => b.userId === customer.id);
          
          return (
            <div key={customer.id} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-gray-900 mb-2">{customer.name}</h3>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span>{customer.email}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg mb-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span>Total Bookings</span>
                  </div>
                  <p className="text-gray-900">{stats.totalBookings}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span>Active Bookings</span>
                  </div>
                  <p className="text-green-600">{stats.activeBookings}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span>Total Spent</span>
                  </div>
                  <p className="text-gray-900">${stats.totalSpent.toFixed(2)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span>Pending</span>
                  </div>
                  <p className="text-yellow-600">${stats.pendingPayments.toFixed(2)}</p>
                </div>
              </div>

              {/* Recent Bookings */}
              <div>
                <h4 className="text-gray-900 mb-3">Recent Bookings</h4>
                <div className="space-y-2">
                  {customerBookings.slice(0, 3).map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-gray-900">{booking.spaceName}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        booking.status === 'approved' ? 'bg-green-100 text-green-800' :
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        booking.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {customers.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No customers yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
