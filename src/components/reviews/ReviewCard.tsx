import { CalendarDays, MessageSquareQuote } from 'lucide-react';
import StarRating from './StarRating';

type ReviewCardProps = {
  name?: string;
  unitName?: string;
  rating: number;
  comment?: string | null;
  createdAt?: string | null;
  actions?: React.ReactNode;
};

export default function ReviewCard({
  name,
  unitName,
  rating,
  comment,
  createdAt,
  actions,
}: ReviewCardProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600">
              Submitted Review
            </span>
          </div>

          <h3 className="mt-3 text-base font-semibold tracking-tight text-gray-900 sm:text-lg">
            {unitName || name || 'Unknown Review'}
          </h3>

          {name && unitName && (
            <p className="mt-1 text-sm text-gray-500">{name}</p>
          )}

          <div className="mt-3">
            <StarRating rating={rating} />
          </div>
        </div>

        {actions && <div className="shrink-0">{actions}</div>}
      </div>

      <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-white p-2 shadow-sm">
            <MessageSquareQuote className="size-4 text-blue-600" />
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
              Feedback
            </p>
            <p className="mt-2 text-sm leading-6 text-gray-700">
              {comment?.trim() || 'No written feedback provided.'}
            </p>
          </div>
        </div>
      </div>

      {createdAt && (
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
          <CalendarDays className="size-4" />
          <span>Submitted on {new Date(createdAt).toLocaleDateString()}</span>
        </div>
      )}
    </div>
  );
}