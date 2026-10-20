'use client';

import { useState } from 'react';
import { ChevronLeft } from '@untitledui/icons';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/shared/atoms/button';
import { Input } from '@/components/shared/atoms/input';
import { useToast } from '@/hook/useToast';

type DepositAmountInputProps = {
  onClose: () => void;
  onSubmit: (amount: number) => void;
  isPending: boolean;
};

export default function DepositAmountInput({
  onClose,
  onSubmit,
  isPending,
}: DepositAmountInputProps) {
  const { t } = useTranslation();
  const { showError } = useToast();
  const [amount, setAmount] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsedAmount = Number(amount.replace(/,/g, ''));
    if (!parsedAmount || parsedAmount < 10_000) {
      showError(t('common.error'), t('topUp.minimumAmountError'));
      return;
    }
    onSubmit(parsedAmount);
  };

  return (
    <div className="bg-background flex h-full flex-col">
      <div className="border-border relative flex h-14 w-full items-center justify-center border-b px-4">
        <button type="button" onClick={onClose} aria-label={t('common.close')} className="absolute left-4">
          <ChevronLeft className="text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <Image src="/assets/images/bank.svg" alt="" width={26} height={26} />
          <p className="text-h3-semibold text-foreground">{t('topUp.vndDepositTitle')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-6 p-5">
        <div className="flex flex-col gap-2">
          <label className="text-body-small-semibold text-foreground">{t('topUp.amountLabel')}</label>
          <Input
            inputMode="numeric"
            placeholder={t('topUp.amountPlaceholder')}
            value={amount}
            onChange={(event) => {
              const numbers = event.target.value.replace(/\D/g, '');
              setAmount(numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ','));
            }}
            disabled={isPending}
            className="h-12 text-lg tabular-nums"
          />
          <p className="text-body-small-regular text-muted-foreground">{t('topUp.minimumAmount')}</p>
        </div>
        <Button type="submit" disabled={isPending || !amount} className="h-11 w-full">
          {t('topUp.continue')}
        </Button>
      </form>
    </div>
  );
}
