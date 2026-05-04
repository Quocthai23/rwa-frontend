import { Skeleton } from '@/components/shared/atoms/skeleton';

export function HomeHeaderBarSkeleton() {
  return (
    <div className="bg-background z-10 flex h-12 flex-row items-center justify-between gap-4 p-4">
      <div className="flex flex-1 flex-row items-center gap-3">
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-5 rounded-sm" />
      </div>
      <div className="flex flex-row items-center gap-5 dark:bg-neutral-800">
        <Skeleton className="size-5 rounded-sm dark:bg-neutral-800" />
        <Skeleton className="size-5 rounded-sm dark:bg-neutral-800" />
      </div>
    </div>
  );
}
