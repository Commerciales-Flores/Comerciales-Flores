import { useData } from '../../context/DataContext';
import { TrendingUp, Calendar, DollarSign, Building } from 'lucide-react';

export default function Insights() {
  const { spaces, bookings } = useData();

  // Calculate insights
  const mostBookedSpaces = spaces
    .map(space => ({
      ...space,
      bookingCount: bookings.filter(b => b.spaceId === space.id).length,
    }))
    .sort((a, b) => b.bookingCount - a.bookingCount)
    .slice(0, 5);

  const totalBookings = bookings.length;
  const availableSpaces = spaces.filter(s => s.availability === 'available').length;
  const occupiedSpaces = spaces.filter(s => s.availability === 'occupied').length;

  const spaceTypeDistribution = {
    unit: spaces.filter(s => s.type === 'unit').length,
    'function-hall': spaces.filter(s => s.type === 'function-hall').length,
    parking: spaces.filter(s => s.type === 'parking').length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Business Insights</h1>
        <p className="text-gray-600">General statistics and trends</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-gray-600">Total Spaces</span>
          </div>
          <p className="text-gray-900">{spaces.length}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-gray-600">Available</span>
          </div>
          <p className="text-gray-900">{availableSpaces}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-gray-600">Occupied</span>
          </div>
          <p className="text-gray-900">{occupiedSpaces}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-gray-600">Total Bookings</span>
          </div>
          <p className="text-gray-900">{totalBookings}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Most Booked Spaces */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h2 className="text-gray-900">Most Booked Spaces</h2>
          </div>

          <div className="space-y-4">
            {mostBookedSpaces.map((space, index) => (
              <div key={space.id} className="flex items-center gap-4">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600">{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 truncate">{space.name}</p>
                  <p className="text-sm text-gray-600 capitalize">{space.type.replace('-', ' ')}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-900">{space.bookingCount}</p>
                  <p className="text-sm text-gray-600">bookings</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Space Type Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <Building className="w-5 h-5 text-blue-600" />
            <h2 className="text-gray-900">Space Distribution</h2>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700">Office Units</span>
                <span className="text-gray-900">{spaceTypeDistribution.unit}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${(spaceTypeDistribution.unit / spaces.length) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700">Function Halls</span>
                <span className="text-gray-900">{spaceTypeDistribution['function-hall']}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${(spaceTypeDistribution['function-hall'] / spaces.length) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700">Parking</span>
                <span className="text-gray-900">{spaceTypeDistribution.parking}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: `${(spaceTypeDistribution.parking / spaces.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
