'use client';

import { ArrowLeft, InfoCircle } from '@untitledui/icons';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/shared/atoms/button';
import { Input } from '@/components/shared/atoms/input';

type WithdrawDetailFormProps = {
  address: string;
  amount: string;
  availableBalance: number;
  addressError: string;
  amountReceived: string;
  networkFee: number;
  onBack: () => void;
  onAddressChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onPasteAddress: () => Promise<void>;
  onSelectMax: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
};

export default function WithdrawDetailForm({
  address,
  amount,
  availableBalance,
  addressError,
  amountReceived,
  networkFee,
  onBack,
  onAddressChange,
  onAmountChange,
  onPasteAddress,
  onSelectMax,
  onSubmit,
  canSubmit,
}: WithdrawDetailFormProps) {
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
          <h3 className="text-h3-semibold text-foreground">{t('features.withdraw')}</h3>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="mb-3 flex items-center gap-1">
          <span className="text-body-large-semibold text-foreground">
            {t('withdraw.detail.walletUsdtAddress')}
          </span>
          <InfoCircle size={14} className="text-muted-foreground" />
        </div>

        <div className="mb-5">
          <Input
            placeholder={t('withdraw.detail.enterWalletAddress')}
            type="text"
            aria-invalid={Boolean(addressError)}
            rightAccessory={
              <Button
                type="button"
                variant="neutral-ghost"
                className="bg-muted flex h-9 items-center justify-center px-3"
                onClick={onPasteAddress}
              >
                <span className="text-button-small-medium">{t('withdraw.detail.paste')}</span>
              </Button>
            }
            className="border-border h-12"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
          />
          {addressError ? (
            <p className="text-body-small-regular mt-2 text-red-500">{addressError}</p>
          ) : null}
        </div>

        <div className="mb-3 flex items-center">
          <span className="text-body-large-semibold text-foreground">
            {t('withdraw.confirm.withdrawalAmount')}
          </span>
        </div>

        <div className="mb-4">
          <Input
            placeholder="0"
            type="text"
            inputMode="decimal"
            step="0.01"
            className="border-border h-12"
            rightAccessory={
              <div className="flex items-center">
                <span className="text-body-large-regular text-foreground">
                  {t('withdraw.common.usd')}
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
