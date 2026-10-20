'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Lock01 } from '@untitledui/icons';
import type { Asset } from '@/types/assets';

export function BuyoutBuyerPanel({
  assetId,
  summary,
}: {
  assetId: string;
  summary?: Asset['buyoutSummary'];
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage?.startsWith('vi') ? 'vi-VN' : 'en-US';
  const number = (value: string | number | null | undefined) => {
    if (value == null || value === '' || !Number.isFinite(Number(value))) return '--';
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(Number(value));
  };
  const money = (value: string | number | null | undefined) => {
    if (value == null || value === '' || !Number.isFinite(Number(value))) return '--';
    return (
      new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Number(value)) + ' VND'
    );
  };
  const recordAt = summary?.nextInstallment?.recordAt ?? summary?.nextRecordAt;
  const recordDate = recordAt ? new Date(recordAt) : null;
  const dateLabel =
    recordDate && Number.isFinite(recordDate.getTime())
      ? new Intl.DateTimeFormat(locale, {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).format(recordDate)
      : '--';
  const hasPaidAmounts = summary?.principalPaidVnd != null && summary?.premiumPaidVnd != null;
  const paid = hasPaidAmounts
    ? Number(summary.principalPaidVnd) + Number(summary.premiumPaidVnd)
    : null;
  const details = [
    {
      label: t('trade.buyoutTrading.lockedPrice'),
      value: money(summary?.principalUnitPrice ?? summary?.redemptionUnitPrice),
    },
    {
      label: t('trade.buyoutTrading.totalPremium'),
      value: summary?.premiumPercent == null ? '--' : number(summary.premiumPercent) + '%',
    },
    {
      label: t('trade.buyoutTrading.monthlyWaitingRate'),
      value:
        summary?.monthlyWaitingRatePercent == null
          ? '--'
          : number(summary.monthlyWaitingRatePercent) + '%',
    },
    {
      label: t('trade.buyoutTrading.remainingTokens'),
      value: number(summary?.remainingMinorityTokens),
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto scrollbar-neutral-slim pb-1">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-foreground text-sm font-semibold">
          {t('trade.buyoutTrading.paymentOverview')}
        </h2>
        <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
          <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
          {t('trade.buyoutTrading.active')}
        </span>
      </div>

      <section className="border-primary-500/20 bg-primary-500/5 rounded-xl border p-4">
        <p className="text-muted-foreground text-xs">{t('trade.buyoutTrading.nextPayment')}</p>
        <p className="text-foreground mt-2 text-xl font-semibold tracking-tight break-words tabular-nums">
          {money(summary?.nextInstallment?.paymentAmount)}
        </p>
        {summary?.nextInstallment?.status === 'PROJECTED' && <p className="text-muted-foreground mt-1 text-xs leading-5">{t('trade.buyoutTrading.paymentEstimate', { defaultValue: 'Estimated until the next ownership snapshot.' })}</p>}
        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">{t('trade.buyoutTrading.recordDate')}</span>
          <span className="text-foreground font-medium tabular-nums">{dateLabel}</span>
        </div>
        {summary?.nextInstallment && (
          <dl className="border-primary-500/15 mt-3 space-y-2 border-t pt-3 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t('trade.buyoutTrading.principalPart')}</dt>
              <dd className="text-foreground text-right tabular-nums">
                {money(summary.nextInstallment.principalAmount)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t('trade.buyoutTrading.premiumPart')}</dt>
              <dd className="text-foreground text-right tabular-nums">
                {money(summary.nextInstallment.waitingPremiumAmount)}
              </dd>
            </div>
          </dl>
        )}
      </section>

      <div className="border-border rounded-xl border p-4">
        <p className="text-muted-foreground text-xs">{t('trade.buyoutTrading.paidToDate')}</p>
        <p className="mt-1.5 text-lg font-semibold break-words text-emerald-600 tabular-nums dark:text-emerald-400">
          {money(paid)}
        </p>
      </div>

      <dl className="divide-border divide-y text-xs">
        {details.map((detail) => (
          <div
            key={detail.label}
            className="flex items-start justify-between gap-4 py-3 first:pt-0"
          >
            <dt className="text-muted-foreground min-w-0 flex-1 leading-5">{detail.label}</dt>
            <dd className="text-foreground max-w-[55%] text-right leading-5 font-medium tabular-nums">
              {detail.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="border-border bg-muted/30 flex items-start gap-2.5 rounded-lg border p-3">
        <Lock01 className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-foreground text-xs font-medium">{t('trade.buyoutTrading.viewOnly')}</p>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            {t('trade.buyoutTrading.buyerLockedShort')}
          </p>
        </div>
      </div>

      <Link
        href={'/asset-management/' + assetId + '/governance'}
        className="bg-primary-500 hover:bg-primary-600 focus-visible:ring-primary-500 mt-auto flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-white focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        {t('trade.buyoutTrading.manageProgram')}
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
