// src/components/admin/AdminReservationForm.tsx

import { useState, useEffect, useMemo } from 'react'; // Import useMemo
import { useData } from '../../contexts/DataContext';
import type { PaymentCycle, PaymentMethod, Reservation, User } from '../../contexts/DataContext';
import { calculateTotalAmount } from '../../utils/propertyHelpers';
import { formatCurrency } from '../../utils/currency';
import { CheckCircle, X, User as UserIcon } from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

interface AdminReservationFormProps {
  userId: string;
  unitId: string;
  onComplete: () => void;
}

interface AdminReservationFormState {
  startDate: Date;
  endDate: Date;
  duration: number;
  durationType: 'hours' | 'days';
  notes: string;
  paymentCycle: 'monthly' | 'quarterly' | 'full';
  eventPurpose: string;
  attendees: string; // Stored as a string from the input
  vehicleType: string;
  plateNumber: string;
  businessType: string;
  paymentMethod: Reservation['paymentMethod'];
  slotId: string;
}

export default function AdminReservationFormState({ userId, unitId, onComplete }: AdminReservationFormProps) {
  const { units, reservations, users, parkingSlots, addReservation } = useData();
  const unit = units.find(p => p.id === unitId);
  const user = users.find(u => u.id === userId); // The user VALUE is here

  // --- State management adopted and enhanced from ClientUnits ---
  const [formState, setFormState] = useState(() => {
    // ... (initial state setup is the same)
    const prop = units.find(p => p.id === unitId);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextYear = new Date(tomorrow);
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    return {
      startDate: prop?.type === 'parking_slot' ? new Date() : tomorrow,
      endDate: prop?.type === 'rental_space' ? nextYear : (prop?.type === 'parking_slot' ? new Date() : tomorrow),
      duration: prop?.type === 'rental_space' ? 1 : 1,
      durationType: prop?.type === 'parking_slot' ? 'hours' : 'days',
      notes: '',
      paymentCycle: 'monthly',
      eventPurpose: '',
      attendees: '10', // Initialize as string
      vehicleType: '',
      plateNumber: '',
      businessType: '',
      paymentMethod: 'cash',
      slotId: '',
    };
  });

  const [showCalendar, setShowCalendar] = useState(false);
  const [isSlotPanelOpen, setIsSlotPanelOpen] = useState(false); // ✅ NEW: For slot panel

  // ✅ CORRECTED LOGIC
useEffect(() => {
  if (!unit) return;
  const newEndDate = new Date(formState.startDate);
  const durationNum = Number(formState.duration) || 0;

  if (unit.type === 'rental_space') {
    // Logic is now based on years
    newEndDate.setFullYear(newEndDate.getFullYear() + durationNum);
  } else if (unit.type === 'function_hall') {
    const dayCount = durationNum > 0 ? durationNum - 1 : 0;
    newEndDate.setDate(newEndDate.getDate() + dayCount);
  } else if (unit.type === 'parking_slot') {
     if (formState.durationType === 'days') {
      const dayCount = durationNum > 0 ? durationNum - 1 : 0;
      newEndDate.setDate(newEndDate.getDate() + dayCount);
    } else { // hours
      newEndDate.setHours(newEndDate.getHours() + durationNum);
    }
  }
  setFormState(prev => ({ ...prev, endDate: newEndDate }));
}, [formState.startDate, formState.duration, unit?.type, formState.durationType]);


  // ✅ START: LOGIC FOR PARKING SLOT RESERVATIONS (ported from client)
  const reservedSlotIds = useMemo(() => {
    if (unit?.type !== 'parking_slot') return new Set<string>();

    const formStart = new Date(formState.startDate);
    const multiplier = formState.durationType === 'hours' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const formEnd = new Date(formStart.getTime() + Number(formState.duration) * multiplier);

    const reservedIds = reservations
      .filter((reservation) => {
        if (reservation.unitType !== 'parking_slot' || !reservation.slotId) return false;

        const resStart = new Date(reservation.startDate);
        const resMultiplier = reservation.durationType === 'hours' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
        const resEnd = new Date(resStart.getTime() + (reservation.duration * resMultiplier));

        return formStart < resEnd && resEnd > formStart;
      })
      .map((reservation) => reservation.slotId!);

    return new Set<string>(reservedIds);
  }, [reservations, unit, formState.startDate, formState.duration, formState.durationType]);
  // ✅ END: LOGIC FOR PARKING SLOT RESERVATIONS

  if (!unit) {
    return <div className="text-red-500 p-4">Error: Unit information could not be found.</div>;
  }

  if(!user){
    return <div className="text-red-500 p-4">Error: User information could not be found.</div>; 
  }

  const selectedSlotObject = formState.slotId ? parkingSlots.find((slot) => slot.id === formState.slotId) : null;
  const totalContractValue = calculateTotalAmount(unit.type, unit.price, Number(formState.duration), formState.paymentCycle);
  
  // --- Handlers ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unit) return;
    if (unit.type === 'parking_slot' && !formState.slotId) {
        alert("Please select a parking slot before creating the reservation.");
        return;
    }

    // ✅ CORRECTED CODE
const durationInMonths = unit.type === 'rental_space' ? Number(formState.duration) * 12 : Number(formState.duration);
const totalAmount = calculateTotalAmount(unit.type, unit.price, durationInMonths, formState.paymentCycle);

const resolvedPaymentMethod: PaymentMethod | undefined = 
    formState.paymentMethod === "" ? undefined : formState.paymentMethod as PaymentMethod;

    const finalReservationData: Omit<Reservation, 'id' | 'requestDate' | 'paidAmount'> = {
      userId,
      unitId,
      unitName: unit.name,
      unitType: unit.type,
      startDate: formState.startDate.toISOString(), // Convert Date to string
      endDate: formState.endDate.toISOString(),     // Convert Date to string
      duration: formState.duration,
      totalAmount: totalContractValue,
      notes: formState.notes,
      modeOfVisit: 'online',
      paymentMethod: resolvedPaymentMethod,
      status: 'confirmed',
      // Add type-specific fields, converting types as needed
      ...(unit.type === 'rental_space' && { paymentCycle: formState.paymentCycle as PaymentCycle, businessType: formState.businessType }),
      ...(unit.type === 'function_hall' && { eventPurpose: formState.eventPurpose, attendees: Number(formState.attendees) || 0 }), // Convert string to number
      ...(unit.type === 'parking_slot' && { vehicleType: formState.vehicleType, plateNumber: formState.plateNumber, durationType: formState.durationType as 'hours' | 'days', slotId: formState.slotId, slotName: selectedSlotObject?.name }),
    };

    addReservation(finalReservationData);
    onComplete();
  };

  // --- Main Form Render ---


  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="font-semibold text-gray-800">{unit.name}</p>
          <p className="text-gray-600 capitalize">Type: {unit.type.replace('_', ' ')}</p>
        </div>

        <div>
            <p className="text-xs text-gray-500">For User</p>
             <div className="flex items-center gap-2">
                <UserIcon className="size-4 text-gray-500"/>
                <p className="font-semibold text-gray-800">{user.first_name} {user.last_name} <span className="font-mono text-gray-500 font-normal">(ID: {user.id})</span></p>
            </div>
          </div>

        {/* --- DYNAMIC DATE INPUTS --- */}

        {/* Case 1: Parking Slot */}
        {unit.type === 'parking_slot' && (
             <div className="space-y-4">
                <div className="p-3 border rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reservation Type</label>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button type="button" onClick={() => setFormState({ ...formState, durationType: 'hours', duration: 1 })} className={`flex-1 py-1 rounded-md text-sm transition-colors ${formState.durationType === 'hours' ? 'bg-white shadow' : ''}`}>Hourly</button>
                        <button type="button" onClick={() => setFormState({ ...formState, durationType: 'days', duration: 1 })} className={`flex-1 py-1 rounded-md text-sm transition-colors ${formState.durationType === 'days' ? 'bg-white shadow' : ''}`}>Daily</button>
                    </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block font-medium text-gray-700 mb-1">{formState.durationType === 'hours' ? 'Start Date & Time' : 'Start Date'}</label>
                        {formState.durationType === 'hours' ? (
                            <input type="datetime-local" required value={formState.startDate.toISOString().slice(0, 16)} onChange={(e) => setFormState({ ...formState, startDate: new Date(e.target.value) })} min={new Date().toISOString().slice(0, 16)} className="w-full px-3 py-2 border border-gray-300 rounded-lg"/>
                        ) : (
                            <input type="date" required value={formState.startDate.toISOString().split('T')[0]} onChange={(e) => setFormState({ ...formState, startDate: new Date(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg"/>
                        )}
                    </div>
                     <div>
                        <label className="block font-medium text-gray-700 mb-1">Duration ({formState.durationType})</label>
                        <input type="number" required min="1" value={formState.duration} onChange={(e) => setFormState({ ...formState, duration: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg"/>
                     </div>
                </div>
             </div>
        )}

        {/* Case 2: Function Hall (Calendar Range) */}
        {unit.type === 'function_hall' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reservation Dates</label>
            <button type="button" onClick={() => setShowCalendar(!showCalendar)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left">
              {formState.startDate.toLocaleDateString()} - {formState.endDate.toLocaleDateString()}
            </button>
            {showCalendar && (
              <div className="relative z-10 mt-2">
                <Calendar
                  onChange={(value) => {
                    if (Array.isArray(value) && value[0] && value[1]) {
                      const start = new Date(value[0].setHours(0, 0, 0, 0));
                      const end = new Date(value[1].setHours(0, 0, 0, 0));
                      const dayCount = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                      setFormState({ ...formState, startDate: start, endDate: end, duration: dayCount });
                      setShowCalendar(false);
                    }
                  }}
                  value={[formState.startDate, formState.endDate]}
                  selectRange={true}
                  minDate={(() => { const t = new Date(); t.setDate(t.getDate() + 1); return t; })()}
                  className="w-full border rounded-lg shadow-lg"
                />
              </div>
            )}
            <div className="mt-2">
              <label className="block text-sm text-gray-700 mb-1">Calculated Duration</label>
              <input type="text" readOnly value={`${formState.duration} day(s)`} className="w-full px-3 py-2 bg-gray-100 border rounded-lg"/>
            </div>
          </div>
        )}

        {/* Case 3: Rental Space (Manual duration) */}
        {unit.type === 'rental_space' && (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Lease Start Date</label>
              <button
                type="button"
                onClick={() => setShowCalendar(!showCalendar)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left"
              >
                {formState.startDate.toLocaleDateString()}
              </button>
              {showCalendar && (
                <div className="relative z-10 mt-2">
                  <Calendar
                    onChange={(value) => {
                      if (value instanceof Date) {
                        setFormState({ ...formState, startDate: value });
                        setShowCalendar(false); // Close calendar after selection
                      }
                    }}
                    value={formState.startDate}
                    minDate={(() => { const t = new Date(); t.setDate(t.getDate() + 1); return t; })()}
                    className="w-full border rounded-lg shadow-lg"
                  />
                </div>
              )}
            </div>

            
            <div>
              <label className="block font-medium text-gray-700 mb-1">Duration (years)</label>
              <input
                type="number"
                required
                min="1"
                value={formState.duration}
                onChange={(e) => setFormState({ ...formState, duration: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Lease End Date</label>
              <input
                type="text"
                readOnly
                value={formState.endDate.toLocaleDateString()}
                className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Business Type</label>
              <input
                type="text"
                required
                placeholder="e.g., Retail, Office, Restaurant"
                value={formState.businessType}
                onChange={(e) => setFormState({ ...formState, businessType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Payment Cycle</label>
              <select 
                value={formState.paymentCycle} 
                onChange={(e) => setFormState({ ...formState, paymentCycle: e.target.value as any })} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="full">Full (Upfront)</option>
              </select>
            </div>
          </div>
        
        )}

        {/* --- CONDITIONAL FIELDS (SAME AS BEFORE) --- */}
        {/* Function Hall Details */}
        {unit.type === 'function_hall' && (
            <div className="space-y-4 pt-4 border-t">
                <div><label className="block font-medium text-gray-700 mb-1">Event Purpose</label><input type="text" placeholder="e.g., Wedding, Conference" value={formState.eventPurpose} onChange={(e) => setFormState({ ...formState, eventPurpose: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block font-medium text-gray-700 mb-1">Number of Attendees</label><input type="number" min="1" max={unit.capacity} placeholder={`Max: ${unit.capacity}`} value={formState.attendees} onChange={(e) => setFormState({ ...formState, attendees: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
            </div>
        )}

        {/* Parking Slot Details */}
        {unit.type === 'parking_slot' && (
          <div className="space-y-4 pt-4 border-t">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Parking Slot</label>
                {selectedSlotObject ? (
                  <div className="flex items-center gap-4 bg-gray-100 p-2 border rounded-lg">
                    <img src={selectedSlotObject.imageUrl} alt={selectedSlotObject.name} className="w-24 h-16 object-cover rounded-md" />
                    <div className="flex-grow"><p className="font-bold text-blue-700">{selectedSlotObject.name}</p></div>
                    <button type="button" onClick={() => setFormState(prev => ({ ...prev, slotId: '' }))} className="p-1 text-gray-500 hover:text-red-600 rounded-full"><X className="w-5 h-5" /></button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setIsSlotPanelOpen(true)} className="w-full py-3 border-2 border-dashed rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-600">Click to Select a Slot</button>
                )}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="block font-medium text-gray-700 mb-1">Vehicle Type</label><input type="text" placeholder="e.g., Sedan, SUV" value={formState.vehicleType} onChange={(e) => setFormState({ ...formState, vehicleType: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block font-medium text-gray-700 mb-1">Plate Number</label><input type="text" placeholder="e.g., ABC 1234" value={formState.plateNumber} onChange={(e) => setFormState({ ...formState, plateNumber: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
            </div>
          </div>
        )}


        {/* ... other fields like payment method, notes ... */}
        <div>
            <label className="block font-medium text-gray-700 mb-1">Payment Method</label>
            <select value={formState.paymentMethod} onChange={(e) => setFormState({ ...formState, paymentMethod: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                <option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option><option value="not_applicable">Not Applicable</option>
            </select>
        </div>
        <div>
            <label className="block font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea value={formState.notes} onChange={(e) => setFormState({ ...formState, notes: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-lg" placeholder="Internal notes..."/>
        </div>


        <div className="space-y-4 pt-4 border-t">
          <div className="bg-gray-100 p-4 rounded-lg">
            {unit.type === 'rental_space' ? (
              <>
                <p className="text-sm text-gray-600 mb-1">
                  {formState.paymentCycle === 'monthly' && 'Monthly Installment'}
                  {formState.paymentCycle === 'quarterly' && 'Quarterly Payment'}
                  {formState.paymentCycle === 'full' && 'Total Contract Value'}
                </p>
                <div className="text-gray-900 font-bold text-lg">
                  {formState.paymentCycle === 'monthly' && formatCurrency(unit.price)}
                  {formState.paymentCycle === 'quarterly' && formatCurrency(unit.price * 3)}
                  {formState.paymentCycle === 'full' && formatCurrency(totalContractValue)}
                </div>
                {formState.paymentCycle !== 'full' && (
                  <p className="text-xs text-gray-500 mt-2">Total Contract Value: {formatCurrency(totalContractValue)}</p>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-1">Estimated Total Amount</p>
                <div className="text-gray-900 font-bold text-lg">{formatCurrency(totalContractValue)}</div>
              </>
            )}
          </div>
          
          <button type="submit" className="flex w-full justify-center items-center gap-2 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
            <CheckCircle className="size-5" />
            Create Approved Reservation
          </button>
        </div>
      </form>

      {/* ✅ START: PARKING SLOT SELECTOR PANEL */}
      {isSlotPanelOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" onClick={() => setIsSlotPanelOpen(false)}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Select an Available Parking Slot</h3>
              <button onClick={() => setIsSlotPanelOpen(false)}><X/></button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {parkingSlots.map((slot) => {
                  const isReserved = reservedSlotIds.has(slot.id);
                  const isSelected = formState.slotId === slot.id;
                  return (
                    <button
                      type="button"
                      key={slot.id}
                      disabled={isReserved}
                      onClick={() => {
                          setFormState(prev => ({...prev, slotId: slot.id}));
                          setIsSlotPanelOpen(false);
                      }}
                      className={`border-2 rounded-lg overflow-hidden relative text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed ${isSelected ? "border-blue-600 ring-2 ring-blue-600" : "border-gray-200"} ${!isReserved && "hover:border-blue-500"}`}
                    >
                      {isSelected && <div className="absolute top-1 right-1 bg-blue-600 text-white rounded-full p-0.5 z-10"><CheckCircle className="size-3"/></div>}
                      <img src={slot.imageUrl} alt={slot.name} className="w-full h-32 object-cover" />
                      {isReserved && <div className="absolute inset-0 flex items-center justify-center bg-black/70"><span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded">TAKEN</span></div>}
                      <div className="p-2 bg-gray-50"><p className="text-sm font-bold text-center text-gray-800">{slot.name}</p></div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ✅ END: PARKING SLOT SELECTOR PANEL */}
    </>
  );
}
