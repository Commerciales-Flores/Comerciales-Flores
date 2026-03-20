// src/components/admin/AdminReservationForm.tsx

import { useState, useEffect, useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { CheckCircle, X, User as UserIcon } from 'lucide-react';

import { useData } from '../../contexts/DataContext';
import { useUnits } from '../../contexts/UnitsContext';
import type { PaymentCycle, PaymentMethod, Reservation } from '../../contexts/DataContext';
import { calculateTotalAmount } from '../../utils/propertyHelpers';
import { formatCurrency } from '../../utils/currency';

interface AdminReservationFormProps {
  userId: string;
  unitId: string;
  onComplete: () => void;
}

type DurationType = 'hours' | 'days' | 'months' | 'years';

interface AdminReservationFormState {
  startDate: Date;
  endDate: Date;
  duration: number;
  durationType: DurationType;
  notes: string;
  paymentCycle: 'monthly' | 'quarterly' | 'full';
  eventPurpose: string;
  attendees: string;
  vehicleType: string;
  plateNumber: string;
  businessType: string;
  paymentMethod: Reservation['paymentMethod'];
  slotId: string;
}

function getTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function computeEndFromForm(start: Date, duration: number, type: DurationType) {
  const end = new Date(start);

  if (type === 'hours') {
    end.setHours(end.getHours() + duration);
  } else if (type === 'days') {
    end.setDate(end.getDate() + Math.max(duration - 1, 0));
    end.setHours(23, 59, 59, 999);
  } else if (type === 'months') {
    end.setMonth(end.getMonth() + duration);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
  } else {
    end.setFullYear(end.getFullYear() + duration);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
  }

  return end;
}

function buildInitialForm(unitType?: string): AdminReservationFormState {
  const tomorrow = getTomorrow();

  if (unitType === 'parking_slot') {
    const endDate = computeEndFromForm(tomorrow, 1, 'months');
    return {
      startDate: tomorrow,
      endDate,
      duration: 1,
      durationType: 'months',
      notes: '',
      paymentCycle: 'monthly',
      eventPurpose: '',
      attendees: '',
      vehicleType: '',
      plateNumber: '',
      businessType: '',
      paymentMethod: 'cash',
      slotId: '',
    };
  }

  if (unitType === 'function_hall') {
    const endDate = computeEndFromForm(tomorrow, 1, 'days');
    return {
      startDate: tomorrow,
      endDate,
      duration: 1,
      durationType: 'days',
      notes: '',
      paymentCycle: 'full',
      eventPurpose: '',
      attendees: '',
      vehicleType: '',
      plateNumber: '',
      businessType: '',
      paymentMethod: 'cash',
      slotId: '',
    };
  }

  const endDate = computeEndFromForm(tomorrow, 1, 'years');
  return {
    startDate: tomorrow,
    endDate,
    duration: 1,
    durationType: 'years',
    notes: '',
    paymentCycle: 'monthly',
    eventPurpose: '',
    attendees: '',
    vehicleType: '',
    plateNumber: '',
    businessType: '',
    paymentMethod: 'cash',
    slotId: '',
  };
}

export default function AdminReservationForm({
  userId,
  unitId,
  onComplete,
}: AdminReservationFormProps) {
  const { reservations, users, addReservation } = useData();
  const { units, parkingSlots } = useUnits();

  const unit = units.find((u) => u.id === unitId);
  const user = users.find((u) => u.id === userId);

  const [formState, setFormState] = useState<AdminReservationFormState>(() =>
    buildInitialForm(unit?.type)
  );
  const [showCalendar, setShowCalendar] = useState(false);
  const [isSlotPanelOpen, setIsSlotPanelOpen] = useState(false);

  useEffect(() => {
    if (!unit) return;
    setFormState(buildInitialForm(unit.type));
  }, [unit?.id, unit?.type]);

  useEffect(() => {
    if (!unit) return;

    setFormState((prev) => ({
      ...prev,
      endDate: computeEndFromForm(prev.startDate, Number(prev.duration) || 1, prev.durationType),
    }));
  }, [formState.startDate, formState.duration, formState.durationType, unit]);

  const unitParkingSlots = useMemo(() => {
    if (unit?.type !== 'parking_slot') return [];
    return parkingSlots.filter((slot) => slot.unitId === unit.id);
  }, [parkingSlots, unit]);

  const reservedSlotIds = useMemo(() => {
    if (unit?.type !== 'parking_slot') return new Set<string>();

    const formStart = new Date(formState.startDate);
    const formEnd = computeEndFromForm(
      formStart,
      Number(formState.duration) || 1,
      formState.durationType
    );

    const reservedIds = reservations
      .filter((r) => r.unitType === 'parking_slot' && r.unitId === unit.id && r.slotId)
      .filter((r) => {
        const resStart = new Date(r.startDate);
        const resType = (r.durationType as DurationType) ?? 'days';
        const resEnd = computeEndFromForm(resStart, r.duration, resType);
        return formStart <= resEnd && formEnd >= resStart;
      })
      .map((r) => r.slotId as string);

    return new Set<string>(reservedIds);
  }, [
    reservations,
    unit,
    formState.startDate,
    formState.duration,
    formState.durationType,
  ]);

  const selectedSlotObject = useMemo(() => {
    return formState.slotId
      ? unitParkingSlots.find((slot) => slot.id === formState.slotId) ?? null
      : null;
  }, [formState.slotId, unitParkingSlots]);

  const totalContractValue = useMemo(() => {
    if (!unit) return 0;
    return calculateTotalAmount(
      unit.type,
      unit.price,
      Number(formState.duration) || 1,
      formState.paymentCycle
    );
  }, [unit, formState.duration, formState.paymentCycle]);

  if (!unit) {
    return <div className="p-4 text-red-500">Error: Unit information could not be found.</div>;
  }

  if (!user) {
    return <div className="p-4 text-red-500">Error: User information could not be found.</div>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (unit.type === 'parking_slot' && !formState.slotId) {
      alert('Please select a parking slot before creating the reservation.');
      return;
    }

    const resolvedPaymentMethod = formState.paymentMethod as PaymentMethod | undefined;

    const finalReservationData: Omit<Reservation, 'id' | 'requestDate' | 'paidAmount'> = {
      userId,
      unitId,
      unitName: unit.name,
      unitType: unit.type,
      startDate: formState.startDate.toISOString(),
      endDate: formState.endDate.toISOString(),
      duration: formState.duration,
      totalAmount: totalContractValue,
      notes: formState.notes,
      modeOfVisit: 'online',
      paymentMethod: resolvedPaymentMethod,
      status: 'confirmed',

      ...(unit.type === 'rental_space' && {
        paymentCycle: formState.paymentCycle as PaymentCycle,
        businessType: formState.businessType,
        durationType: 'years' as const,
      }),

      ...(unit.type === 'function_hall' && {
        eventPurpose: formState.eventPurpose,
        attendees: Number(formState.attendees) || 0,
        durationType: 'days' as const,
      }),

      ...(unit.type === 'parking_slot' && {
        vehicleType: formState.vehicleType,
        plateNumber: formState.plateNumber,
        durationType: formState.durationType as 'hours' | 'days' | 'months',
        slotId: formState.slotId,
        slotName:
          selectedSlotObject?.slotCode ||
          selectedSlotObject?.label ||
          undefined,
      }),
    };

    addReservation(finalReservationData);
    onComplete();
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="font-semibold text-gray-800">{unit.name}</p>
          <p className="text-gray-600 capitalize">Type: {unit.type.replace('_', ' ')}</p>
        </div>

        <div>
          <p className="text-xs text-gray-500">For User</p>
          <div className="flex items-center gap-2">
            <UserIcon className="size-4 text-gray-500" />
            <p className="font-semibold text-gray-800">
              {user.first_name} {user.last_name}{' '}
              <span className="font-mono font-normal text-gray-500">(ID: {user.id})</span>
            </p>
          </div>
        </div>

        {unit.type === 'parking_slot' && (
          <div className="space-y-4">
            <div className="rounded-lg border p-3">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Reservation Period
              </label>

              <button
                type="button"
                onClick={() => setShowCalendar((prev) => !prev)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-left"
              >
                {formState.startDate.toLocaleDateString()} - {formState.endDate.toLocaleDateString()}
              </button>

              {showCalendar && (
                <div className="relative z-10 mt-2">
                  <Calendar
                    value={formState.startDate}
                    selectRange={false}
                    minDate={getTomorrow()}
                    onChange={(value) => {
                      if (value instanceof Date) {
                        setFormState((prev) => ({
                          ...prev,
                          startDate: value,
                          duration: 1,
                          durationType: 'months',
                        }));
                        setShowCalendar(false);
                      }
                    }}
                    className="w-full rounded-lg border shadow-lg"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block font-medium text-gray-700">
                Calculated Duration
              </label>
              <input
                type="text"
                readOnly
                value={`${formState.duration} month(s)`}
                className="w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-3 py-2"
              />
            </div>
          </div>
        )}

        {unit.type === 'function_hall' && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Reservation Dates
            </label>
            <button
              type="button"
              onClick={() => setShowCalendar((prev) => !prev)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-left"
            >
              {formState.startDate.toLocaleDateString()} - {formState.endDate.toLocaleDateString()}
            </button>

            {showCalendar && (
              <div className="relative z-10 mt-2">
                <Calendar
                  onChange={(value) => {
                    if (Array.isArray(value) && value[0] && value[1]) {
                      const start = new Date(value[0]);
                      start.setHours(0, 0, 0, 0);

                      const end = new Date(value[1]);
                      end.setHours(23, 59, 59, 999);

                      const dayCount =
                        Math.floor(
                          (new Date(value[1]).setHours(0, 0, 0, 0) -
                            new Date(value[0]).setHours(0, 0, 0, 0)) /
                            (1000 * 60 * 60 * 24)
                        ) + 1;

                      setFormState((prev) => ({
                        ...prev,
                        startDate: start,
                        endDate: end,
                        duration: dayCount,
                        durationType: 'days',
                      }));

                      setShowCalendar(false);
                    }
                  }}
                  value={[formState.startDate, formState.endDate]}
                  selectRange
                  minDate={getTomorrow()}
                  className="w-full rounded-lg border shadow-lg"
                />
              </div>
            )}

            <div className="mt-2">
              <label className="mb-1 block text-sm text-gray-700">Calculated Duration</label>
              <input
                type="text"
                readOnly
                value={`${formState.duration} day(s)`}
                className="w-full rounded-lg border bg-gray-100 px-3 py-2"
              />
            </div>
          </div>
        )}

        {unit.type === 'rental_space' && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Lease Start Date
              </label>
              <button
                type="button"
                onClick={() => setShowCalendar((prev) => !prev)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-left"
              >
                {formState.startDate.toLocaleDateString()}
              </button>

              {showCalendar && (
                <div className="relative z-10 mt-2">
                  <Calendar
                    onChange={(value) => {
                      if (value instanceof Date) {
                        setFormState((prev) => ({ ...prev, startDate: value }));
                        setShowCalendar(false);
                      }
                    }}
                    value={formState.startDate}
                    minDate={getTomorrow()}
                    className="w-full rounded-lg border shadow-lg"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block font-medium text-gray-700">Duration (years)</label>
              <input
                type="number"
                required
                min="1"
                value={formState.duration}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    duration: Number(e.target.value) || 1,
                    durationType: 'years',
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block font-medium text-gray-700">Lease End Date</label>
              <input
                type="text"
                readOnly
                value={formState.endDate.toLocaleDateString()}
                className="w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block font-medium text-gray-700">Business Type</label>
              <input
                type="text"
                required
                placeholder="e.g., Retail, Office, Restaurant"
                value={formState.businessType}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, businessType: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block font-medium text-gray-700">Payment Cycle</label>
              <select
                value={formState.paymentCycle}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    paymentCycle: e.target.value as PaymentCycle,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="full">Full (Upfront)</option>
              </select>
            </div>
          </div>
        )}

        {unit.type === 'function_hall' && (
          <div className="space-y-4 border-t pt-4">
            <div>
              <label className="mb-1 block font-medium text-gray-700">Event Purpose</label>
              <input
                type="text"
                placeholder="e.g., Wedding, Conference"
                value={formState.eventPurpose}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, eventPurpose: e.target.value }))
                }
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block font-medium text-gray-700">
                Number of Attendees
              </label>
              <input
                type="number"
                min="1"
                max={unit.capacity}
                placeholder={`Max: ${unit.capacity ?? ''}`}
                value={formState.attendees}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, attendees: e.target.value }))
                }
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>
          </div>
        )}

        {unit.type === 'parking_slot' && (
          <div className="space-y-4 border-t pt-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Parking Slot
              </label>

              {selectedSlotObject ? (
                <div className="flex items-center gap-4 rounded-lg border bg-gray-100 p-2">
                  <img
                    src={
                      selectedSlotObject.imageUrl ||
                      'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=600'
                    }
                    alt={
                      selectedSlotObject.slotCode ||
                      selectedSlotObject.label ||
                      'Parking Slot'
                    }
                    className="h-16 w-24 rounded-md object-cover"
                  />
                  <div className="flex-grow">
                    <p className="font-bold text-blue-700">
                      {selectedSlotObject.slotCode ||
                        selectedSlotObject.label ||
                        'Selected Slot'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormState((prev) => ({ ...prev, slotId: '' }))}
                    className="rounded-full p-1 text-gray-500 hover:text-red-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSlotPanelOpen(true)}
                  className="w-full rounded-lg border-2 border-dashed py-3 text-gray-500 hover:border-blue-500 hover:text-blue-600"
                >
                  Click to Select a Slot
                </button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block font-medium text-gray-700">Vehicle Type</label>
                <input
                  type="text"
                  placeholder="e.g., Sedan, SUV"
                  value={formState.vehicleType}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, vehicleType: e.target.value }))
                  }
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-gray-700">Plate Number</label>
                <input
                  type="text"
                  placeholder="e.g., ABC 1234"
                  value={formState.plateNumber}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, plateNumber: e.target.value }))
                  }
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block font-medium text-gray-700">Payment Method</label>
          <select
            value={formState.paymentMethod}
            onChange={(e) =>
              setFormState((prev) => ({
                ...prev,
                paymentMethod: e.target.value as Reservation['paymentMethod'],
              }))
            }
            className="w-full rounded-lg border px-3 py-2"
          >
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="not_applicable">Not Applicable</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block font-medium text-gray-700">Notes (Optional)</label>
          <textarea
            value={formState.notes}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, notes: e.target.value }))
            }
            rows={3}
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Internal notes..."
          />
        </div>

        <div className="space-y-4 border-t pt-4">
          <div className="rounded-lg bg-gray-100 p-4">
            {unit.type === 'rental_space' ? (
              <>
                <p className="mb-1 text-sm text-gray-600">
                  {formState.paymentCycle === 'monthly' && 'Monthly Installment'}
                  {formState.paymentCycle === 'quarterly' && 'Quarterly Payment'}
                  {formState.paymentCycle === 'full' && 'Total Contract Value'}
                </p>
                <div className="text-lg font-bold text-gray-900">
                  {formState.paymentCycle === 'monthly' && formatCurrency(unit.price)}
                  {formState.paymentCycle === 'quarterly' && formatCurrency(unit.price * 3)}
                  {formState.paymentCycle === 'full' && formatCurrency(totalContractValue)}
                </div>
                {formState.paymentCycle !== 'full' && (
                  <p className="mt-2 text-xs text-gray-500">
                    Total Contract Value: {formatCurrency(totalContractValue)}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="mb-1 text-sm text-gray-600">Estimated Total Amount</p>
                <div className="text-lg font-bold text-gray-900">
                  {formatCurrency(totalContractValue)}
                </div>
              </>
            )}
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <CheckCircle className="size-5" />
            Create Approved Reservation
          </button>
        </div>
      </form>

      {isSlotPanelOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setIsSlotPanelOpen(false)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="text-lg font-semibold">Select an Available Parking Slot</h3>
              <button onClick={() => setIsSlotPanelOpen(false)}>
                <X />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              {unitParkingSlots.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-500">
                  No parking slots found for this parking area.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {unitParkingSlots.map((slot) => {
                    const isReserved = reservedSlotIds.has(slot.id);
                    const isSelected = formState.slotId === slot.id;
                    const slotLabel = slot.slotCode || slot.label || 'Slot';

                    return (
                      <button
                        type="button"
                        key={slot.id}
                        disabled={
                          isReserved ||
                          slot.status === 'inactive' ||
                          slot.status === 'maintenance'
                        }
                        onClick={() => {
                          setFormState((prev) => ({ ...prev, slotId: slot.id }));
                          setIsSlotPanelOpen(false);
                        }}
                        className={`relative overflow-hidden rounded-lg border-2 text-left transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                          isSelected
                            ? 'border-blue-600 ring-2 ring-blue-600'
                            : 'border-gray-200'
                        } ${!isReserved ? 'hover:border-blue-500' : ''}`}
                      >
                        {isSelected && (
                          <div className="absolute right-1 top-1 z-10 rounded-full bg-blue-600 p-0.5 text-white">
                            <CheckCircle className="size-3" />
                          </div>
                        )}

                        <img
                          src={
                            slot.imageUrl ||
                            'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=600'
                          }
                          alt={slotLabel}
                          className="h-32 w-full object-cover"
                        />

                        {(isReserved ||
                          slot.status === 'inactive' ||
                          slot.status === 'maintenance') && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                            <span className="rounded bg-red-600 px-2 py-1 text-xs font-bold text-white">
                              {isReserved ? 'TAKEN' : slot.status.toUpperCase()}
                            </span>
                          </div>
                        )}

                        <div className="bg-gray-50 p-2">
                          <p className="text-center text-sm font-bold text-gray-800">
                            {slotLabel}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}