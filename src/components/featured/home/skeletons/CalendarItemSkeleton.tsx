'use client';

import { Skeleton } from '@/components/shared/atoms/skeleton';

export function CalendarItemSkeleton() {
  return (
    <div className="flex w-full flex-col border-b border-neutral-200 py-4 text-left">
      {/* Header: Flag, Time/Currency & Impact Stars */}
      <div className="flex flex-row items-center justify-between">
        <div className="flex flex-row items-center gap-2">
          <Skeleton className="h-5 w-6 rounded-sm" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-4 w-12" />
      </div>
      {/* Title */}
      <div className="mt-2 mb-3 flex flex-col gap-1.5">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-2/3" />
      </div>
      {/* Bottom stats: Previous / Expected / Actual */}
      <div className="flex flex-row items-center justify-between">
        <div className="flex w-1/3 flex-col items-start gap-1.5">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-4 w-8" />
        </div>
        <div className="flex w-1/3 flex-col items-center gap-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-8" />
        </div>
        <div className="flex w-1/3 flex-col items-end gap-1.5">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-4 w-8" />
        </div>
      </div>
    </div>
  );
}
