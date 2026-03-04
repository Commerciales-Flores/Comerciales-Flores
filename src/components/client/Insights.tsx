import { useState, useEffect } from 'react';
import supabase from '../../supabaseClient';
import { useData } from '../../contexts/DataContext';
import { TrendingUp, Calendar, Building, Loader2 } from 'lucide-react';

export default function Insights() {
  // ✅ FIX 1: Grab 'units' instead of 'spaces'
  const { units } = useData();
  
  // ✅ NEW: Fetch live bookings from Supabase
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAllBookings = async () => {
      try {
        // We only need the unit_id to count how many times a property was booked
        const { data, error } = await supabase
          .from('reservations')
          .select('unit_id');
        
        if (error) throw error;
        setAllBookings(data || []);
      } catch (error) {
        console.error('Error fetching reservations for insights:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllBookings();
  }, []);

  // ✅ FIX 2: Mapped calculations to use `unit.id` and the Supabase data
  const mostBookedUnits = units
    .map(unit => ({
      ...unit,
      bookingCount: allBookings.filter(b => b.unit_id === unit.id).length,
    }))
    .sort((a, b) => b.bookingCount - a.bookingCount)
    .slice(0, 5);

  const totalBookings = allBookings.length;
  
  // ✅ FIX 3: Updated to use the boolean `available` property
  const availableUnits = units.filter(u => u.available === true).length;
  const occupiedUnits = units.filter(u => u.available === false).length;

  // ✅ FIX 4: Updated to use the correct strict unit_type strings
  const unitTypeDistribution = {
    rental_space: units.filter(u => u.type === 'rental_space').length,
    function_hall: units.filter(u => u.type === 'function_hall').length,
    parking_slot: units.filter(u => u.type === 'parking_slot').length,
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="size-8 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-500 text-lg">Loading business insights...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Business Insights</h1>
        <p className="text-gray-600">General statistics and trends across all properties</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Total Units</span>
          </div>
          <p className="text-gray-900 text-2xl font-bold">{units.length}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Available</span>
          </div>
          <p className="text-gray-900 text-2xl font-bold">{availableUnits}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Occupied</span>
          </div>
          <p className="text-gray-900 text-2xl font-bold">{occupiedUnits}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Total Bookings</span>
          </div>
          <p className="text-gray-900 text-2xl font-bold">{totalBookings}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Most Booked Spaces */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Most Booked Properties</h2>
          </div>

          <div className="space-y-4">
            {mostBookedUnits.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No bookings data available yet.</p>
            ) : (
                mostBookedUnits.map((unit, index) => (
                <div key={unit.id} className="flex items-center gap-4 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="w-8 h-8 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-medium truncate">{unit.name}</p>
                    <p className="text-sm text-gray-500 capitalize">{unit.type.replace('_', ' ')}</p>
                    </div>
                    <div className="text-right">
                    <p className="text-gray-900 font-semibold">{unit.bookingCount}</p>
                    <p className="text-xs text-gray-500">bookings</p>
                    </div>
                </div>
                ))
            )}
          </div>
        </div>

        {/* Space Type Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
            <Building className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Property Distribution</h2>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Commercial / Office Units</span>
                <span className="text-sm font-bold text-gray-900">{unitTypeDistribution.rental_space}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${units.length > 0 ? (unitTypeDistribution.rental_space / units.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Function Halls</span>
                <span className="text-sm font-bold text-gray-900">{unitTypeDistribution.function_hall}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${units.length > 0 ? (unitTypeDistribution.function_hall / units.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Parking Slots</span>
                <span className="text-sm font-bold text-gray-900">{unitTypeDistribution.parking_slot}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="bg-purple-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${units.length > 0 ? (unitTypeDistribution.parking_slot / units.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}