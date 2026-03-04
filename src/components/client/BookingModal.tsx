import { useState } from 'react';
import { X, Calendar, DollarSign } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/currency';

// ✅ FIX 1: Renamed spaceId to unitId to match the domain model
interface BookingModalProps {
  unitId: string; 
  onClose: () => void;
}

export default function BookingModal({ unitId, onClose }: BookingModalProps) {
  // ✅ FIX 2: Pulled `units` and `addBooking` from context
  const { units, addBooking } = useData();
  const { user } = useAuth();
  
  const unit = units.find(u => u.id === unitId);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');

  if (!unit || !user) return null;

  // ✅ FIX 3: Calculate duration properly based on unit type
  const calculateDuration = () => {
    if (!startDate || !endDate) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    if (unit.type === 'rental_space') {
      return Math.ceil(days / 30); // Treat as months
    } else {
      return days; // Treat as days
    }
  };

  const calculateTotal = () => {
    const duration = calculateDuration();
    return unit.price * duration;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ FIX 4: Formatted payload to perfectly match the Omit<Booking, ...> signature
    addBooking({
      userId: user.id,
      unitId: unit.id,
      propertyName: unit.name,
      unitType: unit.type,
      startDate,
      endDate,
      duration: calculateDuration(),
      totalAmount: calculateTotal(),
      modeOfVisit: 'onsite', // Required by interface
      notes: notes || undefined,
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-gray-900">Book Property</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-gray-900 mb-2">{unit.name}</h3>
            <p className="text-gray-600 mb-2">{unit.description}</p>
            <p className="text-gray-900 font-medium">
              {formatCurrency(unit.price)} 
              <span className="text-gray-500 font-normal">
                {unit.type === 'rental_space' ? ' / month' : ' / day'}
              </span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-2">Start Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 mb-2">End Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || new Date().toISOString().split('T')[0]}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Additional Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Any special requirements, business details, or questions..."
            />
          </div>

          {startDate && endDate && calculateTotal() > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <span className="text-gray-900 font-medium">Total Amount</span>
              </div>
              <p className="text-blue-700 font-bold text-lg">{formatCurrency(calculateTotal())}</p>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={!startDate || !endDate}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Submit Booking Request
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>

          <p className="text-sm text-gray-500 text-center">
            Note: Your booking request will be sent to the administrator for approval. You will receive a notification once it's reviewed.
          </p>
        </form>
      </div>
    </div>
  );
}