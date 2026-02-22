import { useState } from "react";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext";
import {
  Search,
  Filter,
  MapPin,
  Users,
  Maximize,
  Calendar,
} from "lucide-react";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import BookingModal from "./BookingModal";

export default function BrowseSpaces() {
  const { spaces } = useData();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<
    "all" | "unit" | "function-hall" | "parking"
  >("all");
  const [filterAvailability, setFilterAvailability] = useState<
    "all" | "available" | "occupied"
  >("all");
  const [selectedSpace, setSelectedSpace] = useState<
    string | null
  >(null);
  const [selectedPriceRange, setSelectedPriceRange] = useState<'all' | '0-5000' | '5000-10000' | '10000-20000' | '20000+' >('all');


  const filteredSpaces = spaces.filter(space => {
    const matchesSearch = space.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          space.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || space.type === filterType;
    const matchesAvailability = filterAvailability === 'all' || space.availability === filterAvailability;
  
    let matchesPrice = true;
    if (selectedPriceRange !== 'all') {
      const price = space.price;
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
      case "unit":
        return "Office Unit";
      case "function-hall":
        return "Function Hall";
      case "parking":
        return "Parking";
      default:
        return type;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">
          Browse Available Spaces
        </h1>
        <p className="text-gray-600">
          Find the perfect space for your business needs
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search spaces..."
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
                onChange={(e) =>
                  setFilterType(e.target.value as any)
                }
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">All Types</option>
                <option value="unit">Office Units</option>
                <option value="function-hall">
                  Function Halls
                </option>
                <option value="parking">Parking</option>
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
                  <option value="0-5000">Up to $5,000</option>
                  <option value="5000-10000">$5,001 - $10,000</option>
                  <option value="10000-20000">$10,001 - $20,000</option>
                  <option value="20000+">Above $20,000</option>
                </select>
              </div>
            </div>

          <div>
            <label className="block text-gray-700 mb-2">
              Availability
            </label>
            <select
              value={filterAvailability}
              onChange={(e) =>
                setFilterAvailability(e.target.value as any)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All</option>
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
            </select>
          </div>
        </div>
      </div>

      {/* Spaces Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSpaces.map((space) => (
          <div
            key={space.id}
            className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="relative h-48">
              <ImageWithFallback
                src={space.image}
                alt={space.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 right-4">
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    space.availability === "available"
                      ? "bg-green-100 text-green-800"
                      : space.availability === "occupied"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {space.availability.charAt(0).toUpperCase() +
                    space.availability.slice(1)}
                </span>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="text-sm text-blue-600">
                    {getTypeLabel(space.type)}
                  </span>
                  <h3 className="text-gray-900 mt-1">
                    {space.name}
                  </h3>
                </div>
              </div>

              <p className="text-gray-600 mb-4 line-clamp-2">
                {space.description}
              </p>

              <div className="space-y-2 mb-4">
                {space.capacity && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{space.capacity}</span>
                  </div>
                )}
                {space.area && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Maximize className="w-4 h-4" />
                    <span>{space.area}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {space.amenities
                  .slice(0, 3)
                  .map((amenity, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                    >
                      {amenity}
                    </span>
                  ))}
                {space.amenities.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                    +{space.amenities.length - 3} more
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div>
                  <span className="text-gray-900">
                    ${space.price}
                  </span>
                  <span className="text-sm text-gray-600">
                    /{space.priceUnit.replace("per ", "")}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedSpace(space.id)}
                  disabled={space.availability !== "available"}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Calendar className="w-4 h-4" />
                  Book Now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredSpaces.length === 0 && (
        <div className="text-center py-12">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            No spaces found matching your criteria
          </p>
        </div>
      )}

      {selectedSpace && (
        <BookingModal
          spaceId={selectedSpace}
          onClose={() => setSelectedSpace(null)}
        />
      )}
    </div>
  );
}