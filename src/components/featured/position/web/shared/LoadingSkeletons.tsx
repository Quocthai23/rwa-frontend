export function LoadingMoreTableSkeleton() {
  return (
    <div className="">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={`loading-row-${index}`} className="border-border py-3">
          <div className="bg-muted h-7 w-full animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}
