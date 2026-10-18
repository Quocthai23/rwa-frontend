'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/shared/atoms/button';
import { Skeleton } from '@/components/shared/atoms/skeleton';
import { useAssetStatus, useBuyoutProposals, useEligibility } from '@/hook/useAssetManagement';
import { usePortfolioItem } from '@/hook/usePortfolio';
import { useAccountStore } from '@/store/useAccountStore';
import type { Asset } from '@/types/assets';
import { formatBalance } from '@/utils/currency';

const number = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function AssetOverviewTab({ asset }: { asset: Asset }) {
  const { t } = useTranslation();
  const router = useRouter();
  const accountId = useAccountStore((state) => state.selectedAccount?.id || '');
  const { data: status, isLoading: loadingStatus } = useAssetStatus(asset.id);
  const { data: eligibility, isLoading: loadingEligibility } = useEligibility(asset.id);
  const { data: proposals = [], isLoading: loadingProposals } = useBuyoutProposals(asset.id);
  const { data: holding } = usePortfolioItem({ accountId, assetId: asset.id });

  const activeProposalCount = useMemo(
    () =>
      Array.isArray(proposals) ? proposals.filter((item) => item.status === 'ACTIVE').length : 0,
    [proposals],
  );
  const currentHolding = number(eligibility?.currentHolding ?? holding?.quantity);
  const requiredHolding = number(eligibility?.requiredCurrentHolding);
  const ownershipProgress =
    requiredHolding > 0 ? Math.min(100, (currentHolding / requiredHolding) * 100) : 0;
  const rental = status?.rentalContract;

  if (loadingStatus || loadingEligibility || loadingProposals) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
      </div>
    );
  }

  const sections = [
    {
      key: 'rental',
      title: t('assetManagement.sections.rental', { defaultValue: 'Rental operations' }),
      value: rental
        ? t('assetManagement.operations.rented', { defaultValue: 'Currently leased' })
        : t('assetManagement.operations.available', { defaultValue: 'Available for lease' }),
    },
    {
      key: 'liquidity',
      title: t('assetManagement.sections.liquidity', { defaultValue: 'Token liquidity' }),
      value:
        asset.tradingStatus === 'OPEN'
          ? t('assetManagement.status.open', { defaultValue: 'Trading open' })
          : t('assetManagement.status.paused', { defaultValue: 'Trading paused' }),
    },
    {
      key: 'governance',
      title: t('assetManagement.sections.governance', { defaultValue: 'Governance' }),
      value: t('assetManagement.overview.activeProposals', {
        count: activeProposalCount,
        defaultValue: `${activeProposalCount} active proposals`,
      }),
    },
    {
      key: 'cash-flow',
      title: t('assetManagement.sections.cashFlow', { defaultValue: 'Cash flow' }),
      value:
        status?.treasuryBalance == null
          ? t('assetManagement.transactionHistory.notConfigured')
          : `${formatBalance(status.treasuryBalance)} ${status.treasuryCurrency ?? ''}`,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="border-border border">
        <div className="border-border grid divide-y md:grid-cols-4 md:divide-x md:divide-y-0">
          <Metric
            label={t('assetManagement.overview.operation', { defaultValue: 'Operation status' })}
            value={
              rental
                ? t('assetManagement.operations.rented', { defaultValue: 'Currently leased' })
                : t('assetManagement.operations.available', { defaultValue: 'Available for lease' })
            }
          />
          <Metric
            label={t('assetManagement.expectedApy', { defaultValue: 'Expected annual yield' })}
            value={`${number(asset.expectedApy).toFixed(2)}%`}
          />
          <Metric
            label={t('assetManagement.overview.yourOwnership', {
              defaultValue: 'Your token ownership',
            })}
            value={`${formatBalance(currentHolding)} token`}
          />
          <Metric
            label={t('assetManagement.overview.buyoutStatus', {
              defaultValue: 'Buyout eligibility',
            })}
            value={
              eligibility?.eligible
                ? t('assetManagement.eligibility.eligible', { defaultValue: 'Eligible' })
                : t('assetManagement.eligibility.notEligible', { defaultValue: 'Not eligible' })
            }
          />
        </div>
      </section>

      {!eligibility?.eligible && (
        <section className="border-border border px-4 py-4">
          <div className="flex items-center justify-between gap-4 text-sm">
            <div>
              <p className="text-foreground font-medium">
                {t('assetManagement.overview.buyoutProgress', {
                  defaultValue: 'Buyout eligibility progress',
                })}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {eligibility?.reason ||
                  t('assetManagement.eligibility.requirementsMissing', {
                    defaultValue: 'Ownership or continuous holding requirements are not yet met.',
                  })}
              </p>
            </div>
            <span className="text-foreground tabular-nums">{ownershipProgress.toFixed(1)}%</span>
          </div>
          <div className="bg-muted mt-3 h-1.5 overflow-hidden">
            <div className="bg-primary-500 h-full" style={{ width: `${ownershipProgress}%` }} />
          </div>
        </section>
      )}

      <section>
        <div className="border-border grid border md:grid-cols-2">
          {sections.map((section) => (
            <button
              type="button"
              key={section.key}
              onClick={() => router.push(`/asset-management/${asset.id}/${section.key}`)}
              className="border-border hover:bg-muted/40 flex items-center justify-between border-b px-4 py-4 text-left odd:md:border-r"
            >
              <div>
                <p className="text-foreground text-sm font-medium">{section.title}</p>
                <p className="text-muted-foreground mt-1 text-xs">{section.value}</p>
              </div>
              <span className="text-muted-foreground">→</span>
            </button>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={() => router.push(`/trade/${asset.symbol}`)}>
          {t('assetManagement.tradeAsset', { defaultValue: 'Trade token' })}
        </Button>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-4">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-foreground mt-2 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
