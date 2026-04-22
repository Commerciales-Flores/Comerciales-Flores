export type SortOption<T extends string> = {
  value: T;
  label: string;
};

type SortSelectProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: SortOption<T>[];
  className?: string;
  size?: 'default' | 'compact';
};

export default function SortSelect<T extends string>({
  value,
  onChange,
  options,
  className = '',
  size = 'default',
}: SortSelectProps<T>) {
  const sizeClass =
    size === 'compact'
      ? 'h-9 rounded-xl px-3 text-[11px] font-semibold'
      : 'h-11 rounded-xl px-4 text-sm font-medium';

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={`${sizeClass} border border-slate-300 bg-white text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${className}`}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}