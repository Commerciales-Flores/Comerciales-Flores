import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { UnitType } from "../../../contexts/DataContext";
import { formatCurrency } from "../../../utils/currency";
import { getMinimumDuration, getPriceLabel } from "../../../utils/propertyHelpers";

type ReviewItem = {
  review_id?: string | null;
  unit_id?: string | null;
  rating?: number | null;
  comment?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  user_name?: string | null;
  customer_name?: string | null;
  name?: string | null;
  profile_picture?: string | null;
  avatar_url?: string | null;
  profileImage?: string | null;
  user_avatar?: string | null;
};

interface SelectedUnitData {
  id: string;
  name: string;
  type: UnitType;
  description?: string | null;
  location?: string | null;
  price: number;
  minimumPaymentPercent?: number | null;
}

interface ReservationUnitDetailsPanelProps {
  selectedUnitData: SelectedUnitData;
  selectedUnitMedia: string[];
  safeCurrentMediaIndex: number;
  selectedUnitReviews: ReviewItem[];
  currentReviewIndex: number;
  setCurrentReviewIndex: React.Dispatch<React.SetStateAction<number>>;
  reservationDurationType: "hours" | "days" | "months" | "years";
  isVideoUrl: (url?: string | null) => boolean;
  nextImage: () => void;
  prevImage: () => void;
  setCurrentImageIndex: React.Dispatch<React.SetStateAction<number>>;
}

function getReviewTimestamp(review: ReviewItem) {
  return new Date(review.created_at ?? review.updated_at ?? 0).getTime();
}

function getReviewerName(review: ReviewItem) {
  const fullName = [review.first_name, review.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    review.user_name ||
    review.customer_name ||
    review.name ||
    "Anonymous User"
  );
}

function getReviewerAvatar(review: ReviewItem) {
  return (
    review.profile_picture ||
    review.avatar_url ||
    review.profileImage ||
    review.user_avatar ||
    ""
  );
}

function getReviewerInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function ReservationUnitDetailsPanel({
  selectedUnitData,
  selectedUnitMedia,
  safeCurrentMediaIndex,
  selectedUnitReviews,
  currentReviewIndex,
  setCurrentReviewIndex,
  reservationDurationType,
  isVideoUrl,
  nextImage,
  prevImage,
  setCurrentImageIndex,
}: ReservationUnitDetailsPanelProps) {
  const priceLabel =
    selectedUnitData.type === "parking_slot"
      ? reservationDurationType === "hours"
        ? "per hour"
        : reservationDurationType === "days"
          ? "per day"
          : "per month"
      : selectedUnitData.type === "rental_space"
        ? "per month"
        : getPriceLabel(selectedUnitData.type);

  const minimumDuration =
    selectedUnitData.type === "parking_slot"
      ? {
          value: 1,
          unit:
            reservationDurationType === "hours"
              ? "hour"
              : reservationDurationType === "days"
                ? "day"
                : "month",
        }
      : getMinimumDuration(selectedUnitData.type);

  return (
    <div>
      <div className="relative mb-4 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
        {isVideoUrl(selectedUnitMedia[safeCurrentMediaIndex]) ? (
          <video
            key={selectedUnitMedia[safeCurrentMediaIndex]}
            src={selectedUnitMedia[safeCurrentMediaIndex]}
            controls
            autoPlay
            muted
            playsInline
            preload="metadata"
            className="h-48 w-full object-cover sm:h-56"
          />
        ) : (
          <img
            key={selectedUnitMedia[safeCurrentMediaIndex]}
            src={selectedUnitMedia[safeCurrentMediaIndex]}
            alt={selectedUnitData.name}
            className="h-48 w-full object-cover sm:h-56"
          />
        )}

        {isVideoUrl(selectedUnitMedia[safeCurrentMediaIndex]) && (
          <span className="absolute right-3 top-3 z-10 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-semibold text-white">
            Video
          </span>
        )}

        {selectedUnitMedia.length > 1 && (
          <>
            <button
              onClick={prevImage}
              type="button"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-sm backdrop-blur transition hover:bg-white"
              aria-label="Previous media"
            >
              <ChevronLeft className="size-5" />
            </button>

            <button
              onClick={nextImage}
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-sm backdrop-blur transition hover:bg-white"
              aria-label="Next media"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>

      {selectedUnitMedia.length > 1 && (
        <div className="mb-4 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {selectedUnitMedia.map((media, index) => (
            <button
              key={`${media}-${index}`}
              type="button"
              onClick={() => setCurrentImageIndex(index)}
              className={`overflow-hidden rounded-xl border ${
                index === safeCurrentMediaIndex
                  ? "border-blue-500 ring-2 ring-blue-200"
                  : "border-gray-200"
              }`}
              aria-label={`Open media ${index + 1}`}
            >
              {isVideoUrl(media) ? (
                <div className="relative h-16 w-20 bg-gray-100">
                  <video
                    src={media}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-[10px] font-medium text-white">
                    Video
                  </div>
                </div>
              ) : (
                <img
                  src={media}
                  alt={`Media ${index + 1}`}
                  className="h-16 w-20 object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}

      <div className="mb-4 space-y-4">
        <p className="text-sm leading-relaxed text-gray-600">
          {selectedUnitData.description?.trim() || "No description available."}
        </p>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Recent Reviews
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Feedback from recent users of this unit.
              </p>
            </div>

            {selectedUnitReviews.length > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentReviewIndex((prev) =>
                      prev === 0 ? selectedUnitReviews.length - 1 : prev - 1
                    )
                  }
                  className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50"
                  aria-label="Previous review"
                >
                  <ChevronLeft className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentReviewIndex((prev) =>
                      prev === selectedUnitReviews.length - 1 ? 0 : prev + 1
                    )
                  }
                  className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50"
                  aria-label="Next review"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </div>

          {selectedUnitReviews.length > 0 ? (
            <>
              <div className="overflow-hidden rounded-2xl">
                <motion.div
                  className="flex"
                  animate={{ x: `-${currentReviewIndex * 100}%` }}
                  transition={{ type: "spring", stiffness: 60, damping: 18 }}
                >
                  {selectedUnitReviews.map((review) => {
                    const reviewerName = getReviewerName(review);
                    const reviewerAvatar = getReviewerAvatar(review);
                    const reviewerInitials = getReviewerInitials(reviewerName);
                    const hasComment =
                      typeof review.comment === "string" &&
                      review.comment.trim();

                    return (
                      <div
                        key={
                          review.review_id ??
                          `${review.unit_id}-${getReviewTimestamp(review)}`
                        }
                        className="w-full flex-shrink-0"
                      >
                        <div className="min-h-[180px] rounded-2xl border border-slate-100 bg-slate-50 p-4">
                          <div className="flex items-start gap-3">
                            {reviewerAvatar ? (
                              <img
                                src={reviewerAvatar}
                                alt={reviewerName}
                                className="size-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex size-10 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                                {reviewerInitials}
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900">
                                    {reviewerName}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {Number(review.rating ?? 0).toFixed(1)} / 5
                                  </p>
                                </div>

                                <div className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                                  ★ {Number(review.rating ?? 0).toFixed(1)}
                                </div>
                              </div>

                              {hasComment ? (
                                <p className="mt-3 line-clamp-4 text-sm italic leading-relaxed text-slate-600">
                                  “{review.comment?.trim()}”
                                </p>
                              ) : (
                                <p className="mt-3 text-sm text-slate-400">
                                  No written comment provided.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              </div>

              {selectedUnitReviews.length > 1 && (
                <div className="mt-3 flex justify-center gap-2">
                  {selectedUnitReviews.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentReviewIndex(idx)}
                      className={`h-2 rounded-full transition-all ${
                        currentReviewIndex === idx
                          ? "w-6 bg-blue-600"
                          : "w-2 bg-slate-300"
                      }`}
                      aria-label={`Go to review ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center">
              <p className="text-sm font-medium text-slate-500">
                No reviews yet for this unit.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <p className="mb-1 text-xs text-gray-600 sm:text-sm">Price</p>

        <div className="text-base font-bold text-blue-600 sm:text-lg">
          {formatCurrency(selectedUnitData.price)}{" "}
          <span className="text-xs font-medium text-gray-500 sm:text-sm">
            {priceLabel}
          </span>
        </div>

        {selectedUnitData.minimumPaymentPercent ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 sm:text-sm">
            Minimum initial payment:{" "}
            <strong>{selectedUnitData.minimumPaymentPercent}%</strong> of total
            amount.
          </div>
        ) : null}

        <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 sm:text-sm">
          {selectedUnitData.type === "rental_space" &&
            "Payments follow your selected billing cycle."}
          {selectedUnitData.type === "function_hall" &&
            "Partial payments are allowed until the event is fully paid."}
          {selectedUnitData.type === "parking_slot" &&
            (reservationDurationType === "hours"
              ? "Hourly parking is billed based on your selected reservation hours."
              : reservationDurationType === "days"
                ? "Daily parking is billed based on your selected reservation days."
                : "Monthly parking dues must be completed on time.")}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
        <p>
          Minimum Duration:{" "}
          <span className="font-semibold text-gray-900">
            {minimumDuration.value} {minimumDuration.unit}
          </span>
        </p>
      </div>
    </div>
  );
}