import { useState } from "react";
import Calendar from 'react-calendar'; // ✅ ADD THIS
import 'react-calendar/dist/Calendar.css'; 
import { useData } from "../../contexts/DataContext";
import type { PropertyType } from "../../contexts/DataContext"; // ✅ type-only

import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import {
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  MapPin, // ✅ New icon
  Laptop,
} from "lucide-react";
import { formatCurrency } from "../../utils/currency";
import {
  getPropertyTypeLabel,
  getPriceLabel,
  calculateTotalAmount,
  getMinimumDuration,
} from "../../utils/propertyHelpers";

export default function ClientProperties() {
  const { user } = useAuth();
  const { properties, addBooking, parkingSlots, bookings } = useData();
  const [isSlotPanelOpen, setIsSlotPanelOpen] = useState(false);
  const { sendSystemNotification } = useNotifications();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<
    PropertyType | "all"
  >("all");
  const [selectedProperty, setSelectedProperty] = useState<
    string | null
  >(null);
  const [showBookingModal, setShowBookingModal] =
    useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const [bookingForm, setBookingForm] = useState({
    // We use Date objects now for the calendar component
    startDate: new Date(),
    endDate: new Date(),
    duration: 1,
    durationType: 'hours' as 'hours' | 'days',
    modeOfVisit: "online" as "online" | "onsite", // ✅ Renamed for clarity
    paymentIntent: "pay_later" as "pay_onsite" | "pay_later", // ✅ NEW FIELD
    paymentMethod: "gcash" as any,
    paymentCycle: "monthly" as any,
    notes: "",
    slotId: "",
    // Type-specific fields
    vehicleType: "",
    plateNumber: "",
    eventPurpose: "",
    attendees: "",
    businessType: "",
});

  

  const property = selectedProperty
    ? properties.find((p) => p.id === selectedProperty)
    : null;
  const [priceRange, setPriceRange] = useState<
    "all" | "0-1000" | "1001-5000" | "5001-10000" | "10001+"
  >("all");

  // Filter properties
  const filteredProperties = properties.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesType =
      filterType === "all" || p.type === filterType;

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

    return (
      matchesSearch &&
      matchesType &&
      matchesPrice &&
      p.available
    );
  });

const handleBookNow = (propertyId: string) => {
    const prop = properties.find(p => p.id === propertyId);
    if (!prop) return;

    setSelectedProperty(propertyId);
    setCurrentImageIndex(0);
    setShowBookingModal(true);
    
    // ✅ NEW: Smarter state reset based on property type
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextYear = new Date(tomorrow);
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    setBookingForm({
      // For rental/function hall, default to tomorrow to prevent same-day booking
      startDate: prop.type === 'parking_slot' ? new Date() : tomorrow, 
      // For rental_space, default endDate to one year from tomorrow
      endDate: prop.type === 'rental_space' ? nextYear : (prop.type === 'parking_slot' ? new Date() : tomorrow),
      duration: 1,
      durationType: prop.type === 'parking_slot' ? 'hours' : 'days',
      modeOfVisit: "online", // ✅ Default to 'online'
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
    // Ensure the calendar is hidden when the modal opens
    setShowCalendar(false); 
};
  // ... after your other state definitions

  // ✅ 4. Add the function to check for reserved slots
  const getReservedSlotIds = () => {
    if (!bookingForm.startDate || !bookingForm.duration) {
      return new Set<string>();
    }

    const formStart = new Date(bookingForm.startDate);
    const multiplier = bookingForm.durationType === 'hours'
      ? 60 * 60 * 1000
      : 24 * 60 * 60 * 1000;
    const formEnd = new Date(formStart.getTime() + bookingForm.duration * multiplier);

    const reservedIds = bookings
      .filter((booking) => {
        // Only consider other parking slot bookings
        if (booking.propertyType !== 'parking_slot' || !booking.slotId) {
          return false;
        }

        const resStart = new Date(booking.startDate);
        const resMultiplier = booking.durationType === 'hours'
          ? 60 * 60 * 1000
          : 24 * 60 * 60 * 1000;
        const resEnd = new Date(resStart.getTime() + booking.duration * resMultiplier);

        // Standard check for time overlap
        return formStart < resEnd && formEnd > resStart;
      })
      .map((booking) => booking.slotId!);

    return new Set<string>(reservedIds);
  };
  const reservedSlotIds = getReservedSlotIds();

    // ... after getReservedSlotIds

  // ✅ 5. Add helpers for the slot selector UI
  const handleSlotSelectFromPanel = (slotId: string) => {
    setBookingForm((prevForm) => ({
      ...prevForm,
      slotId: slotId,
    }));
    setIsSlotPanelOpen(false); // Close the panel after selection
  };

  const clearSlotSelection = () => {
    setBookingForm((prevForm) => ({
      ...prevForm,
      slotId: "",
    }));
  };

  const selectedSlotObject = bookingForm.slotId
    ? parkingSlots.find((slot) => slot.id === bookingForm.slotId)
    : null;


  // ... inside the return() statement


  const [showCalendar, setShowCalendar] = useState(false);

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!property || !user) return;

    const totalAmount = calculateTotalAmount(
      property.type,
      property.price,
      bookingForm.duration,
      bookingForm.paymentCycle,
    );

    const bookingData: any = {
      userId: user.id,
      propertyId: property.id,
      propertyName: property.name,
      propertyType: property.type,
      startDate: bookingForm.startDate.toISOString(),
      endDate: bookingForm.endDate.toISOString(),
      duration: bookingForm.duration,
      modeOfVisit: bookingForm.modeOfVisit,
      paymentIntent: bookingForm.modeOfVisit === 'onsite' ? bookingForm.paymentIntent : undefined,
      paymentMethod: bookingForm.paymentMethod,
      totalAmount,
      notes: bookingForm.notes,
    };

    // Add type-specific fields
    if (property.type === "rental_space") {
      bookingData.paymentCycle = bookingForm.paymentCycle;
      bookingData.businessType = bookingForm.businessType;
    } else if (property.type === "function_hall") {
      bookingData.eventPurpose = bookingForm.eventPurpose;
      bookingData.attendees = parseInt(bookingForm.attendees);
    } else if (property.type === "parking_slot") {
      const selectedSlot = parkingSlots.find(p => p.id === bookingForm.slotId);
      if (!selectedSlot) {
          console.error("No slot selected!");
          // Here you might want to show a user-facing error
          return;
      }
      bookingData.vehicleType = bookingForm.vehicleType;
      bookingData.plateNumber = bookingForm.plateNumber;
      bookingData.modeOfVisit = bookingForm.modeOfVisit;
    }

    const bookingId = addBooking(bookingData);

    // Send notification
    sendSystemNotification(
      user.id,
      "Booking Request Submitted",
      `Your booking request for ${property.name} has been submitted and is pending admin approval.`,
    );

    setBookingSuccess(true);
    setTimeout(() => {
      setShowBookingModal(false);
      setBookingSuccess(false);
    }, 2000);
  };

  const nextImage = () => {
    if (property) {
      setCurrentImageIndex(
        (prev) => (prev + 1) % property.images.length,
      );
    }
  };

  const prevImage = () => {
    if (property) {
      setCurrentImageIndex(
        (prev) =>
          (prev - 1 + property.images.length) %
          property.images.length,
      );
    }
  };

  // Calculate end date based on property type and duration
  const calculateEndDate = (
    startDate: string,
    duration: number,
    type: PropertyType,
  ): string => {
    if (!startDate) return "";
    const start = new Date(startDate);

    if (type === "rental_space") {
      // Duration in months
      start.setMonth(start.getMonth() + duration);
    } else if (type === "function_hall") {
      // Duration in days
      start.setDate(start.getDate() + duration);
    } else if (type === "parking_slot") {
      // Duration in hours
      start.setHours(start.getHours() + duration);
    }

    return start.toISOString().split("T")[0];
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2">Browse Properties</h1>
        <p className="text-gray-600">
          Find the perfect space for your needs
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
                setFilterType(
                  e.target.value as PropertyType | "all",
                )
              }
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="rental_space">
                Rental Spaces
              </option>
              <option value="function_hall">
                Function Halls
              </option>
              <option value="parking_slot">
                Parking Slots
              </option>
            </select>
          </div>

          <div className="relative">
            <select
              value={priceRange}
              onChange={(e) =>
                setPriceRange(e.target.value as any)
              }
              className="pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Prices</option>
              <option value="0-1000">₱0 - ₱1,000</option>
              <option value="1001-5000">₱1,001 - ₱5,000</option>
              <option value="5001-10000">
                ₱5,001 - ₱10,000
              </option>
              <option value="10001+">₱10,001+</option>
            </select>
          </div>
        </div>
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProperties.map((property) => (
          <div
            key={property.id}
            className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
          >
            <img
              src={property.images[0]}
              alt={property.name}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <div className="text-xs text-blue-600 mb-1">
                {getPropertyTypeLabel(property.type)}
              </div>
              <h3 className="mb-2">{property.name}</h3>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {property.description}
              </p>
              <div className="flex justify-between items-center mb-3">
                <div>
                  <div className="text-blue-600">
                    {formatCurrency(property.price)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {getPriceLabel(property.type)}
                  </div>
                </div>
                {property.capacity && (
                  <div className="text-sm text-gray-600">
                    {property.capacity} pax
                  </div>
                )}
              </div>
              <button
                onClick={() => handleBookNow(property.id)}
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
          <p className="text-gray-500">
            No properties found matching your criteria
          </p>
        </div>
      )}

      {/* Booking Modal */}
      {showBookingModal && property && (
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
                onClick={() => setShowBookingModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="size-6" />
              </button>
            </div>

            {bookingSuccess ? (
              <div className="p-6 text-center">
                <div className="bg-green-100 text-green-700 p-6 rounded-lg">
                  <h3 className="mb-2">
                    Booking Request Submitted!
                  </h3>
                  <p>
                    Your booking is pending admin approval.
                    We'll notify you once it's processed.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  {/* Property Details */}
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
                    <p className="text-sm text-gray-600 mb-4">
                      {property.description}
                    </p>
                    <div className="bg-blue-50 p-4 rounded-lg mb-4">
                      <p className="text-sm text-gray-600 mb-1">
                        Price
                      </p>
                      <div className="text-blue-600">
                        {formatCurrency(property.price)}{" "}
                        <span className="text-sm">
                          {getPriceLabel(property.type)}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p className="mb-1">
                        Minimum Duration:{" "}
                        {
                          getMinimumDuration(property.type)
                            .value
                        }{" "}
                        {getMinimumDuration(property.type).unit}
                      </p>
                    </div>
                  </div>

                  {/* Booking Form */}
                  <form
                    onSubmit={handleBookingSubmit}
                    className="space-y-4"
                  >
                    {property.type !== "parking_slot" && (
                      <div className="p-4 border border-gray-200 rounded-lg space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            How do you want to proceed?
                          </label>
                          <select
                            value={bookingForm.modeOfVisit}
                            onChange={(e) => {
                              const newMode = e.target.value as "online" | "onsite";
                              setBookingForm({
                                ...bookingForm,
                                modeOfVisit: newMode,
                                paymentIntent: newMode === 'online' ? 'pay_later' : bookingForm.paymentIntent
                              });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="online">Online / Digital Process</option>
                            <option value="onsite">On-site Visit / Tour</option>
                          </select>
                        </div>

                        {/* ✅ CONDITIONAL "Payment Intent" FIELD */}
                        {bookingForm.modeOfVisit === 'onsite' && (
                          <div className="pt-4 border-t border-gray-200">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Regarding Payment:
                            </label>
                            <div className="space-y-2">
                              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500">
                                <input
                                  type="radio"
                                  name="paymentIntent"
                                  value="pay_onsite"
                                  checked={bookingForm.paymentIntent === 'pay_onsite'}
                                  onChange={(e) => setBookingForm({ ...bookingForm, paymentIntent: e.target.value as any })}
                                  className="size-4 text-blue-600 focus:ring-blue-500"
                                />
                                <div>
                                  <p className="font-medium">Pay On-site</p>
                                  <p className="text-xs text-gray-500">I intend to pay in person during my visit.</p>
                                </div>
                              </label>
                              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500">
                                <input
                                  type="radio"
                                  name="paymentIntent"
                                  value="pay_later"
                                  checked={bookingForm.paymentIntent === 'pay_later'}
                                  onChange={(e) => setBookingForm({ ...bookingForm, paymentIntent: e.target.value as any })}
                                  className="size-4 text-blue-600 focus:ring-blue-500"
                                />
                                <div>
                                  <p className="font-medium">Decide Later</p>
                                  <p className="text-xs text-gray-500">I am just viewing the property for now and will pay later if I decide to proceed.</p>
                                </div>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

{/* ✅ START: FINAL, REFINED DATE SELECTION LOGIC */}

{/* Case 1: Parking Slot (with refined Hourly/Daily options) */}
{property.type === 'parking_slot' && (
    <>
        {/* Hourly/Daily Toggle */}
        <div>
            <label className="block text-sm text-gray-700 mb-2">Booking Type</label>
            <div className="flex bg-gray-200 p-1 rounded-lg">
                <button type="button" onClick={() => setBookingForm({...bookingForm, durationType: 'hours'})} className={`flex-1 py-1 rounded-md text-sm transition-colors ${bookingForm.durationType === 'hours' ? 'bg-white shadow' : 'hover:bg-gray-300'}`}>
                    Hourly
                </button>
                <button type="button" onClick={() => setBookingForm({...bookingForm, durationType: 'days'})} className={`flex-1 py-1 rounded-md text-sm transition-colors ${bookingForm.durationType === 'days' ? 'bg-white shadow' : 'hover:bg-gray-300'}`}>
                    Daily
                </button>
            </div>
        </div>

        {/* Input for Hourly Parking */}
        {bookingForm.durationType === 'hours' && (
            <>
                <div>
                    <label className="block text-sm text-gray-700 mb-2">Start Date & Time</label>
                    <input type="datetime-local" required value={bookingForm.startDate.toISOString().slice(0, 16)} onChange={(e) => setBookingForm({ ...bookingForm, startDate: new Date(e.target.value) })} min={new Date().toISOString().slice(0, 16)} className="w-full px-3 py-2 border border-gray-300 rounded-lg"/>
                </div>
                <div>
                    <label className="block text-sm text-gray-700 mb-2">Duration (hours)</label>
                    <input type="number" required min="1" value={bookingForm.duration} onChange={(e) => setBookingForm({ ...bookingForm, duration: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg"/>
                </div>
            </>
        )}

        {/* ✅ NEW: Calendar input for Daily Parking */}
        {bookingForm.durationType === 'days' && (
            <div>
                <label className="block text-sm text-gray-700 mb-2">Booking Dates</label>
                <button type="button" onClick={() => setShowCalendar(!showCalendar)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left flex justify-between items-center">
                    <span>{bookingForm.startDate.toLocaleDateString()} - {bookingForm.endDate.toLocaleDateString()}</span>
                    {/* Calendar Icon */}
                </button>
                {showCalendar && (
                    <div className="mt-2">
                        <Calendar
                            onChange={(value) => {
                                if (Array.isArray(value) && value[0] && value[1]) {
                                    const start = new Date(value[0].setHours(0, 0, 0, 0));
                                    const end = new Date(value[1].setHours(0, 0, 0, 0));
                                    const dayCount = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                                    setBookingForm({ ...bookingForm, startDate: start, endDate: end, duration: dayCount });
                                    setShowCalendar(false);
                                }
                            }}
                            value={[bookingForm.startDate, bookingForm.endDate]}
                            selectRange={true}
                            minDate={new Date()}
                            className="w-full border rounded-lg shadow-lg"
                        />
                    </div>
                )}
                <div className="mt-4">
                    <label className="block text-sm text-gray-700 mb-2">Calculated Duration</label>
                    <input type="text" readOnly value={`${bookingForm.duration} day(s)`} className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg"/>
                </div>
            </div>
        )}
    </>
)}

{/* Case 2: Function Hall (Range selection with CORRECTED auto-duration) */}
{property.type === 'function_hall' && (
    <div>
        <label className="block text-sm text-gray-700 mb-2">Booking Dates</label>
        <button type="button" onClick={() => setShowCalendar(!showCalendar)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left flex justify-between items-center">
            <span>{bookingForm.startDate.toLocaleDateString()} - {bookingForm.endDate.toLocaleDateString()}</span>
            {/* Calendar Icon */}
        </button>
        {showCalendar && (
            <div className="mt-2">
                <Calendar
                    onChange={(value) => {
                        if (Array.isArray(value) && value[0] && value[1]) {
                            const start = new Date(value[0].setHours(0, 0, 0, 0));
                            const end = new Date(value[1].setHours(0, 0, 0, 0));
                            // ✅ CORRECTED: This calculation is now accurate.
                            const dayCount = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                            setBookingForm({ ...bookingForm, startDate: start, endDate: end, duration: dayCount });
                            setShowCalendar(false);
                        }
                    }}
                    value={[bookingForm.startDate, bookingForm.endDate]}
                    selectRange={true}
                    minDate={(() => { const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); return tomorrow; })()}
                    className="w-full border rounded-lg shadow-lg"
                />
            </div>
        )}
        <div className="mt-4">
            <label className="block text-sm text-gray-700 mb-2">Calculated Duration</label>
            <input type="text" readOnly value={`${bookingForm.duration} day(s)`} className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg"/>
        </div>
    </div>
)}

{/* Case 3: Rental Space (Start date selection with MANUAL year duration) */}
{property.type === 'rental_space' && (
    <>
        <div>
            <label className="block text-sm text-gray-700 mb-2">Lease Start Date</label>
            <button type="button" onClick={() => setShowCalendar(!showCalendar)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left flex justify-between items-center">
                <span>{bookingForm.startDate.toLocaleDateString()}</span>
                {/* Calendar Icon */}
            </button>
            {showCalendar && (
                <div className="mt-2">
                    <Calendar
                        onChange={(value) => {
                            if (value instanceof Date) {
                                // Just set the start date, end date will be calculated based on duration
                                setBookingForm({ ...bookingForm, startDate: value });
                                setShowCalendar(false);
                            }
                        }}
                        value={bookingForm.startDate}
                        selectRange={false}
                        minDate={(() => { const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); return tomorrow; })()}
                        className="w-full border rounded-lg shadow-lg"
                    />
                </div>
            )}
        </div>
        {/* ✅ NEW: Manual duration input for years */}
        <div>
            <label className="block text-sm text-gray-700 mb-2 mt-4">Duration (years)</label>
            <input
                type="number"
                required
                min={getMinimumDuration(property.type).value}
                value={bookingForm.duration}
                onChange={(e) => {
                    const newDuration = parseInt(e.target.value) || 1;
                    const newEndDate = new Date(bookingForm.startDate);
                    newEndDate.setFullYear(newEndDate.getFullYear() + newDuration);
                    setBookingForm({ ...bookingForm, duration: newDuration, endDate: newEndDate });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
        </div>
        <div className="mt-4">
            <label className="block text-sm text-gray-700 mb-2">Lease End Date (Auto-calculated)</label>
            <input type="text" readOnly value={bookingForm.endDate.toLocaleDateString()} className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg"/>
        </div>
    </>
)}

{/* ✅ END: FINAL, REFINED DATE SELECTION LOGIC */}

                    {/* ✅ 6. Add the visual slot selector */}
{property.type === 'parking_slot' && (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">Parking Slot</label>
    {selectedSlotObject ? (
      // If a slot is selected, show its details
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
      // If no slot is selected, show the button to open the panel
      <button type="button" onClick={() => setIsSlotPanelOpen(true)} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-600 transition-colors">
        Click to View & Select a Slot
      </button>
    )}
  </div>
)}




                    {property.type === "rental_space" && (
                      <>
                        <div>
                          <label className="block text-sm text-gray-700 mb-2">
                            Payment Cycle
                          </label>
                          <select
                            value={bookingForm.paymentCycle}
                            onChange={(e) =>
                              setBookingForm({
                                ...bookingForm,
                                paymentCycle: e.target
                                  .value as any,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="monthly">
                              Monthly Installments
                            </option>
                            <option value="quarterly">
                              Quarterly Payments
                            </option>
                            <option value="full">
                              Full Payment
                            </option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-2">
                            Business Type
                          </label>
                          <input
                            type="text"
                            required
                            value={bookingForm.businessType}
                            onChange={(e) =>
                              setBookingForm({
                                ...bookingForm,
                                businessType: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Retail, Office, Restaurant"
                          />
                        </div>
                      </>
                    )}

                    {property.type === "function_hall" && (
                      <>
                        <div>
                          <label className="block text-sm text-gray-700 mb-2">
                            Event Purpose
                          </label>
                          <input
                            type="text"
                            required
                            value={bookingForm.eventPurpose}
                            onChange={(e) =>
                              setBookingForm({
                                ...bookingForm,
                                eventPurpose: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Wedding, Conference, Birthday"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-2">
                            Number of Attendees
                          </label>
                          <input
                            type="number"
                            required
                            min="1"
                            max={property.capacity}
                            value={bookingForm.attendees}
                            onChange={(e) =>
                              setBookingForm({
                                ...bookingForm,
                                attendees: e.target.value,
                              })
                            }
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
                            value={bookingForm.vehicleType}
                            onChange={(e) =>
                              setBookingForm({
                                ...bookingForm,
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
                            value={bookingForm.plateNumber}
                            onChange={(e) =>
                              setBookingForm({
                                ...bookingForm,
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
                        value={bookingForm.paymentMethod}
                        onChange={(e) =>
                          setBookingForm({
                            ...bookingForm,
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
                        value={bookingForm.notes}
                        onChange={(e) =>
                          setBookingForm({
                            ...bookingForm,
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
        bookingForm.duration,
        bookingForm.paymentCycle,
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
                      Submit Booking Request
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
                  const isSelected = bookingForm.slotId === slot.id;
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