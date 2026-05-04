'use client';

import { Skeleton } from '@/components/shared/atoms/skeleton';

export function TopRiserItemSkeleton() {
  return (
    <div className="flex w-full flex-row items-center justify-between border-b border-neutral-200 bg-transparent py-3 text-left last:border-b-0">
      {/* Left */}
      <div className="flex w-2/5 min-w-0 items-center gap-3">
        <Skeleton className="h-5 w-5 shrink-0" />
        <div className="flex-1">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="mt-2 h-4 w-28" />
        </div>
      </div>

      {/* Middle */}
      <div className="flex flex-1 flex-row items-center justify-end gap-3">
        <Skeleton className="h-11.25 w-23.25" />
      </div>

      {/* Right */}
      <div className="flex w-20 flex-col items-end gap-2">
        <Skeleton className="h-5 w-14" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}
