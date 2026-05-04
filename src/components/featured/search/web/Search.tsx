'use client';

import { SearchLg } from '@untitledui/icons';
import { usePathname, useRouter } from 'next/navigation';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/shared/atoms/button';
import { Input } from '@/components/shared/atoms/input';
import { ToggleFavouriteAsset } from '@/components/shared/components/ToggleFavouriteAsset/ToggleFavouriteAsset';
import { useGetData } from '@/context/GetdataContext';
import { useSymbols } from '@/hook/useSymbols';
import { cn } from '@/lib/utils';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import { useFavoriteAssetsStore } from '@/store/favoriteAssetsStore';
import type { DecimalValue } from '@/types/decimal';
import { filterAndSortAssets } from '@/utils/searchHelper';
import { toFiniteNumberFromNumberish } from '@/components/shared/chart/components/tradePanel/utils/tradePanelInputHelpers';

type SearchProps = {
  placeholder?: string;
  className?: string;
  onSelectSymbol?: (symbol: string) => void;
  maxResults?: number;
};

type SearchableAsset = {
  id: string;
  name: string;
  symbol: string;
  marginCurrency: string;
  profitCurrency: string;
  bid: DecimalValue;
  ask?: DecimalValue;
  isFavorite?: boolean;
  digit: number;
};

type SearchRtBidAsk = {
  bid?: DecimalValue;
  ask?: DecimalValue;
};

function resolveSearchBidAsk(
  rt: SearchRtBidAsk | undefined,
  asset: Pick<SearchableAsset, 'ask' | 'bid'>,
): { ask: number; bid: number } {
  const bid = toFiniteNumberFromNumberish(rt?.bid) ?? toFiniteNumberFromNumberish(asset.bid) ?? 0;
  const ask =
    toFiniteNumberFromNumberish(rt?.ask) ??
    toFiniteNumberFromNumberish(asset.ask ?? asset.bid) ??
    0;
  return { ask, bid };
}

type SortKey = 'symbol' | 'sell' | 'buy' | 'chg';
type SortDir = 'asc' | 'desc';
const TRADE_SYMBOL_SELECTED_EVENT = 'trade:web:select-symbol';

const getSortButtonClass = (active: boolean) =>
  cn(
    'inline-flex w-full cursor-pointer items-center gap-1 border-0 p-0 text-right transition-colors',
    active
      ? 'text-primary-500 dark:text-primary-500'
      : 'text-muted-foreground hover:text-primary-500',
  );

function SortIndicator({ active, direction }: { active: boolean; direction?: SortDir }) {
  return (
    <span className="inline-flex shrink-0 flex-col text-current transition-colors" aria-hidden>
      <svg
        width={6}
        height={4}
        aria-hidden
        viewBox="0 0 7 5"
        className={cn(
          'size-[6px] h-[4px] transition-opacity',
          !active && 'opacity-90',
          active && direction === 'desc' && 'opacity-30',
        )}
      >
        <path fill="currentColor" d="M3.5 0 7 5H0z" />
      </svg>
      <svg
        width={6}
        height={4}
        aria-hidden
        viewBox="0 0 7 5"
        className={cn(
          'mt-[1px] size-[6px] h-[4px] transition-opacity',
          !active && 'opacity-90',
          active && direction === 'asc' && 'opacity-30',
        )}
      >
        <path fill="currentColor" d="M0 0h7L3.5 5z" />
      </svg>
    </span>
  );
}

export default function Search({
  placeholder,
  className,
  onSelectSymbol,
  maxResults = 30,
}: SearchProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { assets } = useGetData();
  const rtBySymbol = useMarketSocketStore((s) => s.rtBySymbol);
  const [searchText, setSearchText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const deferredSearchText = useDeferredValue(searchText);
  const favoritesByAssetId = useFavoriteAssetsStore((s) => s.favoritesByAssetId);
  const favoritesBySymbol = useFavoriteAssetsStore((s) => s.favoritesBySymbol);

  const listAssets = useMemo(() => {
    return (assets ?? [])
      .filter((item) => Boolean(item.symbol))
      .map((item) => {
        const id = item.id || '';
        const byId = id ? favoritesByAssetId[id] : undefined;
        const bySymbol = item.symbol ? favoritesBySymbol[item.symbol] : undefined;
        return {
          ...item,
          isFavorite: (byId ?? bySymbol ?? item.isFavorite) || false,
        };
      }) as SearchableAsset[];
  }, [assets, favoritesByAssetId, favoritesBySymbol]);

  const filteredAssets = useMemo(() => {
    return filterAndSortAssets(listAssets, deferredSearchText, maxResults);
  }, [deferredSearchText, listAssets, maxResults]);

  const symbolsToSub = useMemo(() => filteredAssets.map((item) => item.symbol), [filteredAssets]);
  useSymbols(symbolsToSub, isOpen && symbolsToSub.length > 0);

  const displayedAssets = useMemo(() => {
    if (!sortKey) return filteredAssets;

    const sorted = [...filteredAssets].sort((a, b) => {
      const aRt = rtBySymbol?.[a.symbol];
      const bRt = rtBySymbol?.[b.symbol];
      const aQ = resolveSearchBidAsk(aRt, a);
      const bQ = resolveSearchBidAsk(bRt, b);
      const aChg = aRt?.changePercent ?? 0;
      const bChg = bRt?.changePercent ?? 0;
      const aSymbol = (
        a.marginCurrency && a.profitCurrency ? `${a.marginCurrency}/${a.profitCurrency}` : a.symbol
      ).toLowerCase();
      const bSymbol = (
        b.marginCurrency && b.profitCurrency ? `${b.marginCurrency}/${b.profitCurrency}` : b.symbol
      ).toLowerCase();

      if (sortKey === 'symbol') return aSymbol.localeCompare(bSymbol);
      if (sortKey === 'sell') return aQ.bid - bQ.bid;
      if (sortKey === 'buy') return aQ.ask - bQ.ask;
      return aChg - bChg;
    });

    if (sortDir === 'desc') sorted.reverse();
    return sorted;
  }, [filteredAssets, rtBySymbol, sortDir, sortKey]);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapperRef.current && !wrapperRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const showDropdown = isOpen;
  const resolvedPlaceholder =
    placeholder ?? t('search.placeholderSymbol', { defaultValue: 'Search symbol' });

  const handleSelectSymbol = (symbol: string) => {
    setIsOpen(false);
    setSearchText('');
    if (onSelectSymbol) {
      onSelectSymbol(symbol);
      return;
    }
    if (pathname?.startsWith('/trade')) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(TRADE_SYMBOL_SELECTED_EVENT, {
            detail: { symbol },
          }),
        );
        window.history.replaceState(
          window.history.state,
          '',
          `/trade/${encodeURIComponent(symbol)}`,
        );
      }
      return;
    }
    router.push(`/trade/${encodeURIComponent(symbol)}`);
  };

  const handleSortToggle = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
      return;
    }
    if (sortDir === 'asc') {
      setSortDir('desc');
      return;
    }
    setSortKey(null);
    setSortDir('asc');
  };

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      <div className="flex items-center gap-2">
        <SearchLg size={16} className="text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          value={searchText}
          placeholder={resolvedPlaceholder}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setSearchText(e.target.value);
            setIsOpen(true);
          }}
          className="!text-body-small-regular h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
        />
      </div>

      {showDropdown ? (
        <div className="bg-background dark:bg-card border-border absolute top-[calc(100%+20px)] left-[-12px] z-50 w-[456px] rounded border p-4 shadow-[3px_3px_12px_0px_rgba(0,0,0,0.15)] dark:border-neutral-900 dark:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] dark:ring-1 dark:ring-neutral-800/20 dark:ring-inset">
          <div className="text-body-small-medium text-muted-foreground mb-1 grid grid-cols-[20px_1.4fr_1fr_1fr_0.8fr] items-center gap-2 border-solid border-neutral-200 pb-2 dark:border-neutral-700">
            <div aria-hidden />
            <Button
              type="button"
              variant="white-contained"
              className={cn(
                getSortButtonClass(sortKey === 'symbol'),
                'justify-start bg-transparent text-left',
              )}
              onClick={() => handleSortToggle('symbol')}
            >
              <span className="text-body-small-medium text-current">
                {t('market.columns.symbol', { defaultValue: 'Symbol' })}
              </span>
              <SortIndicator active={sortKey === 'symbol'} direction={sortDir} />
            </Button>
            <Button
              type="button"
              variant="white-contained"
              className={cn(getSortButtonClass(sortKey === 'sell'), 'justify-end bg-transparent')}
              onClick={() => handleSortToggle('sell')}
            >
              <span className="text-body-small-medium text-current">
                {t('market.columns.sellPrice', { defaultValue: 'Sell Price' })}
              </span>
              <SortIndicator active={sortKey === 'sell'} direction={sortDir} />
            </Button>
            <Button
              type="button"
              variant="white-contained"
              className={cn(getSortButtonClass(sortKey === 'buy'), 'justify-end bg-transparent')}
              onClick={() => handleSortToggle('buy')}
            >
              <span className="text-body-small-medium text-current">
                {t('market.columns.buyPrice', { defaultValue: 'Buy Price' })}
              </span>
              <SortIndicator active={sortKey === 'buy'} direction={sortDir} />
            </Button>
            <Button
              type="button"
              variant="white-contained"
              className={cn(getSortButtonClass(sortKey === 'chg'), 'justify-end bg-transparent')}
              onClick={() => handleSortToggle('chg')}
            >
              <span className="text-body-small-medium text-current">
                {t('market.columns.changePercent', { defaultValue: 'Change %' })}
              </span>
              <SortIndicator active={sortKey === 'chg'} direction={sortDir} />
            </Button>
          </div>
          <div className="-mr-2 h-[70vh] max-h-[70vh] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-[3px] [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-clip-padding hover:[&::-webkit-scrollbar-thumb]:bg-neutral-300 dark:hover:[&::-webkit-scrollbar-thumb]:bg-neutral-700 [&::-webkit-scrollbar-thumb:hover]:bg-neutral-400 dark:[&::-webkit-scrollbar-thumb:hover]:bg-neutral-500 [&::-webkit-scrollbar-track]:bg-transparent">
            {displayedAssets.length === 0 ? (
              <div className="text-body-small-regular text-muted-foreground items-center justify-center p-3 text-center">
                {t('search.noAssetsFound', { defaultValue: 'No assets found' })}
              </div>
            ) : (
              displayedAssets.map((item) => {
                const rt = rtBySymbol?.[item.symbol];
                const { ask, bid } = resolveSearchBidAsk(rt, item);
                const changePercent = rt?.changePercent ?? 0;
                const priceClass =
                  changePercent > 0
                    ? 'text-green-500'
                    : changePercent < 0
                      ? 'text-red-500'
                      : 'text-muted-foreground';
                const pair =
                  item.marginCurrency && item.profitCurrency
                    ? `${item.marginCurrency}/${item.profitCurrency}`
                    : item.symbol;
                const safeDigit = Number.isFinite(item.digit)
                  ? Math.min(12, Math.max(0, Math.trunc(item.digit)))
                  : 2;

                return (
                  <div
                    key={item.id || item.symbol}
                    role="button"
                    tabIndex={0}
                    className="group border-border grid w-full cursor-pointer grid-cols-[20px_1.4fr_1fr_1fr_0.8fr] items-center gap-2 border-b py-2 text-left last:border-b-0 dark:border-neutral-700"
                    onClick={() => handleSelectSymbol(item.symbol)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleSelectSymbol(item.symbol);
                      }
                    }}
                  >
                    <ToggleFavouriteAsset
                      assetId={item.id || ''}
                      size={5}
                      defaultIsFavorite={item.isFavorite}
                      className="dark:bg-card h-[20px] w-[20px] p-0"
                    />
                    <div className="min-w-0">
                      <p className="text-body-small-medium text-foreground group-hover:text-primary-500 truncate transition-colors">
                        {item.symbol || pair}
                      </p>
                      <p className="text-body-small-regular text-muted-foreground group-hover:text-primary-500 truncate transition-colors">
                        {item.name || pair}
                      </p>
                    </div>
                    <p
                      className={cn(
                        'text-body-caption-medium group-hover:text-primary-500 text-right tabular-nums transition-colors',
                        priceClass,
                      )}
                    >
                      {Number.isFinite(bid) ? bid.toFixed(safeDigit) : '-'}
                    </p>
                    <p
                      className={cn(
                        'text-body-caption-medium group-hover:text-primary-500 text-right tabular-nums transition-colors',
                        priceClass,
                      )}
                    >
                      {Number.isFinite(ask) ? ask.toFixed(safeDigit) : '-'}
                    </p>
                    <p
                      className={cn(
                        'text-body-caption-medium group-hover:text-primary-500 text-right tabular-nums transition-colors',
                        priceClass,
                      )}
                    >
                      {changePercent > 0 ? '+' : ''}
                      {changePercent.toFixed(2)}%
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
