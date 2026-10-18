export function LoadingMoreTableSkeleton({
  rows = 4,
  columns = 1,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`loading-row-${rowIndex}`} className="border-border flex gap-2 border-b py-3">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={`loading-col-${colIndex}`}
              className="bg-muted h-7 flex-1 animate-pulse rounded"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

