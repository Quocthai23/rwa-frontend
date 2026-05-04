'use client';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import { cn } from '@/utils';
import { useTheme } from '@/theme';
import MiniChart from './MiniChart';
import { useRouter } from 'next/navigation';
import { HelpCircle } from '@untitledui/icons';
import { useEffect, useRef, useState } from 'react';
import type { Candle } from '@/services/marketService';

// import MiniChart from './MiniChart'

type TopRiserItemProps = {
  assetId: string;
  rank: number;
  symbol: string;
  symbolCode: string;
  symbolName: string;
  miniCandles?: Candle[];
  className?: string;
};

const TopRiserItem = ({
  assetId,
  rank,
  symbol,
  symbolCode,
  symbolName,
  miniCandles = [],
  className,
}: TopRiserItemProps) => {
  const { colors } = useTheme();
  const router = useRouter();
  const [showFullName, setShowFullName] = useState(false);
  const fullNameRef = useRef<HTMLDivElement | null>(null);

  // Get market data from socket store with specific selector to avoid unnecessary re-renders
  const marketData = useMarketSocketStore((s) => s.rtBySymbol?.[symbol]);

  const parsedLastPrice =
    typeof marketData?.lastPrice === 'number'
      ? marketData.lastPrice
      : Number.parseFloat(String(marketData?.lastPrice ?? '0'));
  const parsedChangePercent =
    typeof marketData?.changePercent === 'number'
      ? marketData.changePercent
      : Number.parseFloat(String(marketData?.changePercent ?? '0'));

  const lastPrice = Number.isFinite(parsedLastPrice) ? parsedLastPrice : 0;
  const changePercent = Number.isFinite(parsedChangePercent) ? parsedChangePercent : 0;

  const isPositive = changePercent >= 0;
  const percentageText = `${isPositive ? '+' : ''}${changePercent.toFixed(2)}%`;

  const candles = miniCandles;

  const handlePress = () => {
    router.push(`/market/${symbol}?assetId=${assetId}`);
  };

  useEffect(() => {
    if (!showFullName) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (fullNameRef.current?.contains(target)) return;
      setShowFullName(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    const autoCloseTimer = window.setTimeout(() => {
      setShowFullName(false);
    }, 5000);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      window.clearTimeout(autoCloseTimer);
    };
  }, [showFullName]);

  return (
    <button
      className={cn(
        'flex min-h-18 w-full cursor-pointer flex-row items-center justify-between border-b border-neutral-200 bg-transparent py-3 text-left transition-colors duration-200 dark:border-neutral-800',
        className,
      )}
      onClick={handlePress}
    >
      {/* Left: Rank and Symbol Info */}
      <div className="flex w-2/5 min-w-0 items-center gap-3">
        <p className="text-body-large-semibold text-foreground w-5 shrink-0">{rank}</p>
        <div ref={fullNameRef} className="relative flex-1">
          <div className="flex min-h-9.5 min-w-0 flex-col justify-center gap-0.5">
            <p className="text-body-large-semibold text-foreground truncate leading-5">
              {symbolName}
            </p>
            <div className="flex min-w-0 items-center gap-1">
              <p className="text-body-small-medium text-muted-foreground flex-1 truncate leading-4">
                {symbolCode}
              </p>
              {symbolName.length > 12 ? (
                <span
                  role="button"
                  tabIndex={0}
                  className="text-muted-foreground hover:text-foreground inline-flex shrink-0 cursor-pointer"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setShowFullName((prev) => !prev);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                      setShowFullName((prev) => !prev);
                    }
                  }}
                  aria-label="Show full symbol name"
                >
                  <HelpCircle size={14} />
                </span>
              ) : null}
            </div>
          </div>
          {showFullName ? (
            <div
              className="bg-background border-border text-foreground absolute top-full left-0 z-20 mt-1 inline-flex h-7 max-w-64 items-center rounded-md border px-2.5 text-xs whitespace-nowrap shadow-sm"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
            >
              <span className="block max-w-full truncate">{symbolName}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Middle: Chart */}
      <div className="flex flex-1 flex-row items-center justify-end gap-3 transition-opacity duration-200">
        {/* Mini chart */}
        {candles.length > 0 && (
          <MiniChart candles={candles} height={45} isPositive={isPositive} width={93} />
        )}
      </div>

      {/* Right: Price info */}
      <div className="flex w-20 flex-col items-end gap-0.5">
        <p
          className="text-body-large-semibold min-w-0 truncate tabular-nums"
          style={{ color: isPositive ? colors.green500 : colors.red500 }}
        >
          {percentageText}
        </p>
        <p className="text-body-small-medium text-foreground min-w-0 truncate tabular-nums">
          {lastPrice > 0 ? lastPrice.toFixed(2) : '-'}
        </p>
      </div>
    </button>
  );
};

export default TopRiserItem;
