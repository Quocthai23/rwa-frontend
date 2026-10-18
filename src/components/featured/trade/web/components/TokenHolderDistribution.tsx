'use client';

import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { getAssetHolders } from '@/services/assetsService';

const HOLDER_COLORS = ['#2563eb', '#0f766e', '#7c3aed', '#be185d'];
const SYSTEM_COLORS = {
  issuer: '#64748b',
  offering: '#d97706',
  others: '#0891b2',
  unallocated: '#dc2626',
  liquidity: '#4f46e5',
};

export function TokenHolderDistribution({ assetId }: { assetId: string }) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    enabled: Boolean(assetId),
    queryFn: () => getAssetHolders(assetId),
    queryKey: ['asset-holder-distribution', assetId],
    staleTime: 60_000,
  });

  const segments = useMemo(() => {
    if (!data) return [];
    const investorSegments = [
      ...data.topHolders.map((holder, index) => ({
        ...holder,
        displayName: t('assetManagement.rentalOperations.guestName', {
          number: holder.publicGuestNumber,
          defaultValue: 'Guest {{number}}',
        }),
        color: HOLDER_COLORS[index],
        kind: 'holder' as const,
      })),
      ...(Number(data.others.amount) > 0
        ? [
            {
              amount: data.others.amount,
              color: SYSTEM_COLORS.others,
              displayName: t('trade.info.holders.otherInvestors', {
                defaultValue: 'Other investors',
              }),
              kind: 'summary' as const,
              percentage: data.others.percentage,
              userId: '',
            },
          ]
        : []),
    ];
    return [
      {
        amount: data.issuerReserve.amount,
        color: SYSTEM_COLORS.issuer,
        displayName: t('trade.info.holders.issuerReserve', { defaultValue: 'Issuer retained' }),
        kind: 'summary' as const,
        percentage: data.issuerReserve.percentage,
        userId: '',
      },
      {
        amount: data.primaryOffering.amount,
        color: SYSTEM_COLORS.offering,
        displayName: t('trade.info.holders.primaryOffering', {
          defaultValue: 'Available for primary sale',
        }),
        kind: 'summary' as const,
        percentage: data.primaryOffering.percentage,
        userId: '',
      },
      ...investorSegments,
      ...(Number(data.liquidityProvider.amount) > 0
        ? [
            {
              amount: data.liquidityProvider.amount,
              color: SYSTEM_COLORS.liquidity,
              displayName: t('trade.info.holders.liquidityProvider', {
                defaultValue: 'Liquidity provider inventory',
              }),
              kind: 'summary' as const,
              percentage: data.liquidityProvider.percentage,
              userId: '',
            },
          ]
        : []),
      ...(Number(data.unallocated.amount) > 0
        ? [
            {
              amount: data.unallocated.amount,
              color: SYSTEM_COLORS.unallocated,
              displayName: t('trade.info.holders.unallocated', {
                defaultValue: 'Unallocated discrepancy',
              }),
              kind: 'summary' as const,
              percentage: data.unallocated.percentage,
              userId: '',
            },
          ]
        : []),
    ].filter((segment) => Number(segment.amount) > 0);
  }, [data, t]);

  const chartBackground = useMemo(() => {
    let cursor = 0;
    const stops = segments.map((segment) => {
      const start = cursor;
      cursor += Number(segment.percentage);
      return `${segment.color} ${start}% ${Math.min(cursor, 100)}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }, [segments]);

  if (isLoading) {
    return <div className="bg-muted h-64 animate-pulse rounded-xl" />;
  }
  if (!data) return null;

  return (
    <section className="border-border bg-card rounded-xl border p-5 shadow-sm shadow-slate-200/50 dark:shadow-none">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-foreground text-lg font-semibold">
            {t('trade.info.holders.title', { defaultValue: 'Token ownership' })}
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {t('trade.info.holders.subtitle', {
              defaultValue: 'Largest holders based on the current internal settlement ledger.',
            })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground text-xs">
            {t('trade.info.holders.totalSupply', { defaultValue: 'Total supply' })}
          </p>
          <p className="text-foreground font-semibold tabular-nums">
            {Number(data.totalSupply).toLocaleString()}{' '}
            {t('trade.info.holders.tokenUnit', { defaultValue: 'token' })}
          </p>
        </div>
      </div>

      <div className="grid items-center gap-6 md:grid-cols-[180px_1fr]">
        <div
          className="relative mx-auto size-40 rounded-full"
          style={{ background: chartBackground }}
        >
          <div className="bg-card absolute inset-7 flex flex-col items-center justify-center rounded-full text-center">
            <span className="text-foreground text-xl font-semibold">{data.holderCount}</span>
            <span className="text-muted-foreground text-xs">
              {t('trade.info.holders.investors', { defaultValue: 'investors' })}
            </span>
          </div>
        </div>

        <div className="divide-border divide-y">
          {segments.map((segment, index) => {
            const content = (
              <div className="flex min-w-0 items-center gap-3 py-2.5">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: segment.color }}
                />
                {segment.kind === 'holder' ? (
                  segment.avatar ? (
                    <Image
                      src={segment.avatar}
                      alt=""
                      width={32}
                      height={32}
                      className="size-8 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="bg-primary-50 text-primary-600 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                      {segment.displayName.slice(0, 1).toUpperCase()}
                    </span>
                  )
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate text-sm font-medium">
                    {segment.kind === 'holder' ? `${index + 1}. ` : ''}
                    {segment.displayName}
                  </p>
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {Number(segment.amount).toLocaleString()}{' '}
                    {t('trade.info.holders.tokenUnit', { defaultValue: 'token' })}
                  </p>
                </div>
                <span className="text-foreground shrink-0 text-sm font-semibold tabular-nums">
                  {Number(segment.percentage).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                  %
                </span>
              </div>
            );
            return segment.kind === 'holder' ? (
              <Link
                key={segment.userId}
                href={`/discover?tab=profile?userId=${encodeURIComponent(segment.userId)}`}
                className="hover:bg-muted -mx-2 block rounded-lg px-2 transition-colors"
              >
                {content}
              </Link>
            ) : (
              <div key={`${segment.kind}-${segment.displayName}`}>{content}</div>
            );
          })}
        </div>
      </div>

      <div className="border-border mt-4 grid grid-cols-3 gap-3 border-t pt-4 text-center">
        <div>
          <p className="text-muted-foreground text-xs">
            {t('trade.info.holders.circulating', { defaultValue: 'Held by investors' })}
          </p>
          <p className="text-foreground mt-1 font-semibold tabular-nums">
            {Number(data.circulatingSupply.amount).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">
            {t('trade.info.holders.availableForSale', { defaultValue: 'Available for sale' })}
          </p>
          <p className="text-foreground mt-1 font-semibold tabular-nums">
            {Number(data.primaryOffering.amount).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">
            {t('trade.info.holders.issuerRetained', { defaultValue: 'Issuer retained' })}
          </p>
          <p className="text-foreground mt-1 font-semibold tabular-nums">
            {Number(data.issuerReserve.amount).toLocaleString()}
          </p>
        </div>
      </div>

      {Number(data.ledgerSurplus.amount) > 0 && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {t('trade.info.holders.ledgerSurplus', {
            defaultValue:
              'Ledger data exceeds the declared total supply. Trading should remain paused until reconciled.',
          })}
        </p>
      )}

      <p className="text-muted-foreground mt-4 text-xs leading-5">
        {t('trade.info.holders.privacy', {
          defaultValue:
            'Only public profile names are shown. Email addresses, private keys and full wallet addresses are never exposed.',
        })}
      </p>
    </section>
  );
}
