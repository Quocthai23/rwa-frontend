'use client';

import { ChevronRight } from '@untitledui/icons';
import { useTrendingMarket } from '@/hook/useTrendingMarket';
import TrendingCard from './TrendingCard';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { TrendingCardSkeleton } from './skeletons';
import { useMemo } from 'react';
import { isOtcWeekend } from '@/components/featured/market/web/helpers/marketOpenRule';
import { useGetData } from '@/context/GetdataContext';
import type { Asset } from '@/types';
import type { TrendingMarketItem } from '@/services/marketService';
import { useMiniChartData } from '@/hook/useMinichartData';

const WEEKEND_CRYPTO_PRIORITY = ['BTC', 'ETH', 'SOL', 'BNB'] as const;
type TrendingDisplayItem = {
  id: string;
  logo?: string;
  symbol: string;
};

function isCryptoAsset(asset: Asset): boolean {
  return (asset.category?.code ?? '').toUpperCase() === 'CRYPTO';
}

function pickWeekendTrendingAssets(assets: Asset[] | undefined): Asset[] {
  if (!assets?.length) return [];
  const cryptoAssets = assets.filter(isCryptoAsset);
  if (cryptoAssets.length === 0) return [];

  const selected: Asset[] = [];
  for (const token of WEEKEND_CRYPTO_PRIORITY) {
    const found = cryptoAssets.find((item) => {
      const symbol = (item.symbol ?? '').toUpperCase();
      const name = (item.name ?? '').toUpperCase();
      return symbol.includes(token) || name.includes(token);
    });
    if (found && !selected.some((item) => item.id === found.id)) {
      selected.push(found);
    }
  }

  if (selected.length < 4) {
    for (const item of cryptoAssets) {
      if (selected.length >= 4) break;
      if (selected.some((x) => x.id === item.id)) continue;
      selected.push(item);
    }
  }

  return selected.slice(0, 4);
}

export default function MarketTrending() {
  const { t } = useTranslation();
  const { data: trendingData, isLoading } = useTrendingMarket();
  const { assets } = useGetData();
  const router = useRouter();
  const weekend = isOtcWeekend();

  const displayItems = useMemo(() => {
    if (!weekend) {
      return (trendingData ?? []).map((item: TrendingMarketItem & { logo?: string }) => ({
        id: item.id,
        logo: item.logo,
        symbol: item.symbol,
      })) satisfies TrendingDisplayItem[];
    }

    return pickWeekendTrendingAssets(assets).map((item) => ({
      id: item.id,
      logo: item.logo,
      symbol: item.symbol,
    })) satisfies TrendingDisplayItem[];
  }, [assets, weekend, trendingData]);

  const isWeekendLoading = weekend && !assets;
  const shouldShowSkeleton = isLoading || isWeekendLoading;
  const symbolsForMiniCharts = useMemo(
    () => Array.from(new Set(displayItems.map((item) => item.symbol).filter(Boolean))),
    [displayItems],
  );
  const { data: miniChartData = [] } = useMiniChartData({
    enabled: !shouldShowSkeleton && symbolsForMiniCharts.length > 0,
    limit: 15,
    symbols: symbolsForMiniCharts,
    timeframe: 300,
  });
  const miniChartBySymbol = useMemo(
    () => new Map(miniChartData.map((item) => [item.symbol, item.candles] as const)),
    [miniChartData],
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-h3-semibold text-foreground">{t('home.marketTrending')}</p>

        <ChevronRight size={24} className="cursor-pointer" onClick={() => router.push('/market')} />
      </div>

      {/* Cards */}
      <div className="flex flex-wrap gap-2 px-4">
        {shouldShowSkeleton
          ? [1, 2, 3, 4].map((i) => <TrendingCardSkeleton key={i} />)
          : displayItems.map((item) => (
              <TrendingCard
                key={item.id}
                assetId={item.id}
                icon={item.logo}
                symbol={item.symbol}
                symbolName={item.symbol}
                timeframe={300}
                miniCandles={miniChartBySymbol.get(item.symbol) || []}
              />
            ))}
      </div>
    </div>
  );
}
