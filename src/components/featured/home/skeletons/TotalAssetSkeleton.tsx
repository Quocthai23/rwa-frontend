import { Skeleton } from '@/components/shared/atoms/skeleton';

export function TotalAssetSkeleton() {
  return (
    <div className="p-4">
      <div className="bg-muted flex flex-col gap-3 rounded p-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-5 rounded-sm" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-44" />
            <Skeleton className="h-6 w-18" />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="size-30 rounded-full" />
          <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-18" />
            <Skeleton className="h-4 w-14" />
          </div>
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-11.5 flex-1 rounded" />
          <Skeleton className="h-11.5 flex-1 rounded" />
        </div>
      </div>
    </div>
  );
}
