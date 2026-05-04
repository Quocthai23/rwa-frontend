'use client';

import * as React from 'react';
import { ChevronRight } from '@untitledui/icons';

import { cn } from '@/lib/utils';

export function AboutRow({
  left,
  right,
  onPress,
  showChevron = true,
  className,
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  className?: string;
  chevronClassName?: string;
}) {
  const isInteractive = Boolean(onPress);

  return (
    <button
      type="button"
      onClick={onPress}
      className={cn(
        'bg-card flex w-full items-center justify-between rounded px-4 py-4 text-left transition-colors',
        isInteractive ? 'cursor-pointer' : 'cursor-default',
        className,
      )}
    >
      <div className="min-w-0">{left}</div>

      <div className="flex items-center gap-3">
        {right}
        {isInteractive && showChevron ? (
          <ChevronRight className="text-muted-foreground size-5" />
        ) : null}
      </div>
    </button>
  );
}
