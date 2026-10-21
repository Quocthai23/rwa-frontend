'use client';

import { notifyIfDemoAccount } from '@/store/demoNoticeStore';

import type { Account } from '@/types/account';
import { formatBalance } from '@/utils/currency';
import { PlusSquare } from '@untitledui/icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DepositFlowSheet from '@/components/featured/deposit/web/DepositFlowSheet';

export default function AssetOverview({ activeAccount }: { activeAccount: Account }) {
  const { t } = useTranslation();
  const [isDepositSheetOpen, setIsDepositSheetOpen] = useState(false);

  const balance = Number(activeAccount?.balance || '0');
  const availableBalance = Number(activeAccount?.availableBalance || '0');
  const reservedBalance = Math.max(0, balance - availableBalance);

  return (
    <section className="border-border w-full border-b pb-4">
      <DepositFlowSheet isOpen={isDepositSheetOpen} onOpenChange={setIsDepositSheetOpen} />

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-h3-semibold text-foreground">
            {t('account.assetOverview') || 'Property ownership portfolio'}
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {t('account.assetOverviewDescription', {
              defaultValue: 'Track your tokenized property ownership and investment funds.',
            })}
          </p>
        </div>
        <button
          onClick={() => {
            if (notifyIfDemoAccount()) return;
            setIsDepositSheetOpen(true);
          }}
          className="border-border text-foreground hover:bg-muted flex items-center gap-2 rounded border px-3 py-2 text-sm font-medium transition-colors"
        >
          <PlusSquare size={17} />
          {t('account.addInvestmentFunds', { defaultValue: 'Add funds' })}
        </button>
      </div>
      <div className="border-border divide-border grid border-y md:grid-cols-3 md:divide-x">
        {[
          {
            label: t('account.totalCashBalance', { defaultValue: 'Total cash balance' }),
            value: balance,
          },
          {
            label: t('account.availableInvestmentFunds', {
              defaultValue: 'Available investment funds',
            }),
            value: availableBalance,
          },
          {
            label: t('account.reservedForOrders', {
              defaultValue: 'Reserved for pending purchases',
            }),
            value: reservedBalance,
          },
        ].map(({ label, value }) => (
          <div key={label} className="px-4 py-3 first:pl-0 last:pr-0">
            <div className="text-muted-foreground mb-1 text-xs">{label}</div>
            <p className="text-foreground text-lg font-semibold tabular-nums">
              {formatBalance(value)} <span className="text-muted-foreground text-xs">VND</span>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
