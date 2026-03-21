import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquare, Star, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useReviews } from '../../contexts/ReviewsContext';
import StarRating from './StarRating';

type ReviewModalProps = {
  open: boolean;
  onClose: () => void;
  reservation?: {
    id: string;
    unitId: string;
    unitName: string;
    endDate?: string;
  } | null;
  review?: {
    review_id: string;
    unit_id: string | null;
    rating: number | null;
    comment: string | null;
  } | null;
  mode?: 'create' | 'edit';
};

export default function ReviewModal({
  open,
  onClose,
  reservation = null,
  review = null,
  mode = 'create',
}: ReviewModalProps) {
  const { user } = useAuth();
  const { createReview, updateReview } = useReviews();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unitId = useMemo(() => {
    if (mode === 'edit') return review?.unit_id || null;
    return reservation?.unitId || null;
  }, [mode, reservation?.unitId, review?.unit_id]);

  const unitName = useMemo(() => {
    if (mode === 'edit') return reservation?.unitName || 'Selected Unit';
    return reservation?.unitName || 'Selected Unit';
  }, [mode, reservation?.unitName]);

  useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && review) {
      setRating(review.rating || 0);
      setComment(review.comment || '');
    } else {
      setRating(0);
      setComment('');
    }

    setError(null);
  }, [open, mode, review]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      setError('You must be signed in to submit a review.');
      return;
    }

    if (!unitId) {
      setError('Unable to determine which unit this review belongs to.');
      return;
    }

    if (rating < 1 || rating > 5) {
      setError('Please select a rating from 1 to 5 stars.');
      return;
    }

    if (!comment.trim()) {
      setError('Please share a short review before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      if (mode === 'edit' && review?.review_id) {
        const result = await updateReview(review.review_id, {
          rating,
          comment: comment.trim(),
        });

        if (!result.success) {
          setError(result.error || 'Failed to update review.');
          return;
        }
      } else {
        const result = await createReview({
          user_id: user.id,
          unit_id: unitId,
          rating,
          comment: comment.trim(),
        });

        if (!result.success) {
          setError(result.error || 'Failed to submit review.');
          return;
        }
      }

      onClose();
    } catch (err) {
      console.error('Review submission failed:', err);
      setError('Something went wrong while saving your review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
          />

          <div className="fixed inset-0 z-[110] flex items-end justify-center p-0 sm:items-center sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]"
            >
              <div className="border-b border-gray-100 px-5 py-4 sm:px-6 sm:py-5">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600">
                      {mode === 'edit' ? 'Edit Review' : 'Leave a Review'}
                    </p>
                    <h2 className="mt-1 text-xl font-bold tracking-tight text-gray-900">
                      {unitName}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {mode === 'edit'
                        ? 'Update your feedback and rating for this unit.'
                        : 'Share your experience and help others learn more about this unit.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={submitting}
                    className="rounded-xl bg-gray-100 p-2 text-gray-500 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Close review modal"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-white p-2 shadow-sm">
                      <MessageSquare className="size-4 text-blue-600" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Your feedback matters
                      </p>
                      <p className="mt-1 text-sm leading-6 text-gray-600">
                        Rate the unit honestly and share a short comment about your
                        experience.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
                <div className="space-y-6">
                  <div className="rounded-2xl border border-gray-100 bg-white">
                    <div className="border-b border-gray-100 px-4 py-4 sm:px-5">
                      <div className="flex items-center gap-2">
                        <Star className="size-4 text-amber-500" />
                        <h3 className="text-sm font-semibold text-gray-900">
                          Your Rating
                        </h3>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        Select a score from 1 to 5 stars.
                      </p>
                    </div>

                    <div className="px-4 py-5 sm:px-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <StarRating
                          rating={rating}
                          readonly={false}
                          onChange={(value) => setRating(value)}
                          size={24}
                        />

                        <span className="text-sm font-medium text-gray-500">
                          {rating > 0 ? `${rating} out of 5` : 'No rating selected'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-white">
                    <div className="border-b border-gray-100 px-4 py-4 sm:px-5">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Your Review
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Share what stood out during your experience.
                      </p>
                    </div>

                    <div className="px-4 py-5 sm:px-5">
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={6}
                        maxLength={1000}
                        placeholder="Write your review here..."
                        className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                      />

                      <div className="mt-2 flex justify-between gap-3 text-xs text-gray-400">
                        <span>
                          Keep it clear, honest, and helpful for future clients.
                        </span>
                        <span>{comment.trim().length}/1000</span>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 bg-white px-5 py-4 sm:px-6">
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={submitting}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {submitting
                      ? mode === 'edit'
                        ? 'Saving Changes...'
                        : 'Submitting Review...'
                      : mode === 'edit'
                      ? 'Save Changes'
                      : 'Submit Review'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}