import { useState } from 'react';
import { X, Calendar, DollarSign } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

interface BookingModalProps {
  spaceId: string;
  onClose: () => void;
}

export default function BookingModal({ spaceId, onClose }: BookingModalProps) {
  const { spaces, createBooking } = useData();
  const { user } = useAuth();
  const space = spaces.find(s => s.id === spaceId);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');

  if (!space || !user) return null;

  const calculateTotal = () => {
    if (!startDate || !endDate) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    if (space.priceUnit.includes('month')) {
      const months = Math.ceil(days / 30);
      return space.price * months;
    } else {
      return space.price * days;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createBooking({
      spaceId: space.id,
      spaceName: space.name,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      startDate,
      endDate,
      status: 'pending',
      totalAmount: calculateTotal(),
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-gray-900">Book Space</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-gray-900 mb-2">{space.name}</h3>
            <p className="text-gray-600 mb-2">{space.description}</p>
            <p className="text-gray-900">
              ${space.price} <span className="text-gray-600">/ {space.priceUnit.replace('per ', '')}</span>
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
              placeholder="Any special requirements or questions..."
            />
          </div>

          {startDate && endDate && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <span className="text-gray-900">Total Amount</span>
              </div>
              <p className="text-blue-600">${calculateTotal().toFixed(2)}</p>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={!startDate || !endDate}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Booking Request
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>

          <p className="text-sm text-gray-600">
            Note: Your booking request will be sent to the administrator for approval. You will receive a notification once it's reviewed.
          </p>
        </form>
      </div>
    </div>
  );
}
