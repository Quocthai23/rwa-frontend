'use client';

import { Copy07, LinkExternal01 } from '@untitledui/icons';
import Image from 'next/image';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/hook/useToast';

type WithdrawPendingResultProps = {
  accountId: string;
  address?: string;
  amount: string;
  networkFee: number;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-body-small-regular text-muted-foreground">{label}</span>
      <div className="text-body-small-semibold text-foreground text-right">{value}</div>
    </div>
  );
}

export default function WithdrawPendingResult({
  accountId,
  address,
  amount,
  networkFee,
}: WithdrawPendingResultProps) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();

  const timeLabel = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date());
  }, []);

  const amountReceived = useMemo(() => {
    return Math.max(0, parseFloat(amount || '0') - networkFee).toFixed(4);
  }, [amount, networkFee]);

  const short = (value: string) => {
    if (!value) return '--';
    if (value.length <= 12) return value;
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess(t('topUp.copySuccessTitle'), t('topUp.copySuccessMessage'));
    } catch {
      showError(t('referral.copyFailedTitle'), t('withdraw.success.copyFailedMessage'));
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-border border-b px-6 py-5">
        <h2 className="text-h3-semibold text-foreground">{t('withdraw.success.pending')}</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center">
            <Image src="/assets/images/tether.png" alt="VNDT" width={60} height={60} />
          </div>
          <h3 className="text-display-sm leading-none text-green-500">+ {amountReceived} VNDT</h3>
        </div>

        <div className="space-y-6">
          <Row label={t('transactionHistory.from')} value={<span>{short(accountId)}</span>} />
          {address ? (
            <Row label={t('withdraw.detail.walletAddress')} value={<span>{short(address)}</span>} />
          ) : null}
          <Row label={t('withdraw.success.time')} value={timeLabel} />
          <Row label={t('withdraw.success.type')} value={t('features.withdraw')} />
          <Row
            label={t('withdraw.common.networkFee')}
            value={t('withdraw.common.amountWithUsd', { amount: networkFee.toFixed(2) })}
          />
          <Row
            label={t('withdraw.success.details', 'Detail')}
            value={
              <span className="inline-flex items-center gap-1 text-[#1769ff]">
                {t('withdraw.success.viewInExchange')}
                <LinkExternal01 size={14} />
              </span>
            }
          />
        </div>
      </div>
    </div>
  );
}

