import type { ReactNode } from 'react';

type DataTableProps = {
  headers: ReactNode[];
  children: ReactNode;
  className?: string;
};

export function DataTable({ headers, children, className = '' }: DataTableProps) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gray-500"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

type DataCellProps = {
  value: ReactNode;
  className?: string;
  nowrap?: boolean;
  mono?: boolean;
  muted?: boolean;
};

export function DataCell({
  value,
  className = '',
  nowrap = false,
  mono = false,
  muted = false,
}: DataCellProps) {
  return (
    <td className={`px-4 py-2.5 align-middle ${className}`}>
      <div
        className={[
          'min-w-0 text-sm leading-snug',
          mono ? 'font-mono font-semibold text-sm text-gray-700' : 'font-normal text-gray-600',
          muted ? 'text-gray-500' : '',
          nowrap ? 'whitespace-nowrap' : 'whitespace-normal break-words',
        ].join(' ')}
      >
        {value || '—'}
      </div>
    </td>
  );
}

type ActionCellProps = {
  children: ReactNode;
  className?: string;
};

export function ActionCell({ children, className = '' }: ActionCellProps) {
  return (
    <td className={`px-4 py-3 align-top whitespace-nowrap ${className}`}>
      <div className="flex items-center gap-1 whitespace-nowrap">{children}</div>
    </td>
  );
}   