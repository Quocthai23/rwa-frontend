'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAssetActionCounts } from '@/hook/useAssetActionCounts';
import { AssetActionBadge } from '@/features/asset-management/web/components/AssetActionBadge';

import { useTranslation } from 'react-i18next';

import { AssetManagementButton as Button } from '@/features/asset-management/web/components/AssetManagementButton';
import { Skeleton } from '@/components/shared/atoms/skeleton';
import { useActiveAssets } from '@/hook/useAssets';
import { useInfinitePortfolioItems } from '@/hook/usePortfolio';
import { useAccountStore } from '@/store/useAccountStore';
import { formatBalance } from '@/utils/currency';

export default function AssetManagementWebScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: actionCounts } = useAssetActionCounts();
  const accountId = useAccountStore((state) => state.selectedAccount?.id || '');
  const { data: assets = [], isLoading: loadingAssets } = useActiveAssets();
  const { data: portfolio, isLoading: loadingPortfolio } = useInfinitePortfolioItems(
    { accountId, sortBy: 'symbol', sortDir: 'asc' },
    100,
  );
  const holdings = useMemo(
    () => portfolio?.pages.flatMap((page) => page.data) ?? [],
    [portfolio],
  );
  const rows = useMemo(
    () => holdings.map((holding) => ({ holding, asset: assets.find((asset) => asset.id === holding.assetId) })).filter((row) => row.asset),
    [assets, holdings],
  );

  return (
    <div className="mx-auto w-full max-w-[1480px] px-6 py-6">
      <div className="border-border mb-5 flex items-end justify-between border-b pb-4">
        <div>
          <h1 className="text-foreground text-xl font-semibold">{t('assetManagement.portfolioTitle')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('assetManagement.portfolioDesc')}</p>
        </div>
        <span className="text-muted-foreground text-xs">{rows.length} {t('assetManagement.properties', { defaultValue: 'properties' })}</span>
      </div>

      {loadingAssets || loadingPortfolio ? (
        <div className="space-y-2">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-20 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <div className="border-border text-muted-foreground border border-dashed px-4 py-16 text-center text-sm">{t('assetManagement.emptyOwned', { defaultValue: 'You do not own property tokens in this account.' })}</div>
      ) : (
        <div className="border-border border">
          {rows.map(({ asset, holding }) => {
            if (!asset) return null;
            const ownership = Number(asset.totalSupply) > 0 ? Number(holding.quantity) / Number(asset.totalSupply) * 100 : 0;
            return (
              <div key={asset.id} className="border-border grid items-center gap-4 border-b px-4 py-4 last:border-b-0 md:grid-cols-[minmax(260px,1fr)_180px_180px_150px]">
                <div><p className="text-foreground text-sm font-semibold">{asset.name}</p><p className="text-muted-foreground mt-1 text-xs">{asset.symbol} · {asset.location || asset.propertyType || t('assetManagement.property', { defaultValue: 'Tokenized property' })}</p></div>
                <div className="md:text-right"><p className="text-muted-foreground text-xs">{t('portfolio.table.quantity', { defaultValue: 'Tokens owned' })}</p><p className="text-foreground mt-1 text-sm tabular-nums">{formatBalance(holding.quantity)}</p></div>
                <div className="md:text-right"><p className="text-muted-foreground text-xs">{t('portfolio.table.avgBuyPrice', { defaultValue: 'Ownership share' })}</p><p className="text-foreground mt-1 text-sm tabular-nums">{ownership.toFixed(4)}%</p></div>
                <Button variant="neutral-outline" onClick={() => router.push(`/asset-management/${asset.id}`)}>{t('assetManagement.manageAsset')}<AssetActionBadge count={actionCounts?.[asset.id]?.total} /></Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
