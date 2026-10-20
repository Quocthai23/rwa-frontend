'use client';

import { InfoCircle } from '@untitledui/icons';
import { useTheme } from '@/theme';
import { Button } from '@/components/shared/atoms/button';
import { formatPriceDecimal } from '@/utils/currency';
import { truncateAddress } from '@/utils/truncateAddress';
import { useTranslation } from 'react-i18next';

export type WithdrawData = {
  accountId: string;
  address?: string;
  amount: string;
  chainId: string;
};

interface Props {
  withdrawData: WithdrawData;
  isPending: boolean;
  onConfirm: () => void;
}

const WithdrawConfirm: React.FC<Props> = ({ withdrawData, isPending, onConfirm }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const amountReceived = Math.max(0, parseFloat(withdrawData.amount) - 0.1);
  return (
    <div className="flex h-full flex-col">
      <div className="border-border border-b px-6 py-5">
        <h2 className="text-h3-semibold" style={{ color: colors.neutral900 }}>
          {t('withdraw.confirm.title')}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="bg-muted mb-5 flex items-center gap-2 rounded-lg px-3 py-3">
          <InfoCircle color={colors.neutral700} size={16} />
          <p className="text-body-small-regular flex-1" style={{ color: colors.neutral900 }}>
            {t('withdraw.confirm.description')}
          </p>
        </div>

        <div className="border-border mb-6 flex flex-col gap-3 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <span className="text-body-small-regular" style={{ color: colors.neutral500 }}>
              {t('withdraw.confirm.network')}
            </span>
            <span className="font-medium" style={{ color: colors.neutral900 }}>
              {/* {CHAINS_NAME?.[network ?? 'Binance Smart Chain']} (
              {TOKEN_NAME?.[network ?? 'Binance Smart Chain']}) */}
              {t('withdraw.confirm.VNDEthereum')}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-body-small-regular" style={{ color: colors.neutral500 }}>
              {t('withdraw.confirm.withdrawalAmount')}
            </span>
            <span className="font-medium" style={{ color: colors.neutral900 }}>
              {t('withdraw.common.amountWithUsd', { amount: withdrawData.amount })}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-body-small-regular" style={{ color: colors.neutral500 }}>
              {t('withdraw.common.networkFee')}
            </span>
            <span className="font-medium" style={{ color: colors.neutral900 }}>
              {t('withdraw.confirm.networkFeeValue')}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span style={{ color: colors.neutral500 }}>{t('withdraw.common.amountReceived')}</span>
            <span className="font-medium" style={{ color: colors.neutral900 }}>
              {t('withdraw.common.amountWithVND', { amount: formatPriceDecimal(amountReceived) })}
            </span>
          </div>
        </div>
      </div>

      <div className="border-border border-t px-6 py-4">
        <Button
          disabled={isPending}
          className="w-full px-3 py-2"
          content={isPending ? t('withdraw.common.processing') : t('withdraw.common.confirm')}
          style={{ borderRadius: 8 }}
          onClick={onConfirm}
        />
      </div>
    </div>
  );
};

export default WithdrawConfirm;

