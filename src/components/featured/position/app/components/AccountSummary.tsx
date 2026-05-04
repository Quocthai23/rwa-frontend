'use client';

import DepositFlowSheet from '@/components/featured/deposit/DepositFlowSheet';
import { ACCOUNT_TYPES_ID } from '@/constants/account';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import { useTheme } from '@/theme/ThemeProvider';
import type { Position, PositionsResponse } from '@/types';
import type { Account } from '@/types/account';
import { formatBalance } from '@/utils/currency';
import { InfiniteData } from '@tanstack/react-query';
import { PlusSquare } from '@untitledui/icons';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getEnrichedPositionsFromInfiniteData } from '../../utils/position.calculations';
import { useGetData } from '@/context/GetdataContext';
import { useAccountSummaryMetrics } from '@/hook/useAccountSummaryMetrics';
export default function AccountSummary({
  position,
  activeAccount,
}: {
  position: InfiniteData<PositionsResponse, unknown> | undefined;
  activeAccount: Account;
}) {
  const { t } = useTranslation();
  const { assets } = useGetData();

  const allPositions = useMemo(() => {
    return getEnrichedPositionsFromInfiniteData(position, assets);
  }, [position, assets]);
  const router = useRouter();
  const { colors } = useTheme();
  const [isDepositSheetOpen, setIsDepositSheetOpen] = useState(false);
  const { availableBalance, balance, equity, marginLevel, marginPositions } =
    useAccountSummaryMetrics();

  return (
    <div className="mb-3 px-4">
      <DepositFlowSheet isOpen={isDepositSheetOpen} onOpenChange={setIsDepositSheetOpen} />
      <div className="bg-card rounded p-4">
        <div className="flex flex-row items-center justify-between">
          <div className="flex flex-row items-center gap-1">
            <p className="text-body-large-medium text-foreground">{t('account.equity')}</p>
            <button
              onClick={() => {
                if (activeAccount?.accountTypeId === ACCOUNT_TYPES_ID.DEMO) {
                  router.push('/top-up');
                } else {
                  setIsDepositSheetOpen(true);
                }
              }}
            >
              <PlusSquare color={colors.primary500} size={18} strokeWidth={2.5} />
            </button>
          </div>
          <p className="text-h3-semibold text-foreground tabular-nums">
            {formatBalance(equity.toNumber())}
          </p>
        </div>

        <div className="my-3 border-t border-neutral-200" />

        <div className="flex flex-col gap-2">
          <div className="flex flex-row items-center justify-between">
            <p className="text-body-small-regular text-muted-foreground">{t('account.balance')}</p>
            <p className="text-body-small-medium text-foreground tabular-nums">
              {formatBalance(balance.toNumber())}
            </p>
          </div>

          {/* Available Row */}
          <div className="flex flex-row items-center justify-between">
            <p className="text-body-small-regular text-muted-foreground">
              {t('account.available')}
            </p>
            <p className="text-body-small-medium text-foreground tabular-nums">
              {formatBalance(availableBalance.toNumber())}
            </p>
          </div>

          {/* Margin Row */}
          <div className="flex flex-row items-center justify-between">
            <p className="text-body-small-regular text-muted-foreground">{t('account.margin')}</p>
            <p className="text-body-small-medium text-foreground tabular-nums">
              {' '}
              {formatBalance(marginPositions.toNumber())}
            </p>
          </div>
          {/* Margin Level Row */}
          <div className="flex flex-row items-center justify-between">
            <p className="text-body-small-regular text-muted-foreground">
              {t('account.marginLevel')}
            </p>
            <p
              className={`text-body-small-medium tabular-nums ${allPositions.length === 0 ? 'text-foreground' : marginLevel.toNumber() > 0 ? 'text-green-500' : 'text-red-500'}`}
            >
              {marginLevel.toNumber() > 0 ? formatBalance(marginLevel.toNumber()) + '%' : '--'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
