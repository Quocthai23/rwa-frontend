'use client';

import { InfoCircle } from '@untitledui/icons';
import { useTheme } from '@/theme';
import { Button } from '@/components/shared/atoms/button';
import { formatPriceDecimal } from '@/utils/currency';
import { truncateAddress } from '@/utils/truncateAddress';
import { useTranslation } from 'react-i18next';

export type WithdrawData = {
  accountId: string;
  address: string;
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
    <div className="bg-card flex flex-col">
      {/* Header */}
      <div className="border-b px-3 py-2 text-center" style={{ borderColor: colors.neutral200 }}>
        <h2 className="text-h3-semibold" style={{ color: colors.neutral900 }}>
          {t('withdraw.confirm.title')}
        </h2>
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        {/* Info Banner */}
        <div className="bg-muted mb-5 flex items-center gap-2 rounded px-2 py-3">
          <InfoCircle color={colors.neutral700} size={16} />
          <p className="text-body-small-regular flex-1" style={{ color: colors.neutral900 }}>
            {t('withdraw.confirm.description')}
          </p>
        </div>

        {/* Details */}
        <div className="mb-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-body-small-regular" style={{ color: colors.neutral500 }}>
              {t('withdraw.confirm.walletAddress')}
            </span>
            <span className="font-medium" style={{ color: colors.neutral900 }}>
              {truncateAddress(withdrawData.address)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-body-small-regular" style={{ color: colors.neutral500 }}>
              {t('withdraw.confirm.network')}
            </span>
            <span className="font-medium" style={{ color: colors.neutral900 }}>
              {/* {CHAINS_NAME?.[network ?? 'Binance Smart Chain']} (
              {TOKEN_NAME?.[network ?? 'Binance Smart Chain']}) */}
              {t('withdraw.confirm.usdtEthereum')}
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
            <span className="" style={{ color: colors.neutral500 }}>
              {t('withdraw.common.amountReceived')}
            </span>
            <span className="font-medium" style={{ color: colors.neutral900 }}>
              {t('withdraw.common.amountWithUsdt', { amount: formatPriceDecimal(amountReceived) })}
            </span>
          </div>
        </div>

        {/* Button */}
        <Button
          disabled={isPending}
          className="mb-1 w-full px-3 py-2"
          content={isPending ? t('withdraw.common.processing') : t('withdraw.common.confirm')}
          style={{ borderRadius: 4 }}
          onClick={onConfirm}
        />
      </div>
    </div>
  );
};

export default WithdrawConfirm;
