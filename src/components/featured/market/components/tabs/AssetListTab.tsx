'use client';

import { ArrowDown, ArrowUp, Check, ChevronSelectorVertical } from '@untitledui/icons';
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/shared/atoms/button';
import { Sheet, SheetContent } from '@/components/shared/atoms/sheet';
import { useFavoriteAssetsStore } from '@/store/favoriteAssetsStore';
import { useMarketListPreferencesStore } from '@/store/marketListPreferencesStore';
import { filterCategoryOptions, filterCategoryStatus, sortByOptions } from '../../constant/options';
import { useRealtimeSortedListByRT } from '../../hooks/useRealtimeSortedListByRT';
import MarketFilterSheet from '../MarketFilterSheet';
import ItemSymbolChartViewConnected from '../ItemSymbolChartViewConnected';
import ItemSymbolConnected from '../ItemSymbolConnected';
import { SymbolRowSkeleton } from '@/components/featured/market/components/ItemSymbolSeketon';
import LayoutSymbolView from '../LayoutSymbolView';
import Image from 'next/image';
import { useGetData } from '@/context/GetdataContext';
import { useTranslation } from 'react-i18next';
import { useIsTinyPhone } from '@/hook/useMediaQuery';
import { useMiniChartData } from '@/hook/useMinichartData';

type AssetListTabProps = {
  readonly categoryCode?: string;
  readonly defaultSearch?: string;
  readonly favoriteOnly?: boolean;
  readonly isHotOnly?: boolean;
};

function AssetListTab({
  categoryCode,
  defaultSearch = '',
  favoriteOnly = false,
  isHotOnly = false,
}: AssetListTabProps) {
  const { t } = useTranslation();
  const { assets: contextAssets, isLoadingAssets: isAssetsLoading } = useGetData();
  const setFavoriteByAssetId = useFavoriteAssetsStore((s) => s.setFavoriteByAssetId);
  const favoritesByAssetId = useFavoriteAssetsStore((s) => s.favoritesByAssetId);
  const favoritesBySymbol = useFavoriteAssetsStore((s) => s.favoritesBySymbol);
  const listContainerReference = useRef<HTMLDivElement>(null);
  const loadMoreReference = useRef<HTMLDivElement>(null);

  const sortKey = categoryCode ?? 'all';
  const sortById =
    useMarketListPreferencesStore((s) => s.sortByIdByKey[sortKey]) ?? sortByOptions[0].id;
  const setSortById = useMarketListPreferencesStore((s) => s.setSortById);
  const globalViewTypeKey = 'all';
  const viewType =
    useMarketListPreferencesStore((s) => s.viewTypeByKey[globalViewTypeKey]) ?? 'chart';
  const setViewType = useMarketListPreferencesStore((s) => s.setViewType);
  const setFilterOnlyFavorite = useMarketListPreferencesStore((s) => s.setFilterOnlyFavorite);
  const setFilterCategories = useMarketListPreferencesStore((s) => s.setFilterCategories);
  const setFilterStatus = useMarketListPreferencesStore((s) => s.setFilterStatus);
  const openSortBy = useMemo(() => {
    return sortByOptions.find((o) => o.id === sortById) ?? sortByOptions[0];
  }, [sortById]);

  const [categoryFilter, setCategoryFilter] = useState<string[]>([filterCategoryOptions[0].id]);
  const [categoryStatus, setCategoryStatus] = useState<{
    id: string;
    option: string;
    optionKey?: string;
  }>(filterCategoryStatus[0]);
  const [onlyFavorite, setOnlyFavorite] = useState(favoriteOnly);

  const isTinyPhone = useIsTinyPhone();

  useEffect(() => {
    const state = useMarketListPreferencesStore.getState();

    const storedOnlyFav = state.getFilterOnlyFavorite(sortKey);
    const storedCategories = state.getFilterCategories(sortKey);
    const storedStatusId = state.getFilterStatus(sortKey);

    setOnlyFavorite(storedOnlyFav ?? favoriteOnly);
    setCategoryFilter(storedCategories ?? [filterCategoryOptions[0].id]);
    setCategoryStatus(
      filterCategoryStatus.find((c) => c.id === (storedStatusId ?? filterCategoryStatus[0].id)) ??
        filterCategoryStatus[0],
    );
  }, [favoriteOnly, sortKey]);
  const [isSortOpen, setIsSortOpen] = React.useState(false);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isLayoutOpen, setIsLayoutOpen] = React.useState(false);

  const parameters = useMemo(
    () => ({
      categoryCode,
      search: defaultSearch,
      take: 20,
    }),
    [categoryCode, defaultSearch],
  );

  const shouldUseContextAssets = true;

  const listFromContext = useMemo(() => {
    if (!shouldUseContextAssets) return [];

    const q = defaultSearch.trim().toLowerCase();
    const category = categoryCode?.toLowerCase();

    return contextAssets?.filter((a) => {
      if (category) {
        const code = a.category?.code?.toLowerCase?.() ?? '';
        if (code !== category) return false;
      }

      if (!q) return true;

      const symbol = a.symbol?.toLowerCase?.() ?? '';
      const name = (a as any)?.name?.toLowerCase?.() ?? '';
      return symbol.includes(q) || name.includes(q);
    });
  }, [categoryCode, contextAssets, defaultSearch, shouldUseContextAssets]);

  const listPopular = useMemo(() => {
    if (shouldUseContextAssets) return listFromContext;
    return contextAssets ?? [];
  }, [contextAssets, listFromContext, shouldUseContextAssets]);

  const listWithFavoriteState = useMemo(() => {
    return listPopular?.map((item) => {
      const id = item.id || '';
      const byId = id ? favoritesByAssetId[id] : undefined;
      const bySymbol = item.symbol ? favoritesBySymbol[item.symbol] : undefined;

      return {
        ...item,
        isFavorite: (byId ?? bySymbol ?? item.isFavorite) || false,
      };
    });
  }, [listPopular, favoritesByAssetId, favoritesBySymbol]);

  useEffect(() => {
    if (shouldUseContextAssets) return;
    const root = listContainerReference.current;
    const target = loadMoreReference.current;
    if (!root || !target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
          }
        }
      },
      { root, threshold: 0.1 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [shouldUseContextAssets]);

  React.useLayoutEffect(() => {
    for (const item of listPopular ?? []) {
      const assetId = item.id || '';
      if (assetId && !(assetId in favoritesByAssetId)) {
        setFavoriteByAssetId(assetId, item.isFavorite || false);
      }
    }
  }, [listPopular, favoritesByAssetId, setFavoriteByAssetId]);

  const categoryCodeMap: Record<string, string | null> = {
    all: null,
    forex: 'FOREX',
    commodities: 'COMMODITIES',
    share: 'SHARE',
    indices: 'INDICES',
    crypto: 'CRYPTO',
    etfs: 'ETFS',
    bonds: 'BONDS',
  };

  const filteredList = useMemo(() => {
    let result = listWithFavoriteState;

    if (categoryFilter && !categoryFilter.includes('all')) {
      const allowedCodes = categoryFilter
        .map((id) => categoryCodeMap[id])
        .filter((code): code is string => Boolean(code))
        .map((code) => code.toUpperCase());

      result = result?.filter((item) =>
        allowedCodes.includes(item.category?.code?.toUpperCase?.() ?? ''),
      );
    }

    if (categoryStatus.id === 'market_open') {
      result = result?.filter((item) => item.isActive);
    }

    return result;
  }, [categoryFilter, categoryStatus, listWithFavoriteState]);

  const { sortedList } = useRealtimeSortedListByRT({
    list: filteredList ?? [],
    categoryCode,
    openSortBy,
    favoriteOnly: onlyFavorite,
    isHotOnly,
  });
  const symbolsForMiniCharts = useMemo(
    () => Array.from(new Set(sortedList.map((item) => item.symbol).filter(Boolean))),
    [sortedList],
  );
  const { data: miniChartData = [] } = useMiniChartData({
    enabled: viewType === 'chart' && symbolsForMiniCharts.length > 0,
    limit: 15,
    symbols: symbolsForMiniCharts,
    timeframe: 60,
  });
  const miniChartBySymbol = useMemo(
    () => new Map(miniChartData.map((item) => [item.symbol, item.candles] as const)),
    [miniChartData],
  );

  const renderHeader = React.useCallback(
    () => (
      <>
        <div className="flex items-center gap-3">
          <Button
            variant="white-contained"
            className="bg-muted flex min-w-0 items-center gap-2 rounded px-3 py-2"
            onClick={() => setIsSortOpen(true)}
          >
            <Image
              src="/assets/icons/market/filter-lines.svg"
              alt="filter-lines"
              width={20}
              height={20}
            />
            <span
              className={`text-button-small-medium text-foreground max-w-40 min-w-0 truncate whitespace-nowrap`}
            >
              {t('market.sortBy')}: {openSortBy.nameKey ? t(openSortBy.nameKey) : openSortBy.name}
            </span>
          </Button>
          <Button
            variant="white-contained"
            className="bg-muted flex items-center gap-2 rounded px-3 py-2"
            onClick={() => setIsFilterOpen(true)}
          >
            <Image
              src="/assets/icons/market/filter-funnel-01.svg"
              alt="filter-lines"
              width={20}
              height={20}
            />
            <span className="text-button-small-medium text-foreground">{t('market.filter')}</span>
          </Button>

          <Button
            variant="white-contained"
            className="ml-auto"
            onClick={() => setIsLayoutOpen(true)}
          >
            <Image
              src="/assets/icons/market/layout-grid-01.svg"
              alt="layout-grid"
              width={24}
              height={24}
            />
          </Button>
        </div>

        {/* content */}
        <div className="mt-4 mb-3">
          <div className="flex items-center">
            <div
              className="flex w-[50%] min-w-0 items-center gap-1"
              onClick={() => {
                switch (openSortBy.id) {
                  case 'default': {
                    setSortById(sortKey, sortByOptions[1].id);

                    break;
                  }
                  case 'percentChange_hight_to_low': {
                    setSortById(sortKey, sortByOptions[2].id);

                    break;
                  }
                  case 'percentChange_low_to_high': {
                    setSortById(sortKey, sortByOptions[0].id);

                    break;
                  }
                  default: {
                    setSortById(sortKey, sortByOptions[1].id);
                  }
                }
              }}
            >
              <span
                className={`text-body-small-regular min-w-0 truncate whitespace-nowrap ${
                  openSortBy.id.startsWith('percentChange')
                    ? 'text-primary-500'
                    : 'text-muted-foreground'
                }`}
              >
                {t('market.marketPercentChange')}
              </span>

              {openSortBy.id === 'percentChange_hight_to_low' ? (
                <ArrowDown className="text-primary-500" size={18} />
              ) : openSortBy.id === 'percentChange_low_to_high' ? (
                <ArrowUp className="text-primary-500" size={18} />
              ) : (
                <ChevronSelectorVertical className="text-muted-foreground" size={18} />
              )}
            </div>
          </div>
        </div>
      </>
    ),
    [openSortBy, setSortById, sortKey, t],
  );

  const renderItem = React.useCallback(
    (item: (typeof sortedList)[0]) => {
      const commonProps = {
        accessId: item.id || '',
        symbol: item.symbol,
        marginCurrency: item.marginCurrency,
        profitCurrency: item.profitCurrency,
        desc: item.name,
        isFavorite: item.isFavorite,
        digit: item.digit,
        initialAsk: item.ask ?? '0',
        initialBid: item.bid ?? '0',
      };

      if (viewType === 'spread') {
        return <ItemSymbolConnected {...commonProps} />;
      }

      return (
        <ItemSymbolChartViewConnected
          {...commonProps}
          isTinyPhone={isTinyPhone}
          miniCandles={miniChartBySymbol.get(item.symbol) || []}
        />
      );
    },
    [viewType, isTinyPhone, miniChartBySymbol],
  );

  const renderFooter = React.useCallback(() => {
    if (!isAssetsLoading) return null;

    return (
      <div className="py-4">
        <SymbolRowSkeleton />
      </div>
    );
  }, [isAssetsLoading]);

  const renderEmpty = React.useCallback(() => {
    if (isAssetsLoading) {
      return (
        <>
          <SymbolRowSkeleton />
          <SymbolRowSkeleton />
          <SymbolRowSkeleton />
        </>
      );
    }

    return (
      <div className="flex w-full items-center justify-center py-4">
        <span className="text-body-large-regular text-muted-foreground text-center">
          {t('market.noDataAvailable')}
        </span>
      </div>
    );
  }, [isAssetsLoading, t]);
  return (
    <div className="min-h-0 flex-1">
      <div className={isAssetsLoading ? '' : ''}>{renderHeader()}</div>
      <div className="flex h-full flex-col">
        <div
          ref={listContainerReference}
          className="no-scrollbar max-h-[calc(100dvh-320px)] overflow-y-auto supports-[height:100dvh]:max-h-[calc(100dvh-320px)]"
        >
          {sortedList.length === 0
            ? renderEmpty()
            : sortedList.map((item) => (
                <React.Fragment key={item.id || item.symbol}>{renderItem(item)}</React.Fragment>
              ))}
          {renderFooter()}
          <div ref={loadMoreReference} className="h-1 w-full" />
        </div>
      </div>

      {/* modal */}

      {/* sort */}
      <Sheet open={isSortOpen} onOpenChange={setIsSortOpen}>
        <SheetContent
          side="bottom"
          className="bg-sheet max-h-[85vh] overflow-y-auto p-0"
          showCloseButton={false}
        >
          <div className="pt-2">
            <p className="text-h3-semibold text-foreground border-border border-b px-4 py-4">
              {t('market.sortByTitle')}
            </p>

            <div className="-mx-2 mt-4 px-4 pb-4">
              {sortByOptions.map((tab) => (
                <button
                  type="button"
                  key={tab.id}
                  className="mb-3 w-full px-2 text-left"
                  onClick={() => {
                    setSortById(sortKey, tab.id);
                    setIsSortOpen(false);
                  }}
                >
                  <div className={`flex items-center justify-between rounded-xl p-2`}>
                    <span
                      className={`text-body-large-regular text-center ${
                        openSortBy.id === tab.id ? 'text-primary-500' : 'text-foreground'
                      }`}
                    >
                      {tab.labelKey ? t(tab.labelKey) : tab.label}
                    </span>
                    {openSortBy.id === tab.id && <Check className="text-primary-500" size={24} />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* filter */}
      <MarketFilterSheet
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        onlyFavorite={onlyFavorite}
        onToggleOnlyFavorite={(next) => {
          setOnlyFavorite(next);
          setFilterOnlyFavorite(sortKey, next);
        }}
        categoryFilter={categoryFilter}
        onChangeCategoryFilter={(next) => {
          setCategoryFilter(next);
          setFilterCategories(sortKey, next);
        }}
        categoryStatus={categoryStatus}
        onChangeCategoryStatus={(next) => {
          setCategoryStatus(next);
          setFilterStatus(sortKey, next.id);
        }}
        categoryOptions={filterCategoryOptions}
        statusOptions={filterCategoryStatus}
      />

      {/* layout */}
      <Sheet open={isLayoutOpen} onOpenChange={setIsLayoutOpen}>
        <SheetContent
          side="bottom"
          className="bg-background max-h-[85vh] overflow-y-auto p-0"
          showCloseButton={false}
        >
          <LayoutSymbolView
            selectedView={viewType}
            onSelect={(type) => {
              setViewType(globalViewTypeKey, type);
              setIsLayoutOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default memo(AssetListTab);
