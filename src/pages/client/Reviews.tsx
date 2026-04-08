import { useMemo, useState } from 'react';
import { MessageSquare, Star, PenSquare, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useClientData } from '../../contexts/ClientDataContext';
import { useReviews } from '../../contexts/ReviewsContext';
import ReviewModal from '../../components/reviews/ReviewModal';
import EmptyState from '../../components/common/EmptyState';
import ReviewCard from '../../components/reviews/ReviewCard';
import { formatDate } from '../../utils/date';

type ReviewStatCardProps = {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone?: 'blue' | 'amber' | 'violet';
};

function ReviewStatCard({
  label,
  value,
  icon,
  tone = 'blue',
}: ReviewStatCardProps) {
  const toneClasses = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
  }[tone];

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
            {label}
          </p>
          <p className="mt-2 text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
            {value}
          </p>
        </div>

        <div className={`rounded-xl p-2.5 ${toneClasses}`}>{icon}</div>
      </div>
    </div>
  );
}

export default function Review() {
  const { user } = useAuth();
  const { getReservationsByUserId, units } = useClientData();
  const { reviews, loading, getReviewsByUserId } = useReviews();

  const [showSubmitted, setShowSubmitted] = useState(true);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedPendingReview, setSelectedPendingReview] = useState<{
    id: string;
    unitId: string;
    unitName: string;
    endDate?: string;
  } | null>(null);

  const userReviews = useMemo(() => {
    if (!user?.id) return [];
    return getReviewsByUserId(user.id);
  }, [getReviewsByUserId, user?.id]);

  const userReservations = useMemo(() => {
    return getReservationsByUserId(user?.id || '');
  }, [getReservationsByUserId, user?.id]);

  const reservationUnitMap = useMemo(() => {
    return new Map(units.map((unit) => [unit.id, unit]));
  }, [units]);

  const reviewedUnitIds = useMemo(() => {
    return new Set(
      reviews
        .filter((review) => review.user_id === user?.id && review.unit_id)
        .map((review) => review.unit_id)
    );
  }, [reviews, user?.id]);

  const pendingReviews = useMemo(() => {
    const now = Date.now();

    return userReservations
      .filter((reservation) =>
        ['approved', 'confirmed', 'completed'].includes(reservation.status)
      )
      .filter((reservation) => {
        if (!reservation.endDate) return false;
        return new Date(reservation.endDate).getTime() <= now;
      })
      .filter(
        (reservation) =>
          Number(reservation.paidAmount || 0) >= Number(reservation.totalAmount || 0)
      )
      .filter((reservation) => !reviewedUnitIds.has(reservation.unitId))
      .sort(
        (a, b) =>
          new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
      );
  }, [userReservations, reviewedUnitIds]);

  const reviewStats = useMemo(() => {
    const totalReviews = userReviews.length;
    const totalRating = userReviews.reduce(
      (sum, review) => sum + (review.rating || 0),
      0
    );
    const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;
    const pendingCount = pendingReviews.length;

    return {
      totalReviews,
      averageRating,
      pendingCount,
    };
  }, [userReviews, pendingReviews]);

  const hasNoReviewContent =
    !loading && pendingReviews.length === 0 && userReviews.length === 0;

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 p-4 sm:gap-6 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <header>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
              My Reviews
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your feedback and keep track of units waiting for a review
            </p>
          </header>
        </div>

        {!hasNoReviewContent && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <ReviewStatCard
              label="Total Reviews"
              value={reviewStats.totalReviews}
              icon={<MessageSquare className="size-5" />}
              tone="blue"
            />

            <ReviewStatCard
              label="Average Rating"
              value={
                reviewStats.averageRating > 0
                  ? reviewStats.averageRating.toFixed(1)
                  : '0.0'
              }
              icon={<Star className="size-5" />}
              tone="amber"
            />

            <div className="sm:col-span-2 xl:col-span-1">
              <ReviewStatCard
                label="Pending Reviews"
                value={reviewStats.pendingCount}
                icon={<PenSquare className="size-5" />}
                tone="violet"
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:rounded-3xl">
            <p className="text-sm text-gray-500 sm:text-base">Loading reviews...</p>
          </div>
        ) : hasNoReviewContent ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <EmptyState
              icon={<MessageSquare className="size-10 text-blue-500" />}
              title="No reviews yet"
              description="Reservations that have already ended and are fully paid will appear here once they are ready for review."
            />
          </motion.div>
        ) : (
          <>
            <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm sm:rounded-3xl">
              <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
                <h2 className="text-base font-semibold text-gray-900">
                  Pending Reviews
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Ended and fully paid reservations waiting for your feedback
                </p>
              </div>

              <div className="p-4 sm:p-6">
                {pendingReviews.length === 0 ? (
                  <p className="text-sm text-gray-500 sm:text-base">
                    No pending reviews right now.
                  </p>
                ) : (
                  <div className="grid gap-4">
                    {pendingReviews.map((reservation) => {
                      const unit = reservationUnitMap.get(reservation.unitId);

                      return (
                        <motion.div
                          key={reservation.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 sm:p-5"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
                                Ready for review
                              </span>

                              <h3 className="mt-1 text-base font-semibold text-gray-900 sm:text-lg">
                                {reservation.unitName}
                              </h3>

                              <div className="mt-2 space-y-1 text-sm text-gray-500 sm:text-base">
                                <p>Ended on {formatDate(reservation.endDate)}</p>
                                <p>{unit?.location || 'Location unavailable'}</p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPendingReview({
                                  id: reservation.id,
                                  unitId: reservation.unitId,
                                  unitName: reservation.unitName,
                                  endDate: reservation.endDate,
                                });
                                setIsReviewModalOpen(true);
                              }}
                              className="min-h-[44px] w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 sm:w-auto"
                            >
                              Leave Review
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm sm:rounded-3xl">
              <button
                type="button"
                onClick={() => setShowSubmitted((prev) => !prev)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-gray-50 sm:px-6"
              >
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-gray-900">
                    Submitted Reviews
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 sm:text-base">
                    View the feedback you’ve already shared
                  </p>
                </div>

                <motion.div
                  animate={{ rotate: showSubmitted ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="shrink-0 rounded-lg bg-gray-100 p-1.5"
                >
                  <ChevronDown className="size-4 text-gray-500" />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {showSubmitted && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-gray-100 p-5 sm:p-6">
                      {userReviews.length === 0 ? (
                        <p className="text-sm text-gray-500 sm:text-base">
                          You haven’t submitted any reviews yet.
                        </p>
                      ) : (
                        <div className="grid gap-4">
                          {userReviews.map((review) => {
                            const unit = reservationUnitMap.get(review.unit_id || '');

                            return (
                              <ReviewCard
                                key={review.review_id}
                                unitName={unit?.name || 'Unknown Unit'}
                                rating={review.rating || 0}
                                comment={review.comment}
                                createdAt={review.created_at}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <ReviewModal
                open={isReviewModalOpen}
                reservation={selectedPendingReview}
                onClose={() => {
                  setIsReviewModalOpen(false);
                  setSelectedPendingReview(null);
                }}
              />
            </section>
          </>
        )}
      </div>
    </div>
  );
}