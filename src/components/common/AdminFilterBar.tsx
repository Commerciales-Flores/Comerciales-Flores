import type { ReactNode } from 'react';
import { Search, Filter } from 'lucide-react';

type AdminFilterBarProps = {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  showMobileFilters?: boolean;
  onToggleMobileFilters?: () => void;
};

export const FILTER_INPUT_CLASS =
  'w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100';

export const FILTER_SELECT_CLASS =
  'w-full lg:w-auto rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100';

export const FILTER_BUTTON_CLASS =
  'inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50';

export default function AdminFilterBar({
  searchTerm,
  onSearchChange,
  placeholder = 'Search...',
  filters,
  actions,
  showMobileFilters,
  onToggleMobileFilters,
}: AdminFilterBarProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
  <div className="flex items-center gap-2 lg:min-w-[320px] lg:flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              maxLength={100}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={placeholder}
              className={FILTER_INPUT_CLASS}
            />
          </div>

          {onToggleMobileFilters && (
            <button
              type="button"
              onClick={onToggleMobileFilters}
              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition lg:hidden ${
                showMobileFilters
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700'
              }`}
            >
              <Filter className="size-4" />
            </button>
          )}

          {actions}
        </div>

        {filters && (
  <div className="hidden w-full border-t border-gray-100 pt-4 lg:block">
    {filters}
  </div>
)}
      </div>

      {filters && showMobileFilters && (
  <div className="mt-1 w-full border-t border-gray-100 pt-2 lg:hidden">
    {filters}
  </div>
)}
    </div>
  );
}