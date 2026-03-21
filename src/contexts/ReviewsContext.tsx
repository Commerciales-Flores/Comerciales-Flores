import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import supabase from '../supabaseClient';

export type Review = {
  review_id: string;
  user_id: string | null;
  unit_id: string | null;
  rating: number | null;
  comment: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type CreateReviewInput = {
  user_id: string;
  unit_id: string;
  rating: number;
  comment: string;
};

type UpdateReviewInput = {
  rating?: number;
  comment?: string;
};

type ReviewsContextType = {
  reviews: Review[];
  loading: boolean;
  error: string | null;
  fetchReviews: () => Promise<void>;
  createReview: (input: CreateReviewInput) => Promise<{ success: boolean; error?: string }>;
  updateReview: (
    reviewId: string,
    input: UpdateReviewInput
  ) => Promise<{ success: boolean; error?: string }>;
  deleteReview: (reviewId: string) => Promise<{ success: boolean; error?: string }>;
  getReviewsByUserId: (userId: string) => Review[];
  getReviewsByUnitId: (unitId: string) => Review[];
  getAverageRatingByUnitId: (unitId: string) => number;
  getReviewCountByUnitId: (unitId: string) => number;
};

const ReviewsContext = createContext<ReviewsContextType | undefined>(undefined);

export function ReviewsProvider({ children }: { children: React.ReactNode }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setReviews((data as Review[]) || []);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
      setError('Failed to load reviews.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const createReview = useCallback(async (input: CreateReviewInput) => {
    try {
      setError(null);

      const { data, error } = await supabase
        .from('reviews')
        .insert({
          user_id: input.user_id,
          unit_id: input.unit_id,
          rating: input.rating,
          comment: input.comment,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setReviews((prev) => [data as Review, ...prev]);

      return { success: true };
    } catch (err) {
      console.error('Failed to create review:', err);
      return { success: false, error: 'Failed to create review.' };
    }
  }, []);

  const updateReview = useCallback(async (reviewId: string, input: UpdateReviewInput) => {
    try {
      setError(null);

      const { data, error } = await supabase
        .from('reviews')
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('review_id', reviewId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setReviews((prev) =>
        prev.map((review) => (review.review_id === reviewId ? (data as Review) : review))
      );

      return { success: true };
    } catch (err) {
      console.error('Failed to update review:', err);
      return { success: false, error: 'Failed to update review.' };
    }
  }, []);

  const deleteReview = useCallback(async (reviewId: string) => {
    try {
      setError(null);

      const { error } = await supabase.from('reviews').delete().eq('review_id', reviewId);

      if (error) {
        throw error;
      }

      setReviews((prev) => prev.filter((review) => review.review_id !== reviewId));

      return { success: true };
    } catch (err) {
      console.error('Failed to delete review:', err);
      return { success: false, error: 'Failed to delete review.' };
    }
  }, []);

  const getReviewsByUserId = useCallback(
    (userId: string) => reviews.filter((review) => review.user_id === userId),
    [reviews]
  );

  const getReviewsByUnitId = useCallback(
    (unitId: string) => reviews.filter((review) => review.unit_id === unitId),
    [reviews]
  );

  const getAverageRatingByUnitId = useCallback(
    (unitId: string) => {
      const unitReviews = reviews.filter(
        (review) => review.unit_id === unitId && typeof review.rating === 'number'
      );

      if (!unitReviews.length) return 0;

      const total = unitReviews.reduce((sum, review) => sum + (review.rating || 0), 0);
      return total / unitReviews.length;
    },
    [reviews]
  );

  const getReviewCountByUnitId = useCallback(
    (unitId: string) => reviews.filter((review) => review.unit_id === unitId).length,
    [reviews]
  );

  const value = useMemo(
    () => ({
      reviews,
      loading,
      error,
      fetchReviews,
      createReview,
      updateReview,
      deleteReview,
      getReviewsByUserId,
      getReviewsByUnitId,
      getAverageRatingByUnitId,
      getReviewCountByUnitId,
    }),
    [
      reviews,
      loading,
      error,
      fetchReviews,
      createReview,
      updateReview,
      deleteReview,
      getReviewsByUserId,
      getReviewsByUnitId,
      getAverageRatingByUnitId,
      getReviewCountByUnitId,
    ]
  );

  return <ReviewsContext.Provider value={value}>{children}</ReviewsContext.Provider>;
}

export function useReviews() {
  const context = useContext(ReviewsContext);

  if (!context) {
    throw new Error('useReviews must be used within a ReviewsProvider');
  }

  return context;
}