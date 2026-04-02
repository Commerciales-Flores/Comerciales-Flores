import { useMemo, useState } from 'react';
import { ChevronDown, MessageSquare, Star, TrendingUp, AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import { useReviews } from '../../contexts/ReviewsContext';
import EmptyState from '../../components/common/EmptyState';
import ReviewCard from '../../components/reviews/ReviewCard';

export default function AdminReview() {
  const { units, users } = useData();
  const { reviews, loading } = useReviews();

  const [showAllReviews, setShowAllReviews] = useState(true);

  const unitMap = useMemo(() => {
    return new Map(
      units.map((unit: any) => [unit.id ?? unit.unit_id, unit])
    );
  }, [units]);

  const userMap = useMemo(() => {
    return new Map(
      users.map((user: any) => [
        user.id ?? user.user_id,
        `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown User',
      ])
    );
  }, [users]);

  const sortedReviews = useMemo(() => {
    return [...reviews].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [reviews]);

  const reviewStats = useMemo(() => {
    const totalReviews = sortedReviews.length;
    const totalRating = sortedReviews.reduce((sum, review) => sum + (review.rating || 0), 0);
    const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;
    const lowRatedCount = sortedReviews.filter((review) => (review.rating || 0) <= 2).length;

    return {
      totalReviews,
      averageRating,
      lowRatedCount,
    };
  }, [sortedReviews]);

  const hasNoReviewContent = !loading && sortedReviews.length === 0;

  return (
    <div className="min-h-screen bg-white">
  <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <div className="flex items-end justify-between gap-4">
          <header>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Reviews
            </h1>
            <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">
              Monitor client feedback and ratings across all units
            </p>
          </header>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
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
              description="Client reviews and ratings will appear here once feedback is submitted."
            />
          </motion.div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                      Low Ratings
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">
                      {reviewStats.lowRatedCount}
                    </p>
                  </div>
                  <div className="rounded-xl bg-red-50 p-2.5 text-red-600">
                    <AlertTriangle className="size-5" />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl sm:rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAllReviews((prev) => !prev)}
                className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-gray-50 sm:px-6"
              >
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Submitted Reviews
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Recent client feedback and property ratings
                  </p>
                </div>

                <motion.div
                  animate={{ rotate: showAllReviews ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-lg bg-gray-100 p-1.5"
                >
                  <ChevronDown className="size-4 text-gray-500" />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {showAllReviews && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-gray-100 p-5 sm:p-6">
                      <div className="grid gap-4">
                        {sortedReviews.map((review) => {
                          const unit = unitMap.get(review.unit_id || '');
                          const userName = userMap.get(review.user_id || '') || 'Unknown User';
                          const unitName =
                            unit?.name || unit?.unitName || 'Unknown Unit';

                          return (
                            <ReviewCard
                              key={review.review_id}
                              name={userName}
                              unitName={unitName}
                              rating={review.rating || 0}
                              comment={review.comment}
                              createdAt={review.created_at}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-green-50 p-2.5 text-green-600">
                  <TrendingUp className="size-5" />
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    Review Insights
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    Use this page to monitor overall sentiment, spot low-rated units,
                    and keep track of the latest feedback from clients.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}