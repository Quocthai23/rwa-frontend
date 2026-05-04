import { Skeleton } from '@/components/shared/atoms/skeleton';

const ProfileHeaderSkeleton = () => {
  return (
    <>
      <div>
        <div className="relative">
          <div className="-mx-4">
            <Skeleton className="h-38.25 w-full rounded-t-lg sm:h-40" />
          </div>

          <div className="px-1 sm:px-2">
            <div className="flex items-end justify-between gap-3">
              <div className="relative z-10 -mt-10 sm:-mt-12">
                <Skeleton className="border-background h-30 w-30 rounded-full border-4" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="mb-1 h-9 w-24 rounded-full" />
              </div>
            </div>

            <div className="mt-5 px-4">
              <div className="space-y-2">
                <Skeleton className="h-6 w-42" />
                <Skeleton className="h-4 w-28" />
              </div>

              <div className="pt-3">
                <Skeleton className="h-4 w-40" />
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 py-5">
                <Skeleton className="h-4 w-22" />
                <Skeleton className="h-4 w-22" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex">
          <div className="flex-1 px-3 py-3">
            <Skeleton className="mx-auto h-4 w-16" />
          </div>
          <div className="flex-1 px-3 py-3">
            <Skeleton className="mx-auto h-4 w-16" />
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfileHeaderSkeleton;
