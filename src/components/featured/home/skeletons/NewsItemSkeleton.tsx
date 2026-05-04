'use client';

import { Skeleton } from '@/components/shared/atoms/skeleton';

export function NewsItemSkeleton() {
  return (
    <div className="flex w-full gap-3 border-b border-neutral-200 py-4 text-left">
      <div className="flex flex-1 flex-col justify-center gap-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
        <div className="mt-1 flex items-center gap-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Skeleton className="h-20 w-20 shrink-0 rounded" />
    </div>
  );
}
