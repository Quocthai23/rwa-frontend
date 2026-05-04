'use client';

import { useMemo, useState } from 'react';

import TopRiserItem from './TopRiserItem';
import { useTrendingData } from '@/hook/useTrendingMarket';
import { TrendingMarketItem } from '@/services/marketService';
import { useSymbols } from '@/hook/useSymbols';
import { TopRiserItemSkeleton } from './skeletons';
import { useTranslation } from 'react-i18next';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import { useMiniChartData } from '@/hook/useMinichartData';
type TabType = 'risers' | 'fallers';

const TAKE = 5;
const TopRisersFallers = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('risers');

  // Fetch trending data with auto-refresh every 5s
  const { data, isLoading } = useTrendingData();
  // Get top risers and fallers from API response
  const topRisers = data?.topMovers?.topRisers ?? [];
  const topFallers = data?.topMovers?.topFallers ?? [];
  const symbols = topRisers.map((item) => item.symbol);
  const symbolsFallers = topFallers.map((item) => item.symbol);
  useSymbols(symbols, symbols.length > 0);
  useSymbols(symbolsFallers, symbolsFallers.length > 0);

  const currentList = activeTab === 'risers' ? topRisers : topFallers;
  const rtBySymbol = useMarketSocketStore((s) => s.rtBySymbol);

  const sortedList = useMemo(() => {
    return [...currentList].sort((a, b) => {
      const changeA = rtBySymbol?.[a.symbol]?.changePercent ?? 0;
      const changeB = rtBySymbol?.[b.symbol]?.changePercent ?? 0;

      if (activeTab === 'risers') {
        return changeB - changeA;
      }
      return changeA - changeB;
    });
  }, [currentList, rtBySymbol, activeTab]);
  const topList = useMemo(() => sortedList.slice(0, TAKE), [sortedList]);
  const symbolsForMiniCharts = useMemo(
    () => Array.from(new Set(topList.map((item) => item.symbol).filter(Boolean))),
    [topList],
  );
  const { data: miniChartData = [] } = useMiniChartData({
    enabled: !isLoading && symbolsForMiniCharts.length > 0,
    limit: 15,
    symbols: symbolsForMiniCharts,
    timeframe: 60,
  });
  const miniChartBySymbol = useMemo(
    () => new Map(miniChartData.map((item) => [item.symbol, item.candles] as const)),
    [miniChartData],
  );

  return (
    <div className="mt-3">
      {/* Tab Header */}
      <div className="flex gap-3 px-4 py-3">
        <button
          onClick={() => setActiveTab('risers')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <p
            className={
              activeTab === 'risers'
                ? 'text-h3-semibold text-foreground'
                : 'text-h3-regular text-muted-foreground'
            }
          >
            {t('home.topRisers')}
          </p>
        </button>

        <button
          onClick={() => setActiveTab('fallers')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <p
            className={
              activeTab === 'fallers'
                ? 'text-h3-semibold text-foreground'
                : 'text-h3-regular text-muted-foreground'
            }
          >
            {t('home.topFallers')}
          </p>
        </button>
      </div>

      {/* List of Items */}
      {isLoading ? (
        <div className="px-4">
          {[1, 2, 3, 4, 5].map((rank) => (
            <TopRiserItemSkeleton key={rank} />
          ))}
        </div>
      ) : (
        <div className="px-4">
          {sortedList.length > 0 ? (
            topList.map((item: TrendingMarketItem, index: number) => (
              <TopRiserItem
                key={item.id}
                className="last:border-b-0"
                assetId={item.id}
                rank={index + 1}
                symbol={item.symbol}
                symbolCode={item.symbol}
                symbolName={item.name}
                miniCandles={miniChartBySymbol.get(item.symbol) || []}
              />
            ))
          ) : (
            <div className="items-center py-8">
              <p className="text-body-large-regular text-muted-foreground">
                {t('home.noItemsAvailable', {
                  type:
                    activeTab === 'risers'
                      ? t('home.topRisers').toLowerCase()
                      : t('home.topFallers').toLowerCase(),
                })}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TopRisersFallers;
