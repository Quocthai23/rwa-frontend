'use client';

import { Button } from '@/components/shared/atoms/button';
import MT5PriceText from '@/components/featured/market/components/MT5PriceText';
import { useTranslation } from 'react-i18next';
import { TradeVolumeControl } from './TradeVolumeControl';
import { cn } from '@/lib/utils';

export type TradeBottomBarProps = {
  ask: number;
  bid: number;
  whiteColor: string;
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
  onSell: () => void;
  onBuy: () => void;
  disabled?: boolean;
  bottomClassName?: string;
};

export function TradeBottomBar({
  ask,
  bid,
  whiteColor,
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
  onSell,
  onBuy,
  disabled = false,
  bottomClassName,
}: TradeBottomBarProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'bg-muted fixed bottom-16 left-1/2 z-40 w-full max-w-3xl -translate-x-1/2',
        bottomClassName,
      )}
    >
      <div className="bg-background mx-auto flex w-full shadow-[0_-2px_8px_rgba(15,23,42,0.08)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.35)]">
        <div className="w-[33%]">
          <Button
            type="button"
            variant="red-contained"
            disabled={disabled}
            className="w-full items-center justify-center gap-1 rounded-none py-2 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onSell}
          >
            <span className="text-body-large-semibold text-white">{t('symbolDetail.sell')}</span>
            <MT5PriceText
              baseFontSize={13}
              bigFontSize={17}
              supFontSize={13}
              style={{ color: whiteColor }}
              value={bid}
            />
          </Button>
        </div>
        <TradeVolumeControl
          minTradeSize={minTradeSize}
          maxTradeSize={maxTradeSize}
          volume={volume}
          volumeInput={volumeInput}
          volumeError={volumeError}
          onVolumeChange={onVolumeChange}
          onVolumeBlur={onVolumeBlur}
          setVolume={setVolume}
          setVolumeInput={setVolumeInput}
          setVolumeBoth={setVolumeBoth}
        />
        <div className="w-[33%]">
          <Button
            type="button"
            variant="green-contained"
            disabled={disabled}
            className="w-full items-center justify-center gap-1 rounded-none py-2 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onBuy}
          >
            <span className="text-body-large-semibold text-white">{t('symbolDetail.buy')}</span>
            <MT5PriceText
              baseFontSize={13}
              bigFontSize={17}
              supFontSize={13}
              style={{ color: whiteColor }}
              value={ask}
            />
          </Button>
        </div>
      </div>
    </div>
  );
}
