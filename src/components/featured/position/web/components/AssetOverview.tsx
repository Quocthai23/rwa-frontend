'use client';

import { ACCOUNT_TYPES_ID } from '@/constants/account';
import { useTheme } from '@/theme/ThemeProvider';
import type { Account } from '@/types/account';
import { formatBalance } from '@/utils/currency';
import { PlusSquare } from '@untitledui/icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DepositFlowSheet from '@/components/featured/deposit/web/DepositFlowSheet';
import TopUpFlowSheet from '@/components/featured/top-up/web/TopUpFlowSheet';

export default function AssetOverview({
  activeAccount,
}: {
  activeAccount: Account;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [isDepositSheetOpen, setIsDepositSheetOpen] = useState(false);
  const [isTopUpSheetOpen, setIsTopUpSheetOpen] = useState(false);

  const balance = Number(activeAccount?.balance || '0');
  const availableBalance = Number(activeAccount?.availableBalance || '0');

  return (
    <div className="border-border w-full rounded-sm border p-4">
      <DepositFlowSheet isOpen={isDepositSheetOpen} onOpenChange={setIsDepositSheetOpen} />
      <TopUpFlowSheet isOpen={isTopUpSheetOpen} onOpenChange={setIsTopUpSheetOpen} />

      <h2 className="text-h3-semibold text-foreground mb-2">
        {t('account.assetOverview') || 'Asset Overview'}
      </h2>

      <div className="flex flex-row justify-between">
        <div className="mb-3 flex flex-row items-center gap-2">
          <span className="text-body-large-medium">{t('account.balance') || 'Total Balance'}</span>
          <button
            onClick={() => {
              if (activeAccount?.accountTypeId === ACCOUNT_TYPES_ID.DEMO) {
                setIsTopUpSheetOpen(true);
              } else {
                setIsDepositSheetOpen(true);
              }
            }}
            className="transition-opacity hover:opacity-80"
          >
            <PlusSquare color={colors.primary500} size={24} strokeWidth={2.5} />
          </button>
        </div>
        <p className="text-h2-semibold text-foreground tabular-nums">
          {formatBalance(balance)}
        </p>
      </div>

      <div className="border-border mb-4 border-b" />

      <div className="grid grid-cols-2 gap-10">
        <div className="flex flex-col gap-2">
          <div className="flex flex-row items-center justify-between">
            <p className="text-body-small-regular text-muted-foreground">
              {t('account.available') || 'Available Balance'}
            </p>
            <p className="text-body-large-medium text-foreground tabular-nums">
              {formatBalance(availableBalance)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
