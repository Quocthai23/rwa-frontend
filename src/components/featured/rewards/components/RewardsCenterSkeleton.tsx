import { Skeleton } from '@/components/shared/atoms/skeleton';

const RewardsCenterSkeleton = () => (
  <>
    <div className="mb-4 pt-5">
      <Skeleton className="mb-3 h-6 w-40" />
    </div>

    <div className="mb-6 pt-5">
      <Skeleton className="mt-5 mb-4 h-6 w-40" />
      <div className="flex gap-2 py-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`earning-skeleton-${index}`}
            className="border-border bg-background flex-1 rounded border p-2"
          >
            <Skeleton className="mb-2 h-8 w-8 rounded-full" />
            <Skeleton className="mb-2 h-6 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>

    <Skeleton className="mb-3 h-6 w-36" />
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, groupIndex) => (
        <div key={`reward-group-skeleton-${groupIndex}`}>
          <Skeleton className="mb-2 h-5 w-24" />
          <div className="border-border bg-background overflow-hidden rounded border px-4 py-2">
            {Array.from({ length: 3 }).map((_, itemIndex) => (
              <div key={`reward-item-skeleton-${groupIndex}-${itemIndex}`}>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <Skeleton className="mb-2 h-5 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
                {itemIndex < 2 ? <div className="bg-border h-px" /> : null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </>
);

export default RewardsCenterSkeleton;
