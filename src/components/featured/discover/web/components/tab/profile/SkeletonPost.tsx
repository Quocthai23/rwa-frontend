import { Skeleton } from '@/components/shared/atoms/skeleton';

const SkeletonPost = () => {
  return (
    <article key="profile-post-skeleton" className="bg-background overflow-hidden">
      <div className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="bg-muted h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 space-y-2">
              <Skeleton className="bg-muted h-4 w-40" />
              <Skeleton className="bg-muted h-3.5 w-28" />
            </div>
          </div>
          <Skeleton className="bg-muted h-6 w-6 rounded" />
        </div>

        <div className="mt-3 space-y-2">
          <Skeleton className="bg-muted h-4 w-full" />
          <Skeleton className="bg-muted h-4 w-3/4" />
        </div>
      </div>

      <div className="mt-3 pb-4">
        <Skeleton className="bg-muted h-72 w-full rounded-2xl" />
      </div>

      <div className="border-border flex items-center gap-6 border-t px-4 py-3">
        <Skeleton className="bg-muted h-4 w-16" />
        <Skeleton className="bg-muted h-4 w-16" />
        <Skeleton className="bg-muted h-4 w-16" />
      </div>
    </article>
  );
};

export default SkeletonPost;
