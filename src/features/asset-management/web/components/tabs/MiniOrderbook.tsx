'use client';

import React, { useEffect, useState } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ChevronRight } from '@untitledui/icons';

import { Button } from '@/components/shared/atoms/button';
import { Skeleton } from '@/components/shared/atoms/skeleton';
import { useAssetLiquidity } from '@/hook/useAssetManagement';
import { useRealtimeStore } from '@/store/realtimeStore';
import { AssetEntryDetailDialog } from '../AssetEntryDetailDialog';

interface MiniOrderbookProps {
  assetId: string;
  symbol: string;
}

type RecentTrade = {
  id: string;
  price: number | string;
  quantity: number | string;
  side: 'BUY' | 'SELL' | null;
  createdAt: string;
};

const formatVnd = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  return `${Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} VND`;
};

const formatQuantity = (value: number | string) =>
  Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 4 });

export const MiniOrderbook: React.FC<MiniOrderbookProps> = ({ assetId, symbol }) => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [selectedTrade, setSelectedTrade] = useState<RecentTrade | null>(null);
  const { data: snapshot, isLoading, isError } = useAssetLiquidity(assetId);
  const { pricesBySymbol, lastTrades, orderBooks, subscribeSymbol, unsubscribeSymbol } =
    useRealtimeStore();

  useEffect(() => {
    subscribeSymbol(symbol, assetId);
    return () => unsubscribeSymbol(symbol, assetId);
  }, [assetId, subscribeSymbol, symbol, unsubscribeSymbol]);

  const livePrice = pricesBySymbol[symbol];
  const liveBook = orderBooks[symbol];
  const realtimeTrades = lastTrades[symbol] ?? [];
  const bids = liveBook?.bids?.length
    ? liveBook.bids.slice(0, 8).map(([price, quantity]) => ({ price, quantity }))
    : (snapshot?.bids ?? []);
  const asks = liveBook?.asks?.length
    ? liveBook.asks.slice(0, 8).map(([price, quantity]) => ({ price, quantity }))
    : (snapshot?.asks ?? []);
  const trades: RecentTrade[] = realtimeTrades.length
    ? realtimeTrades.slice(0, 10).map((trade) => ({
        id: trade.id,
        price: trade.price,
        quantity: trade.quantity,
        side: trade.side as 'BUY' | 'SELL' | null,
        createdAt: new Date(trade.timestamp).toISOString(),
      }))
    : (snapshot?.recentTrades ?? []);
  const locale = i18n.resolvedLanguage?.startsWith('vi') ? 'vi-VN' : 'en-US';

  if (isLoading) return <Skeleton className="h-[520px] w-full" />;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-foreground text-base font-semibold">
            {t('assetManagement.orderbook.title', { defaultValue: 'Thanh khoản token' })}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t('assetManagement.orderbook.subtitle', {
              defaultValue: 'Sổ lệnh và giao dịch được ghi nhận thực tế',
            })}
          </p>
        </div>
        <Button variant="neutral-outline" onClick={() => router.push(`/trade/${symbol}`)}>
          {t('assetManagement.orderbook.tradeBtn', { defaultValue: 'Mở trang giao dịch' })}
        </Button>
      </header>

      {isError ? (
        <div className="border-border text-destructive border border-dashed p-5 text-sm">
          {t('assetManagement.orderbook.loadError', {
            defaultValue: 'Không thể tải dữ liệu thanh khoản từ hệ thống.',
          })}
        </div>
      ) : (
        <>
          <section className="border-border grid grid-cols-1 border sm:grid-cols-3 sm:divide-x">
            <Metric
              label={t('assetManagement.orderbook.currentPrice', { defaultValue: 'Khớp gần nhất' })}
              value={formatVnd(livePrice?.lastPrice ?? snapshot?.lastPrice)}
            />
            <Metric
              label={t('assetManagement.orderbook.bid', { defaultValue: 'Dư mua tốt nhất' })}
              value={formatVnd(livePrice?.bid ?? snapshot?.bestBid)}
              tone="buy"
            />
            <Metric
              label={t('assetManagement.orderbook.ask', { defaultValue: 'Dư bán tốt nhất' })}
              value={formatVnd(livePrice?.ask ?? snapshot?.bestAsk)}
              tone="sell"
            />
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <OrderLevels
              title={t('assetManagement.orderbook.buyOrders', { defaultValue: 'Lệnh chờ mua' })}
              levels={bids}
              tone="buy"
            />
            <OrderLevels
              title={t('assetManagement.orderbook.sellOrders', { defaultValue: 'Lệnh chờ bán' })}
              levels={asks}
              tone="sell"
            />
          </section>

          <section className="border-border border">
            <div className="border-border flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-foreground text-sm font-semibold">
                {t('assetManagement.orderbook.recentTrades', {
                  defaultValue: 'Giao dịch gần nhất',
                })}
              </h3>
              <span className="text-muted-foreground text-xs">{symbol}</span>
            </div>
            {trades.length === 0 ? (
              <div className="text-muted-foreground px-4 py-10 text-center text-sm">
                {bids.length || asks.length
                  ? t('assetManagement.orderbook.noTradesYet', {
                      defaultValue: 'Đã có lệnh chờ nhưng chưa phát sinh giao dịch khớp.',
                    })
                  : t('assetManagement.orderbook.noLiquidity', {
                      defaultValue: 'Chưa có lệnh mua, lệnh bán hoặc giao dịch cho tài sản này.',
                    })}
              </div>
            ) : (
              <div className="divide-border divide-y">
                {trades.map((trade) => (
                  <button
                    key={trade.id}
                    type="button"
                    onClick={() => setSelectedTrade(trade)}
                    className="hover:bg-muted/40 focus-visible:ring-primary grid w-full grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3 px-4 py-3 text-left text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                    aria-label={t('assetManagement.details.openTrade', {
                      defaultValue: 'View trade details',
                    })}
                  >
                    <div className="text-muted-foreground flex items-center gap-2">
                      {trade.side === 'BUY' ? (
                        <ArrowUp className="text-emerald-600" size={14} />
                      ) : trade.side === 'SELL' ? (
                        <ArrowDown className="text-red-500" size={14} />
                      ) : (
                        <span className="bg-muted-foreground h-1.5 w-1.5 rounded-full" />
                      )}
                      <span className="truncate">
                        {new Date(trade.createdAt).toLocaleString(locale)}
                      </span>
                    </div>
                    <span className="text-foreground font-medium">{formatVnd(trade.price)}</span>
                    <span className="text-muted-foreground hidden sm:inline">
                      {formatQuantity(trade.quantity)} token
                    </span>
                    <ChevronRight className="text-muted-foreground" size={15} />
                  </button>
                ))}
              </div>
            )}
          </section>
          <p className="text-muted-foreground text-xs">
            {t('assetManagement.orderbook.settlementNote', {
              defaultValue: 'Tất cả giá và giá trị giao dịch được hiển thị bằng VND.',
            })}
          </p>

          {selectedTrade ? (
            <AssetEntryDetailDialog
              open
              onOpenChange={(open) => {
                if (!open) setSelectedTrade(null);
              }}
              eyebrow={t('assetManagement.orderbook.recentTrades')}
              title={t('assetManagement.details.tradeTitle', {
                defaultValue: 'Matched trade details',
              })}
              description={t('assetManagement.details.tradeDescription', {
                symbol,
                defaultValue: `Completed token trade for ${symbol}.`,
              })}
              status={t('assetManagement.statuses.COMPLETED', { defaultValue: 'Completed' })}
              fields={[
                {
                  label: t('assetManagement.details.asset', { defaultValue: 'Asset' }),
                  value: symbol,
                },
                {
                  label: t('assetManagement.details.side', { defaultValue: 'Side' }),
                  value: tradeSideLabel(selectedTrade.side, t),
                },
                {
                  label: t('assetManagement.transactionHistory.price'),
                  value: formatVnd(selectedTrade.price),
                },
                {
                  label: t('assetManagement.transactionHistory.quantity'),
                  value: `${formatQuantity(selectedTrade.quantity)} token`,
                },
                {
                  label: t('assetManagement.transactionHistory.value'),
                  value: formatVnd(Number(selectedTrade.price) * Number(selectedTrade.quantity)),
                },
                {
                  label: t('assetManagement.details.executedAt', { defaultValue: 'Executed at' }),
                  value: new Date(selectedTrade.createdAt).toLocaleString(locale),
                },
                {
                  label: t('assetManagement.details.tradeId', { defaultValue: 'Trade ID' }),
                  value: selectedTrade.id,
                  wide: true,
                  mono: true,
                },
              ]}
              closeLabel={t('assetManagement.details.close', { defaultValue: 'Close' })}
            />
          ) : null}
        </>
      )}
    </div>
  );
};

function tradeSideLabel(side: RecentTrade['side'], t: TFunction) {
  if (side === 'BUY') {
    return t('assetManagement.details.buy', { defaultValue: 'Buy' });
  }
  if (side === 'SELL') {
    return t('assetManagement.details.sell', { defaultValue: 'Sell' });
  }
  return t('assetManagement.details.unknownSide', { defaultValue: 'Not specified' });
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'buy' | 'sell' }) {
  return (
    <div className="border-border border-b px-4 py-4 last:border-b-0 sm:border-b-0">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p
        className={
          tone === 'buy'
            ? 'mt-1 text-sm font-semibold text-emerald-600'
            : tone === 'sell'
              ? 'mt-1 text-sm font-semibold text-red-500'
              : 'text-foreground mt-1 text-sm font-semibold'
        }
      >
        {value}
      </p>
    </div>
  );
}

function OrderLevels({
  title,
  levels,
  tone,
}: {
  title: string;
  levels: Array<{ price: number | string; quantity: number | string }>;
  tone: 'buy' | 'sell';
}) {
  const { t } = useTranslation();
  return (
    <div className="border-border border">
      <div className="border-border grid grid-cols-2 border-b px-4 py-3 text-xs">
        <span
          className={
            tone === 'buy' ? 'font-semibold text-emerald-600' : 'font-semibold text-red-500'
          }
        >
          {title}
        </span>
        <span className="text-muted-foreground text-right">
          {t('assetManagement.orderbook.quantity')}
        </span>
      </div>
      {levels.length === 0 ? (
        <div className="text-muted-foreground px-4 py-8 text-center text-sm">
          {t('assetManagement.orderbook.noOpenOrders')}
        </div>
      ) : (
        <div className="divide-border divide-y">
          {levels.map((level) => (
            <div key={String(level.price)} className="grid grid-cols-2 px-4 py-2.5 text-xs">
              <span className="text-foreground tabular-nums">{formatVnd(level.price)}</span>
              <span className="text-muted-foreground text-right tabular-nums">
                {formatQuantity(level.quantity)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
