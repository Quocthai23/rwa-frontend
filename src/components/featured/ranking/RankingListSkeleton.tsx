'use client';

export default function RankingListSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={`ranking-skeleton-${index}`}
          className="flex items-center justify-between border-b border-neutral-100 py-4"
        >
          <div className="flex flex-1 items-center gap-2">
            <div className="flex-1 space-y-2">
              <div className="h-5 w-24 animate-pulse rounded-full bg-neutral-200" />
              <div className="h-4 w-16 animate-pulse rounded-full bg-neutral-100" />
            </div>
          </div>
          <div className="items-end">
            <div className="flex items-center gap-3">
              <div className="w-24">
                <div className="h-5 w-20 animate-pulse rounded-full bg-neutral-200" />
              </div>
              <div className="w-24">
                <div className="h-5 w-16 animate-pulse rounded-full bg-neutral-200" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
