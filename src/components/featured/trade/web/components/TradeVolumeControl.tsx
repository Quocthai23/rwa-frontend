'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from '@untitledui/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shared/atoms/dropdown-menu';
import { Input } from '@/components/shared/atoms/input';
import { cn } from '@/lib/utils';
import { Button } from '@/components/shared/atoms/button';

const INCREMENT_OPTIONS = [0.01, 0.1, 1] as const;
const QUICK_VOLUME_OPTIONS = [0.1, 0.5, 1, 2] as const;

export type TradeVolumeControlProps = {
  minTradeSize: number;
  maxTradeSize: number;
  volume: string;
  volumeInput: string;
  volumeError: string | null;
  onVolumeChange: (value: string) => void;
  onVolumeBlur: () => void;
  setVolume: (value: string) => void;
  setVolumeInput: (value: string) => void;
  setVolumeBoth: (next: number) => void;
  className?: string;
  inputClassName?: string;
  triggerClassName?: string;
  chevronClassName?: string;
  onAdjustVolume?: (next: number) => void;
  onQuickVolumeSet?: (next: number) => void;
  chevronSize?: number;
};

export function TradeVolumeControl({
  minTradeSize,
  maxTradeSize,
  volume,
  volumeInput,
  volumeError,
  onVolumeChange,
  onVolumeBlur,
  setVolume,
  setVolumeInput,
  setVolumeBoth,
  className,
  inputClassName,
  triggerClassName,
  chevronClassName,
  onAdjustVolume,
  onQuickVolumeSet,
  chevronSize = 28,
}: TradeVolumeControlProps) {
  const [openVolumeMenu, setOpenVolumeMenu] = useState<'decrease' | 'increase' | null>(null);

  const applyVolumeBoth = (next: number) => {
    if (onAdjustVolume) onAdjustVolume(next);
    else setVolumeBoth(next);
  };

  const applyQuickPick = (value: number) => {
    if (onQuickVolumeSet) onQuickVolumeSet(value);
    else {
      setVolume(value.toString());
      setVolumeInput(value.toFixed(2));
    }
  };

  return (
    <div
      className={cn(
        'bg-background flex h-full w-full items-stretch border-y border-neutral-200 dark:border-neutral-800',
        className,
      )}
    >
      <DropdownMenu
        open={openVolumeMenu === 'decrease'}
        onOpenChange={(open) => setOpenVolumeMenu(open ? 'decrease' : null)}
      >
        <DropdownMenuTrigger asChild>
          <Button
            variant="white-contained"
            className={cn('flex items-center justify-center rounded-none p-0.5', triggerClassName)}
          >
            <ChevronDown
              className={cn('text-muted-foreground', chevronClassName)}
              size={chevronSize}
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="top"
          className="bg-background z-110 w-full border-none"
        >
          <div className="flex">
            {INCREMENT_OPTIONS.map((increment) => (
              <DropdownMenuItem
                key={`dec-${increment}`}
                className="border-border flex-1 justify-center border-b py-2"
                onSelect={(e) => {
                  e.preventDefault();
                  const min = minTradeSize;
                  const current = Number.parseFloat(volumeInput || volume || String(min));
                  const next = Math.max(
                    min,
                    (Number.isFinite(current) ? current : min) - increment,
                  );
                  applyVolumeBoth(next);
                }}
              >
                <span className="text-primary-500 block text-center font-semibold">
                  -{increment}
                </span>
              </DropdownMenuItem>
            ))}
          </div>
          <div className="px-4 py-2">
            <div className="flex flex-wrap">
              {QUICK_VOLUME_OPTIONS.map((value) => (
                <DropdownMenuItem
                  key={`dec-q-${value}`}
                  className="flex w-1/2 items-center justify-center px-2 py-2"
                  onSelect={() => {
                    applyQuickPick(value);
                  }}
                >
                  <span className="text-[14px] font-semibold">
                    {Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}
                  </span>
                </DropdownMenuItem>
              ))}
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <Input
        type="text"
        inputMode="decimal"
        pattern="[0-9]*[.,]?[0-9]*"
        placeholder="0.00"
        className={cn(
          'dark:bg-neutral-1000 h-full w-full flex-1 rounded-none border-none bg-white py-2.25 text-center font-semibold shadow-none outline-none placeholder:text-neutral-300 focus-visible:ring-0',
          volumeError ? 'text-red-500' : 'text-muted-foreground',
          inputClassName,
        )}
        value={volumeInput}
        onChange={(e) => onVolumeChange(e.target.value)}
        onBlur={onVolumeBlur}
      />

      <DropdownMenu
        open={openVolumeMenu === 'increase'}
        onOpenChange={(open) => setOpenVolumeMenu(open ? 'increase' : null)}
      >
        <DropdownMenuTrigger asChild>
          <Button
            className={cn('flex items-center justify-center rounded-none p-0.5', triggerClassName)}
            variant="white-contained"
          >
            <ChevronUp
              className={cn('text-muted-foreground', chevronClassName)}
              size={chevronSize}
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side="top"
          className="bg-background z-110 w-full border-none"
        >
          <div className="flex">
            {INCREMENT_OPTIONS.map((increment) => (
              <DropdownMenuItem
                key={`inc-${increment}`}
                className="border-border flex-1 justify-center border-b py-2"
                onSelect={(e) => {
                  e.preventDefault();
                  const min = minTradeSize;
                  const max = maxTradeSize;
                  const current = Number.parseFloat(volumeInput || volume || String(min));
                  const base = Number.isFinite(current) ? current : min;
                  const next = Math.min(max, base + increment);
                  applyVolumeBoth(next);
                }}
              >
                <span className="text-primary-500 block text-center font-semibold">
                  +{increment}
                </span>
              </DropdownMenuItem>
            ))}
          </div>
          <div className="px-4 py-2">
            <div className="flex flex-wrap">
              {QUICK_VOLUME_OPTIONS.map((value) => (
                <DropdownMenuItem
                  key={`inc-q-${value}`}
                  className="flex w-1/2 items-center justify-center px-2 py-2"
                  onSelect={() => {
                    applyQuickPick(value);
                  }}
                >
                  <span className="text-[14px] font-semibold">
                    {Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}
                  </span>
                </DropdownMenuItem>
              ))}
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
