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

const normalizeCategory = (value: string | undefined): string =>
  normalize(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '_');

const isRealEstateCategory = (category: CategoryOption): boolean => {
  const values = [category.code, category.name].map(normalizeCategory);
  return values.some((value) =>
    ['real_estate', 'realestate', 'bat_dong_san', 'property'].includes(value),
  );
};

export function buildMarketTabs({ categories, t }: BuildMarketTabsParams): MarketTabVM[] {
  const staticTabs: MarketTabVM[] = [
    { id: 'fav', label: t('market.tabs.fav') },
    { id: 'popular', label: t('market.tabs.popular') },
    { id: 'rental', label: t('market.tabs.rental', { defaultValue: 'Tài sản cho thuê' }) },
    { id: 'buyout', label: t('market.tabs.buyout', { defaultValue: 'Đang thâu tóm' }) },
  ];

  const categoryTabs = categories
    .filter(
      (category) => (category.name ?? '').trim().length > 0 && !isRealEstateCategory(category),
    )
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
        lastPriceValue: toNumber(asset.tokenPrice),
        referencePriceValue: toNumber(asset.referencePrice),
        categoryCode: asset.category?.code ?? asset.category?.name ?? '',
        categoryName: asset.category?.name ?? '',
        propertyType: asset.propertyType,
        location: asset.location,
        expectedApy: toNumber(asset.expectedApy),
        buyoutPremiumPercent: asset.buyoutSummary
          ? toNumber(asset.buyoutSummary.premiumPercent)
          : undefined,
        buyoutMonthlyWaitingRatePercent: asset.buyoutSummary
          ? toNumber(asset.buyoutSummary.monthlyWaitingRatePercent ?? undefined)
          : undefined,
        buyoutMonthsRemaining: asset.buyoutSummary
          ? Math.max(0, asset.buyoutSummary.totalMonths - asset.buyoutSummary.monthsCompleted)
          : undefined,
        buyoutTotalMonths: asset.buyoutSummary?.totalMonths,
        buyoutMonthsCompleted: asset.buyoutSummary?.monthsCompleted,
        buyoutPrincipalUnitPrice: asset.buyoutSummary
          ? toNumber(asset.buyoutSummary.principalUnitPrice ?? undefined)
          : undefined,
        buyoutRedemptionUnitPrice: asset.buyoutSummary
          ? toNumber(asset.buyoutSummary.redemptionUnitPrice ?? undefined)
          : undefined,
        buyoutInitialMinorityTokens: asset.buyoutSummary
          ? toNumber(asset.buyoutSummary.initialMinorityTokens ?? undefined)
          : undefined,
        buyoutRemainingMinorityTokens: asset.buyoutSummary
          ? toNumber(asset.buyoutSummary.remainingMinorityTokens ?? undefined)
          : undefined,
        buyoutTotalConsiderationVnd: asset.buyoutSummary
          ? toNumber(asset.buyoutSummary.totalConsiderationVnd ?? undefined)
          : undefined,
        buyoutPrincipalPaidVnd: asset.buyoutSummary
          ? toNumber(asset.buyoutSummary.principalPaidVnd ?? undefined)
          : undefined,
        buyoutPremiumPaidVnd: asset.buyoutSummary
          ? toNumber(asset.buyoutSummary.premiumPaidVnd ?? undefined)
          : undefined,
        buyoutNextPaymentVnd: asset.buyoutSummary?.nextInstallment
          ? toNumber(asset.buyoutSummary.nextInstallment.paymentAmount)
          : undefined,
        buyoutNextRecordAt:
          asset.buyoutSummary?.nextInstallment?.recordAt ??
          asset.buyoutSummary?.nextRecordAt ??
          undefined,
        buyoutBuyerGuestNumber: asset.buyoutSummary?.buyerGuestNumber,
        rentalStatus: asset.rentalSummary?.status,
        monthlyRentVnd: toNumber(asset.rentalSummary?.monthlyRentVnd ?? undefined),
        rentalDueDay: asset.rentalSummary?.dueDay ?? undefined,
        latestRentalPeriod: asset.rentalSummary?.latestDistribution?.periodStart ?? undefined,
        digit: Number.isFinite(asset.digit) ? asset.digit : 2,
        id: asset.id,
        initialHigh: high,
        initialLow: low,
        isActive: Boolean(asset.isActive),
        tradingStatus: asset.tradingStatus ?? 'PAUSED',
        isFavorite: Boolean(byId ?? bySymbol ?? apiFavorite),
        name: asset.name ?? '',
        spreadText: asset.spread,
        spreadValue: toNumber(asset.spread),
        statusColor: asset.statusColor,
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
