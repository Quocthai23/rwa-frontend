'use client';

import { memo, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/shared/atoms/button';
import { ToggleFavouriteAsset } from '@/components/shared/components/ToggleFavouriteAsset/ToggleFavouriteAsset';
import MiniChart from '../../home/MiniChart';
import type { Candle } from '@/services/marketService';
import { toFiniteNumberFromNumberish } from '@/components/shared/chart/components/tradePanel/utils/tradePanelInputHelpers';
import type { DecimalValue } from '@/types/decimal';

type ItemSymbolChartViewProps = {
  readonly accessId: string;
  readonly ask?: DecimalValue;
  readonly bid?: DecimalValue;
  readonly change?: number;
  readonly desc?: string;
  readonly digit?: number;
  readonly isFavorite?: boolean;
  readonly percentChange?: number;
  readonly spread?: number;
  readonly symbol?: string;
  readonly marginCurrency?: string;
  readonly profitCurrency?: string;
  readonly miniCandles?: Candle[];
  readonly sellPercent?: number;
  readonly buyPercent?: number;
  readonly isTinyPhone?: boolean;
};

function ItemSymbolChartView({
  accessId,
  ask = 0,
  bid = 0,
  change = 0,
  digit = 2,
  percentChange = 0,
  spread = 3,
  symbol = 'EURUSD',
  marginCurrency,
  profitCurrency,
  miniCandles = [],
  sellPercent = 0,
  buyPercent = 0,
  isTinyPhone,
}: ItemSymbolChartViewProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const pair =
    marginCurrency && profitCurrency ? `${marginCurrency}/${profitCurrency}` : (symbol ?? '');

  const isPositive = change >= 0;
  const formatQuote = useMemo(() => {
    const safeDigit = Number.isFinite(digit) ? Math.min(12, Math.max(0, Math.trunc(digit))) : 2;
    return (value: DecimalValue) => {
      const parsed = toFiniteNumberFromNumberish(value);
      return parsed != null && Number.isFinite(parsed) ? parsed.toFixed(safeDigit) : '-';
    };
  }, [digit]);
  const clampedSellPercent = Math.min(100, Math.max(0, sellPercent));
  const clampedBuyPercent = Math.min(100, Math.max(0, buyPercent));
  const totalPercent = clampedSellPercent + clampedBuyPercent || 1;
  const sellWidth = (clampedSellPercent / totalPercent) * 100;
  const buyWidth = 100 - sellWidth;
  const slantPx = 10;
  const hasBothSides = sellWidth > 0 && buyWidth > 0;
  const displayCandles = useMemo(() => {
    const askValue = toFiniteNumberFromNumberish(ask) ?? 0;
    if (!miniCandles.length) return [];
    if (askValue <= 0) return miniCandles;

    const lastCandle = miniCandles[miniCandles.length - 1];
    if (lastCandle?.close === askValue) return miniCandles;

    const updatedCandles = [...miniCandles];
    updatedCandles[updatedCandles.length - 1] = {
      ...lastCandle,
      close: askValue,
    };

    return updatedCandles;
  }, [miniCandles, ask]);

  return (
    <div
      role="button"
      tabIndex={0}
      className="flex w-full min-w-0 items-center justify-between gap-4 overflow-hidden border-b border-neutral-100 py-2"
      onClick={() => {
        router.push(`/market/${encodeURIComponent(symbol)}`);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          router.push(`/market/${encodeURIComponent(symbol)}`);
        }
      }}
    >
      <div
        className={`relative flex ${isTinyPhone ? 'w-[71.66%]' : 'w-[69.66%]'} min-w-0 flex-col gap-2 text-left`}
      >
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1">
            <span className="text-body-large-semibold min-w-0 truncate">{pair}</span>
            <ToggleFavouriteAsset assetId={accessId} size={5} />
          </div>
          <span
            className={`${isTinyPhone ? 'text-[12px]' : 'text-body-small-regular'} text-muted-foreground tabular-nums`}
          >
            {t('market.spread')}: {spread}
          </span>
        </div>

        <div className="flex min-w-0 items-center gap-2 self-stretch">
          <Button
            variant="red-ghost"
            className="min-w-0 flex-1 justify-between gap-2 overflow-hidden px-2 py-2 text-center"
          >
            <span
              className={`${isTinyPhone ? 'text-[12px]' : 'text-body-small-medium'} min-w-0 truncate text-center tabular-nums`}
            >
              Sell {formatQuote(bid)}
            </span>
          </Button>

          <Button
            variant="green-ghost"
            className="min-w-0 flex-1 justify-between gap-2 overflow-hidden px-2 py-2 text-center"
          >
            <span
              className={`${isTinyPhone ? 'text-[12px]' : 'text-body-small-medium'} min-w-0 truncate text-center tabular-nums`}
            >
              Buy {formatQuote(ask)}
            </span>
          </Button>
        </div>

        <div className="flex flex-col gap-0.5">
          <div className="bg-card ring-border h-1.5 w-full overflow-hidden rounded-full ring-1">
            <div className="relative h-full w-full">
              <div
                className="absolute inset-y-0 left-0 z-0 bg-red-500"
                style={{
                  width: hasBothSides ? `calc(${sellWidth}% + ${slantPx}px)` : `${sellWidth}%`,
                  clipPath: hasBothSides
                    ? `polygon(0 0, calc(100% - ${slantPx}px) 0, 100% 100%, 0 100%)`
                    : undefined,
                }}
              />
              <div
                className="absolute inset-y-0 z-10 bg-green-500"
                style={{
                  left: hasBothSides ? `calc(${sellWidth}% - ${slantPx}px)` : `${sellWidth}%`,
                  width: hasBothSides ? `calc(${buyWidth}% + ${slantPx}px)` : `${buyWidth}%`,
                  clipPath: hasBothSides
                    ? `polygon(${slantPx}px 0, 100% 0, 100% 100%, 0 100%)`
                    : undefined,
                }}
              />
              {hasBothSides ? (
                <div
                  className="bg-card pointer-events-none absolute inset-y-0 z-20"
                  style={{
                    left: `calc(${sellWidth}% - ${slantPx}px)`,
                    width: `${slantPx * 2}px`,
                    clipPath: `polygon(50% 0, calc(50% + 2px) 0, 2px 100%, 0 100%)`,
                  }}
                />
              ) : null}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-body-small-regular w-12 text-left text-red-500 tabular-nums">
              {clampedSellPercent.toFixed(2)}%
            </span>
            <span className="text-body-small-regular w-12 text-right text-green-500 tabular-nums">
              {clampedBuyPercent.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      <div
        className={`relative flex h-full ${isTinyPhone ? 'w-[28.33%]' : 'w-[30.33%]'} min-w-0 flex-none flex-col justify-between gap-2 overflow-hidden`}
      >
        <div className="relative flex w-auto flex-col gap-1 overflow-hidden">
          <span
            className={`${isTinyPhone ? 'text-[12px]' : 'text-body-small-regular'} text-left ${
              isPositive ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {change?.toFixed(2)} ({percentChange?.toFixed()}%)
          </span>
          <div className="flex w-full justify-end">
            <MiniChart
              candles={displayCandles}
              isPositive={isPositive}
              responsive
              width={250}
              height={isTinyPhone ? 195 : 165}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(ItemSymbolChartView);

