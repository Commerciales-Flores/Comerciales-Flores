import type { ReactNode } from 'react';

export default function TableBadge({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-[10px] font-bold leading-none ${className}`}
    >
      {children}
    </span>
  );
}