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
  if (value == null || value === '') return null;
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
  const remainingTokens = toFiniteNumber(summary.remainingMinorityTokens);
  const paidToDate =
    (toFiniteNumber(summary.principalPaidVnd) ?? 0) + (toFiniteNumber(summary.premiumPaidVnd) ?? 0);
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
    {
      label: t('trade.buyoutTrading.remainingTokens'),
      value: remainingTokens == null ? '--' : formatVnd(remainingTokens),
    },
    {
      label: t('trade.buyoutTrading.paidToDate'),
      value: `${formatVnd(paidToDate)} VND`,
    },
  ];

  if (!compact) {
    return (
      <section className="border-border bg-background shrink-0 border-b px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <span
              className="bg-primary-500/10 text-primary-500 flex size-7 items-center justify-center rounded-lg"
              aria-hidden="true"
            >
              <span className="bg-primary-500 size-2 rounded-full" />
            </span>
            <h1 className="text-foreground text-sm font-semibold">
              {t(buyerLocked ? 'trade.buyoutTrading.buyerTitle' : 'trade.buyoutTrading.title')}
            </h1>
            <span className="border-primary-500/20 bg-primary-500/10 text-primary-500 rounded-full border px-2 py-0.5 text-[11px] font-medium">
              {t(buyerLocked ? 'trade.buyoutTrading.buyerRole' : 'trade.buyoutTrading.active')}
            </span>
            <span className="text-muted-foreground text-xs">{asset.symbol}</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">
              {t('trade.buyoutTrading.progressValue', {
                completed: completedMonths,
                total: totalMonths,
              })}
            </span>
            <div
              className="bg-muted h-1.5 w-24 overflow-hidden rounded-full"
              role="progressbar"
              aria-label={t('trade.buyoutTrading.progress')}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
            >
              <div
                className="bg-primary-500 h-full rounded-full"
                style={{ width: progress + '%' }}
              />
            </div>
          </div>
        </div>
        <Button variant="neutral-outline" className="mt-2 h-8 text-xs" onClick={() => router.push(`/asset-management/${asset.id}/governance`)}>{t('trade.buyoutTrading.viewProgram')}</Button>
        <p className="text-muted-foreground mt-1.5 text-xs leading-5">
          {t(buyerLocked ? 'trade.buyoutTrading.buyerMonitoring' : 'trade.buyoutTrading.minorityCanTrade')}
        </p>
      </section>
    );
  }

  return (
    <section className="border-border bg-background shrink-0 border-b">
      <div className="mx-auto w-full px-4 py-3 lg:px-5">
        <div className={cn('flex gap-4', compact ? 'flex-col' : 'items-start justify-between')}>
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
                'mt-1 max-w-4xl text-sm leading-5',
                buyerLocked ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground',
              )}
            >
              {buyerLocked
                ? t('trade.buyoutTrading.buyerLocked')
                : t('trade.buyoutTrading.minorityCanTrade')}
            </p>
          </div>
          <Button
            type="button"
            variant="white-contained"
            className="border-border h-9 shrink-0 rounded border px-3 text-xs shadow-none"
            onClick={() => router.push(`/asset-management/${asset.id}/governance`)}
          >
            {t('trade.buyoutTrading.viewProgram')}
          </Button>
        </div>

        <div
          className={cn(
            'border-border divide-border mt-3 grid min-w-0 border-y',
            compact ? 'grid-cols-2 divide-x' : 'grid-cols-4 divide-x 2xl:grid-cols-7',
          )}
        >
          {metrics.map((metric) => (
            <div key={metric.label} className="min-w-0 px-3 py-2.5 first:pl-0">
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

        <div className="mt-3 flex items-center gap-3">
          <div className="min-w-24 flex-1">
            <div className="bg-muted h-1.5 overflow-hidden rounded">
              <div className="bg-primary-500 h-full" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <p className="text-muted-foreground max-w-3xl text-right text-xs leading-4">
            {t('trade.buyoutTrading.recordDateRule')}
          </p>
        </div>
      </div>
    </section>
  );
}
