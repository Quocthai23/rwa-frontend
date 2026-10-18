'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/shared/atoms/button';
import type { Asset } from '@/types/assets';
import { cn } from '@/lib/utils';

type BuyoutTradingOverviewProps = {
  asset?: Asset;
  compact?: boolean;
};

function toFiniteNumber(value: string | number | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function BuyoutTradingOverview({ asset, compact = false }: BuyoutTradingOverviewProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const summary = asset?.buyoutSummary;
  if (!asset || !summary) return null;

  const locale = i18n.resolvedLanguage?.startsWith('vi') ? 'vi-VN' : 'en-US';
  const totalMonths = Math.max(summary.totalMonths || 0, 0);
  const completedMonths = Math.min(Math.max(summary.monthsCompleted || 0, 0), totalMonths);
  const progress = totalMonths > 0 ? (completedMonths / totalMonths) * 100 : 0;
  const lockedPrice = toFiniteNumber(summary.principalUnitPrice ?? summary.redemptionUnitPrice);
  const waitingRate = toFiniteNumber(summary.monthlyWaitingRatePercent);
  const totalPremium = toFiniteNumber(summary.premiumPercent);
  const nextPayment = toFiniteNumber(summary.nextInstallment?.paymentAmount);
  const nextRecordAt = summary.nextRecordAt
    ? new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(summary.nextRecordAt))
    : '--';
  const formatVnd = (value: number | null) =>
    value == null
      ? '--'
      : new Intl.NumberFormat(locale, {
          maximumFractionDigits: 0,
        }).format(value);
  const buyerLocked = summary.status === 'ACTIVE' && summary.viewerIsBuyer === true;

  const metrics = [
    {
      label: t('trade.buyoutTrading.lockedPrice'),
      value: `${formatVnd(lockedPrice)} VND`,
    },
    {
      label: t('trade.buyoutTrading.monthlyWaitingRate'),
      value: waitingRate == null ? '--' : `${waitingRate.toLocaleString(locale)}%`,
    },
    {
      label: t('trade.buyoutTrading.totalPremium'),
      value: totalPremium == null ? '--' : `${totalPremium.toLocaleString(locale)}%`,
    },
    {
      label: t('trade.buyoutTrading.nextPayment'),
      value: nextPayment == null ? '--' : `${formatVnd(nextPayment)} VND`,
      hint: nextRecordAt,
    },
    {
      label: t('trade.buyoutTrading.progress'),
      value: t('trade.buyoutTrading.progressValue', {
        completed: completedMonths,
        total: totalMonths,
      }),
    },
  ];

  return (
    <section className="border-border bg-background shrink-0 border-b">
      <div
        className={cn(
          'mx-auto flex w-full gap-4 px-4 py-3',
          compact ? 'flex-col' : 'items-center justify-between',
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-foreground text-base font-semibold">
              {t('trade.buyoutTrading.title')}
            </h1>
            <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              {t('trade.buyoutTrading.active')}
            </span>
            <span className="text-muted-foreground text-xs">
              {t('trade.buyoutTrading.buyer', {
                number: summary.buyerGuestNumber ?? '--',
              })}
            </span>
          </div>
          <p
            className={cn(
              'mt-1 text-sm leading-5',
              buyerLocked ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground',
            )}
          >
            {buyerLocked
              ? t('trade.buyoutTrading.buyerLocked')
              : t('trade.buyoutTrading.minorityCanTrade')}
          </p>
          <p className="text-muted-foreground mt-1 text-xs leading-4">
            {t('trade.buyoutTrading.recordDateRule')}
          </p>
        </div>

        <div
          className={cn(
            'border-border divide-border grid min-w-0 divide-x border-y',
            compact ? 'grid-cols-2' : 'grid-cols-5',
          )}
        >
          {metrics.map((metric) => (
            <div key={metric.label} className="min-w-0 px-3 py-2 first:pl-0">
              <p className="text-muted-foreground truncate text-[11px]">{metric.label}</p>
              <p className="text-foreground mt-0.5 truncate text-sm font-semibold tabular-nums">
                {metric.value}
              </p>
              {metric.hint ? (
                <p className="text-muted-foreground truncate text-[10px]">{metric.hint}</p>
              ) : null}
            </div>
          ))}
        </div>

        <div className={cn('shrink-0', compact && 'flex items-center gap-3')}>
          <div className={cn('mb-2', compact ? 'min-w-0 flex-1' : 'w-36')}>
            <div className="bg-muted h-1.5 overflow-hidden rounded">
              <div className="bg-primary-500 h-full" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <Button
            type="button"
            variant="white-contained"
            className="border-border h-9 rounded border px-3 text-xs shadow-none"
            onClick={() => router.push(`/asset-management/${asset.id}/governance`)}
          >
            {t('trade.buyoutTrading.viewProgram')}
          </Button>
        </div>
      </div>
    </section>
  );
}
