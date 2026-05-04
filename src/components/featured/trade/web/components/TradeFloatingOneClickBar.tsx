'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { TradeVolumeControl } from '@/components/featured/trade/web/components/TradeVolumeControl';
import type { TradeWebAsideOrderFormHandle } from './TradeWebAsideOrderForm';
import MT5PriceText from '@/components/featured/market/components/MT5PriceText';
import Image from 'next/image';
import type { NullableDecimalValue } from '@/types/decimal';
import { toFiniteNumberFromNumberish } from '@/components/shared/chart/components/web/tradePanel/utils/tradePanelInputHelpers';

function splitPriceParts(value: NullableDecimalValue, digit: number) {
  const safeDigit = Number.isFinite(digit) ? Math.min(12, Math.max(0, Math.trunc(digit))) : 2;
  const parsed = toFiniteNumberFromNumberish(value);
  const formatted = parsed != null && parsed > 0 ? parsed.toFixed(safeDigit) : '--';
  const dot = formatted.indexOf('.');
  if (dot < 0) {
    return { intPart: formatted, decPart: '' };
  }
  return {
    intPart: formatted.slice(0, dot),
    decPart: formatted.slice(dot),
  };
}

function getHeaderMinTopPx() {
  // Header height depends on Tailwind breakpoints used in `WebHeader`.
  // Base: ~56px, sm: ~64px, md+: ~72px.
  if (typeof window === 'undefined') return 45;
  const w = window.innerWidth;
  if (w >= 768) return 45; // md
  if (w >= 640) return 64; // sm
  return 56; // base
}

type TradeFloatingOneClickBarProps = {
  bid: NullableDecimalValue;
  ask: NullableDecimalValue;
  digit: number;
  minTradeSize: number;
  maxTradeSize: number;
  volume: string;
  volumeInput: string;
  isOneClickEnabled: boolean;
  isAsideLimitMode: boolean;
  asideOrderFormRef: React.MutableRefObject<TradeWebAsideOrderFormHandle | null>;
  onOpenAsideForLimitOrder?: (side: 'buy' | 'sell') => void;
};

const WIDGET_W = 300;
const WIDGET_H = 112;
const PAD = 8;

const FLOATING_ONE_CLICK_OFFSET_KEY = 'trade-web-floating-one-click-offset';

function shouldIgnoreDragPointerTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      'button, input, textarea, select, a[href], [role="button"], [role="menuitem"], [role="combobox"]',
    ),
  );
}

export function TradeFloatingOneClickBar({
  bid,
  ask,
  digit,
  minTradeSize,
  maxTradeSize,
  volume,
  volumeInput,
  isOneClickEnabled,
  isAsideLimitMode,
  asideOrderFormRef,
  onOpenAsideForLimitOrder,
}: TradeFloatingOneClickBarProps) {
  const { t } = useTranslation();
  const [{ right, top }, setOffset] = useState({ right: 24, top: 24 });
  const skipInitialOffsetPersist = useRef(true);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originRight: number;
    originTop: number;
  } | null>(null);

  const clamp = useCallback((r: number, t: number) => {
    if (typeof window === 'undefined') return { right: r, top: t };
    const maxR = Math.max(PAD, window.innerWidth - WIDGET_W - PAD);
    const maxT = Math.max(PAD, window.innerHeight - WIDGET_H - PAD);
    const minT = Math.max(PAD, getHeaderMinTopPx());
    return {
      right: Math.min(Math.max(PAD, r), maxR),
      top: Math.min(Math.max(minT, t), maxT),
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FLOATING_ONE_CLICK_OFFSET_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { right?: unknown; top?: unknown; bottom?: unknown };
      if (typeof parsed.right !== 'number' || !Number.isFinite(parsed.right)) return;
      let nextTop: number;
      if (typeof parsed.top === 'number' && Number.isFinite(parsed.top)) {
        nextTop = parsed.top;
      } else if (typeof parsed.bottom === 'number' && Number.isFinite(parsed.bottom)) {
        nextTop =
          typeof window !== 'undefined' ? window.innerHeight - parsed.bottom - WIDGET_H : 24;
      } else {
        return;
      }
      setOffset(clamp(parsed.right, nextTop));
    } catch {
      /* ignore */
    }
  }, [clamp]);

  // Ensure initial offset doesn't overlap the header even when localStorage is empty.
  useEffect(() => {
    setOffset((prev) => clamp(prev.right, prev.top));
  }, [clamp]);

  useEffect(() => {
    if (skipInitialOffsetPersist.current) {
      skipInitialOffsetPersist.current = false;
      return;
    }
    try {
      localStorage.setItem(FLOATING_ONE_CLICK_OFFSET_KEY, JSON.stringify({ right, top }));
    } catch {
      /* ignore */
    }
  }, [right, top]);

  useEffect(() => {
    const onResize = () => setOffset((prev) => clamp(prev.right, prev.top));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clamp]);

  const onDragPointerDown = (e: React.PointerEvent) => {
    if (shouldIgnoreDragPointerTarget(e.target)) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originRight: right,
      originTop: top,
    };
  };

  const onDragPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const nextRight = d.originRight - (e.clientX - d.startX);
    const nextTop = d.originTop + (e.clientY - d.startY);
    setOffset(clamp(nextRight, nextTop));
  };

  const endDrag = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    dragRef.current = null;
  };

  const sellParts = splitPriceParts(bid, digit);
  const buyParts = splitPriceParts(ask, digit);
  const isDark =
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const handleSell = () => {
    if (isAsideLimitMode || !isOneClickEnabled) {
      onOpenAsideForLimitOrder?.('sell');
      return;
    }
    asideOrderFormRef.current?.submitOrder('sell');
  };

  const handleBuy = () => {
    if (isAsideLimitMode || !isOneClickEnabled) {
      onOpenAsideForLimitOrder?.('buy');
      return;
    }
    asideOrderFormRef.current?.submitOrder('buy');
  };

  return (
    <div className="pointer-events-none fixed z-40" style={{ right, top }}>
      <div
        className="pointer-events-auto w-61"
        role="region"
        aria-label={t('trade.a11y.oneClickTrading')}
      >
        <div
          className="relative flex h-28 cursor-grab touch-none active:cursor-grabbing"
          onPointerDown={onDragPointerDown}
          onPointerMove={onDragPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div
            className="absolute top-7 left-0 h-15.5 w-30.25 rounded-t rounded-br-[8px] bg-[#f3dedf] dark:bg-red-900"
            aria-hidden
          />
          <div
            className="absolute top-7 right-0 h-15.5 w-30.25 rounded-t rounded-bl-[8px] bg-[#dff0e6] dark:bg-green-900"
            aria-hidden
          />

          <div className="relative z-2 min-w-0 flex-1 px-3 pt-9 pb-2">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={handleSell}
              className="focus-visible:ring-primary-500 flex w-full flex-col items-start gap-1 rounded text-left outline-none focus-visible:ring-2"
            >
              <MT5PriceText
                value={sellParts.intPart + sellParts.decPart}
                baseFontSize={16}
                bigFontSize={20}
                supFontSize={16}
                style={{ color: '#e34a39' }}
              />
              <span className="text-body-small-medium tracking-[0.4px] text-red-500">
                {t('trade.sell')}
              </span>
            </button>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-3 flex justify-center">
            <div className="relative h-13 w-61 shrink-0">
              {isDark ? (
                <Image
                  src="/web/svg/Subtract4.svg"
                  alt=""
                  width={244}
                  height={52}
                  className="pointer-events-none block h-13 w-61"
                  aria-hidden
                />
              ) : (
                <Image
                  src="/web/svg/Subtract.svg"
                  alt=""
                  width={244}
                  height={52}
                  className="pointer-events-none block h-13 w-61"
                  aria-hidden
                />
              )}
              <div
                className="bg-muted pointer-events-auto absolute top-1/2 left-1/2 flex h-9 w-[min(100px,calc(100%-16px))] max-w-full -translate-x-1/2 -translate-y-1/2 items-stretch overflow-hidden rounded border border-neutral-200 dark:border-neutral-700"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <TradeVolumeControl
                  minTradeSize={minTradeSize}
                  maxTradeSize={maxTradeSize}
                  volume={volume}
                  volumeInput={volumeInput}
                  volumeError={null}
                  onVolumeChange={(v) => asideOrderFormRef.current?.onFloatingVolumeInputChange(v)}
                  onVolumeBlur={() => asideOrderFormRef.current?.onFloatingVolumeInputBlur()}
                  setVolume={() => {}}
                  setVolumeInput={() => {}}
                  setVolumeBoth={() => {}}
                  onAdjustVolume={(next) => asideOrderFormRef.current?.setFloatingVolumeBoth(next)}
                  onQuickVolumeSet={(next) =>
                    asideOrderFormRef.current?.setFloatingVolumeQuick(next)
                  }
                  className="h-full w-full min-w-0 border-0"
                  inputClassName="text-[13px] font-semibold tabular-nums text-foreground"
                  triggerClassName="rounded text-foreground transition-colors"
                  chevronClassName="text-foreground"
                  chevronSize={16}
                />
              </div>
            </div>
          </div>

          <div className="relative z-2 min-w-0 flex-1 px-3 pt-9">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={handleBuy}
              className="focus-visible:ring-primary-500 flex w-full flex-col items-end gap-1 rounded text-right outline-none focus-visible:ring-2"
            >
              <MT5PriceText
                value={buyParts.intPart + buyParts.decPart}
                baseFontSize={16}
                bigFontSize={20}
                supFontSize={16}
                style={{ color: '#37b26c' }}
              />
              <span className="text-body-small-medium tracking-[0.4px] text-green-500">
                {t('trade.buy')}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
