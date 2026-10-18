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

export default function DepositAmountInput({ onClose, onSubmit, isPending }: DepositAmountInputProps) {
  const { t } = useTranslation();
  const { showError } = useToast();
  const [amount, setAmount] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(amount.replace(/,/g, ''));
    if (!parsedAmount || parsedAmount < 10000) {
      showError(t('common.error'), 'Số tiền nạp tối thiểu là 10,000 VND');
      return;
    }
    onSubmit(parsedAmount);
  };

  const formatNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNumber(e.target.value);
    setAmount(formatted);
  };

  return (
    <div className="bg-background flex h-full flex-col">
      <div className="relative flex h-14 w-full items-center justify-center px-4">
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="absolute left-4"
        >
          <ChevronLeft className="text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <Image
            src="/assets/images/banner-deposit.svg"
            alt="deposit banner"
            width={28}
            height={28}
          />
          <p className="text-h3-semibold text-foreground">Nạp tiền VNDT</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-4 pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-body-small-semibold text-foreground">Số tiền (VND)</label>
            <Input
              type="text"
              placeholder="Nhập số tiền nạp..."
              value={amount}
              onChange={handleAmountChange}
              disabled={isPending}
              className="h-12 text-lg"
            />
            <p className="text-body-small-regular text-muted-foreground">Tối thiểu: 10,000 VNDT</p>
          </div>

          <Button
            type="submit"
            disabled={isPending || !amount}
            className="w-full h-12 mb-4"
          >
            Tiếp tục
          </Button>
        </form>
      </div>
    </div>
  );
}
