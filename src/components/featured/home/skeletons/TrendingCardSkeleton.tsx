'use client';

export function TrendingCardSkeleton() {
  return (
    <div className="bg-accent flex w-[calc(50%-4px)] animate-pulse flex-col gap-2 rounded p-3">
      {/* Header */}
      <div className="flex w-full items-center justify-between">
        <div className="bg-muted h-4 w-1/2 rounded"></div>
        <div className="bg-muted h-6 w-6 rounded-full"></div>
      </div>

      {/* Price */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex flex-1 flex-col gap-1">
          <div className="bg-muted h-3 w-[60%] rounded"></div>
          <div className="bg-muted h-3 w-[80%] rounded"></div>
        </div>

        <div className="bg-muted h-9.25 w-18.75 rounded"></div>
      </div>

      {/* Progress */}
      <div className="bg-muted h-1.5 w-full rounded"></div>

      {/* Percent */}
      <div className="flex justify-between">
        <div className="bg-muted h-3 w-[30%] rounded"></div>
        <div className="bg-muted h-3 w-[30%] rounded"></div>
      </div>
    </div>
  );
}
