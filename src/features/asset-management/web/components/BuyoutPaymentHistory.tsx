'use client';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from '@untitledui/icons';
import { formatVnd, getIntlLocale } from '@/i18n/formatting';

import type { BuyoutPaymentPeriod } from '@/types/dao';

export function BuyoutPaymentHistory({ periods = [] }: { periods?: BuyoutPaymentPeriod[] }) {
  const { t, i18n } = useTranslation();
  const locale = getIntlLocale(i18n.resolvedLanguage ?? i18n.language);
  const pending = periods.filter((period) =>
    period.claims?.some((claim) => claim.status === 'CLAIMABLE'),
  );
  const claimed = periods.filter(
    (period) =>
      period.claims?.length > 0 && period.claims.every((claim) => claim.status === 'CLAIMED'),
  );
  const rows = (items: BuyoutPaymentPeriod[]) => (
    <div className="scrollbar-neutral-slim max-h-72 overflow-y-auto">
      <ul className="divide-border divide-y">
        {items.map((period) => (
          <li
            key={period.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
          >
            <div>
              <p>{t('assetManagement.buyout.periodNumber', { count: period.installmentNumber })}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {new Date(period.recordAt).toLocaleDateString(locale)}
              </p>
            </div>
            <span className="font-medium tabular-nums">
              {formatVnd(
                period.claims.reduce((sum, claim) => sum + Number(claim.amount), 0),
                locale,
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <div className="space-y-3">
      {pending.length > 0 && (
        <details className="group border-border rounded-lg border">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm [&::-webkit-details-marker]:hidden">
            <ChevronDown size={16} className="group-open:hidden" />
            <ChevronUp size={16} className="hidden group-open:block" />
            {t('assetManagement.buyout.pendingPeriods', { count: pending.length })}
          </summary>
          {rows(pending)}
        </details>
      )}
      {claimed.length > 0 && (
        <details className="group border-border rounded-lg border">
          <summary className="text-muted-foreground flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm [&::-webkit-details-marker]:hidden">
            <ChevronDown size={16} className="group-open:hidden" />
            <ChevronUp size={16} className="hidden group-open:block" />
            {t('assetManagement.buyout.claimedHistory', { count: claimed.length })}
          </summary>
          {rows(claimed)}
        </details>
      )}
    </div>
  );
}
