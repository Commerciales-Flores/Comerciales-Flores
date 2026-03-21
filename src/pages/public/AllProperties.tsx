import { useData, type Unit, type UnitType } from "../../contexts/DataContext";
import { Link } from "react-router-dom";
import { useReviews } from "../../contexts/ReviewsContext";
import {
  ArrowLeft,
  MapPin,
  Search,
  Filter,
  RotateCcw,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import { formatCurrency } from "../../utils/currency";
import { getUnitTypeLabel, getPriceLabel } from "../../utils/propertyHelpers";
import UnitModal from "../../components/PropertyModal";

type PriceRange = "all" | "0-1000" | "1001-5000" | "5001-10000" | "10001+";

const FALLBACK_IMAGE =
  "https://placehold.co/1200x800/e5e7eb/6b7280?text=No+Image";

export default function AllUnits() {
  const { units } = useData();
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const { reviews } = useReviews();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<UnitType | "all">("all");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<PriceRange>("all");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const resetFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setFilterLocation("all");
    setPriceRange("all");
  };

  const locations: string[] = useMemo(
    () =>
      Array.from(
        new Set(
          units
            .map((u) => u.location || "")
            .filter((loc) => loc.trim() !== "")
        )
      ),
    [units]
  );

  const hasNoDataAtAll = units.length === 0;

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

      return unit.available && matchesSearch && matchesType && matchesLocation && matchesPrice;
    });
  }, [units, searchTerm, filterType, filterLocation, priceRange]);

  const FilterInputs = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search units..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full rounded-xl border text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${
            mobile
              ? "border-slate-200 bg-white py-3 pl-10 pr-4"
              : "border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4"
          }`}
        />
      </div>

      <div className="relative">
        <Filter className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as UnitType | "all")}
          className={`w-full appearance-none rounded-xl border text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${
            mobile
              ? "border-slate-200 bg-white py-3 pl-10 pr-4"
              : "border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4"
          }`}
        >
          <option value="all">All Types</option>
          <option value="rental_space">Rental Spaces</option>
          <option value="function_hall">Function Halls</option>
          <option value="parking_slot">Parking Slots</option>
        </select>
      </div>

      <div className="relative">
        <SlidersHorizontal className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <select
          value={priceRange}
          onChange={(e) => setPriceRange(e.target.value as PriceRange)}
          className={`w-full appearance-none rounded-xl border text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${
            mobile
              ? "border-slate-200 bg-white py-3 pl-10 pr-4"
              : "border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4"
          }`}
        >
          <option value="all">Any Price</option>
          <option value="0-1000">₱0 - ₱1,000</option>
          <option value="1001-5000">₱1,001 - ₱5,000</option>
          <option value="5001-10000">₱5,001 - ₱10,000</option>
          <option value="10001+">₱10,001+</option>
        </select>
      </div>

      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-red-500" />
        <select
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
          className={`w-full appearance-none rounded-xl border text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${
            mobile
              ? "border-slate-200 bg-white py-3 pl-10 pr-4"
              : "border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4"
          }`}
        >
          <option value="all">All Locations</option>
          {locations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-20">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="mb-5">
            <Link
              to="/"
              className="group flex w-fit items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-blue-600"
            >
              <ArrowLeft className="size-5 transition-transform group-hover:-translate-x-1" />
              <span>Back to Home</span>
            </Link>
          </div>

          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <h1 className="text-2xl font-bold text-slate-900">
                All Available Spaces
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Browse units, compare prices, and view complete details.
              </p>
            </div>

            {!hasNoDataAtAll && (
              <div className="hidden md:flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  Results
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700 shadow-sm">
                  {filteredUnits.length}
                </div>
              </div>
            )}
          </div>

          {!hasNoDataAtAll && (
            <div className="hidden md:flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="grid w-full md:grid-cols-4 gap-3">
                <FilterInputs />
              </div>

              <button
                onClick={resetFilters}
                className="whitespace-nowrap rounded-xl border border-transparent px-4 py-2.5 text-sm font-bold text-slate-500 transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-600"
                type="button"
              >
                <span className="flex items-center gap-2">
                  <RotateCcw className="size-4" />
                  Reset
                </span>
              </button>
            </div>
          )}
        </div>
      </header>

      <AnimatePresence>
        {isFilterPanelOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterPanelOpen(false)}
              className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm md:hidden"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 24, stiffness: 220 }}
              className="fixed right-0 top-0 z-[70] flex h-full w-[320px] flex-col bg-white shadow-2xl md:hidden"
            >
              <div className="border-b border-slate-100 px-5 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Filters</h2>
                    <p className="text-sm text-slate-500">
                      Refine available spaces
                    </p>
                  </div>

                  <button
                    onClick={() => setIsFilterPanelOpen(false)}
                    className="rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
                    type="button"
                  >
                    <X className="size-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                <FilterInputs mobile />
              </div>

              <div className="space-y-3 border-t border-slate-100 px-5 py-5">
                <button
                  onClick={resetFilters}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                  type="button"
                >
                  <RotateCcw className="size-4" />
                  Reset All
                </button>

                <button
                  onClick={() => setIsFilterPanelOpen(false)}
                  className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
                  type="button"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="mx-auto mt-10 max-w-7xl px-4 sm:px-6 lg:px-8">
        {hasNoDataAtAll ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-24 text-center shadow-sm">
            <MapPin className="mx-auto mb-4 size-12 text-slate-200" />
            <h3 className="mb-2 text-xl font-bold text-slate-900">
              No spaces available right now
            </h3>
            <p className="mx-auto mb-6 max-w-md text-slate-500">
              There are currently no spaces listed. Please check back later.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-600"
            >
              <ArrowLeft className="size-4" />
              Return to Home
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                  Showing {filteredUnits.length} Result
                  {filteredUnits.length !== 1 ? "s" : ""}
                </p>
              </div>

              <button
                onClick={() => setIsFilterPanelOpen(true)}
                className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition active:bg-slate-50 md:hidden"
                aria-label="Open Filters"
                type="button"
              >
                <Filter className="size-5" />
              </button>
            </div>

            {filteredUnits.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
                {filteredUnits.map((prop) => {
                  const unitReviews = reviews.filter(
  (r) => r.unit_id === (prop.id)
);

const averageRating =
  unitReviews.length > 0
    ? unitReviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
      unitReviews.length
    : 0;
                  return (
  <motion.div
    key={prop.id}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-xl"
  >
    <div className="relative h-48 overflow-hidden sm:h-56 md:h-64">
      <img
        src={prop.images?.[0] || FALLBACK_IMAGE}
        alt={prop.name}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
      />
      <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-blue-600 backdrop-blur-md">
        {getUnitTypeLabel(prop.type)}
      </div>
    </div>

    <div className="flex flex-1 flex-col p-5">
      <div className="min-h-[56px]">
        <h3 className="line-clamp-2 text-lg font-bold text-slate-900">
          {prop.name}
        </h3>
      </div>

      <div className="mt-2 min-h-[40px]">
        <p className="line-clamp-2 text-sm text-slate-500">
          {prop.description?.trim() || "No description available."}
        </p>
      </div>

      <div className="mt-3 space-y-1 min-h-[40px]">
        {prop.location?.trim() ? (
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <MapPin className="size-3.5 text-red-500" />
            <span className="line-clamp-1">{prop.location}</span>
          </p>
        ) : (
          <p className="text-xs text-transparent select-none">placeholder</p>
        )}

        <div className="flex items-center gap-1 text-xs text-slate-600">
          {averageRating > 0 ? (
            <>
              <span className="text-amber-500">★</span>
              <span className="font-semibold text-slate-900">
                {averageRating.toFixed(1)}
              </span>
              <span className="text-slate-400">
                ({unitReviews.length})
              </span>
            </>
          ) : (
            <span className="text-slate-400">No ratings yet</span>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-4">
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Price
          </span>
          <span className="text-lg font-bold text-blue-600">
            {formatCurrency(prop.price)}
          </span>
        </div>

        <button
          onClick={() => setSelectedUnit(prop)}
          className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-600"
        >
          View Details
        </button>
      </div>
    </div>
  </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center shadow-sm">
                <Search className="mx-auto mb-4 size-12 text-slate-200" />
                <h3 className="mb-2 text-lg font-bold text-slate-900">
                  No spaces match your filters
                </h3>
                <p className="mb-6 font-medium text-slate-500">
                  Try adjusting your search, type, location, or price range.
                </p>
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 font-bold text-white transition-colors hover:bg-blue-600"
                  type="button"
                >
                  <RotateCcw className="size-4" />
                  Reset Filters
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <AnimatePresence>
        {selectedUnit && (
          <UnitModal Unit={selectedUnit} onClose={() => setSelectedUnit(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}