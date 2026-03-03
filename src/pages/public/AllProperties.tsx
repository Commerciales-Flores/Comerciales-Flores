import { useData, type Property, type PropertyType } from "../../contexts/DataContext";
import { Link } from "react-router-dom";
import { ArrowLeft, MapPin, Search, Filter, RotateCcw, X, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import { formatCurrency } from "../../utils/currency";
import { getPropertyTypeLabel } from "../../utils/propertyHelpers";
import PropertyModal from "../../components/PropertyModal";

export default function AllProperties() {
  const { properties, locations } = useData();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // --- Filter States ---
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<PropertyType | "all">("all");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<"all" | "0-1000" | "1001-5000" | "5001-10000" | "10001+">("all");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const resetFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setFilterLocation("all");
    setPriceRange("all");
  };

  // --- NEW: Define FilterInputs sub-component inside the function ---
  const FilterInputs = () => (
    <>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
        <input 
          type="text"
          placeholder="Search properties..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
        />
      </div>

      {/* Type */}
      <div className="relative">
        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm appearance-none focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="all">All Types</option>
          <option value="rental_space">Rental Spaces</option>
          <option value="function_hall">Function Halls</option>
          <option value="parking_slot">Parking Slots</option>
        </select>
      </div>

      {/* Price */}
      <select
        value={priceRange}
        onChange={(e) => setPriceRange(e.target.value as any)}
        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm appearance-none focus:ring-2 focus:ring-blue-500 outline-none"
      >
        <option value="all">Any Price</option>
        <option value="0-1000">₱0 - ₱1,000</option>
        <option value="1001-5000">₱1,001 - ₱5,000</option>
        <option value="5001-10000">₱5,001 - ₱10,000</option>
        <option value="10001+">₱10,001+</option>
      </select>

      {/* Location */}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
        <select
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm appearance-none focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="all">All Locations</option>
          {locations.map((loc) => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>
      </div>
    </>
  );

  // --- Filtering Logic ---
  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch = p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      const matchesType = filterType === "all" || p.type === filterType;
      const matchesLocation = filterLocation === "all" || p.location === filterLocation;

      let matchesPrice = true;
      const price = p.price;
      switch (priceRange) {
        case "0-1000": matchesPrice = price <= 1000; break;
        case "1001-5000": matchesPrice = price > 1000 && price <= 5000; break;
        case "5001-10000": matchesPrice = price > 5000 && price <= 10000; break;
        case "10001+": matchesPrice = price > 10000; break;
      }

      return matchesSearch && matchesType && matchesPrice && matchesLocation && p.available;
    });
  }, [properties, searchTerm, filterType, filterLocation, priceRange]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-20">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          
          <div className="mb-6">
            <Link to="/" className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors group w-fit">
              <ArrowLeft className="size-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-semibold text-sm">Back to Home</span>
            </Link>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="max-w-2xl">
                <h1 className="text-2xl font-bold text-gray-900">All Available Spaces</h1>
                <p className="text-gray-500">Browse properties, check prices, and view details</p>
            </div>
          </div>

          {/* Desktop Filter Row: Hidden on mobile (md:flex) */}
          <div className="hidden md:flex flex-row gap-3 items-center">
            <div className="grid md:grid-cols-4 gap-3 w-full">
                <FilterInputs />
            </div>
            <button 
              onClick={resetFilters}
              className="flex items-center gap-2 px-4 py-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all text-sm font-bold whitespace-nowrap border border-transparent hover:border-red-100"
            >
              <RotateCcw className="size-4" />
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Filter Panel */}
      <AnimatePresence>
        {isFilterPanelOpen && (
            <>
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsFilterPanelOpen(false)}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] md:hidden"
            />
            <motion.div 
                initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 h-full w-[300px] bg-white z-[70] shadow-2xl md:hidden flex flex-col p-6"
            >
                <div className="flex justify-between items-center mb-8">
                <h2 className="font-bold text-xl text-slate-800">Filters</h2>
                <button onClick={() => setIsFilterPanelOpen(false)} className="p-2 bg-slate-100 rounded-full">
                    <X className="size-5" />
                </button>
                </div>
                <div className="space-y-4 flex-1 overflow-y-auto">
                <FilterInputs />
                </div>
                <div className="pt-6 border-t border-slate-100 space-y-3">  
                <button onClick={resetFilters} className="w-full py-3 text-red-600 font-semibold text-sm flex items-center justify-center gap-2">
                    <RotateCcw className="size-4" /> Reset All
                </button>
                </div>
            </motion.div>
            </>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
            Showing {filteredProperties.length} Results
          </p>
          <button 
            onClick={() => setIsFilterPanelOpen(true)}
            className="md:hidden p-2 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-600 active:bg-slate-50 transition-all"
            aria-label="Open Filters"
            >
            <Filter className="size-5" />
            </button>
        </div>

        {filteredProperties.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredProperties.map((prop) => (
              <motion.div 
                key={prop.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-xl transition-all group"
              >
                <div className="relative h-48 sm:h-56 md:h-64 overflow-hidden">
                  <img 
                    src={prop.images[0] || '/fallback-property.jpg'} 
                    alt={prop.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-xs font-bold text-blue-600">
                    {getPropertyTypeLabel(prop.type)}
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{prop.name}</h3>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-4">
                    {prop.description}
                  </p>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mb-4">
                    <MapPin className="size-3" /> {prop.location}
                  </p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Price</span>
                        <span className="text-lg font-bold text-blue-600">{formatCurrency(prop.price)}</span>
                    </div>
                    
                    <button
                        onClick={() => setSelectedProperty(prop)}
                        className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-colors"
                    >
                        View Details
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
            <Search className="mx-auto size-12 text-slate-200 mb-4" />
            <p className="text-slate-500 font-medium">No spaces match your filters.</p>
          </div>
        )}
      </main>

      <AnimatePresence>
        {selectedProperty && (
          <PropertyModal 
            property={selectedProperty} 
            onClose={() => setSelectedProperty(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}