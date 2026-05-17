import type { Asset } from '@/types';

import type { MarketRowVM, MarketTabVM } from './types';

type CategoryOption = {
  code?: string;
  name?: string;
};

type BuildMarketTabsParams = {
  categories: CategoryOption[];
  t: (key: string, options?: { defaultValue?: string }) => string;
};

type BuildMarketRowsParams = {
  assets: Asset[];
  favoritesByAssetId: Record<string, boolean>;
  favoritesBySymbol: Record<string, boolean>;
};

type FilterMarketRowsParams = {
  categoryCode?: string;
  marketOpenOnly?: boolean;
  rows: MarketRowVM[];
  search?: string;
};

const toNumber = (value: string | number | undefined): number => {
  const parsed = Number.parseFloat(String(value ?? 0));
  return Number.isFinite(parsed) ? parsed : 0;
};

const toNumberish = (value: unknown): number | string | undefined => {
  if (typeof value === 'number' || typeof value === 'string') return value;
  return undefined;
};

const normalize = (value: string | undefined): string => {
  return (value ?? '').trim().toLowerCase();
};

export function buildMarketTabs({ categories, t }: BuildMarketTabsParams): MarketTabVM[] {
  const staticTabs: MarketTabVM[] = [
    { id: 'fav', label: t('market.tabs.fav') },
    { id: 'popular', label: t('market.tabs.popular') },
  ];

  const categoryTabs = categories
    .filter((category) => (category.name ?? '').trim().length > 0)
    .map((category) => {
      const key = (category.code ?? category.name ?? '').toString().toLowerCase();

      return {
        id: String(category.name),
        label: t(`market.categoryOptions.${key}`, { defaultValue: category.name }),
      };
    });

  return [...staticTabs, ...categoryTabs];
}

export function buildMarketRows({
  assets,
  favoritesByAssetId,
  favoritesBySymbol,
}: BuildMarketRowsParams): MarketRowVM[] {
  return assets
    .map((asset) => {
      const rawAsset = asset as Record<string, unknown>;
      const byId = favoritesByAssetId[asset.id];
      const bySymbol = favoritesBySymbol[asset.symbol];
      const rawFavorite = rawAsset.isFavorite ?? rawAsset.isFavorites ?? rawAsset.isFovorites;
      const apiFavorite = typeof rawFavorite === 'boolean' ? rawFavorite : undefined;
      const rawHigh = rawAsset.high;
      const rawLow = rawAsset.low;
      const high = typeof toNumberish(rawHigh) !== 'undefined' ? toNumber(toNumberish(rawHigh)) : 0;
      const low = typeof toNumberish(rawLow) !== 'undefined' ? toNumber(toNumberish(rawLow)) : 0;

      return {
        askText: asset.ask,
        askValue: toNumber(asset.ask),
        bidText: asset.bid,
        bidValue: toNumber(asset.bid),
        categoryCode: asset.category?.code ?? asset.category?.name ?? '',
        categoryName: asset.category?.name ?? '',
        digit: Number.isFinite(asset.digit) ? asset.digit : 2,
        id: asset.id,
        initialHigh: high,
        initialLow: low,
        isActive: Boolean(asset.isActive),
        isFavorite: Boolean(byId ?? bySymbol ?? apiFavorite),
        name: asset.name ?? '',
        spreadText: asset.spread,
        spreadValue: toNumber(asset.spread),
        symbol: asset.symbol,
      };
    })
    .sort((left, right) => left.symbol.localeCompare(right.symbol));
}

export function filterMarketRows({
  categoryCode,
  marketOpenOnly = false,
  rows,
  search,
}: FilterMarketRowsParams): MarketRowVM[] {
  const normalizedSearch = normalize(search);
  const normalizedCategoryCode = normalize(categoryCode);

  return rows.filter((row) => {
    if (marketOpenOnly && !row.isActive) {
      return false;
    }

    if (normalizedCategoryCode && normalize(row.categoryCode) !== normalizedCategoryCode) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const target = `${row.symbol} ${row.name}`.toLowerCase();
    return target.includes(normalizedSearch);
  });
}
