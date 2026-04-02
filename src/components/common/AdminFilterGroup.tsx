import type { ReactNode } from 'react';

export function AdminFilterGroup({
  children,
  align = 'start',
}: {
  children: ReactNode;
  align?: 'start' | 'between';
}) {
  return (
    <div
      className={
        align === 'between'
          ? 'flex w-full flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'
          : 'flex w-full flex-wrap items-center gap-2'
      }
    >
      {children}
    </div>
  );
}