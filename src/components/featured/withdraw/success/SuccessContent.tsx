'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Copy07 } from '@untitledui/icons';
import Image from 'next/image';
import { Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/hook/useToast';
import { Button } from '@/components/shared/atoms/button';

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-body-small-regular text-muted-foreground">{label}</span>
      <div className="text-body-large-semibold text-foreground">{value}</div>
    </div>
  );
}

export default function SuccessContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess, showError } = useToast();

  const [showDetails, setShowDetails] = useState(false);

  const amount = searchParams.get('amount') || '0';
  const address = searchParams.get('address') || '';
  const networkFee = searchParams.get('networkFee') || '0';
  const accountId = searchParams.get('accountId') || '';

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess(t('topUp.copySuccessTitle'), t('topUp.copySuccessMessage'));
    } catch (err) {
      console.error('Failed to copy text: ', err);
      showError(t('referral.copyFailedTitle'), t('withdraw.success.copyFailedMessage'));
    }
  };

  const dateFormatted = new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date());

  if (!showDetails) {
    return (
      <div className="bg-background text-foreground mx-auto flex min-h-screen max-w-md flex-col px-4 pt-6 pb-18 font-sans">
        <div className="flex flex-1 items-center justify-center">
          <div className="max-w-65 text-center">
            <h2 className="text-h3-semibold text-foreground mb-2">
              {t('withdraw.success.requestSubmitted')}
            </h2>
            <p className="text-body-small-regular text-muted-foreground">
              {t('withdraw.success.requestSubmittedDescription')}
            </p>
          </div>
        </div>

        <div className="space-y-3 pb-3">
          <Button
            variant="primary-contained"
            onClick={() => setShowDetails(true)}
            className="h-[44px] w-full rounded text-[15px] font-semibold"
          >
            {t('withdraw.success.viewWithdrawalDetails')}
          </Button>

          <Button
            variant="neutral-contained"
            onClick={() => router.push('/home')}
            className="h-[44px] w-full rounded text-[15px] font-semibold"
          >
            {t('withdraw.success.goBack')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground mx-auto flex min-h-screen max-w-md flex-col pb-18 font-sans">
      {/* Header */}
      <div className="relative mt-4 flex items-center justify-center px-4 py-6">
        <Button
          variant="white-contained"
          onClick={() => router.push('/home')}
          className="absolute left-4 -ml-2 !rounded-full p-2"
        >
          <ChevronLeft className="text-foreground size-6" strokeWidth={2} />
        </Button>
        <h1 className="text-h3-semibold text-netral-900">{t('withdraw.success.pending')}</h1>
      </div>

      {/* Amount Section */}
      <div className="mt-10 mb-14 flex flex-col items-center">
        {/* Logo */}
        <div className="relative mb-4 flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full bg-gray-100">
          <Image
            src="/assets/images/11155111.png"
            alt={t('withdraw.success.tokenLogoAlt')}
            fill
            className="rounded-full object-contain"
            sizes="72px"
            priority
          />
        </div>

        {/* Amount */}
        <h2 className="text-display-sm tracking-tight text-green-500">
          -{' '}
          {t('withdraw.common.amountWithUsd', {
            amount: Math.max(0, parseFloat(amount || '0') - parseFloat(networkFee || '0')).toFixed(
              2,
            ),
          })}
        </h2>
      </div>

      {/* Details List */}
      <div className="flex-1 space-y-7 px-5">
        <DetailRow
          label={t('transactionHistory.from')}
          value={
            <div className="flex items-center gap-2">
              <span className="max-w-[120px] truncate" title={accountId}>
                {accountId ? `${accountId.slice(0, 6)}...${accountId.slice(-4)}` : '--'}
              </span>
              <Button
                variant="primary-contained"
                onClick={() => handleCopy(accountId)}
                className="h-auto min-w-0 bg-transparent p-0 hover:bg-transparent"
              >
                <Copy07 className="text-foreground size-[18px]" strokeWidth={2} />
              </Button>
            </div>
          }
        />
        <DetailRow
          label={t('transactionHistory.to')}
          value={
            <div className="flex items-center gap-2">
              <span className="max-w-[120px] truncate" title={address}>
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '--'}
              </span>
              <Button
                variant="primary-contained"
                onClick={() => handleCopy(address)}
                className="h-auto min-w-0 bg-transparent p-0 hover:bg-transparent"
              >
                <Copy07 className="text-foreground size-[18px]" strokeWidth={2} />
              </Button>
            </div>
          }
        />
        <DetailRow label={t('withdraw.success.time')} value={dateFormatted} />
        <DetailRow label={t('withdraw.success.type')} value={t('features.withdraw')} />
        <DetailRow
          label={t('withdraw.common.networkFee')}
          value={t('withdraw.success.networkFeeValue', { networkFee })}
        />
        <DetailRow
          label={t('withdraw.success.details')}
          value={t('withdraw.success.viewInExchange')}
        />
      </div>
    </div>
  );
}
