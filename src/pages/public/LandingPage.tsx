import { Link } from "react-router-dom";
import { useState } from "react";
import { useData } from "../../contexts/DataContext";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatCurrency } from "../../utils/currency";
import {
  getPropertyTypeLabel,
  getPriceLabel,
} from "../../utils/propertyHelpers";

type ParkingFormState = {
  name: string;
  contact: string;
  email: string;
  plateNumber: string;
  vehicleType: "Motorcycle" | "Sedan" | "SUV" | "Other" | "";
  startDate: Date; // Use Date object, not string
  endDate: Date;
  duration: number;
  durationType: 'hours' | 'days';
  slotId: string;
  paymentMethod: string;
  reference: string;
  notes: string;
};

export default function LandingPage() {
  const {
    properties,
    contentSettings,
    addInquiry,
    addParkingReservation,
    parkingSlots, // The list of all 10 slots
    guestParkingReservations, // The list of existing reservations
  } = useData();
  const [selectedProperty, setSelectedProperty] = useState<
    string | null
  >(null);
  const [inquirySubmitted, setInquirySubmitted] =
    useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [inquiryForm, setInquiryForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [showCalendar, setShowCalendar] = useState(false);

  const featuredProperties = properties
    .filter((p) => p.available)
    .slice(0, 6);
  const parkingSlotProperty = properties.find(
    (p) => p.type === "parking_slot" && p.id === "p3", // Assuming 'p3' is the ID for "Covered Parking - Section A"
  );
  const property = selectedProperty
    ? properties.find((p) => p.id === selectedProperty)
    : null;

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addInquiry(inquiryForm);
    setInquirySubmitted(true);
    setInquiryForm({
      name: "",
      email: "",
      subject: "",
      message: "",
    });
    setTimeout(() => setInquirySubmitted(false), 3000);
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

  const [isSlotPanelOpen, setIsSlotPanelOpen] = useState(false);
  const [isFormExpanded, setIsFormExpanded] = useState(false);

  const handleSlotSelectFromPanel = (slotId: string) => {
    setParkingForm((prevForm) => ({
      ...prevForm,
      slotId: slotId,
    }));
    setIsSlotPanelOpen(false);
  };

  const clearSlotSelection = () => {
    setParkingForm((prevForm) => ({
      ...prevForm,
      slotId: "",
    }));
  };

  const [parkingForm, setParkingForm] = useState<ParkingFormState>({
    name: "",
    contact: "",
    email: "",
    plateNumber: "",
    vehicleType: "",
    startDate: new Date(),
    endDate: new Date(),
    duration: 1,
    durationType: 'hours',
    slotId: "",
    paymentMethod: "",
    reference: "",
    notes: ""
  });

  const [reservationSubmitted, setReservationSubmitted] =
    useState(false);

    // ✅ FIX 3: Fully corrected availability logic
  const getReservedSlotIds = () => {
    if (!parkingForm.startDate || !parkingForm.duration) {
      return new Set<string>();
    }

    const formStart = new Date(parkingForm.startDate);
    // Determine the multiplier based on the selected duration type
    const multiplier = parkingForm.durationType === 'hours'
      ? 60 * 60 * 1000 // milliseconds in an hour
      : 24 * 60 * 60 * 1000; // milliseconds in a day
    const formEnd = new Date(formStart.getTime() + parkingForm.duration * multiplier);

    const reservedIds = guestParkingReservations
      .filter((res) => {
        const resStart = new Date(res.startDate);
        // Also check the duration type of the existing reservation
        const resMultiplier = res.durationType === 'hours'
          ? 60 * 60 * 1000
          : 24 * 60 * 60 * 1000;
        const resEnd = new Date(resStart.getTime() + res.duration * resMultiplier);

        // Standard check for time overlap
        return formStart < resEnd && formEnd > resStart;
      })
      .map((res) => res.slotId);

    return new Set<string>(reservedIds);
  };
  const reservedSlotIds = getReservedSlotIds();

  const handleParkingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedSlot = parkingSlots.find((p) => p.id === parkingForm.slotId);

    if (!selectedSlot) {
      console.error("Could not find the selected parking slot. Reservation failed.");
      return;
    }

    // ✅ FIX 4: Convert date to ISO string only upon submission
    addParkingReservation({
      ...parkingForm,
      startDate: parkingForm.startDate.toISOString(), // Convert Date to string
      slotName: selectedSlot.name
    });

    setReservationSubmitted(true);
    setTimeout(() => {
      setIsFormExpanded(false);
      setReservationSubmitted(false);
      // Reset the form correctly
      setParkingForm({
        name: "",
        contact: "",
        email: "",
        plateNumber: "",
        vehicleType: "",
        startDate: new Date(),
        endDate: new Date(),
        duration: 1,
        durationType: 'hours',
        slotId: "",
        paymentMethod: "",
        reference: "",
        notes: ""
      });
    }, 4000);
  };


  const selectedSlotObject = parkingForm.slotId
    ? parkingSlots.find(
        (slot) => slot.id === parkingForm.slotId,
      )
    : null;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Building2 className="size-8 text-blue-600" />
              <h1 className="text-blue-600">
                Commerciales Flores
              </h1>
            </div>
            <div className="flex gap-3">
              <Link to="/login" className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                Login
              </Link>
              <Link to="/register" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
  className="relative bg-cover bg-center text-white py-20"
  // 1. Set the background image URL here.
  //    Replace this Unsplash URL with your own image.
  style={{ backgroundImage: "url('https://images.unsplash.com/photo-1590674899484-d5640e854abe?q=80&w=1167&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')" }}
>
  {/* 2. Add a semi-transparent overlay to ensure text is readable */}
  <div className="absolute inset-0 bg-black opacity-50"></div>

  {/* 3. Add `relative` to this div so it sits on top of the overlay */}
  <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
    <h1 className="mb-4">{contentSettings.heroTitle}</h1>
    <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
      {contentSettings.heroSubtitle}
    </p>
    <div className="flex gap-4 justify-center">
      <Link to="/register" className="px-6 py-3 bg-white text-blue-700 rounded-lg hover:bg-blue-50 transition-colors">
        Get Started
      </Link>
      <a href="#properties" className="px-6 py-3 border border-white text-white rounded-lg hover:bg-white hover:text-blue-700 transition-colors">
        View Properties
      </a>
    </div>
  </div>
</section>

      {/* Announcements */}
      {contentSettings.announcements.length > 0 && (
        <section className="bg-yellow-50 border-b border-yellow-100 py-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-1">
              {contentSettings.announcements.map((announcement, index) => (
                <p key={index} className="text-sm text-yellow-800">📢 {announcement}</p>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About Us */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="mb-4">About Us</h2>
            <p className="text-gray-600 max-w-3xl mx-auto">{contentSettings.aboutUs}</p>
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section id="properties" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="mb-4">Featured Properties</h2>
            <p className="text-gray-600">Browse our available rental spaces, function halls, and parking areas</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredProperties
              .filter((p) => p.type !== "parking_slot")
              .map((property) => (
                <div key={property.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => { setSelectedProperty(property.id); setCurrentImageIndex(0); }}>
                  <img src={property.images[0]} alt={property.name} className="w-full h-48 object-cover"/>
                  <div className="p-4">
                    <div className="text-xs text-blue-600 mb-1">{getPropertyTypeLabel(property.type)}</div>
                    <h3 className="mb-2">{property.name}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{property.description}</p>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-blue-600">{formatCurrency(property.price)}</div>
                        <div className="text-xs text-gray-500">{getPriceLabel(property.type)}</div>
                      </div>
                      <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">View Details</button>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {parkingSlotProperty && (
            <div className="mt-16 pt-16 border-t border-gray-200" id="parking">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-2">
                    {/* Left Side: Image and Details */}
                    {/* Left Side: Image and Details */}
<div className="p-6 flex flex-col">
  <img src={parkingSlotProperty.images[0]} alt={parkingSlotProperty.name} className="w-full h-60 object-cover rounded-lg"/>
  <div className="mt-4 flex-grow flex flex-col">
    <h3 className="text-2xl font-bold">{parkingSlotProperty.name}</h3>
    <p className="text-gray-600 mt-2 flex-grow">{parkingSlotProperty.description}</p>
    
    {/* ✅ START: NEW DYNAMIC PRICE DISPLAY */}
    <div className="mt-6 bg-blue-50 p-4 rounded-lg">
      <p className="text-sm text-gray-600 mb-1">Rate</p>
      <div className="text-blue-600 font-bold text-xl">
        {/* Assumes parking price is hourly. Adjust if you have a separate daily rate. */}
        {formatCurrency(parkingSlotProperty.price)}{" "}
        <span className="text-sm font-normal">
          per {parkingForm.durationType === 'hours' ? 'hour' : 'day'}
        </span>
      </div>
    </div>
    {/* ✅ END: NEW DYNAMIC PRICE DISPLAY */}

  </div>
</div>


                    {/* Right Side: EXPANDABLE RESERVATION FORM */}
                    <div className="p-6 bg-gray-50 flex flex-col">
                      <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsFormExpanded(!isFormExpanded)} aria-expanded={isFormExpanded} aria-controls="parking-form-container">
                        <div className="flex-grow">
                          <h2 className="text-xl font-bold">Reserve a Parking Slot</h2>
                          <p className="text-sm text-gray-600">No account required to reserve. Click to begin.</p>
                        </div>
                        <div className="flex-shrink-0 ml-4">
                          <div className="size-10 border border-gray-400 rounded-full flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${isFormExpanded ? "rotate-180" : ""}`}>
                              <path d="m6 9 6 6 6-6"></path>
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div id="parking-form-container" className={`transition-all duration-500 ease-in-out grid overflow-hidden ${isFormExpanded ? "grid-rows-[1fr] opacity-100 pt-6" : "grid-rows-[0fr] opacity-0"}`}>
                        <div className="min-h-0">
                          {reservationSubmitted ? (
                            <div className="flex-grow flex items-center justify-center text-center bg-green-50 p-6 rounded-lg">
                              <h3 className="text-green-700 font-semibold text-lg">Thank you, your slot is reserved!</h3>
                            </div>
                          ) : (
                            <form onSubmit={handleParkingSubmit} className="space-y-4">
                              <h4 className="text-sm font-semibold text-gray-800 border-b pb-2">Personal Details</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <input type="text" placeholder="Your Name" required value={parkingForm.name} onChange={(e) => setParkingForm({ ...parkingForm, name: e.target.value })} className="w-full px-3 py-2 text-sm border-gray-300 rounded-md" />
                                <input type="text" placeholder="Contact Number" required value={parkingForm.contact} onChange={(e) => setParkingForm({ ...parkingForm, contact: e.target.value })} className="w-full px-3 py-2 text-sm border-gray-300 rounded-md" />
                                <input type="email" placeholder="Email" required value={parkingForm.email} onChange={(e) => setParkingForm({ ...parkingForm, email: e.target.value })} className="w-full px-3 py-2 text-sm border-gray-300 rounded-md col-span-2" />
                              </div>

                              <h4 className="text-sm font-semibold text-gray-800 border-b pb-2 pt-2">Vehicle Information</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <input type="text" placeholder="Plate Number" required value={parkingForm.plateNumber} onChange={(e) => setParkingForm({ ...parkingForm, plateNumber: e.target.value })} className="w-full px-3 py-2 text-sm border-gray-300 rounded-md" />
                                <select required value={parkingForm.vehicleType} onChange={(e) => setParkingForm({ ...parkingForm, vehicleType: e.target.value as any })} className="w-full px-3 py-2 text-sm border-gray-300 rounded-md">
                                  <option value="">Vehicle Type</option>
                                  <option value="Motorcycle">Motorcycle</option>
                                  <option value="Sedan">Sedan</option>
                                  <option value="SUV">SUV</option>
                                  <option value="Other">Other</option>
                                </select>
                              </div>

                              {/* ✅ START: CORRECTED RESERVATION DETAILS JSX */}

<h4 className="text-sm font-semibold text-gray-800 border-b pb-2 pt-2">
  Reservation Details
</h4>

{/* Hourly/Daily Toggle */}
<div>
  <label className="block text-sm text-gray-700 mb-2">Booking Type</label>
  <div className="flex bg-gray-200 p-1 rounded-lg">
    <button type="button" onClick={() => setParkingForm({ ...parkingForm, durationType: 'hours' })} className={`flex-1 py-1 rounded-md text-sm transition-colors ${
      // ✅ FIX
      parkingForm.durationType === 'hours' ? 'bg-white shadow' : 'hover:bg-gray-300'
    }`}>
      Hourly
    </button>
    <button type="button" onClick={() => setParkingForm({ ...parkingForm, durationType: 'days' })} className={`flex-1 py-1 rounded-md text-sm transition-colors ${
      // ✅ FIX
      parkingForm.durationType === 'days' ? 'bg-white shadow' : 'hover:bg-gray-300'
    }`}>
      Daily
    </button>
  </div>
</div>

{/* Input for Hourly Parking */}
{
  // ✅ FIX
  parkingForm.durationType === 'hours' && (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs text-gray-700 mb-1">Start Date & Time</label>
        <input type="datetime-local" required value={parkingForm.startDate.toISOString().slice(0, 16)} onChange={(e) => setParkingForm({ ...parkingForm, startDate: new Date(e.target.value) })} min={new Date().toISOString().slice(0, 16)} className="w-full px-3 py-2 text-sm border-gray-300 rounded-lg" />
      </div>
      <div>
        <label className="block text-xs text-gray-700 mb-1">Duration (hours)</label>
        <input type="number" required min="1" value={parkingForm.duration} onChange={(e) => setParkingForm({ ...parkingForm, duration: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2 text-sm border-gray-300 rounded-lg" />
      </div>
    </div>
  )
}

{/* --- ✅ REINSTATED: Calendar with Date Range for Daily Parking --- */}
{parkingForm.durationType === 'days' && (
  <div>
    <label className="block text-sm text-gray-700 mb-2">Select Booking Dates</label>
    <button
      type="button"
      onClick={() => setShowCalendar(!showCalendar)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left flex justify-between items-center"
    >
      <span>
        {/* Display the full date range */}
        {`${parkingForm.startDate.toLocaleDateString()} - ${parkingForm.endDate.toLocaleDateString()}`}
      </span>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
    </button>
    {showCalendar && (
      <div className="mt-2">
        <Calendar
          onChange={(value) => {
            // Logic to handle the date range array
            if (Array.isArray(value) && value[0] && value[1]) {
              const start = new Date(value[0].setHours(0, 0, 0, 0));
              const end = new Date(value[1].setHours(0, 0, 0, 0));
              
              // Accurately calculate the number of days
              const dayCount = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
              
              setParkingForm({ 
                ...parkingForm, 
                startDate: start, 
                endDate: end, 
                duration: dayCount 
              });
              setShowCalendar(false);
            }
          }}
          value={[parkingForm.startDate, parkingForm.endDate]}
          selectRange={true} // Re-enabled date range selection
          minDate={new Date()}
          className="w-full border rounded-lg shadow-lg"
        />
      </div>
    )}
    {/* Display the auto-calculated duration as read-only feedback */}
    <div className="mt-4">
      <label className="block text-sm text-gray-700 mb-2">Calculated Duration</label>
      <input
        type="text"
        readOnly
        value={`${parkingForm.duration} day(s)`}
        className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg"
      />
    </div>
  </div>
)}

{/* ✅ END: FINAL AND CORRECTED RESERVATION DETAILS JSX */}



                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Parking Slot</label>
                                {selectedSlotObject ? (
                                  <div className="flex items-center gap-4 bg-white p-3 border border-gray-300 rounded-lg">
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
                              
                              <div>
                                <select required value={parkingForm.paymentMethod} onChange={(e) => setParkingForm({ ...parkingForm, paymentMethod: e.target.value as any })} className="w-full px-3 py-2 text-sm border-gray-300 rounded-md">
                                  <option value="">Select Payment Method</option>
                                  <option value="cash">Cash on Arrival</option>
                                  <option value="gcash">GCash</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs text-gray-700 mb-1">Additional Notes (Optional)</label>
                                <textarea value={parkingForm.notes} onChange={(e) => setParkingForm({ ...parkingForm, notes: e.target.value })} rows={3} className="w-full px-3 py-2 text-sm border-gray-300 rounded-md" placeholder="e.g., Requesting a spot near the entrance..." />
                              </div>

                              <div className="pt-2">
                                <button type="submit" disabled={!parkingForm.slotId} className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
                                  Reserve Now
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* ✅ FIXED: The two closing divs below were in the wrong place. */}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
      
      {/* isSlotPanelOpen Modal and other modals/sections... */}
      {isSlotPanelOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center p-4" onClick={() => setIsSlotPanelOpen(false)}>
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
                  const isSelected = parkingForm.slotId === slot.id;
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

      {/* Contact Section */}
      <section id="contact" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="mb-6">Contact Us</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="size-5 text-blue-600 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="text-gray-900">{contentSettings.contactEmail}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="size-5 text-blue-600 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="text-gray-900">{contentSettings.contactPhone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="size-5 text-blue-600 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="text-gray-900">{contentSettings.contactAddress}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-4">Send us a message</h3>
              <p className="text-sm text-gray-600 mb-4">No account required. We'll get back to you shortly.</p>
              {inquirySubmitted && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">Thank you! We've received your inquiry.</div>
              )}
              <form onSubmit={handleInquirySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Name</label>
                  <input type="text" required value={inquiryForm.name} onChange={(e) => setInquiryForm({ ...inquiryForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Email</label>
                  <input type="email" required value={inquiryForm.email} onChange={(e) => setInquiryForm({ ...inquiryForm, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Subject</label>
                  <input type="text" required value={inquiryForm.subject} onChange={(e) => setInquiryForm({ ...inquiryForm, subject: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Message</label>
                  <textarea required value={inquiryForm.message} onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Send Inquiry</button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">© 2025 Commerciales Flores. All rights reserved.</p>
          <p className="text-sm text-gray-500 mt-2">Compliant with the Philippine Data Privacy Act of 2012</p>
        </div>
      </footer>

      {/* Property Detail Modal */}
      {property && (
        <div className="fixed inset-0 z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-auto my-8 shadow-xl">
            <div className="flex justify-between items-start p-6 border-b border-gray-200">
              <div>
                <div className="text-sm text-blue-600 mb-1">{getPropertyTypeLabel(property.type)}</div>
                <h2 className="text-lg font-semibold">{property.name}</h2>
              </div>
              <button onClick={() => setSelectedProperty(null)} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="size-6" /></button>
            </div>
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="relative">
                <img src={property.images[currentImageIndex]} alt={property.name} className="w-full h-96 object-cover rounded-lg" />
                {property.images.length > 1 && (
                  <>
                    <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 p-2 rounded-full hover:bg-opacity-100 transition-all"><ChevronLeft className="size-6" /></button>
                    <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 p-2 rounded-full hover:bg-opacity-100 transition-all"><ChevronRight className="size-6" /></button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {property.images.map((_, index) => (
                        <div key={index} className={`size-2 rounded-full ${index === currentImageIndex ? "bg-white" : "bg-white bg-opacity-50"}`} />
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div>
                <h3 className="mb-2 font-semibold">Description</h3>
                <p className="text-gray-600">{property.description}</p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold">Features</h3>
                <ul className="grid grid-cols-2 gap-2">
                  {property.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-gray-600">
                      <div className="size-1.5 bg-blue-600 rounded-full" />{feature}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Price</p>
                  <div className="text-blue-600">{formatCurrency(property.price)} <span className="text-sm">{getPriceLabel(property.type)}</span></div>
                </div>
                {property.capacity && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Capacity</p>
                    <p className="text-gray-900">{property.capacity} persons</p>
                  </div>
                )}
              </div>
              <div>
                <h3 className="mb-2 font-semibold">Policies</h3>
                <p className="text-sm text-gray-600">{property.policies}</p>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <Link to="/register" className="block w-full text-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Book Now - Sign Up Required</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
