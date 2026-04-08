import { Star } from 'lucide-react';

type StarRatingProps = {
  rating: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: number;
};

export default function StarRating({
  rating,
  onChange,
  readonly = true,
  size = 18,
}: StarRatingProps) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((value) => {
        const active = value <= rating;

        return (
          <button
            key={value}
            type="button"
            onClick={() => !readonly && onChange?.(value)}
            disabled={readonly}
            className={readonly ? 'cursor-default' : 'cursor-pointer'}
            aria-label={`Rate ${value} star${value > 1 ? 's' : ''}`}
          >
            <Star
              size={size}
              className={active ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
            />
          </button>
        );
      })}
    </div>
  );
}