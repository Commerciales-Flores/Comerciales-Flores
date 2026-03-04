import { useState } from "react";
import { useData } from "../../contexts/DataContext";
import type { UnitType } from "../../contexts/DataContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  Search,
  Filter,
  MapPin,
  Users,
  Maximize,
  Calendar,
  CheckCircle,
} from "lucide-react";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import BookingModal from "./BookingModal";
import { formatCurrency } from "../../utils/currency"; // ✅ Good to use consistent currency formatting

export default function BrowseSpaces() {
  // ✅ FIX 1: Grab 'units' instead of 'spaces'
  const { units } = useData();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  
  // ✅ FIX 2: Use UnitType from DataContext
  const [filterType, setFilterType] = useState<UnitType | "all">("all");
  const [filterAvailability, setFilterAvailability] = useState<"all" | "available" | "occupied">("all");
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedPriceRange, setSelectedPriceRange] = useState<'all' | '0-5000' | '5000-10000' | '10000-20000' | '20000+'>('all');

  const filteredUnits = units.filter(unit => {
    const matchesSearch = unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          unit.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || unit.type === filterType;
    
    // ✅ FIX 3: Evaluate the boolean `unit.available`
    const matchesAvailability = filterAvailability === 'all' || 
                                (filterAvailability === 'available' && unit.available) ||
                                (filterAvailability === 'occupied' && !unit.available);
  
    let matchesPrice = true;
    if (selectedPriceRange !== 'all') {
      const price = unit.price;
      switch (selectedPriceRange) {
        case '0-5000':
          matchesPrice = price <= 5000;
          break;
        case '5000-10000':
          matchesPrice = price > 5000 && price <= 10000;
          break;
        case '10000-20000':
          matchesPrice = price > 10000 && price <= 20000;
          break;
        case '20000+':
          matchesPrice = price > 20000;
          break;
      }
    }
  
    return matchesSearch && matchesType && matchesAvailability && matchesPrice;
  });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "rental_space":
        return "Office / Commercial Unit";
      case "function_hall":
        return "Function Hall";
      case "parking_slot":
        return "Parking Slot";
      default:
        return type;
    }
  };

  const getPriceSuffix = (type: string) => {
    switch (type) {
      case "rental_space": return "/ month";
      case "function_hall": return "/ day";
      case "parking_slot": return "/ hour";
      default: return "";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">
          Browse Available Properties
        </h1>
        <p className="text-gray-600">
          Find the perfect space for your business needs
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search properties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">
              Type
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">All Types</option>
                <option value="rental_space">Commercial Units</option>
                <option value="function_hall">Function Halls</option>
                <option value="parking_slot">Parking</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Price Range</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={selectedPriceRange}
                onChange={(e) => setSelectedPriceRange(e.target.value as any)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">All Prices</option>
                <option value="0-5000">Up to ₱5,000</option>
                <option value="5000-10000">₱5,001 - ₱10,000</option>
                <option value="10000-20000">₱10,001 - ₱20,000</option>
                <option value="20000+">Above ₱20,000</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">
              Availability
            </label>
            <select
              value={filterAvailability}
              onChange={(e) => setFilterAvailability(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All</option>
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
            </select>
          </div>
        </div>
      </div>

      {/* Units Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUnits.map((unit) => (
          <div
            key={unit.id}
            className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col"
          >
            <div className="relative h-48">
              {/* ✅ FIX 4: Used unit.images[0] */}
              <ImageWithFallback
                src={unit.images && unit.images.length > 0 ? unit.images[0] : ''}
                alt={unit.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 right-4">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    unit.available
                      ? "bg-green-100 text-green-800 border border-green-200"
                      : "bg-red-100 text-red-800 border border-red-200"
                  }`}
                >
                  {unit.available ? "Available" : "Occupied"}
                </span>
              </div>
            </div>

            <div className="p-6 flex flex-col flex-grow">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="text-xs font-semibold tracking-wider text-blue-600 uppercase">
                    {getTypeLabel(unit.type)}
                  </span>
                  <h3 className="text-gray-900 mt-1">
                    {unit.name}
                  </h3>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {unit.description}
              </p>

              <div className="space-y-2 mb-4">
                {unit.capacity && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>Up to {unit.capacity} pax</span>
                  </div>
                )}
              </div>

              {/* ✅ FIX 5: Updated from amenities to features */}
              {unit.features && unit.features.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {unit.features.slice(0, 3).map((feature, index) => (
                    <span
                      key={index}
                      className="flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-600 border border-gray-200 rounded text-xs"
                    >
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      {feature}
                    </span>
                  ))}
                  {unit.features.length > 3 && (
                    <span className="px-2 py-1 bg-gray-50 text-gray-500 rounded text-xs">
                      +{unit.features.length - 3} more
                    </span>
                  )}
                </div>
              )}

              <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-lg font-bold text-gray-900">
                    {unit.price ? formatCurrency(unit.price) : '₱0.00'}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">
                    {getPriceSuffix(unit.type)}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedUnitId(unit.id)}
                  disabled={!unit.available}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Calendar className="w-4 h-4" />
                  Book Now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredUnits.length === 0 && (
        <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-100">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">
            No properties found matching your criteria.
          </p>
          <button 
            onClick={() => {
              setSearchTerm("");
              setFilterType("all");
              setSelectedPriceRange("all");
              setFilterAvailability("all");
            }}
            className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* ✅ FIX 6: Changed spaceId to unitId to match the new Modal signature */}
      {selectedUnitId && (
        <BookingModal
          unitId={selectedUnitId}
          onClose={() => setSelectedUnitId(null)}
        />
      )}
    </div>
  );
}