'use client';

import { InfoCircle } from '@untitledui/icons';

import { Button } from '@/components/shared/atoms/button';
import { useTheme } from '@/theme';
import { formatPriceDecimal } from '@/utils/currency';
import { useTranslation } from 'react-i18next';

export type TransferConfirmData = {
  amount: string;
  fromAccountName?: string;
  recipientEmail: string;
  reason: string;
};

interface TransferConfirmProps {
  data: TransferConfirmData;
  isPending: boolean;
  onConfirm: () => void;
}

export default function TransferConfirm({ data, isPending, onConfirm }: TransferConfirmProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const amountValue = Number.parseFloat(data.amount || '0');
  const formattedAmount = Number.isFinite(amountValue)
    ? formatPriceDecimal(amountValue)
    : data.amount;

  return (
    <div className="flex flex-col">
      <div className="text-foreground border-b px-4 py-4">
        <h2 className="text-foreground text-[18px] font-semibold">{t('transfer.confirm.title')}</h2>
      </div>

      <div className="px-4 py-6">
        <div className="mb-5 flex items-center gap-2 rounded px-2 py-3">
          <InfoCircle className="text-foreground" size={16} />
          <p className="text-body-small-regular text-foreground flex-1">
            {t('transfer.confirm.description')}
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-body-small-regular text-foreground">
              {t('transfer.confirm.fromAccount')}
            </span>
            <span className="text-foreground font-medium">
              {data.fromAccountName || t('transfer.confirm.emptyValue')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-body-small-regular text-foreground">
              {t('transfer.confirm.recipientEmail')}
            </span>
            <span className="text-foreground font-medium">{data.recipientEmail}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-body-small-regular text-foreground">
              {t('transfer.confirm.reason')}
            </span>
            <span className="text-foreground font-medium">{data.reason}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-body-small-regular text-foreground">
              {t('transfer.confirm.transferAmount')}
            </span>
            <span className="text-foreground font-medium">
              {t('transfer.confirm.amountWithCurrency', { amount: formattedAmount })}
            </span>
          </div>
        </div>

        <Button
          disabled={isPending}
          className="w-full px-3 py-2"
          content={
            isPending ? t('transfer.confirm.processing') : t('transfer.confirm.confirmButton')
          }
          style={{ borderRadius: 4 }}
          onClick={onConfirm}
        />
      </div>
    </div>
  );
}
