'use client';

import { ACCOUNT_TYPES_ID } from '@/constants/account';
import { useTheme } from '@/theme/ThemeProvider';
import type { PositionsResponse } from '@/types';
import type { Account } from '@/types/account';
import { formatBalance } from '@/utils/currency';
import { InfiniteData } from '@tanstack/react-query';
import { PlusSquare } from '@untitledui/icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getEnrichedPositionsFromInfiniteData } from '../../utils/position.calculations';
import { useGetData } from '@/context/GetdataContext';
import DepositFlowSheet from '@/components/featured/deposit/web/DepositFlowSheet';
import TopUpFlowSheet from '@/components/featured/top-up/web/TopUpFlowSheet';
import { useAccountSummaryMetrics } from '@/hook/useAccountSummaryMetrics';

export default function AssetOverview({
  position,
  activeAccount,
}: {
  position: InfiniteData<PositionsResponse, unknown> | undefined;
  activeAccount: Account;
}) {
  const { t } = useTranslation();
  const { assets } = useGetData();
  const { colors } = useTheme();
  const [isDepositSheetOpen, setIsDepositSheetOpen] = useState(false);
  const [isTopUpSheetOpen, setIsTopUpSheetOpen] = useState(false);

  const allPositions = useMemo(() => {
    return getEnrichedPositionsFromInfiniteData(position, assets);
  }, [position, assets]);

  const { availableBalance, balance, currentUnrealizedPnl, equity, marginLevel, marginPositions } =
    useAccountSummaryMetrics();

  return (
    <div className="border-border w-full rounded-sm border p-4">
      <DepositFlowSheet isOpen={isDepositSheetOpen} onOpenChange={setIsDepositSheetOpen} />
      <TopUpFlowSheet isOpen={isTopUpSheetOpen} onOpenChange={setIsTopUpSheetOpen} />

      <h2 className="text-h3-semibold text-foreground mb-2">
        {t('account.assetOverview') || 'Asset Overview'}
      </h2>

      <div className="flex flex-row justify-between">
        <div className="mb-3 flex flex-row items-center gap-2">
          <span className="text-body-large-medium">{t('account.equity')}</span>
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
          {formatBalance(equity.toNumber())}
        </p>
      </div>

      <div className="border-border mb-4 border-b" />

      <div className="grid grid-cols-2 gap-10">
        <div className="flex flex-col gap-2">
          <div className="flex flex-row items-center justify-between">
            <p className="text-body-small-regular text-muted-foreground">
              {t('account.balance') || 'Balance'}
            </p>
            <p className="text-body-large-medium text-foreground tabular-nums">
              {formatBalance(balance.toNumber())}
            </p>
          </div>

          <div className="flex flex-row items-center justify-between">
            <p className="text-body-small-regular text-muted-foreground">
              {t('account.available') || 'Available'}
            </p>
            <p className="text-body-large-medium text-foreground tabular-nums">
              {formatBalance(availableBalance.toNumber())}
            </p>
          </div>
          <div className="flex flex-row items-center justify-between">
            <p className="text-body-small-regular text-muted-foreground">
              {t('account.margin') || 'Margin'}
            </p>
            <p className="text-body-large-medium text-foreground tabular-nums">
              {formatBalance(marginPositions.toNumber())}
            </p>
          </div>
        </div>

        <div className="border-border flex flex-col gap-2 border-l pl-10">
          <div className="flex flex-row items-center justify-between">
            <p className="text-body-small-regular text-muted-foreground">
              {t('account.profitLoss') || 'Profit / Loss'}
            </p>
            <p
              className={`text-body-large-medium tabular-nums ${
                currentUnrealizedPnl.toNumber() >= 0 ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {formatBalance(currentUnrealizedPnl.toNumber())}
            </p>
          </div>
          <div className="flex flex-row items-center justify-between">
            <p className="text-body-small-regular text-muted-foreground">
              {t('account.marginLevel') || 'Margin Level'}
            </p>
            <p
              className={`text-body-large-medium tabular-nums ${
                allPositions.length === 0
                  ? 'text-foreground'
                  : marginLevel.toNumber() > 100
                    ? 'text-green-500'
                    : 'text-red-500'
              }`}
            >
              {marginLevel.toNumber() > 0 ? formatBalance(marginLevel.toNumber()) + '%' : '--'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
