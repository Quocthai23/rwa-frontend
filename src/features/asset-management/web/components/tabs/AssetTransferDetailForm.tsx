'use client';

import { ArrowLeft } from '@untitledui/icons';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/shared/atoms/button';
import { Input } from '@/components/shared/atoms/input';

type AssetTransferDetailFormProps = {
  title: string;
  amount: string;
  availableBalance: number;
  amountReceived: string;
  networkFee: number;
  onBack: () => void;
  onAmountChange: (value: string) => void;
  onSelectMax: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
};

export default function AssetTransferDetailForm({
  title,
  amount,
  availableBalance,
  amountReceived,
  networkFee,
  onBack,
  onAmountChange,
  onSelectMax,
  onSubmit,
  canSubmit,
}: AssetTransferDetailFormProps) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col">
      <div className="border-border border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground rounded p-1 transition"
            aria-label={t('common.back', 'Back')}
          >
            <ArrowLeft size={18} />
          </button>
          <h3 className="text-h3-semibold text-foreground">{title}</h3>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="mb-3 flex items-center">
          <span className="text-body-large-semibold text-foreground">
            {t('withdraw.confirm.withdrawalAmount', 'Amount')}
          </span>
        </div>

        <div className="mb-4">
          <Input
            placeholder="0.00"
            type="text"
            inputMode="decimal"
            step="0.01"
            className="border-border h-12"
            rightAccessory={
              <div className="flex items-center">
                <span className="text-body-large-regular text-foreground">
                  VNĐ
                </span>
                <div className="bg-border mx-3 h-6 w-px" />
                <button type="button" onClick={onSelectMax}>
                  <span className="text-primary-500 text-body-large-semibold mr-1">
                    {t('withdraw.detail.max')}
                  </span>
                </button>
              </div>
            }
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
          />
        </div>

        <div className="bg-muted/40 border-border mb-5 rounded-lg border p-3">
          <p className="text-body-small-regular text-muted-foreground">
            {t('withdraw.detail.availableBalance')}{' '}
            <span className="text-body-small-semibold text-foreground">
              {t('withdraw.common.amountWithUsd', { amount: availableBalance })}
            </span>
          </p>
        </div>

        <div className="border-border bg-background rounded-lg border p-3">
          <div className="mb-2 flex justify-between">
            <span className="text-body-small-regular text-muted-foreground">
              {t('withdraw.common.networkFee')}
            </span>
            <span className="text-body-small-semibold text-foreground">
              {t('withdraw.common.amountWithUsd', { amount: networkFee })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-body-small-regular text-muted-foreground">
              {t('withdraw.common.amountReceived')}
            </span>
            <span className="text-body-small-semibold text-foreground">
              {t('withdraw.common.amountWithUsd', { amount: amountReceived })}
            </span>
          </div>
        </div>
      </div>

      <div className="border-border border-t px-6 py-4">
        <Button type="button" disabled={!canSubmit} className="h-11 w-full" onClick={onSubmit}>
          {t('withdraw.detail.submit')}
        </Button>
      </div>
    </div>
  );
}
