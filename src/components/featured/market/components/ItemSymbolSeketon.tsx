'use client';

import { useEffect, useState } from 'react';

function SkeletonBlock({
  className = '',
  shimmer = true,
}: {
  readonly className?: string;
  readonly shimmer?: boolean;
}) {
  const [isBright, setIsBright] = useState(false);

  useEffect(() => {
    if (!shimmer) return;

    const interval = window.setInterval(() => {
      setIsBright((prev) => !prev);
    }, 650);
    return () => {
      window.clearInterval(interval);
    };
  }, [shimmer]);

  return (
    <div
      className={`rounded bg-gray-700/10 ${className}`}
      style={{
        opacity: shimmer ? (isBright ? 1 : 0.5) : 0.7,
        transition: 'opacity 650ms ease-in-out',
      }}
    />
  );
}

export function SymbolRowSkeleton({ shimmer = true }: { readonly shimmer?: boolean }) {
  return (
    <div className="border-border flex items-center gap-2 border-b py-3">
      {/* Left 40% */}
      <div className="flex w-[40%] flex-col gap-[6px]">
        {/* Line 1: symbol + star */}
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-[18px] w-[70px]" shimmer={shimmer} />
          <SkeletonBlock className="h-[18px] w-[18px] rounded-full" shimmer={shimmer} />
        </div>

        {/* Spread */}
        <SkeletonBlock className="h-[14px] w-[90px]" shimmer={shimmer} />

        {/* Change */}
        <SkeletonBlock className="h-[14px] w-[120px]" shimmer={shimmer} />
      </div>

      {/* Right */}
      <div className="flex flex-1 gap-2">
        {/* Bid */}
        <div className="flex w-1/2 flex-col items-end gap-2 text-right">
          <SkeletonBlock className="h-[18px] w-[80px]" shimmer={shimmer} />
          <SkeletonBlock className="h-[14px] w-[90px]" shimmer={shimmer} />
        </div>

        {/* Ask */}
        <div className="flex w-1/2 flex-col items-end gap-2 text-right">
          <SkeletonBlock className="h-[18px] w-[80px]" shimmer={shimmer} />
          <SkeletonBlock className="h-[14px] w-[90px]" shimmer={shimmer} />
        </div>
      </div>
    </div>
  );
}

