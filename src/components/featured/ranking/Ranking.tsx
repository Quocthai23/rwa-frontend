'use client';

import { ChevronLeft, FilterFunnel01 } from '@untitledui/icons';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ToggleFavouriteAsset } from '@/components/shared/components/ToggleFavouriteAsset';
import { useSymbols } from '@/hook/useSymbols';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import { useFavoriteAssetsStore } from '@/store/favoriteAssetsStore';
import { useTheme } from '@/theme';
import { Button } from '@/components/shared/atoms/button';
import RankingListSkeleton from '@/components/featured/ranking/RankingListSkeleton';
import dynamic from 'next/dynamic';
import MarketFilterSheet from '@/components/featured/market/components/MarketFilterSheet';
import type { Asset } from '@/types/assets';
import { useTranslation } from 'react-i18next';
import { useGetData } from '@/context/GetdataContext';

type FilterState = {
  onlyFavourite: boolean;
  categories: string[];
};

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

type Tab = {
  id: string;
  label: string;
};

type RankingItem = {
  id: string;
  name: string;
  symbol: string;
  marginCurrency?: string;
  profitCurrency?: string;
  lastPrice?: number;
  change?: number;
  changePercent?: number;
  priceDirection: 'up' | 'down' | 'neutral';
  isFavorite: boolean;
  isHot: boolean;
  ask?: number;
  bid?: number;
  categoryName?: string;
};

type Category = 'All' | 'Crypto' | 'Commodities' | 'Forex' | 'Share' | 'Indices' | 'ETFs' | 'Bonds';

const ALL_CATEGORIES: Category[] = [
  'All',
  'Crypto',
  'Commodities',
  'Forex',
  'Share',
  'Indices',
  'ETFs',
  'Bonds',
];

const EMPTY_STATUS_OPTIONS: never[] = [];

function Ranking() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, mode } = useTheme();
  const [activeTab, setActiveTab] = useState('risers');
  const [dailyRankingAnimationData, setDailyRankingAnimationData] = useState(null);
  const [dailyRankingAnimationDataDark, setDailyRankingAnimationDataDark] = useState(null);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filter, setFilter] = useState<FilterState>({
    onlyFavourite: false,
    categories: ['all'],
  });

  useEffect(() => {
    // Fetch the Lottie JSON data from the public path
    fetch('/assets/animations/home_banner.json')
      .then((response) => response.json())
      .then((data) => setDailyRankingAnimationData(data))
      .catch((error) => console.error(t('ranking.animationLoadFailed'), error));
  }, [t]);

  useEffect(() => {
    // Fetch the Lottie JSON data from the public path
    fetch('/assets/animations/daily-ranking-dark.json')
      .then((response) => response.json())
      .then((data) => setDailyRankingAnimationDataDark(data))
      .catch((error) => console.error(t('ranking.animationLoadFailed'), error));
  }, [t]);

  const parameters = useMemo(
    () => ({
      take: 20,
    }),
    [],
  );

  const {
    assets: data,
    isLoadingAssets,
    isFetchingAssets,
    refetchAssets,
    errorAssets,
  } = useGetData();

  const assets = useMemo<Asset[]>(() => {
    return data ?? [];
  }, [data]);

  const symbols = useMemo(() => assets.map((asset) => asset.symbol), [assets]);
  useSymbols(symbols, symbols.length > 0);

  const rtBySymbol = useMarketSocketStore((s) => s.rtBySymbol);
  const favoritesByAssetId = useFavoriteAssetsStore((s) => s.favoritesByAssetId);
  const favoritesBySymbol = useFavoriteAssetsStore((s) => s.favoritesBySymbol);
  const setFavoriteByAssetId = useFavoriteAssetsStore((s) => s.setFavoriteByAssetId);

  useEffect(() => {
    for (const asset of assets) {
      const assetId = asset.id || '';
      if (assetId && !(assetId in favoritesByAssetId)) {
        setFavoriteByAssetId(assetId, asset.isFavorite || false);
      }
    }
  }, [assets, favoritesByAssetId, setFavoriteByAssetId]);

  const rankingItems: RankingItem[] = useMemo(() => {
    if (!assets) return [];
    return assets.map((asset) => {
      const rt = rtBySymbol?.[asset.symbol];
      const changePercent = rt?.changePercent ?? 0;
      const priceDirection = changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'neutral';
      const byId = asset.id ? favoritesByAssetId[asset.id] : undefined;
      const bySymbol = asset.symbol ? favoritesBySymbol[asset.symbol] : undefined;

      return {
        id: asset.id,
        name: asset.name || asset.symbol,
        symbol: asset.symbol,
        marginCurrency: asset.marginCurrency,
        profitCurrency: asset.profitCurrency,
        lastPrice: rt?.lastPrice,
        change: rt?.change,
        changePercent: rt?.changePercent,
        priceDirection,
        isFavorite: (byId ?? bySymbol ?? asset.isFavorite) || false,
        isHot: asset.isHot ?? false,
        ask: rt?.ask,
        bid: rt?.bid,
        categoryName: asset.category?.name,
      };
    });
  }, [assets, favoritesByAssetId, favoritesBySymbol, rtBySymbol]);

  const onEndReached = useCallback(() => {
    if (isFetchingAssets) return;
    refetchAssets();
  }, [isFetchingAssets, refetchAssets]);

  const tabs: Tab[] = [
    { id: 'risers', label: t('ranking.tabs.risers') },
    { id: 'fallers', label: t('ranking.tabs.fallers') },
    { id: 'hot', label: t('ranking.tabs.hot') },
  ];

  const categoryOptions = useMemo(
    () =>
      ALL_CATEGORIES.map((cat) => ({
        id: cat === 'All' ? 'all' : cat,
        option:
          cat === 'All'
            ? t('ranking.categories.all')
            : cat === 'Crypto'
              ? t('ranking.categories.crypto')
              : cat === 'Commodities'
                ? t('ranking.categories.commodities')
                : cat === 'Forex'
                  ? t('ranking.categories.forex')
                  : cat === 'Share'
                    ? t('ranking.categories.share')
                    : cat === 'Indices'
                      ? t('ranking.categories.indices')
                      : cat === 'ETFs'
                        ? t('ranking.categories.etfs')
                        : t('ranking.categories.bonds'),
      })),
    [t],
  );

  const defaultCategoryStatus = useMemo(
    () => ({ id: 'all', option: t('ranking.categories.all') }),
    [t],
  );
  const currentRankingAnimationData =
    mode === 'dark' ? dailyRankingAnimationDataDark : dailyRankingAnimationData;

  const filteredItems = useMemo(() => {
    return rankingItems.filter((item) => {
      if (activeTab === 'risers' && item.priceDirection !== 'up') return false;
      if (activeTab === 'fallers' && item.priceDirection !== 'down') return false;
      if (activeTab === 'hot' && !item.isHot) return false;

      if (filter.onlyFavourite && !item.isFavorite) return false;

      if (filter.categories.length === 0) return false;

      if (!filter.categories.includes('all') && !filter.categories.includes('All')) {
        if (!item.categoryName) return false;
        const isMatch = filter.categories.some((c) => {
          const filterCategory = c.toLowerCase();
          const itemCategory = item.categoryName?.toLowerCase();

          if (filterCategory === itemCategory) return true;
          if (filterCategory === 'commodities' && itemCategory === 'metals') return true;

          return false;
        });
        if (!isMatch) return false;
      }

      return true;
    });
  }, [rankingItems, activeTab, filter]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const aPercent = a.changePercent ?? 0;
      const bPercent = b.changePercent ?? 0;
      if (activeTab === 'risers') {
        return bPercent - aPercent;
      }
      if (activeTab === 'fallers') {
        return aPercent - bPercent;
      }
      return 0;
    });
  }, [filteredItems, activeTab]);

  const renderItem = useCallback(
    (item: RankingItem) => {
      const displayPrice = Number(item.lastPrice ?? item.ask);
      const displayChange = Number(item.changePercent ?? 0);
      const safePrice = Number.isFinite(displayPrice) ? displayPrice : 0;
      const safeChange = Number.isFinite(displayChange) ? displayChange : 0;
      const pair =
        item.marginCurrency && item.profitCurrency
          ? `${item.marginCurrency}/${item.profitCurrency}`
          : item.symbol;

      const priceClassName =
        safeChange > 0
          ? 'text-green-500'
          : safeChange < 0
            ? 'text-red-500'
            : 'text-muted-foreground';

      const changeClassName = safeChange >= 0 ? 'text-green-500' : 'text-red-500';

      return (
        <div
          key={item.id}
          className="border-border flex w-full cursor-pointer flex-row items-center border-b py-3 text-left transition-colors"
          onClick={() => router.push(`/market/${item.symbol}?assetId=${item.id}`)}
        >
          <div className="flex w-1/3 flex-col items-start">
            <div className="flex flex-row items-center gap-2">
              <span className="text-body-large-semibold">{pair}</span>
              <ToggleFavouriteAsset
                assetId={item.id}
                defaultIsFavorite={item.isFavorite}
                size={24}
              />
            </div>
            <span className="text-body-small-regular text-muted-foreground">{item.symbol}</span>
          </div>

          <div className="w-1/3 text-center">
            <span
              className={`text-body-large-medium min-w-0 truncate tabular-nums ${priceClassName}`}
            >
              {safePrice.toFixed(2)}
            </span>
          </div>

          <div className="w-1/3 text-center">
            <span
              className={`text-body-large-medium min-w-0 truncate tabular-nums ${changeClassName}`}
            >
              {safeChange > 0 ? '+' : ''}
              {safeChange.toFixed(2)}%
            </span>
          </div>
        </div>
      );
    },
    [router, t],
  );

  return (
    <>
      <div className="bg-background min-h-screen flex-1">
        <div className="relative flex min-h-14 items-center justify-center px-2 py-2">
          <div className="absolute left-2">
            <Button className="p-2" variant="white-contained" onClick={() => router.back()}>
              <ChevronLeft className="size-6" />
            </Button>
          </div>
          <div className="text-h3-semibold text-foreground text-center">{t('ranking.title')}</div>
        </div>
        <div className="flex-1">
          <div className="bg-background px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <p className="text-h2-semibold text-foreground mb-2">
                  {t('ranking.tabs.topRisers')}
                </p>
                <p className="text-body-small-regular text-muted-foreground">
                  {t('ranking.subtitle')}
                </p>
              </div>
              {currentRankingAnimationData && (
                <div className="flex h-40 w-36 items-center justify-center">
                  <Lottie animationData={currentRankingAnimationData} loop className="h-40 w-36" />
                </div>
              )}
              {!currentRankingAnimationData && (
                <div className="border-border bg-muted h-40 w-36 animate-pulse rounded border" />
              )}
            </div>
          </div>
        </div>

        <div className="py-2">
          <div className="border-border flex border-b px-4">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className="flex-1 cursor-pointer items-center justify-center p-2 text-center"
                onClick={() => {
                  setActiveTab(tab.id);
                }}
                style={{
                  borderBottomColor: activeTab === tab.id ? colors.primary500 : 'transparent',
                  borderBottomWidth: 2,
                }}
              >
                <span
                  className={`text-body-large-regular ${activeTab === tab.id ? 'font-semibold' : 'font-normal'}`}
                  style={{
                    color: activeTab === tab.id ? colors.primary500 : colors.neutral600,
                  }}
                >
                  {tab.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 px-4">
          <Button
            type="button"
            className="bg-muted flex items-center gap-2 rounded-sm px-3 py-1"
            onClick={() => {
              setIsFilterOpen(true);
            }}
          >
            <FilterFunnel01 color={colors.neutral700} size={20} />
            <span className="text-button-small-medium text-foreground">{t('ranking.filter')}</span>
          </Button>
        </div>

        <div className="flex items-center px-4 pt-4">
          <div className="w-1/3">
            <span className="text-body-small-regular text-muted-foreground">
              {t('ranking.columns.name')}
            </span>
          </div>

          <div className="w-1/3 text-center">
            <span className="text-body-small-regular text-muted-foreground">
              {t('ranking.columns.lastPrice')}
            </span>
          </div>

          <div className="w-1/3 text-center">
            <span className="text-body-small-regular text-muted-foreground">
              {t('ranking.columns.change')}
            </span>
          </div>
        </div>

        <div className="flex-1 px-4">
          {isLoadingAssets ? (
            <div className="py-4">
              <RankingListSkeleton />
            </div>
          ) : errorAssets ? (
            <div className="flex flex-col items-center justify-center pt-[20vh] pb-[20vh] text-center">
              <span className="text-error-500 text-base font-semibold">
                {t('ranking.failedLoadData')}
              </span>
              <span className="text-muted-foreground mt-2 text-sm">{errorAssets.message}</span>
            </div>
          ) : sortedItems.length > 0 ? (
            <div>
              {sortedItems.map(renderItem)}
              {isFetchingAssets ? (
                <div className="items-center py-4">{t('ranking.loading')}</div>
              ) : assets.length > 0 && assets.length % 20 === 0 ? (
                <div className="items-center py-4">
                  <Button
                    type="button"
                    className="text-button-small-medium text-primary-500"
                    onClick={onEndReached}
                  >
                    {t('ranking.loadMore')}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center pt-[20vh] pb-[20vh] text-center">
              <span className="text-muted-foreground text-base">
                {activeTab === 'fav'
                  ? t('ranking.empty.noFavoritesYet')
                  : t('ranking.empty.noItemsAtMoment', { tab: t(`ranking.tabs.${activeTab}`) })}
              </span>
            </div>
          )}
        </div>
      </div>
      <MarketFilterSheet
        open={isFilterOpen}
        onOpenChange={(open) => {
          setIsFilterOpen(open);
        }}
        onlyFavorite={filter.onlyFavourite}
        onToggleOnlyFavorite={(next) => {
          setFilter((prev) => ({ ...prev, onlyFavourite: next }));
        }}
        categoryFilter={filter.categories}
        onChangeCategoryFilter={(next) => {
          setFilter((prev) => ({ ...prev, categories: next }));
        }}
        categoryStatus={defaultCategoryStatus}
        onChangeCategoryStatus={() => {}}
        categoryOptions={categoryOptions}
        statusOptions={EMPTY_STATUS_OPTIONS}
      />
    </>
  );
}

export default Ranking;

