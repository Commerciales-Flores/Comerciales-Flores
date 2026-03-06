import { useState } from 'react';
import { X, Calendar, DollarSign } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/currency';

interface BookingModalProps {
  unitId: string; 
  onClose: () => void;
}

export default function BookingModal({ unitId, onClose }: BookingModalProps) {
  const { units, addBooking } = useData();
  const { user } = useAuth();
  
  const unit = units.find(u => u.id === unitId);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');

  if (!unit || !user) return null;

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
    
    // ✅ FIX: Dynamically determine the correct durationType text for the database
    let derivedDurationType: 'hours' | 'days' | 'months' | 'years' = 'days';
    if (unit.type === 'rental_space') {
      derivedDurationType = 'months';
    } else if (unit.type === 'parking_slot') {
      // Currently defaulting to days based on the date picker, 
      // but you can change this to 'hours' later if you add a time picker!
      derivedDurationType = 'days'; 
    }

    addBooking({
      userId: user.id,
      unitId: unit.id,
      propertyName: unit.name,
      unitType: unit.type,
      startDate,
      endDate,
      duration: calculateDuration(),
      totalAmount: calculateTotal(),
      modeOfVisit: 'online', // Defaulting to online booking request
      paymentIntent: 'pay_later', // ✅ FIX: Awaiting admin approval, so they pay later
      durationType: derivedDurationType, // ✅ FIX: Now properly tracks months vs days
      notes: notes || undefined,
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900">Book Property</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold tracking-wider text-blue-600 uppercase">
                {unit.type.replace('_', ' ')}
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{unit.name}</h3>
            <p className="text-gray-600 mb-3 text-sm">{unit.description}</p>
            <p className="text-blue-700 font-bold text-lg">
              {formatCurrency(unit.price)} 
              <span className="text-blue-600/70 font-normal text-sm">
                {unit.type === 'rental_space' ? ' / month' : ' / day'}
              </span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || new Date().toISOString().split('T')[0]}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Any special requirements, business details, or questions..."
            />
          </div>

          {startDate && endDate && calculateTotal() > 0 && (
            <div className="bg-gray-50 border border-gray-200 p-5 rounded-xl flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-700 font-medium">Estimated Total</span>
                </div>
                <p className="text-sm text-gray-500 ml-7">
                  For {calculateDuration()} {unit.type === 'rental_space' ? 'month(s)' : 'day(s)'}
                </p>
              </div>
              <p className="text-gray-900 font-bold text-2xl">{formatCurrency(calculateTotal())}</p>
            </div>
          )}

          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!startDate || !endDate}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
            >
              Submit Booking Request
            </button>
          </div>

          <p className="text-sm text-gray-500 text-center flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
            Your request will be reviewed by an administrator.
          </p>
        </form>
      </div>
    </div>
  );
}