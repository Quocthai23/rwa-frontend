'use client';

import { useCallback, useMemo, useState, useEffect, useDeferredValue, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import { useFavoriteAssetsStore } from '@/store/favoriteAssetsStore';
import ItemSymbolConnected from './ItemSymbolConnected';
import { SymbolRowSkeleton } from '@/components/featured/market/components/ItemSymbolSeketon';
import { Button } from '@/components/shared/atoms/button';
import { useGetData } from '@/context/GetdataContext';
import { useSymbols } from '@/hook/useSymbols';
import type { DecimalValue } from '@/types/decimal';
import { filterAndSortAssets } from '@/utils/searchHelper';

type TabAssetProps = {
  readonly searchText?: string;
  readonly onSelectSymbol?: (symbol: string) => void;
  readonly isTrade?: boolean;
};

const TabAsset = ({ searchText = '', onSelectSymbol, isTrade }: TabAssetProps) => {
  const router = useRouter();
  const { t } = useTranslation();
  const FILTER_TABS = useMemo(() => {
    if (isTrade) {
      return [
        { label: t('search.tabs.all'), value: 'all' },
        { label: t('search.tabs.fav'), value: 'fav' },
        { label: t('search.tabs.risers'), value: 'risers' },
        { label: t('search.tabs.fallers'), value: 'fallers' },
        { label: t('search.tabs.hot'), value: 'hot' },
      ];
    }

    return [
      { label: t('search.tabs.risers'), value: 'risers' },
      { label: t('search.tabs.fallers'), value: 'fallers' },
      { label: t('search.tabs.hot'), value: 'hot' },
    ];
  }, [isTrade, t]);

  const [activeFilterTab, setActiveFilterTab] = useState(FILTER_TABS[0].value);

  useEffect(() => {
    setActiveFilterTab(FILTER_TABS[0].value);
  }, [FILTER_TABS]);

  const rtBySymbol = useMarketSocketStore((s) => s.rtBySymbol);
  const isSocketConnected = useMarketSocketStore((s) => s.isConnected);
  const deferredRtBySymbol = useDeferredValue(rtBySymbol);
  const deferredSearchText = useDeferredValue(searchText);

  const favoritesByAssetId = useFavoriteAssetsStore((s) => s.favoritesByAssetId);
  const favoritesBySymbol = useFavoriteAssetsStore((s) => s.favoritesBySymbol);
  const setFavoriteByAssetId = useFavoriteAssetsStore((s) => s.setFavoriteByAssetId);

  const { assets: data, isLoadingAssets: isLoading } = useGetData();

  const listAssets = useMemo(() => {
    return data ?? [];
  }, [data]);

  const listWithFavoriteState = useMemo(() => {
    return listAssets.map((item) => {
      const id = item.id || '';
      const byId = id ? favoritesByAssetId[id] : undefined;
      const bySymbol = item.symbol ? favoritesBySymbol[item.symbol] : undefined;

      return {
        ...item,
        isFavorite: (byId ?? bySymbol ?? item.isFavorite) || false,
      };
    });
  }, [listAssets, favoritesByAssetId, favoritesBySymbol]);

  const symbolsForRealtimeFilter = useMemo(
    () => listWithFavoriteState.map((item) => item.symbol).filter(Boolean) as string[],
    [listWithFavoriteState],
  );

  const isRealtimeFilterTab =
    activeFilterTab === 'risers' || activeFilterTab === 'fallers' || activeFilterTab === 'hot';
  const shouldSubscribeRealtime =
    !deferredSearchText && isRealtimeFilterTab && symbolsForRealtimeFilter.length > 0;
  useSymbols(symbolsForRealtimeFilter, shouldSubscribeRealtime);

  const filteredList = useMemo(() => {
    let filtered = listWithFavoriteState;

    const rawQuery = (deferredSearchText ?? '').toLowerCase().trim();
    const query = rawQuery.replace(/[^a-z0-9]/g, '');
    const hasSearch = Boolean(query);
    const isSearchMode = rawQuery.length > 0;

    if (isSearchMode && !hasSearch) {
      return [];
    }
    if (hasSearch) {
      return filterAndSortAssets(filtered, deferredSearchText);
    }

    switch (activeFilterTab) {
      case 'all': {
        filtered = [...filtered].sort((a, b) => {
          if (a.isFavorite && !b.isFavorite) return -1;
          if (!a.isFavorite && b.isFavorite) return 1;
          return 0;
        });
        break;
      }

      case 'fav': {
        filtered = filtered.filter((item) => item.isFavorite);
        break;
      }

      case 'risers': {
        filtered = filtered
          .filter((item) => {
            const symbol = item.symbol || '';
            const change = deferredRtBySymbol?.[symbol]?.changePercent ?? 0;
            return change > 0;
          })
          .sort((a, b) => {
            if (a.isFavorite && !b.isFavorite) return -1;
            if (!a.isFavorite && b.isFavorite) return 1;
            const changeA = deferredRtBySymbol?.[a.symbol || '']?.changePercent ?? 0;
            const changeB = deferredRtBySymbol?.[b.symbol || '']?.changePercent ?? 0;
            return changeB - changeA;
          });
        break;
      }

      case 'fallers': {
        filtered = filtered
          .filter((item) => {
            const symbol = item.symbol || '';
            const change = deferredRtBySymbol?.[symbol]?.changePercent ?? 0;
            return change < 0;
          })
          .sort((a, b) => {
            if (a.isFavorite && !b.isFavorite) return -1;
            if (!a.isFavorite && b.isFavorite) return 1;
            const changeA = deferredRtBySymbol?.[a.symbol || '']?.changePercent ?? 0;
            const changeB = deferredRtBySymbol?.[b.symbol || '']?.changePercent ?? 0;
            return changeA - changeB;
          });
        break;
      }

      case 'hot': {
        filtered = filtered
          .filter((item) => item.isHot)
          .sort((a, b) => {
            if (a.isFavorite && !b.isFavorite) return -1;
            if (!a.isFavorite && b.isFavorite) return 1;
            return 0;
          });
        break;
      }

      default:
        break;
    }

    return filtered;
  }, [listWithFavoriteState, activeFilterTab, deferredSearchText, deferredRtBySymbol]);

  const hasRealtimeData = useMemo(
    () => Object.keys(deferredRtBySymbol ?? {}).length > 0,
    [deferredRtBySymbol],
  );
  const waitingRealtime =
    !deferredSearchText &&
    !isLoading &&
    isRealtimeFilterTab &&
    shouldSubscribeRealtime &&
    (!isSocketConnected || !hasRealtimeData);

  const isFavInitialized = useRef(false);
  useEffect(() => {
    if (isFavInitialized.current || listAssets.length === 0) return;

    for (const item of listAssets) {
      const assetId = item.id || '';
      if (assetId && !(assetId in favoritesByAssetId)) {
        setFavoriteByAssetId(assetId, item.isFavorite || false);
      }
    }

    isFavInitialized.current = true;
  }, [listAssets, favoritesByAssetId, setFavoriteByAssetId]);

  const renderFooter = useCallback(() => {
    if (!isLoading) return null;

    return (
      <div className="py-4">
        <SymbolRowSkeleton />
      </div>
    );
  }, [isLoading]);

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <>
          <SymbolRowSkeleton />
          <SymbolRowSkeleton />
          <SymbolRowSkeleton />
        </>
      );
    }

    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-muted-foreground">{t('search.noAssetsFound')}</p>
      </div>
    );
  }, [isLoading, t]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Filter Tabs */}
      {!searchText && (
        <div className="px-4">
          <div className="border-border flex items-center justify-between overflow-x-auto border-b">
            {FILTER_TABS.map((tab) => {
              const isActive = activeFilterTab === tab.value;
              return (
                <Button
                  key={tab.value}
                  variant="white-contained"
                  className={`flex-1 rounded-none border-b-2 py-2 whitespace-nowrap ${
                    isActive ? 'border-primary-500' : 'border-transparent'
                  }`}
                  onClick={() => setActiveFilterTab(tab.value)}
                >
                  <span
                    className={
                      isActive
                        ? 'text-primary-500 text-body-small-semibold'
                        : 'text-secondary-500 text-body-small-regular'
                    }
                  >
                    {tab.label}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center px-4 pt-2">
        <div className="w-1/3 text-left">
          <span className="text-body-small-regular text-muted-foreground">
            {t('search.columns.name')}
          </span>
        </div>
        <div className="w-1/3 text-center">
          <span className="text-body-small-regular text-muted-foreground">
            {t('search.columns.lastPrice')}
          </span>
        </div>
        <div className={`w-1/3 ${searchText ? 'text-right' : 'text-center'}`}>
          <span className="text-body-small-regular text-muted-foreground">
            {searchText ? t('search.columns.favorite') : t('search.columns.change')}
          </span>
        </div>
      </div>

      {/* Assets List */}
      <div className={`flex-1 overflow-y-auto px-4`}>
        {waitingRealtime ? (
          <>
            <SymbolRowSkeleton />
            <SymbolRowSkeleton />
            <SymbolRowSkeleton />
          </>
        ) : filteredList.length === 0 ? (
          renderEmpty()
        ) : (
          <>
            {filteredList.map((item) => (
              <ItemSymbolConnected
                digit={item.digit}
                key={item.id || item.symbol}
                accessId={item.id || ''}
                symbol={item.symbol}
                marginCurrency={item.marginCurrency}
                profitCurrency={item.profitCurrency}
                desc={item.name}
                initialBid={item.bid as DecimalValue}
                isSearchMode={Boolean(searchText)}
                onClick={
                  item.symbol
                    ? () => {
                        const symbol = item.symbol!;
                        if (isTrade) {
                          onSelectSymbol?.(symbol);
                          return;
                        }

                        router.push(`/market/${encodeURIComponent(symbol)}`);
                      }
                    : undefined
                }
              />
            ))}
            {renderFooter()}
          </>
        )}
      </div>
    </div>
  );
};

export default TabAsset;

