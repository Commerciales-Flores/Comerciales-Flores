import { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useData } from "../../contexts/DataContext";
import type { PropertyType } from "../../contexts/DataContext";

import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import {
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatCurrency } from "../../utils/currency";
import {
  getPropertyTypeLabel,
  getPriceLabel,
  calculateTotalAmount,
  getMinimumDuration,
} from "../../utils/propertyHelpers";

export default function ClientProperties() {
  type DurationType = "hours" | "days" | "months";

  interface ReservationForm {
    startDate: Date;
    endDate: Date;
    duration: number;
    durationType: DurationType;
    modeOfVisit: "online" | "onsite";
    paymentIntent: "pay_onsite" | "pay_later";
    paymentMethod: string;
    paymentCycle: string;
    notes: string;
    slotId: string;
    vehicleType: string;
    plateNumber: string;
    eventPurpose: string;
    attendees: string;
    businessType: string;
  }

  const { user } = useAuth();
  const { properties, addReservation, parkingSlots, reservations } = useData();
  const [isSlotPanelOpen, setIsSlotPanelOpen] = useState(false);
  const { sendSystemNotification } = useNotifications();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<PropertyType | "all">(
    "all"
  );
  const [selectedProperty, setSelectedProperty] = useState<string | null>(
    null
  );
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [reservationSuccess, setReservationSuccess] = useState(false);

  const [reservationForm, setReservationForm] = useState<ReservationForm>({
    startDate: new Date(),
    endDate: new Date(),
    duration: 1,
    durationType: "months",
    modeOfVisit: "online",
    paymentIntent: "pay_later",
    paymentMethod: "gcash",
    paymentCycle: "monthly",
    notes: "",
    slotId: "",
    vehicleType: "",
    plateNumber: "",
    eventPurpose: "",
    attendees: "",
    businessType: "",
  });

  const property = selectedProperty
    ? properties.find((p) => p.id === selectedProperty) ?? null
    : null;

  const [priceRange, setPriceRange] = useState<
    "all" | "0-1000" | "1001-5000" | "5001-10000" | "10001+"
  >("all");

  const filteredProperties = properties.filter((p) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q);
    const matchesType = filterType === "all" || p.type === filterType;

    let matchesPrice = true;
    const price = p.price;
    switch (priceRange) {
      case "0-1000":
        matchesPrice = price <= 1000;
        break;
      case "1001-5000":
        matchesPrice = price > 1000 && price <= 5000;
        break;
      case "5001-10000":
        matchesPrice = price > 5000 && price <= 10000;
        break;
      case "10001+":
        matchesPrice = price > 10000;
        break;
    }

    return matchesSearch && matchesType && matchesPrice && p.available;
  });

  const tomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const handleBookNow = (propertyId: string) => {
    const prop = properties.find((p) => p.id === propertyId);
    if (!prop) return;

    setSelectedProperty(propertyId);
    setCurrentImageIndex(0);
    setShowReservationModal(true);

    const defaultStart = (() => {
      const d = tomorrow();
      return d;
    })();

    const defaultEnd = (() => {
      const e = new Date(defaultStart);
      // Parking slots minimum 1 month
      if (prop.type === "parking_slot") {
        e.setMonth(e.getMonth() + 1);
      } else if (prop.type === "rental_space") {
        e.setFullYear(e.getFullYear() + 1);
      } else {
        e.setDate(e.getDate() + 1);
      }
      return e;
    })();

    setReservationForm({
      startDate: prop.type === "parking_slot" ? defaultStart : defaultStart,
      endDate: defaultEnd,
      duration:
        prop.type === "parking_slot"
          ? 1
          : prop.type === "function_hall"
          ? 1
          : 1,
      durationType:
        prop.type === "parking_slot"
          ? "months"
          : prop.type === "function_hall"
          ? "days"
          : "months",
      modeOfVisit: "online",
      paymentIntent: "pay_later",
      paymentMethod: "gcash",
      paymentCycle: "monthly",
      notes: "",
      slotId: "",
      vehicleType: "",
      plateNumber: "",
      eventPurpose: "",
      attendees: "",
      businessType: "",
    });

    setShowCalendar(false);
  };

  // compute end date given start/duration/type
  const computeEndFromForm = (start: Date, duration: number, type: DurationType) => {
    const end = new Date(start);
    if (type === "hours") {
      end.setHours(end.getHours() + duration);
    } else if (type === "days") {
      end.setDate(end.getDate() + duration - 1); // inclusive days
      end.setHours(23, 59, 59, 999);
    } else {
      // months
      end.setMonth(end.getMonth() + duration);
      end.setDate(end.getDate() - 1); // make it inclusive: start + 1 month -> end is day before same date next month
      end.setHours(23, 59, 59, 999);
    }
    return end;
  };

  // reserved-slot overlap detection with proper handling of hours/days/months
  const getReservedSlotIds = () => {
    if (!reservationForm.startDate || !reservationForm.duration) return new Set<string>();

    const formStart = new Date(reservationForm.startDate);
    const formEnd = computeEndFromForm(formStart, reservationForm.duration, reservationForm.durationType);

    const reservedIds = reservations
      .filter((b) => b.propertyType === "parking_slot" && b.slotId)
      .filter((b) => {
        const resStart = new Date(b.startDate);
        const resType: DurationType = (b.durationType as DurationType) ?? "days";
        const resEnd = computeEndFromForm(resStart, b.duration, resType);

        // overlap check (inclusive)
        return formStart <= resEnd && formEnd >= resStart;
      })
      .map((b) => b.slotId as string);

    return new Set<string>(reservedIds);
  };

  const reservedSlotIds = getReservedSlotIds();

  const handleSlotSelectFromPanel = (slotId: string) => {
    setReservationForm((prev) => ({ ...prev, slotId }));
    setIsSlotPanelOpen(false);
  };

  const clearSlotSelection = () => {
    setReservationForm((prev) => ({ ...prev, slotId: "" }));
  };

  const selectedSlotObject = reservationForm.slotId
    ? parkingSlots.find((s) => s.id === reservationForm.slotId) ?? null
    : null;

  const [showCalendar, setShowCalendar] = useState(false);

  const handleReservationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!property || !user) return;

    if (property.type === "parking_slot" && !reservationForm.slotId) {
      alert("Please select a specific parking slot before proceeding.");
      setIsSlotPanelOpen(true);
      return;
    }

    const totalAmount = calculateTotalAmount(
      property.type,
      property.price,
      reservationForm.duration,
      reservationForm.paymentCycle
    );

    const reservationData: any = {
      userId: user.id,
      propertyId: property.id,
      propertyName: property.name,
      propertyType: property.type,
      startDate: reservationForm.startDate.toISOString(),
      endDate: reservationForm.endDate.toISOString(),
      duration: reservationForm.duration,
      modeOfVisit: reservationForm.modeOfVisit,
      paymentIntent:
        reservationForm.modeOfVisit === "onsite"
          ? reservationForm.paymentIntent
          : "pay_later",
      paymentMethod: reservationForm.paymentMethod,
      totalAmount,
      notes: reservationForm.notes,
    };

    if (property.type === "rental_space") {
      reservationData.paymentCycle = reservationForm.paymentCycle;
      reservationData.businessType = reservationForm.businessType;
    } else if (property.type === "function_hall") {
      reservationData.eventPurpose = reservationForm.eventPurpose;
      reservationData.attendees = parseInt(reservationForm.attendees || "0");
    } else if (property.type === "parking_slot") {
      const selectedSlot = parkingSlots.find((p) => p.id === reservationForm.slotId);
      if (!selectedSlot) {
        console.error("No slot selected!");
        return;
      }
      reservationData.slotId = reservationForm.slotId;
      reservationData.vehicleType = reservationForm.vehicleType;
      reservationData.plateNumber = reservationForm.plateNumber;
      reservationData.modeOfVisit = reservationForm.modeOfVisit;
    }

    addReservation(reservationData);

    sendSystemNotification(
      user.id,
      "Reservation Request Submitted",
      `Your reservation request for ${property.name} has been submitted and is pending admin approval.`
    );

    setReservationSuccess(true);
    setTimeout(() => {
      setShowReservationModal(false);
      setReservationSuccess(false);
    }, 2000);
  };

  const nextImage = () => {
    if (property) {
      setCurrentImageIndex((prev) => (prev + 1) % property.images.length);
    }
  };

  const prevImage = () => {
    if (property) {
      setCurrentImageIndex(
        (prev) => (prev - 1 + property.images.length) % property.images.length
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2">Browse Properties</h1>
        <p className="text-gray-600">
          Secure a space or book an appointment for a tour
        </p>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search properties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) =>
                setFilterType(e.target.value as PropertyType | "all")
              }
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="rental_space">Rental Spaces</option>
              <option value="function_hall">Function Halls</option>
              <option value="parking_slot">Parking Slots</option>
            </select>
          </div>

          <div className="relative">
            <select
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value as any)}
              className="pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Prices</option>
              <option value="0-1000">₱0 - ₱1,000</option>
              <option value="1001-5000">₱1,001 - ₱5,000</option>
              <option value="5001-10000">₱5,001 - ₱10,000</option>
              <option value="10001+">₱10,001+</option>
            </select>
          </div>
        </div>
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProperties.map((prop) => (
          <div
            key={prop.id}
            className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
          >
            <img
              src={prop.images[0]}
              alt={prop.name}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <div className="text-xs text-blue-600 mb-1">
                {getPropertyTypeLabel(prop.type)}
              </div>
              <h3 className="mb-2">{prop.name}</h3>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {prop.description}
              </p>
              <div className="flex justify-between items-center mb-3">
                <div>
                  <div className="text-blue-600">{formatCurrency(prop.price)}</div>
                  <div className="text-xs text-gray-500">
                    {getPriceLabel(prop.type)}
                  </div>
                </div>
                {prop.capacity && (
                  <div className="text-sm text-gray-600">{prop.capacity} pax</div>
                )}
              </div>
              <button
                onClick={() => handleBookNow(prop.id)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Reserve Now
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredProperties.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No properties found matching your criteria</p>
        </div>
      )}

      {/* Reservation Modal */}
      {showReservationModal && property && (
        <div className="fixed inset-0 p-4 z-50 overflow-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-auto my-8 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <div className="text-sm text-blue-600 mb-1">
                  {getPropertyTypeLabel(property.type)}
                </div>
                <h2>{property.name}</h2>
              </div>
              <button
                onClick={() => setShowReservationModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="size-6" />
              </button>
            </div>

            {reservationSuccess ? (
              <div className="p-6 text-center">
                <div className="bg-green-100 text-green-700 p-6 rounded-lg">
                  <h3 className="mb-2">Reservation Request Submitted!</h3>
                  <p>
                    Your reservation is pending admin approval. We'll notify you once it's processed.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <div className="relative mb-4">
                      <img
                        src={property.images[currentImageIndex]}
                        alt={property.name}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      {property.images.length > 1 && (
                        <>
                          <button
                            onClick={prevImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 p-1 rounded-full"
                          >
                            <ChevronLeft className="size-5" />
                          </button>
                          <button
                            onClick={nextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 p-1 rounded-full"
                          >
                            <ChevronRight className="size-5" />
                          </button>
                        </>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mb-4">{property.description}</p>

                    <div className="bg-blue-50 p-4 rounded-lg mb-4">
                      <p className="text-sm text-gray-600 mb-1">Price</p>
                      <div className="text-blue-600">
                        {formatCurrency(property.price)}{" "}
                        <span className="text-sm">{getPriceLabel(property.type)}</span>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600">
                      <p className="mb-1">
                        Minimum Duration: {getMinimumDuration(property.type).value}{" "}
                        {getMinimumDuration(property.type).unit}
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleReservationSubmit} className="space-y-4">
                    {/* Mode + payment intent for non-parking and parking (consistent UX) */}
                    <div className="p-4 border border-gray-200 rounded-lg space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          How do you want to proceed?
                        </label>
                        <select
                          value={reservationForm.modeOfVisit}
                          onChange={(e) => {
                            const newMode = e.target.value as "online" | "onsite";
                            setReservationForm((prev) => ({
                              ...prev,
                              modeOfVisit: newMode,
                              paymentIntent: newMode === "online" ? "pay_later" : prev.paymentIntent,
                            }));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="online">Online / Digital Process</option>
                          <option value="onsite">On-site Visit / Tour</option>
                        </select>
                      </div>

                      {reservationForm.modeOfVisit === "onsite" && (
                        <div className="pt-4 border-t border-gray-200">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Regarding Payment:
                          </label>

                          <div className="space-y-2">
                            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer">
                              <input
                                type="radio"
                                name="paymentIntent"
                                value="pay_onsite"
                                checked={reservationForm.paymentIntent === "pay_onsite"}
                                onChange={(e) =>
                                  setReservationForm((prev) => ({ ...prev, paymentIntent: e.target.value as any }))
                                }
                                className="size-4 text-blue-600 focus:ring-blue-500"
                              />
                              <div>
                                <p className="font-medium">Pay On-site</p>
                                <p className="text-xs text-gray-500">I intend to pay in person during my visit.</p>
                              </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer">
                              <input
                                type="radio"
                                name="paymentIntent"
                                value="pay_later"
                                checked={reservationForm.paymentIntent === "pay_later"}
                                onChange={(e) =>
                                  setReservationForm((prev) => ({ ...prev, paymentIntent: e.target.value as any }))
                                }
                                className="size-4 text-blue-600 focus:ring-blue-500"
                              />
                              <div>
                                <p className="font-medium">Decide Later</p>
                                <p className="text-xs text-gray-500">I am just viewing the property for now and will pay later if I decide to proceed.</p>
                              </div>
                            </label>
                          </div>

                          {/* Conditional: show payment fields only when Pay On-site is selected */}
                          {reservationForm.paymentIntent === "pay_onsite" ? (
                            <div className="mt-4">
                              <label className="block text-sm text-gray-700 mb-2">Payment Method</label>
                              <select
                                value={reservationForm.paymentMethod}
                                onChange={(e) => setReservationForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select method</option>
                                <option value="gcash">GCash</option>
                                <option value="credit_card">Credit/Debit Card</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="cash">Cash (collected on visit)</option>
                              </select>
                              <p className="text-xs text-gray-500 mt-2">
                                You selected Pay On-site — we will collect payment during your visit. Providing a preferred payment method helps staff prepare.
                              </p>
                            </div>
                          ) : (
                            <div className="mt-4 p-3 bg-gray-50 border rounded-lg text-sm text-gray-700">
                              You can pay onsite during your visit.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Parking slot: monthly minimum, date selection, slot selector, vehicle fields when onsite */}
                    {property.type === "parking_slot" && (
                      <>
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                          Parking spaces require a <strong>minimum occupancy of 1 month</strong>.
                        </div>

                        <div>
                          <label className="block text-sm text-gray-700 mb-2">
                            Reservation Period (Minimum 1 Month)
                          </label>

                          <button
                            type="button"
                            onClick={() => setShowCalendar((s) => !s)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left flex justify-between items-center"
                          >
                            <span>
                              {reservationForm.startDate && reservationForm.endDate
                                ? `${reservationForm.startDate.toLocaleDateString()} – ${reservationForm.endDate.toLocaleDateString()}`
                                : "Please select the dates"}
                            </span>
                          </button>

                          {showCalendar && (
                            <div className="mt-2">
                              <Calendar
                                value={reservationForm.startDate}
                                selectRange={false}
                                minDate={tomorrow()}
                                onChange={(value) => {
                                  if (value instanceof Date) {
                                    const newStart = new Date(value);
                                    // set end to one month occupancy (inclusive end)
                                    const newEnd = new Date(newStart);
                                    newEnd.setMonth(newEnd.getMonth() + 1);
                                    // make end inclusive: subtract 1 day to show actual inclusive period end date
                                    newEnd.setDate(newEnd.getDate() - 1);
                                    newEnd.setHours(23, 59, 59, 999);

                                    setReservationForm((prev) => ({
                                      ...prev,
                                      startDate: newStart,
                                      endDate: newEnd,
                                      duration: 1,
                                      durationType: "months",
                                    }));
                                    setShowCalendar(false);
                                  }
                                }}
                                className="w-full border rounded-lg shadow-lg"
                              />
                            </div>
                          )}
                        </div>

                        <div className="mt-4">
                          <label className="block text-sm text-gray-700 mb-2">Calculated Duration</label>
                          <input
                            type="text"
                            readOnly
                            value={`${reservationForm.duration} month(s)`}
                            className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg"
                          />
                        </div>

                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Parking Slot</label>
                          {selectedSlotObject ? (
                            <div className="flex items-center gap-4 bg-gray-100 p-3 border border-gray-300 rounded-lg">
                              <img src={selectedSlotObject.imageUrl} alt={selectedSlotObject.name} className="w-24 h-16 object-cover rounded-md" />
                              <div className="flex-grow">
                                <p className="text-xs text-gray-500">Selected Slot</p>
                                <p className="font-bold text-lg text-blue-700">{selectedSlotObject.name}</p>
                              </div>
                              <button type="button" onClick={clearSlotSelection} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" aria-label="Clear selection">
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          ) : (
                            <button type="button" onClick={() => setIsSlotPanelOpen(true)} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-600 transition-colors">
                              Click to View & Select a Slot
                            </button>
                          )}
                        </div>

                        {/* Vehicle inputs only for onsite visits */}
                        {reservationForm.modeOfVisit === "onsite" && (
                          <>
                            <div>
                              <label className="block text-sm text-gray-700 mb-2">Vehicle Type</label>
                              <input
                                type="text"
                                required
                                value={reservationForm.vehicleType}
                                onChange={(e) => setReservationForm((prev) => ({ ...prev, vehicleType: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., Sedan, SUV, Motorcycle"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-700 mb-2">Plate Number</label>
                              <input
                                type="text"
                                required
                                value={reservationForm.plateNumber}
                                onChange={(e) => setReservationForm((prev) => ({ ...prev, plateNumber: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="ABC 1234"
                              />
                            </div>
                          </>
                        )}
                      </>
                    )}

                    {/* Function hall: date range (days) */}
                    {property.type === "function_hall" && (
                      <div>
                        <label className="block text-sm text-gray-700 mb-2">Reservation Dates</label>
                        <button
                          type="button"
                          onClick={() => setShowCalendar((s) => !s)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left flex justify-between items-center"
                        >
                          <span>{`${reservationForm.startDate.toLocaleDateString()} - ${reservationForm.endDate.toLocaleDateString()}`}</span>
                        </button>
                        {showCalendar && (
                          <div className="mt-2">
                            <Calendar
                              onChange={(value) => {
                                if (Array.isArray(value) && value[0] && value[1]) {
                                  const start = new Date(value[0]);
                                  start.setHours(0, 0, 0, 0);
                                  const end = new Date(value[1]);
                                  end.setHours(23, 59, 59, 999);
                                  const dayCount = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                                  setReservationForm((prev) => ({ ...prev, startDate: start, endDate: end, duration: dayCount, durationType: "days" }));
                                  setShowCalendar(false);
                                }
                              }}
                              value={[reservationForm.startDate, reservationForm.endDate]}
                              selectRange={true}
                              minDate={tomorrow()}
                              className="w-full border rounded-lg shadow-lg"
                            />
                          </div>
                        )}
                        <div className="mt-4">
                          <label className="block text-sm text-gray-700 mb-2">Calculated Duration</label>
                          <input type="text" readOnly value={`${reservationForm.duration} day(s)`} className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg" />
                        </div>
                      </div>
                    )}

                    {/* Rental space: lease start + years */}
                    {property.type === "rental_space" && (
                      <>
                        <div>
                          <label className="block text-sm text-gray-700 mb-2">Lease Start Date</label>
                          <button type="button" onClick={() => setShowCalendar((s) => !s)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left flex justify-between items-center">
                            <span>{`${reservationForm.startDate.toLocaleDateString()}`}</span>
                          </button>
                          {showCalendar && (
                            <div className="mt-2">
                              <Calendar
                                value={reservationForm.startDate}
                                selectRange={false}
                                minDate={tomorrow()}
                                onChange={(value) => {
                                  if (value instanceof Date) {
                                    const newStart = new Date(value);
                                    const newEnd = new Date(newStart);
                                    newEnd.setFullYear(newEnd.getFullYear() + (reservationForm.duration || 1));
                                    setReservationForm((prev) => ({ ...prev, startDate: newStart, endDate: newEnd }));
                                    setShowCalendar(false);
                                  }
                                }}
                                className="w-full border rounded-lg shadow-lg"
                              />
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm text-gray-700 mb-2 mt-4">Duration (years)</label>
                          <input
                            type="number"
                            required
                            min={getMinimumDuration(property.type).value}
                            value={reservationForm.duration}
                            onChange={(e) => {
                              const newDuration = parseInt(e.target.value) || 1;
                              const newEndDate = new Date(reservationForm.startDate);
                              newEndDate.setFullYear(newEndDate.getFullYear() + newDuration);
                              setReservationForm((prev) => ({ ...prev, duration: newDuration, endDate: newEndDate }));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>

                        <div className="mt-4">
                          <label className="block text-sm text-gray-700 mb-2">Lease End Date (Auto-calculated)</label>
                          <input type="text" readOnly value={`${reservationForm.endDate.toLocaleDateString()}`} className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg" />
                        </div>
                      </>
                    )}

                    {/* Rental-specific fields */}
                    {property.type === "rental_space" && (
                      <>
                        <div>
                          <label className="block text-sm text-gray-700 mb-2">Payment Cycle</label>
                          <select
                            value={reservationForm.paymentCycle}
                            onChange={(e) => setReservationForm((prev) => ({ ...prev, paymentCycle: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="monthly">Monthly Installments</option>
                            <option value="quarterly">Quarterly Payments</option>
                            <option value="full">Full Payment</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-2">Business Type</label>
                          <input
                            type="text"
                            required
                            value={reservationForm.businessType}
                            onChange={(e) => setReservationForm((prev) => ({ ...prev, businessType: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Retail, Office, Restaurant"
                          />
                        </div>
                      </>
                    )}

                    {/* Function hall fields */}
                    {property.type === "function_hall" && (
                      <>
                        <div>
                          <label className="block text-sm text-gray-700 mb-2">Event Purpose</label>
                          <input
                            type="text"
                            required
                            value={reservationForm.eventPurpose}
                            onChange={(e) => setReservationForm((prev) => ({ ...prev, eventPurpose: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Wedding, Conference, Birthday"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-2">Number of Attendees</label>
                          <input
                            type="number"
                            required
                            min={1}
                            max={property.capacity}
                            value={reservationForm.attendees}
                            onChange={(e) => setReservationForm((prev) => ({ ...prev, attendees: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={`Max: ${property.capacity}`}
                          />
                        </div>
                      </>
                    )}

                    {property.type === "parking_slot" && (
                      <>
                        <div>
                          <label className="block text-sm text-gray-700 mb-2">
                            Vehicle Type
                          </label>
                          <input
                            type="text"
                            required
                            value={reservationForm.vehicleType}
                            onChange={(e) =>
                              setReservationForm({
                                ...reservationForm,
                                vehicleType: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Sedan, SUV, Motorcycle"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-2">
                            Plate Number
                          </label>
                          <input
                            type="text"
                            required
                            value={reservationForm.plateNumber}
                            onChange={(e) =>
                              setReservationForm({
                                ...reservationForm,
                                plateNumber: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="ABC 1234"
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-sm text-gray-700 mb-2">
                        Payment Method
                      </label>
                      <select
                        value={reservationForm.paymentMethod}
                        onChange={(e) =>
                          setReservationForm({
                            ...reservationForm,
                            paymentMethod: e.target
                              .value as any,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="gcash">GCash</option>
                        <option value="cash">Cash</option>
                        <option value="cheque">Cheque</option>
                        <option value="paymaya">PayMaya</option>
                        <option value="bank_transfer">
                          Bank Transfer
                        </option>
                        <option value="credit_card">
                          Credit/Debit Card
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-2">
                        Additional Notes (Optional)
                      </label>
                      <textarea
                        value={reservationForm.notes}
                        onChange={(e) =>
                          setReservationForm({
                            ...reservationForm,
                            notes: e.target.value,
                          })
                        }
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Any special requests or requirements"
                      />
                    </div>

                    {/* ✅ START: FINAL, WORKING ESTIMATED TOTAL DISPLAY */}
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">
                        Estimated Total
                      </p>
                      <div className="text-gray-900 font-bold text-lg">
                        {/* ✅ FIX: Call your existing helper function directly here */}
                        {formatCurrency(
                          calculateTotalAmount(
                            property.type,
                            property.price,
                            reservationForm.duration,
                            reservationForm.paymentCycle,
                          )
                        )}
                      </div>

                    {/* ✅ END: FINAL, WORKING ESTIMATED TOTAL DISPLAY */}
                      <p className="text-xs text-gray-500 mt-2">
                        * Payment required after admin approval
                      </p>
                    </div>

                    <button
                      type="submit"
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Submit Reservation Request
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ✅ PASTE THE SLOT PANEL MODAL CODE RIGHT HERE */}
      {isSlotPanelOpen && (
        <div className="fixed inset-0 z-[60] bg-black bg-opacity-60 flex items-center justify-center p-4" onClick={() => setIsSlotPanelOpen(false)}>
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Select Your Parking Slot</h3>
              <button onClick={() => setIsSlotPanelOpen(false)} className="text-gray-500 hover:text-gray-800">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {parkingSlots.map((slot) => {
                  const isReserved = reservedSlotIds.has(slot.id);
                  const isSelected = reservationForm.slotId === slot.id;
                  return (
                    <button type="button" key={slot.id} disabled={isReserved} onClick={() => handleSlotSelectFromPanel(slot.id)} className={`border-2 rounded-lg overflow-hidden relative text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isSelected ? "border-blue-600 scale-105" : "border-transparent"} ${isReserved ? "cursor-not-allowed" : "hover:border-blue-500"}`}>
                      {isSelected && (
                        <div className="absolute top-1 right-1 bg-blue-600 text-white rounded-full p-1 z-10">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </div>
                      )}
                      <img src={slot.imageUrl} alt={slot.name} className="w-full h-32 object-cover" />
                      {isReserved && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60">
                          <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full">TAKEN</span>
                        </div>
                      )}
                      <div className="p-2 bg-gray-100">
                        <p className="text-sm font-bold text-center text-gray-800">{slot.name}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}