'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import MiniChart from './MiniChart';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import { useSymbols } from '@/hook/useSymbols';
import { useTheme } from '@/theme';
import type { Candle } from '@/services/marketService';

type TrendingCardProps = {
  assetId?: string;
  icon?: string;
  symbol: string;
  symbolName: string;
  timeframe?: number;
  miniCandles?: Candle[];
};

export default function TrendingCard({
  assetId,
  icon,
  symbol,
  symbolName,
  timeframe = 60,
  miniCandles = [],
}: TrendingCardProps) {
  const router = useRouter();
  const { colors } = useTheme();
  useSymbols([symbol], true);

  const lastPrice = useMarketSocketStore((s) => s.rtBySymbol?.[symbol]?.lastPrice);
  const changePercent = useMarketSocketStore((s) => s.rtBySymbol?.[symbol]?.changePercent);
  const takerBuyRatio24h = useMarketSocketStore((s) => s.rtBySymbol?.[symbol]?.takerBuyRatio24h);

  const price = lastPrice || 0;
  const priceChange = changePercent || 0;

  const buyPercentage = takerBuyRatio24h || 0;
  const sellPercentage = 100 - buyPercentage;

  const isPositive = priceChange >= 0;

  const percentageText = `${isPositive ? '+' : ''}${priceChange.toFixed(2)}%`;

  const displayCandles = useMemo(() => {
    if (!miniCandles.length) return [];
    const updated = [...miniCandles];
    if (updated.length > 0 && price > 0) {
      updated[updated.length - 1] = {
        ...updated[updated.length - 1],
        close: price,
      };
    }
    return updated;
  }, [miniCandles, price]);

  const safeBuy = Math.max(0, Math.min(100, buyPercentage));
  const CUT = 2;

  return (
    <button
      onClick={() => router.push(`/market/${symbol}?assetId=${assetId}`)}
      className="bg-card flex w-[calc(50%-4px)] flex-col gap-2 rounded p-3 text-left"
    >
      {/* Header */}
      <div className="flex w-full items-center justify-between">
        <p className="text-foreground font-semibold">{symbolName}</p>

        {icon && (
          <Image src={icon} alt={symbolName} width={24} height={24} className="rounded-full" />
        )}
      </div>

      {/* Price + Chart */}
      <div className="flex w-full items-center justify-between">
        <div className="flex w-[45%] flex-col gap-1">
          <p
            className={`truncate text-sm font-semibold tabular-nums ${
              isPositive ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {percentageText}
          </p>

          <p className="text-foreground truncate text-sm tabular-nums">{price}</p>
        </div>

        <div className="flex min-h-9.25 w-[45%] justify-end">
          {displayCandles.length > 0 && (
            <MiniChart candles={displayCandles} height={37} width={75} isPositive={isPositive} />
          )}
        </div>
      </div>

      {/* Buy Sell Bar */}
      <div className="flex flex-col gap-1">
        <div className="relative h-1.5 w-full overflow-hidden rounded">
          <svg
            viewBox="0 0 100 6"
            preserveAspectRatio="none"
            className="h-full w-full"
            shapeRendering="geometricPrecision"
          >
            <path
              d={`
      M 0 0
      L ${safeBuy} 0
      L ${safeBuy - CUT} 6
      L 0 6
      Z
    `}
              fill={colors.green500}
            />

            <path
              d={`
      M ${safeBuy + CUT} 0
      L 100 0
      L 100 6
      L ${safeBuy} 6
      Z
    `}
              fill={colors.red500}
            />
          </svg>
        </div>

        <div className="flex justify-between text-sm tabular-nums">
          <span className="text-green-500">{buyPercentage.toFixed(2)}%</span>
          <span className="text-red-500">{sellPercentage.toFixed(2)}%</span>
        </div>
      </div>
    </button>
  );
}

