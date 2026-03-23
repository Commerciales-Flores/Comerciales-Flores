import { useMemo, useState } from 'react';
import { MessageSquare, Star, PenSquare, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useReviews } from '../../contexts/ReviewsContext';
import ReviewModal from '../../components/reviews/ReviewModal';
import EmptyState from '../../components/common/EmptyState';
import ReviewCard from '../../components/reviews/ReviewCard';
import { formatDate } from '../../utils/date';

export default function Review() {
  const { user } = useAuth();
  const { getReservationsByUserId, units } = useData();
  const { reviews, loading, getReviewsByUserId } = useReviews();

  const [showSubmitted, setShowSubmitted] = useState(true);

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
    return userReservations
      .filter((reservation) => reservation.status === 'completed')
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

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [selectedPendingReview, setSelectedPendingReview] = useState<{
    id: string;
    unitId: string;
    unitName: string;
    endDate?: string;
    } | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <div className="flex justify-between items-end gap-4">
          <header>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              My Reviews
            </h1>
            <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">
              Manage your feedback and keep track of units waiting for a review
            </p>
          </header>
        </div>

{!hasNoReviewContent && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                  Total Reviews
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">
                  {reviewStats.totalReviews}
                </p>
              </div>
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                <MessageSquare className="size-5" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                  Average Rating
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">
                  {reviewStats.averageRating > 0
                    ? reviewStats.averageRating.toFixed(1)
                    : '0.0'}
                </p>
              </div>
              <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
                <Star className="size-5" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:col-span-2 xl:col-span-1">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                  Pending Reviews
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">
                  {reviewStats.pendingCount}
                </p>
              </div>
              <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600">
                <PenSquare className="size-5" />
              </div>
            </div>
          </div>
        </div>
)}

        {loading ? (
  <div className="rounded-2xl sm:rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
    <p className="text-sm text-gray-500">Loading reviews...</p>
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
      description="Completed reservations waiting for your feedback and your submitted reviews will appear here."
    />
  </motion.div>
) : (
  <>
    <div className="rounded-2xl sm:rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold text-gray-900">
          Pending Reviews
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Completed reservations waiting for your feedback
        </p>
      </div>

      <div className="p-5 sm:p-6">
        {pendingReviews.length === 0 ? (
          <p className="text-sm text-gray-500">
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
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600">
                        Ready for review
                      </span>

                      <h3 className="mt-1 text-base font-semibold text-gray-900">
                        {reservation.unitName}
                      </h3>

                      <div className="mt-2 space-y-1 text-sm text-gray-500">
                        <p>
                          Completed on {formatDate(reservation.endDate)}
                        </p>
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
                    className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 sm:w-auto"
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
    </div>

    <div className="rounded-2xl sm:rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setShowSubmitted((prev) => !prev)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-gray-50 sm:px-6"
      >
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Submitted Reviews
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            View the feedback you’ve already shared
          </p>
        </div>

        <motion.div
          animate={{ rotate: showSubmitted ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="rounded-lg bg-gray-100 p-1.5"
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
                <p className="text-sm text-gray-500">
                  You haven’t submitted any reviews yet.
                </p>
              ) : (
                <div className="grid gap-4">
                  {userReviews.map((review) => {
                    const unit = reservationUnitMap.get(review.unit_id || '');

                    return (
                      <ReviewCard
                        key={review.review_id}
                        unitName={unit?.name || unit?.name || 'Unknown Unit'}
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
    </div>
  </>
)}
      </div>
    </div>
  );
}