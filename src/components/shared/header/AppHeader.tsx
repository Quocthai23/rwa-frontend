'use client';

import { ChevronLeft } from '@untitledui/icons';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

export type SharedHeaderProps = {
  label: string;
  iconLeftLabel?: ReactNode;
  onBack?: () => void;
  rightItem?: ReactNode;
};

export default function AppHeader({ label, iconLeftLabel, onBack, rightItem }: SharedHeaderProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onBack) {
      onBack();
      return;
    }

    router.back();
  };

  return (
    <div className="bg-background sticky top-0 z-50 flex h-14 items-center">
      <button
        type="button"
        onClick={handleClick}
        className="absolute left-0 z-10 rounded-full p-1 transition-colors"
      >
        <ChevronLeft size={24} className="text-foreground" />
      </button>

      <div className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 items-center gap-2">
        {iconLeftLabel}
        <h1 className="text-h3-semibold text-foreground truncate font-semibold">{label}</h1>
      </div>

      {rightItem && <div className="absolute right-4 z-10">{rightItem}</div>}
    </div>
  );
}
