'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { ChevronRight, Clock, Copy07, Check } from '@untitledui/icons';
import { useToast } from '@/hook/useToast';
import { Button } from '@/components/shared/atoms/button';
import { StatCard } from '../components/StatCard';
import { StepItem } from '../components/StepItem';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from 'react-i18next';
import { useReferralStats } from '@/hook/useReferralStats';
import { useState } from 'react';

type ReferralProps = {
  onBack?: () => void;
  onOpenHistory?: () => void;
  onOpenRewardStructure?: () => void;
};

export default function Referral({ onBack, onOpenHistory, onOpenRewardStructure }: ReferralProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const { user } = useAuthStore();
  const [isCopied, setIsCopied] = useState(false);
  const referralCode = user?.referenceCode || '—';

  const today = dayjs().format('YYYY-MM-DD');
  const thirtyDaysAgo = dayjs().subtract(30, 'day').format('YYYY-MM-DD');

  const { data: todayStats } = useReferralStats({ fromDate: today, toDate: today });
  const { data: monthStats } = useReferralStats({ fromDate: thirtyDaysAgo, toDate: today });

  const todayCount = todayStats?.totalReferralCount || '0';
  const monthCount = monthStats?.totalReferralCount || '0';
  const monthCommission = monthStats?.totalAmountInPeriod || '0';
  const formattedMonthCommission = monthCommission.trim().startsWith('$')
    ? monthCommission
    : `$${monthCommission}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      showSuccess(t('referral.copiedTitle'), t('referral.copiedMessage'));
    } catch {
      showError(t('referral.copyFailedTitle'), t('referral.copyFailedMessage'));
    }
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="bg-background flex min-h-screen flex-col px-4">
      {/* Header */}
      <div className="flex h-15 items-center justify-between">
        <button
          className="p-1"
          onClick={() => {
            if (onBack) {
              onBack();
              return;
            }
            router.back();
          }}
          aria-label={t('common.back', 'Back')}
        >
          <span className="inline-block h-6 w-6" aria-hidden />
        </button>

        <p className="text-h3-semibold text-foreground">{t('referral.title')}</p>

        <button
          className="p-1"
          onClick={() => {
            if (onOpenHistory) {
              onOpenHistory();
              return;
            }
            router.push('/referral/my?entry=referral');
          }}
          aria-label={t('referral.history')}
        >
          <Clock size={24} className="text-foreground" />
        </button>
      </div>

      <div className="overflow-y-auto">
        {/* Banner */}
        <div className="bg-background mb-4 flex h-32 items-center justify-between overflow-hidden">
          <div className="flex-1">
            <p className="text-h2-semibold text-foreground mb-2 leading-[32px]">
              {t('referral.bannerTitle')}
            </p>
            <p className="text-body-small-regular text-muted-foreground">
              {t('referral.bannerSubtitle')}
            </p>
          </div>
          <div className="flex h-29 w-29 shrink-0 items-center justify-center">
            <Image
              src="/assets/images/referral/banner-referral.svg"
              alt={t('referral.title')}
              width={116}
              height={116}
              className="h-full w-full object-contain"
            />
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-body-large-semibold text-foreground">{t('referral.howItWorks')}</p>
            <button
              className="flex items-center"
              onClick={() => {
                if (onOpenRewardStructure) {
                  onOpenRewardStructure();
                  return;
                }
                router.push('/referral/reward-structure');
              }}
              aria-label={t('referral.viewDetails')}
            >
              <span className="text-button-small-primary text-primary-500 mr-1">
                {t('referral.viewDetails')}
              </span>
              <ChevronRight size={16} className="text-primary-500" />
            </button>
          </div>

          <div className="bg-background border-border rounded-sm border p-4">
            <StepItem
              step={1}
              title={t('referral.stepInviteTitle')}
              description={t('referral.stepInviteDesc')}
            />
            <StepItem
              step={2}
              title={t('referral.stepTradeTitle')}
              description={t('referral.stepTradeDesc')}
            />
            <StepItem
              isLast
              step={3}
              title={t('referral.stepRewardTitle')}
              description={t('referral.stepRewardDesc')}
            />
          </div>
        </div>

        {/* Referrals Stats */}
        <div className="mb-4">
          <StatCard
            label={t('referral.commission30d')}
            value={formattedMonthCommission}
            horizontal
            className="mb-3"
          />
          <div className="flex gap-3">
            <StatCard
              label={t('referral.totalReferrals', 'Total referrals')}
              value={todayCount}
              className="flex-1"
            />
            <StatCard label={t('referral.referrals30d')} value={monthCount} className="flex-1" />
          </div>
        </div>

        {/* Referral Code Management */}
        <div className="mb-4">
          <div className="mb-4 flex items-center">
            <p className="text-body-large-semibold text-foreground mr-2">
              {t('referral.codeManagement')}
            </p>
          </div>

          <div className="bg-background border-border flex items-center justify-between rounded border p-4">
            <p className="text-body-regular text-muted-foreground">{t('referral.copyButton')}</p>

            <button className="flex items-center" onClick={handleCopy}>
              <p className="text-h4-semibold text-foreground mr-2">{referralCode}</p>
              {isCopied ? (
                <Check size={20} className="text-green-500" />
              ) : (
                <Copy07 size={20} className="text-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Bottom Button */}
        <div className="py-4">
          <Button className="h-14 w-full" onClick={handleCopy}>
            {t('referral.copyButton')}
          </Button>
        </div>
      </div>
    </div>
  );
}
