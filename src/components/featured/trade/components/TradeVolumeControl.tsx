'use client';

import { ChevronDown, ChevronUp } from '@untitledui/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shared/atoms/dropdown-menu';
import { Input } from '@/components/shared/atoms/input';

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
}: TradeVolumeControlProps) {
  return (
    <div className="flex h-full w-[34%] min-w-20 items-stretch border-y border-neutral-200 dark:border-neutral-800">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="flex items-center justify-center">
            <ChevronDown className="text-muted-foreground" size={28} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="bg-background w-full border-none">
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
                  setVolumeBoth(next);
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
                    setVolume(value.toString());
                    setVolumeInput(value.toFixed(2));
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
        className={`h-full w-1/3 flex-1 border-none bg-transparent py-2.25 text-center font-semibold shadow-none outline-none placeholder:text-neutral-300 focus-visible:ring-0 dark:bg-transparent ${
          volumeError ? 'text-red-500' : 'text-muted-foreground'
        }`}
        value={volumeInput}
        onChange={(e) => onVolumeChange(e.target.value)}
        onBlur={onVolumeBlur}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="flex items-center justify-center">
            <ChevronUp className="text-muted-foreground" size={28} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="bg-background w-full border-none">
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
                  setVolumeBoth(next);
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
                    setVolume(value.toString());
                    setVolumeInput(value.toFixed(2));
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

