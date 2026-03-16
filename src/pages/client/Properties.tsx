import { useState, useMemo, useCallback } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useData } from "../../contexts/DataContext";
import type { UnitType } from "../../contexts/DataContext";
import { motion } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import {
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  House,
} from "lucide-react";
import { formatCurrency } from "../../utils/currency";
import {
  getUnitTypeLabel,
  getPriceLabel,
  calculateTotalAmount,
  getMinimumDuration,
} from "../../utils/propertyHelpers";

type DurationType = "hours" | "days" | "months";
type PriceRange = "all" | "0-1000" | "1001-5000" | "5001-10000" | "10001+";
type VisitMode = "online" | "onsite";
type PaymentIntent = "pay_onsite" | "pay_later";
type PaymentMethod =
  | "gcash"
  | "cash"
  | "cheque"
  | "paymaya"
  | "bank_transfer"
  | "credit_card";
type PaymentCycle = "monthly" | "quarterly" | "full";

interface ReservationForm {
  startDate: Date;
  endDate: Date;
  duration: number;
  durationType: DurationType;
  modeOfVisit: VisitMode;
  paymentIntent: PaymentIntent;
  paymentMethod: PaymentMethod;
  paymentCycle: PaymentCycle;
  notes: string;
  slotId: string;
  vehicleType: string;
  plateNumber: string;
  eventPurpose: string;
  attendees: string;
  businessType: string;
  appointmentDate?: Date;
  appointmentTime?: string;
}

const PRICE_RANGE_OPTIONS: { value: PriceRange; label: string }[] = [
  { value: "all", label: "All Prices" },
  { value: "0-1000", label: "₱0 - ₱1,000" },
  { value: "1001-5000", label: "₱1,001 - ₱5,000" },
  { value: "5001-10000", label: "₱5,001 - ₱10,000" },
  { value: "10001+", label: "₱10,001+" },
];

function getTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function computeEndFromForm(start: Date, duration: number, type: DurationType) {
  const end = new Date(start);

  if (type === "hours") {
    end.setHours(end.getHours() + duration);
  } else if (type === "days") {
    end.setDate(end.getDate() + duration - 1);
    end.setHours(23, 59, 59, 999);
  } else {
    end.setMonth(end.getMonth() + duration);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
  }

  return end;
}

function buildInitialReservationForm(unitType: UnitType): ReservationForm {
  const startDate = getTomorrow();

  if (unitType === "parking_slot") {
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(endDate.getDate() - 1);
    endDate.setHours(23, 59, 59, 999);

    return {
      startDate,
      endDate,
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
      appointmentDate: undefined,
      appointmentTime: "",
    };
  }

  if (unitType === "function_hall") {
    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    return {
      startDate,
      endDate,
      duration: 1,
      durationType: "days",
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
      appointmentDate: undefined,
      appointmentTime: "",
    };
  }

  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1);

  return {
    startDate,
    endDate,
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
    appointmentDate: undefined,
    appointmentTime: "",
  };
}

export default function ClientUnits() {
  const { user } = useAuth();
  const { units, addReservation, parkingSlots, reservations } = useData();
  const { sendSystemNotification } = useNotifications();

  const [isSlotPanelOpen, setIsSlotPanelOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<UnitType | "all">("all");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<PriceRange>("all");
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [reservationSuccess, setReservationSuccess] = useState(false);

  const [reservationForm, setReservationForm] = useState<ReservationForm>(
    buildInitialReservationForm("rental_space")
  );

  const hasUnits = useMemo(() => units.some((u) => u.available), [units]);

  const locations = useMemo(() => {
    return [
      "all",
      ...Array.from(
        new Set(
          units
            .map((u) => u.location || "")
            .filter((loc) => loc.trim() !== "")
        )
      ),
    ];
  }, [units]);

  const selectedUnitData = useMemo(() => {
    if (!selectedUnitId) return null;
    return units.find((u) => u.id === selectedUnitId) ?? null;
  }, [selectedUnitId, units]);

  const filteredUnits = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return units.filter((unit) => {
      const matchesSearch =
        q === "" ||
        unit.name.toLowerCase().includes(q) ||
        unit.description.toLowerCase().includes(q);

      const matchesType = filterType === "all" || unit.type === filterType;
      const matchesLocation =
        filterLocation === "all" || unit.location === filterLocation;

      let matchesPrice = true;
      switch (priceRange) {
        case "0-1000":
          matchesPrice = unit.price <= 1000;
          break;
        case "1001-5000":
          matchesPrice = unit.price > 1000 && unit.price <= 5000;
          break;
        case "5001-10000":
          matchesPrice = unit.price > 5000 && unit.price <= 10000;
          break;
        case "10001+":
          matchesPrice = unit.price > 10000;
          break;
      }

      return (
        unit.available &&
        matchesSearch &&
        matchesType &&
        matchesLocation &&
        matchesPrice
      );
    });
  }, [units, searchTerm, filterType, filterLocation, priceRange]);

  const reservedSlotIds = useMemo(() => {
    if (!reservationForm.startDate || !reservationForm.duration) {
      return new Set<string>();
    }

    const formStart = new Date(reservationForm.startDate);
    const formEnd = computeEndFromForm(
      formStart,
      reservationForm.duration,
      reservationForm.durationType
    );

    const reservedIds = reservations
      .filter((r) => r.unitType === "parking_slot" && r.slotId)
      .filter((r) => {
        const resStart = new Date(r.startDate);
        const resType = (r.durationType as DurationType) ?? "days";
        const resEnd = computeEndFromForm(resStart, r.duration, resType);
        return formStart <= resEnd && formEnd >= resStart;
      })
      .map((r) => r.slotId as string);

    return new Set(reservedIds);
  }, [
    reservations,
    reservationForm.startDate,
    reservationForm.duration,
    reservationForm.durationType,
  ]);

  const selectedSlotObject = useMemo(() => {
    if (!reservationForm.slotId) return null;
    return parkingSlots.find((slot) => slot.id === reservationForm.slotId) ?? null;
  }, [parkingSlots, reservationForm.slotId]);

  const estimatedTotal = useMemo(() => {
    if (!selectedUnitData) return 0;

    return calculateTotalAmount(
      selectedUnitData.type,
      selectedUnitData.price,
      reservationForm.duration,
      reservationForm.paymentCycle
    );
  }, [
    selectedUnitData,
    reservationForm.duration,
    reservationForm.paymentCycle,
  ]);

  const handleReserveNow = useCallback(
    (unitId: string) => {
      const unit = units.find((u) => u.id === unitId);
      if (!unit) return;

      setSelectedUnitId(unitId);
      setCurrentImageIndex(0);
      setReservationForm(buildInitialReservationForm(unit.type));
      setShowCalendar(false);
      setReservationSuccess(false);
      setShowReservationModal(true);
    },
    [units]
  );

  const handleCloseReservationModal = useCallback(() => {
    setShowReservationModal(false);
    setShowCalendar(false);
    setReservationSuccess(false);
    setCurrentImageIndex(0);
  }, []);

  const handleSlotSelectFromPanel = useCallback((slotId: string) => {
    setReservationForm((prev) => ({ ...prev, slotId }));
    setIsSlotPanelOpen(false);
  }, []);

  const clearSlotSelection = useCallback(() => {
    setReservationForm((prev) => ({ ...prev, slotId: "" }));
  }, []);

  const nextImage = useCallback(() => {
    if (!selectedUnitData) return;
    setCurrentImageIndex((prev) => (prev + 1) % selectedUnitData.images.length);
  }, [selectedUnitData]);

  const prevImage = useCallback(() => {
    if (!selectedUnitData) return;
    setCurrentImageIndex(
      (prev) => (prev - 1 + selectedUnitData.images.length) % selectedUnitData.images.length
    );
  }, [selectedUnitData]);

  const handleModeChange = useCallback((mode: VisitMode) => {
    setReservationForm((prev) => ({
      ...prev,
      modeOfVisit: mode,
      paymentIntent: mode === "online" ? "pay_later" : prev.paymentIntent,
      appointmentDate: mode === "online" ? undefined : prev.appointmentDate,
      appointmentTime: mode === "online" ? "" : prev.appointmentTime,
    }));
  }, []);

  const handleReservationSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!selectedUnitData || !user) return;

      if (
        reservationForm.modeOfVisit === "onsite" &&
        (!reservationForm.appointmentDate || !reservationForm.appointmentTime)
      ) {
        alert("Please select an appointment date and time.");
        return;
      }

      if (
        selectedUnitData.type === "parking_slot" &&
        !reservationForm.slotId
      ) {
        alert("Please select a specific parking slot before proceeding.");
        setIsSlotPanelOpen(true);
        return;
      }

      if (
        selectedUnitData.type === "rental_space" &&
        !reservationForm.businessType.trim()
      ) {
        alert("Please enter your business type.");
        return;
      }

      if (
        selectedUnitData.type === "function_hall" &&
        (!reservationForm.eventPurpose.trim() ||
          !reservationForm.attendees.trim())
      ) {
        alert("Please complete the function hall reservation details.");
        return;
      }

      if (
        selectedUnitData.type === "parking_slot" &&
        (!reservationForm.vehicleType.trim() ||
          !reservationForm.plateNumber.trim())
      ) {
        alert("Please enter your vehicle information.");
        return;
      }

      const reservationData: any = {
        userId: user.id,
        unitId: selectedUnitData.id,
        unitName: selectedUnitData.name,
        unitType: selectedUnitData.type,
        startDate: reservationForm.startDate.toISOString(),
        endDate: reservationForm.endDate.toISOString(),
        duration: reservationForm.duration,
        durationType: reservationForm.durationType,
        modeOfVisit: reservationForm.modeOfVisit,
        paymentIntent:
          reservationForm.modeOfVisit === "onsite"
            ? reservationForm.paymentIntent
            : "pay_later",
        paymentMethod: reservationForm.paymentMethod,
        totalAmount: estimatedTotal,
        notes: reservationForm.notes,
      };

      if (selectedUnitData.type === "rental_space") {
        reservationData.paymentCycle = reservationForm.paymentCycle;
        reservationData.businessType = reservationForm.businessType.trim();
      }

      if (selectedUnitData.type === "function_hall") {
        reservationData.eventPurpose = reservationForm.eventPurpose.trim();
        reservationData.attendees = parseInt(reservationForm.attendees || "0", 10);
      }

      if (selectedUnitData.type === "parking_slot") {
        reservationData.slotId = reservationForm.slotId;
        reservationData.vehicleType = reservationForm.vehicleType.trim();
        reservationData.plateNumber = reservationForm.plateNumber.trim();
      }

      if (reservationForm.modeOfVisit === "onsite") {
        reservationData.appointmentDate =
          reservationForm.appointmentDate?.toISOString();
        reservationData.appointmentTime = reservationForm.appointmentTime;
      }

      addReservation(reservationData);

      sendSystemNotification(
        user.id,
        "Reservation Request Submitted",
        `Your reservation request for ${selectedUnitData.name} has been submitted and is pending admin approval.`
      );

      setReservationSuccess(true);
      setTimeout(() => {
        setShowReservationModal(false);
        setReservationSuccess(false);
      }, 2000);
    },
    [
      selectedUnitData,
      user,
      reservationForm,
      estimatedTotal,
      addReservation,
      sendSystemNotification,
    ]
  );

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        <header>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            Browse units
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Secure a space or book an appointment for a tour
          </p>
        </header>

        {hasUnits && (
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex gap-2 sm:hidden">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search units..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={() => setShowFilterModal(true)}
                className="flex items-center justify-center px-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Filter className="size-5 text-gray-600" />
              </button>
            </div>

            <div className="hidden sm:flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search units..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as UnitType | "all")}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All Types</option>
                <option value="rental_space">Rental Spaces</option>
                <option value="function_hall">Function Halls</option>
                <option value="parking_slot">Parking Slots</option>
              </select>

              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value as PriceRange)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                {PRICE_RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc === "all" ? "All Locations" : loc}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUnits.map((unit) => (
            <div
              key={unit.id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              <img
                src={unit.images[0]}
                alt={unit.name}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <div className="text-xs text-blue-600 mb-1">
                  {getUnitTypeLabel(unit.type)}
                </div>

                <h3 className="mb-2">{unit.name}</h3>

                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {unit.description}
                </p>

                <div className="flex justify-between items-center mb-3">
                  <div>
                    <div className="text-blue-600">{formatCurrency(unit.price)}</div>
                    <div className="text-xs text-gray-500">
                      {getPriceLabel(unit.type)}
                    </div>
                  </div>

                  {unit.capacity && (
                    <div className="text-sm text-gray-600">{unit.capacity} pax</div>
                  )}
                </div>

                <button
                  onClick={() => handleReserveNow(unit.id)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Reserve Now
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredUnits.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="bg-blue-50 p-6 rounded-3xl shadow-sm mb-4">
              <House className="size-10 text-blue-500" />
            </div>

            <h3 className="text-lg font-bold text-gray-900">No units found</h3>

            <p className="text-gray-500 max-w-xs text-sm mt-1">
              Try adjusting your search or filters to see available units.
            </p>
          </motion.div>
        )}

        {showFilterModal && hasUnits && (
          <div className="fixed inset-0 z-50 flex items-end sm:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setShowFilterModal(false)}
            />

            <div className="relative w-full bg-white rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">Filters</h3>
                <button onClick={() => setShowFilterModal(false)}>
                  <X className="size-6 text-gray-500" />
                </button>
              </div>

              <div className="mb-4">
                <label className="text-sm text-gray-600 mb-1 block">
                  Unit Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as UnitType | "all")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="all">All Types</option>
                  <option value="rental_space">Rental Spaces</option>
                  <option value="function_hall">Function Halls</option>
                  <option value="parking_slot">Parking Slots</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="text-sm text-gray-600 mb-1 block">
                  Price Range
                </label>
                <select
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value as PriceRange)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {PRICE_RANGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="text-sm text-gray-600 mb-1 block">
                  Location
                </label>
                <select
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc === "all" ? "All Locations" : loc}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setShowFilterModal(false)}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {showReservationModal && selectedUnitData && (
          <div className="fixed inset-0 p-4 z-50 overflow-auto">
            <div className="bg-white rounded-lg max-w-4xl w-full mx-auto my-8 max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <div>
                  <div className="text-sm text-blue-600 mb-1">
                    {getUnitTypeLabel(selectedUnitData.type)}
                  </div>
                  <h2>{selectedUnitData.name}</h2>
                  <div className="text-sm text-gray-500 mb-1">
                    📍 {selectedUnitData.location}
                  </div>
                </div>

                <button
                  onClick={handleCloseReservationModal}
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
                      Your reservation is pending admin approval. We'll notify you
                      once it's processed.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <div className="relative mb-4">
                        <img
                          src={selectedUnitData.images[currentImageIndex]}
                          alt={selectedUnitData.name}
                          className="w-full h-48 object-cover rounded-lg"
                        />

                        {selectedUnitData.images.length > 1 && (
                          <>
                            <button
                              onClick={prevImage}
                              type="button"
                              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 p-1 rounded-full"
                            >
                              <ChevronLeft className="size-5" />
                            </button>

                            <button
                              onClick={nextImage}
                              type="button"
                              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 p-1 rounded-full"
                            >
                              <ChevronRight className="size-5" />
                            </button>
                          </>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mb-4">
                        {selectedUnitData.description}
                      </p>

                      <div className="bg-blue-50 p-4 rounded-lg mb-4">
                        <p className="text-sm text-gray-600 mb-1">Price</p>
                        <div className="text-blue-600">
                          {formatCurrency(selectedUnitData.price)}{" "}
                          <span className="text-sm">
                            {getPriceLabel(selectedUnitData.type)}
                          </span>
                        </div>
                      </div>

                      <div className="text-sm text-gray-600">
                        <p className="mb-1">
                          Minimum Duration:{" "}
                          {getMinimumDuration(selectedUnitData.type).value}{" "}
                          {getMinimumDuration(selectedUnitData.type).unit}
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleReservationSubmit} className="space-y-4">
                      <div className="p-4 border border-gray-200 rounded-lg space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            How do you want to proceed?
                          </label>
                          <select
                            value={reservationForm.modeOfVisit}
                            onChange={(e) =>
                              handleModeChange(e.target.value as VisitMode)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="online">Online / Digital Process</option>
                            <option value="onsite">On-site Visit / Tour</option>
                          </select>
                        </div>

                        {reservationForm.modeOfVisit === "onsite" && (
                          <div className="pt-4 border-t border-gray-200">
                            <div className="mt-6">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Appointment Date
                              </label>
                              <input
                                type="date"
                                value={
                                  reservationForm.appointmentDate
                                    ? reservationForm.appointmentDate
                                        .toISOString()
                                        .split("T")[0]
                                    : ""
                                }
                                min={new Date().toISOString().split("T")[0]}
                                onChange={(e) =>
                                  setReservationForm((prev) => ({
                                    ...prev,
                                    appointmentDate: e.target.value
                                      ? new Date(`${e.target.value}T00:00:00`)
                                      : undefined,
                                  }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            <div className="mt-4">
                              <label className="block text-sm text-gray-700 mb-1">
                                Appointment Time
                              </label>
                              <input
                                type="time"
                                min="09:00"
                                max="17:00"
                                value={reservationForm.appointmentTime || ""}
                                onChange={(e) =>
                                  setReservationForm((prev) => ({
                                    ...prev,
                                    appointmentTime: e.target.value,
                                  }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            <label className="block text-sm font-medium text-gray-700 mt-6 mb-2">
                              What is the goal of your visit?
                            </label>

                            <div className="space-y-2">
                              <label
                                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                                  reservationForm.paymentIntent === "pay_later"
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="paymentIntent"
                                  value="pay_later"
                                  checked={reservationForm.paymentIntent === "pay_later"}
                                  onChange={(e) =>
                                    setReservationForm((prev) => ({
                                      ...prev,
                                      paymentIntent: e.target.value as PaymentIntent,
                                    }))
                                  }
                                  className="size-4 text-blue-600 focus:ring-blue-500"
                                />
                                <div>
                                  <p className="font-medium text-sm">Just Viewing</p>
                                  <p className="text-xs text-gray-500">
                                    I'd like a tour of the unit first before deciding.
                                  </p>
                                </div>
                              </label>

                              <label
                                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                                  reservationForm.paymentIntent === "pay_onsite"
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="paymentIntent"
                                  value="pay_onsite"
                                  checked={reservationForm.paymentIntent === "pay_onsite"}
                                  onChange={(e) =>
                                    setReservationForm((prev) => ({
                                      ...prev,
                                      paymentIntent: e.target.value as PaymentIntent,
                                    }))
                                  }
                                  className="size-4 text-blue-600 focus:ring-blue-500"
                                />
                                <div>
                                  <p className="font-medium text-sm">Ready to Reserve</p>
                                  <p className="text-xs text-gray-500">
                                    I want to secure my slot and pay during my visit.
                                  </p>
                                </div>
                              </label>
                            </div>

                            {reservationForm.paymentIntent === "pay_later" && (
                              <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-800">
                                ✨ We look forward to showing you around! No payment
                                is required for this visit.
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {!(reservationForm.modeOfVisit === "onsite" &&
                        reservationForm.paymentIntent === "pay_later") && (
                        <>
                          {selectedUnitData.type === "parking_slot" && (
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
                                    {`${reservationForm.startDate.toLocaleDateString()} – ${reservationForm.endDate.toLocaleDateString()}`}
                                  </span>
                                </button>

                                {showCalendar && (
                                  <div className="mt-2">
                                    <Calendar
                                      value={reservationForm.startDate}
                                      selectRange={false}
                                      minDate={getTomorrow()}
                                      onChange={(value) => {
                                        if (value instanceof Date) {
                                          const newStart = new Date(value);
                                          const newEnd = new Date(newStart);
                                          newEnd.setMonth(newEnd.getMonth() + 1);
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
                                <label className="block text-sm text-gray-700 mb-2">
                                  Calculated Duration
                                </label>
                                <input
                                  type="text"
                                  readOnly
                                  value={`${reservationForm.duration} month(s)`}
                                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg"
                                />
                              </div>

                              <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Parking Slot
                                </label>

                                {selectedSlotObject ? (
                                  <div className="flex items-center gap-4 bg-gray-100 p-3 border border-gray-300 rounded-lg">
                                    <img
                                      src={selectedSlotObject.imageUrl}
                                      alt={selectedSlotObject.name}
                                      className="w-24 h-16 object-cover rounded-md"
                                    />
                                    <div className="flex-grow">
                                      <p className="text-xs text-gray-500">
                                        Selected Slot
                                      </p>
                                      <p className="font-bold text-lg text-blue-700">
                                        {selectedSlotObject.name}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={clearSlotSelection}
                                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                      aria-label="Clear selection"
                                    >
                                      <X className="w-5 h-5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setIsSlotPanelOpen(true)}
                                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-600 transition-colors"
                                  >
                                    Click to View & Select a Slot
                                  </button>
                                )}
                              </div>

                              <div>
                                <label className="block text-sm text-gray-700 mb-2">
                                  Vehicle Type
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={reservationForm.vehicleType}
                                  onChange={(e) =>
                                    setReservationForm((prev) => ({
                                      ...prev,
                                      vehicleType: e.target.value,
                                    }))
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
                                    setReservationForm((prev) => ({
                                      ...prev,
                                      plateNumber: e.target.value,
                                    }))
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="ABC 1234"
                                />
                              </div>
                            </>
                          )}

                          {selectedUnitData.type === "function_hall" && (
                            <div>
                              <label className="block text-sm text-gray-700 mb-2">
                                Reservation Dates
                              </label>

                              <button
                                type="button"
                                onClick={() => setShowCalendar((s) => !s)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left flex justify-between items-center"
                              >
                                <span>
                                  {`${reservationForm.startDate.toLocaleDateString()} - ${reservationForm.endDate.toLocaleDateString()}`}
                                </span>
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

                                        const dayCount =
                                          Math.round(
                                            (end.getTime() - start.getTime()) /
                                              (1000 * 60 * 60 * 24)
                                          ) + 1;

                                        setReservationForm((prev) => ({
                                          ...prev,
                                          startDate: start,
                                          endDate: end,
                                          duration: dayCount,
                                          durationType: "days",
                                        }));

                                        setShowCalendar(false);
                                      }
                                    }}
                                    value={[
                                      reservationForm.startDate,
                                      reservationForm.endDate,
                                    ]}
                                    selectRange={true}
                                    minDate={getTomorrow()}
                                    className="w-full border rounded-lg shadow-lg"
                                  />
                                </div>
                              )}

                              <div className="mt-4">
                                <label className="block text-sm text-gray-700 mb-2">
                                  Calculated Duration
                                </label>
                                <input
                                  type="text"
                                  readOnly
                                  value={`${reservationForm.duration} day(s)`}
                                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg"
                                />
                              </div>
                            </div>
                          )}

                          {selectedUnitData.type === "rental_space" && (
                            <>
                              <div>
                                <label className="block text-sm text-gray-700 mb-2">
                                  Lease Start Date
                                </label>

                                <button
                                  type="button"
                                  onClick={() => setShowCalendar((s) => !s)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left flex justify-between items-center"
                                >
                                  <span>
                                    {reservationForm.startDate.toLocaleDateString()}
                                  </span>
                                </button>

                                {showCalendar && (
                                  <div className="mt-2">
                                    <Calendar
                                      value={reservationForm.startDate}
                                      selectRange={false}
                                      minDate={getTomorrow()}
                                      onChange={(value) => {
                                        if (value instanceof Date) {
                                          const newStart = new Date(value);
                                          const newEnd = new Date(newStart);
                                          newEnd.setFullYear(
                                            newEnd.getFullYear() + reservationForm.duration
                                          );

                                          setReservationForm((prev) => ({
                                            ...prev,
                                            startDate: newStart,
                                            endDate: newEnd,
                                          }));
                                          setShowCalendar(false);
                                        }
                                      }}
                                      className="w-full border rounded-lg shadow-lg"
                                    />
                                  </div>
                                )}
                              </div>

                              <div>
                                <label className="block text-sm text-gray-700 mb-2 mt-4">
                                  Duration (years)
                                </label>
                                <input
                                  type="number"
                                  required
                                  min={getMinimumDuration(selectedUnitData.type).value}
                                  value={reservationForm.duration}
                                  onChange={(e) => {
                                    const newDuration = parseInt(e.target.value, 10) || 1;
                                    const newEndDate = new Date(reservationForm.startDate);
                                    newEndDate.setFullYear(
                                      newEndDate.getFullYear() + newDuration
                                    );

                                    setReservationForm((prev) => ({
                                      ...prev,
                                      duration: newDuration,
                                      endDate: newEndDate,
                                    }));
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                              </div>

                              <div className="mt-4">
                                <label className="block text-sm text-gray-700 mb-2">
                                  Lease End Date (Auto-calculated)
                                </label>
                                <input
                                  type="text"
                                  readOnly
                                  value={reservationForm.endDate.toLocaleDateString()}
                                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg"
                                />
                              </div>

                              <div>
                                <label className="block text-sm text-gray-700 mb-2">
                                  Payment Cycle
                                </label>
                                <select
                                  value={reservationForm.paymentCycle}
                                  onChange={(e) =>
                                    setReservationForm((prev) => ({
                                      ...prev,
                                      paymentCycle: e.target.value as PaymentCycle,
                                    }))
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="monthly">Monthly Installments</option>
                                  <option value="quarterly">Quarterly Payments</option>
                                  <option value="full">Full Payment</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm text-gray-700 mb-2">
                                  Business Type
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={reservationForm.businessType}
                                  onChange={(e) =>
                                    setReservationForm((prev) => ({
                                      ...prev,
                                      businessType: e.target.value,
                                    }))
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="e.g., Retail, Office, Restaurant"
                                />
                              </div>
                            </>
                          )}

                          {selectedUnitData.type === "function_hall" && (
                            <>
                              <div>
                                <label className="block text-sm text-gray-700 mb-2">
                                  Event Purpose
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={reservationForm.eventPurpose}
                                  onChange={(e) =>
                                    setReservationForm((prev) => ({
                                      ...prev,
                                      eventPurpose: e.target.value,
                                    }))
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
                                  min={1}
                                  max={selectedUnitData.capacity}
                                  value={reservationForm.attendees}
                                  onChange={(e) =>
                                    setReservationForm((prev) => ({
                                      ...prev,
                                      attendees: e.target.value,
                                    }))
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder={`Max: ${selectedUnitData.capacity}`}
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
                                setReservationForm((prev) => ({
                                  ...prev,
                                  paymentMethod: e.target.value as PaymentMethod,
                                }))
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="gcash">GCash</option>
                              <option value="cash">Cash</option>
                              <option value="cheque">Cheque</option>
                              <option value="paymaya">PayMaya</option>
                              <option value="bank_transfer">Bank Transfer</option>
                              <option value="credit_card">Credit/Debit Card</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm text-gray-700 mb-2">
                              Additional Notes (Optional)
                            </label>
                            <textarea
                              value={reservationForm.notes}
                              onChange={(e) =>
                                setReservationForm((prev) => ({
                                  ...prev,
                                  notes: e.target.value,
                                }))
                              }
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Any special requests or requirements"
                            />
                          </div>

                          <div className="bg-gray-100 p-4 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">Estimated Total</p>
                            <div className="text-gray-900 font-bold text-lg">
                              {formatCurrency(estimatedTotal)}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              * Payment required after admin approval
                            </p>
                          </div>

                          <button
                            type="submit"
                            disabled={
                              reservationForm.modeOfVisit === "onsite" &&
                              (!reservationForm.appointmentDate ||
                                !reservationForm.appointmentTime)
                            }
                            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                          >
                            Submit Reservation Request
                          </button>
                        </>
                      )}
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {isSlotPanelOpen && (
          <div
            className="fixed inset-0 z-[60] bg-black bg-opacity-60 flex items-center justify-center p-4"
            onClick={() => setIsSlotPanelOpen(false)}
          >
            <div
              className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-lg font-semibold">Select Your Parking Slot</h3>
                <button
                  onClick={() => setIsSlotPanelOpen(false)}
                  className="text-gray-500 hover:text-gray-800"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {parkingSlots.map((slot) => {
                    const isReserved = reservedSlotIds.has(slot.id);
                    const isSelected = reservationForm.slotId === slot.id;

                    return (
                      <button
                        type="button"
                        key={slot.id}
                        disabled={isReserved}
                        onClick={() => handleSlotSelectFromPanel(slot.id)}
                        className={`border-2 rounded-lg overflow-hidden relative text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          isSelected ? "border-blue-600 scale-105" : "border-transparent"
                        } ${isReserved ? "cursor-not-allowed" : "hover:border-blue-500"}`}
                      >
                        {isSelected && (
                          <div className="absolute top-1 right-1 bg-blue-600 text-white rounded-full p-1 z-10">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        )}

                        <img
                          src={slot.imageUrl}
                          alt={slot.name}
                          className="w-full h-32 object-cover"
                        />

                        {isReserved && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60">
                            <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
                              TAKEN
                            </span>
                          </div>
                        )}

                        <div className="p-2 bg-gray-100">
                          <p className="text-sm font-bold text-center text-gray-800">
                            {slot.name}
                          </p>
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
    </div>
  );
}