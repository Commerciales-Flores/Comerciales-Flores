import { useUnits } from "../../contexts/UnitsContext";
import type { Unit, UnitType } from "../../data/types";
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
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { formatCurrency } from "../../utils/currency";
import { getUnitTypeLabel } from "../../utils/propertyHelpers";
import UnitModal from "../../components/PropertyModal";

type PriceRange = "all" | "0-1000" | "1001-5000" | "5001-10000" | "10001+";

const FALLBACK_IMAGE =
  "https://placehold.co/1200x800/e5e7eb/6b7280?text=No+Image";

export default function AllUnits() {
  const { units } = useUnits();
  const { reviews } = useReviews();

  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<UnitType | "all">("all");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<PriceRange>("all");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const cardVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const resetFilters = useCallback(() => {
    setSearchTerm("");
    setFilterType("all");
    setFilterLocation("all");
    setPriceRange("all");
  }, []);

  const handleCardVideoEnter = useCallback((unitId: string) => {
    const video = cardVideoRefs.current[unitId];
    if (!video) return;

    video.currentTime = 0;
    void video.play().catch(() => {});
  }, []);

  const handleCardVideoLeave = useCallback((unitId: string) => {
    const video = cardVideoRefs.current[unitId];
    if (!video) return;

    video.pause();
    video.currentTime = 0;
  }, []);

  useEffect(() => {
    return () => {
      Object.values(cardVideoRefs.current).forEach((video) => {
        if (!video) return;
        video.pause();
        video.currentTime = 0;
      });
    };
  }, []);

  const { locations, reviewSummaryByUnitId } = useMemo(() => {
    const locationSet = new Set<string>();
    const tempReviewMap = new Map<string, { total: number; count: number }>();

    for (const unit of units) {
      const location = unit.location?.trim();
      if (location) {
        locationSet.add(location);
      }
    }

    for (const review of reviews) {
      if (!review.unit_id) continue;

      if (!tempReviewMap.has(review.unit_id)) {
        tempReviewMap.set(review.unit_id, { total: 0, count: 0 });
      }

      const entry = tempReviewMap.get(review.unit_id)!;
      entry.total += review.rating || 0;
      entry.count += 1;
    }

    const summaryMap = new Map<string, { avg: number; count: number }>();

    for (const [unitId, entry] of tempReviewMap.entries()) {
      summaryMap.set(unitId, {
        avg: entry.count > 0 ? entry.total / entry.count : 0,
        count: entry.count,
      });
    }

    return {
      locations: Array.from(locationSet),
      reviewSummaryByUnitId: summaryMap,
    };
  }, [units, reviews]);

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
        default:
          matchesPrice = true;
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

  const filteredUnitCards = useMemo(() => {
    return filteredUnits.map((unit) => {
      const reviewSummary = reviewSummaryByUnitId.get(unit.id);

      return {
        unit,
        averageRating: reviewSummary?.avg ?? 0,
        reviewCount: reviewSummary?.count ?? 0,
      };
    });
  }, [filteredUnits, reviewSummaryByUnitId]);

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
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 shadow-sm">
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
          </div>

          {!hasNoDataAtAll && (
            <div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:flex">
              <div className="grid w-full gap-3 md:grid-cols-4">
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
              className="fixed inset-0 z-[60] bg-slate-900/40 md:hidden"
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

            {filteredUnitCards.length > 0 ? (
              <div className="grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredUnitCards.map(({ unit, averageRating, reviewCount }) => (
                  <motion.div
                    key={unit.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-xl"
                  >
                    <div
                      className="relative h-48 overflow-hidden sm:h-56 md:h-64"
                      onMouseEnter={() => handleCardVideoEnter(unit.id)}
                      onMouseLeave={() => handleCardVideoLeave(unit.id)}
                    >
                      {unit.videos?.[0] ? (
                        <video
                          ref={(node) => {
                            cardVideoRefs.current[unit.id] = node;
                          }}
                          src={unit.videos[0]}
                          muted
                          playsInline
                          preload="metadata"
                          poster={unit.images?.[0] || FALLBACK_IMAGE}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <img
                          src={unit.images?.[0] || FALLBACK_IMAGE}
                          alt={unit.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      )}

                      <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-blue-600">
                        {getUnitTypeLabel(unit.type)}
                      </div>

                      {unit.videos?.length ? (
                        <div className="absolute right-4 top-4 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white">
                          {unit.videos.length} video
                          {unit.videos.length > 1 ? "s" : ""}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-1 flex-col p-5">
                      <div className="min-h-[56px]">
                        <h3 className="line-clamp-2 text-lg font-bold text-slate-900">
                          {unit.name}
                        </h3>
                      </div>

                      <div className="mt-2 min-h-[40px]">
                        <p className="line-clamp-2 text-sm text-slate-500">
                          {unit.description?.trim() || "No description available."}
                        </p>
                      </div>

                      <div className="mt-3 min-h-[40px] space-y-1">
                        {unit.location?.trim() ? (
                          <p className="flex items-center gap-1.5 text-xs text-slate-400">
                            <MapPin className="size-3.5 text-red-500" />
                            <span className="line-clamp-1">{unit.location}</span>
                          </p>
                        ) : (
                          <p className="select-none text-xs text-transparent">
                            placeholder
                          </p>
                        )}

                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          {averageRating > 0 ? (
                            <>
                              <span className="text-amber-500">★</span>
                              <span className="font-semibold text-slate-900">
                                {averageRating.toFixed(1)}
                              </span>
                              <span className="text-slate-400">
                                ({reviewCount})
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
                            {formatCurrency(unit.price)}
                          </span>
                        </div>

                        <button
                          onClick={() => setSelectedUnit(unit)}
                          className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-600"
                          type="button"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
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