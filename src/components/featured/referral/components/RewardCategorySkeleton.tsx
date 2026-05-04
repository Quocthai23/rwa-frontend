'use client';

import { Skeleton } from '@/components/shared/atoms/skeleton';

export function RewardCategorySkeleton() {
  return (
    <div className="border-border bg-card rounded-2xl border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="space-y-2 text-right">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {[1, 2, 3, 4].map((chip) => (
          <Skeleton key={chip} className="h-6 w-16 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
