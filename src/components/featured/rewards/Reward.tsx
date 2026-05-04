'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/shared/Header';
import { Button } from '@/components/shared/atoms/button';
import {
  RewardHistoryItem,
  RewardHistoryItemData,
} from '@/components/featured/rewards/components/RewardHistoryItem';
import { ACCOUNT_TYPES_ID } from '@/constants/account';
import { claimRewards, getRebateDetails, getRebateStats } from '@/services/reward.service';
import {
  CommissionPayoutDetailType,
  RebateDetailItem,
  RebateStatsData,
} from '@/types/reward.types';
import { useTranslation } from 'react-i18next';
import { CoinsHand, Coins01, Calendar } from '@untitledui/icons';
import { useAccountStore } from '@/store/useAccountStore';
import { generateUUID } from '@/utils/uuid';
import { useToast } from '@/hook/useToast';
import { queryClient } from '@/app/provider';
import RewardsCenterSkeleton from './components/RewardsCenterSkeleton';
import EarningsCard from './components/EarningsCard';
import ReferralAppPage from '@/components/featured/referral/app/ReferralAppPage';
import { cn } from '@/lib/utils';
import MyReferral from '../referral/MyReferral';

export type RewardHistoryGroup = {
  date: string;
  items: RewardHistoryItemData[];
};

type EarningsItem = {
  icon: React.ElementType;
  amount: string;
  label: string;
};

type RewardTab = 'rewardCenter' | 'referral';

const rewardTabs: { id: RewardTab; label: string }[] = [
  { id: 'rewardCenter', label: 'Reward Center' },
  { id: 'referral', label: 'Referral' },
];

const groupRewardsByDate = (rewards: RebateDetailItem[]): RewardHistoryGroup[] => {
  const groups: { [key: string]: RewardHistoryItemData[] } = {};

  const sortedRewards = [...rewards].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  sortedRewards.forEach((reward) => {
    const date = new Date(reward.date);
    const dateKey = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push({
      pair: reward.symbol,
      lot: reward.quantity,
      logo: reward.logo,
      amount: reward.amount,
    });
  });

  return Object.keys(groups).map((date) => ({
    date,
    items: groups[date],
  }));
};

type RebateDetailsResponse = RebateDetailItem[] | { data: RebateDetailItem[] };
type RebateStatsResponse = RebateStatsData | { data: RebateStatsData };

const normalizeRebateDetails = (
  input: RebateDetailsResponse | null | undefined,
): RebateDetailItem[] => {
  if (Array.isArray(input)) {
    return input;
  }

  if (input && 'data' in input && Array.isArray(input.data)) {
    return input.data;
  }

  return [];
};

const normalizeRebateStats = (input: RebateStatsResponse | null | undefined): RebateStatsData => {
  if (!input) {
    return {
      availableAmount: '0',
      totalAmount: '0',
      thisMonthAmount: '0',
      todayAmount: '0',
    };
  }

  if ('data' in input) {
    return input.data;
  }

  return input;
};

export function RewardsCenterContent() {
  const { t } = useTranslation();
  const { showError, showSuccess } = useToast();
  const [availableRewards, setAvailableRewards] = useState('0.00');
  const [earningsData, setEarningsData] = useState<EarningsItem[]>([]);
  const [rewardHistory, setRewardHistory] = useState<RewardHistoryGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedAccount = useAccountStore((state) => state.selectedAccount);

  const refreshRewardsData = useCallback(async () => {
    try {
      setError(null);

      const [stats, details] = await Promise.all([getRebateStats(), getRebateDetails()]);
      const normalizedStats = normalizeRebateStats(stats);

      setAvailableRewards(Number(normalizedStats.availableAmount || 0).toFixed(2));

      const formattedEarnings: EarningsItem[] = [
        {
          icon: Calendar,
          amount: Number(normalizedStats.todayAmount || 0).toFixed(2),
          label: t('rewards.today'),
        },
        {
          icon: Coins01,
          amount: Number(normalizedStats.thisMonthAmount || 0).toFixed(2),
          label: t('rewards.thisMonth'),
        },
        {
          icon: CoinsHand,
          amount: Number(normalizedStats.totalAmount || 0).toFixed(2),
          label: t('rewards.totalEarned'),
        },
      ];

      setEarningsData(formattedEarnings);

      const normalizedDetails = normalizeRebateDetails(details);
      setRewardHistory(groupRewardsByDate(normalizedDetails));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : t('rewards.fetchError'));
    }
  }, [t]);

  useEffect(() => {
    const fetchRewardsData = async () => {
      try {
        setIsLoading(true);
        await refreshRewardsData();
      } finally {
        setIsLoading(false);
      }
    };

    fetchRewardsData();
  }, [refreshRewardsData]);

  const handleClaimRewards = async () => {
    if (isClaiming || Number(availableRewards) <= 0) {
      return;
    }

    try {
      setIsClaiming(true);

      await claimRewards({
        type: CommissionPayoutDetailType.Rebate,
        idempotencyKey: generateUUID(),
      });
      queryClient.refetchQueries({ queryKey: ['accounts'] });
      await refreshRewardsData();
      showSuccess(
        t('rewards.claimSuccessTitle', 'Claim rewards successful'),
        t('rewards.claimSuccessMessage', 'Your rewards have been claimed successfully.'),
      );
    } catch (err) {
      console.error(err);
      showError(
        t('rewards.claimFailedTitle', 'Claim rewards failed'),
        err instanceof Error ? err.message : t('rewards.fetchError'),
      );
    } finally {
      setIsClaiming(false);
    }
  };

  const renderContent = () => {
    if (selectedAccount?.accountTypeId === ACCOUNT_TYPES_ID.DEMO) {
      return (
        <div className="flex h-[60vh] flex-col items-center justify-center px-4 text-center">
          <p className="text-body-large-medium text-muted-foreground">
            {t('rewards.demoAccountNotApplicable')}
          </p>
        </div>
      );
    }

    if (isLoading) {
      return <RewardsCenterSkeleton />;
    }

    if (error) {
      return <div className="flex h-40 items-center justify-center text-red-500">{error}</div>;
    }

    return (
      <>
        <div className="mb-4 pt-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-start">
              <p className="text-body-large-semibold text-foreground">
                {t('rewards.availableRewards', 'Available Rewards')}
              </p>
              <p className="text-h3-semibold text-green-500">${availableRewards}</p>
            </div>
            <Button
              variant="primary-contained"
              className="text-button-small-medium px-3 py-2"
              onClick={handleClaimRewards}
              disabled={isClaiming || Number(availableRewards) <= 0}
            >
              {isClaiming
                ? t('rewards.claiming', 'Claiming...')
                : t('rewards.claimAll', 'Claim All')}
            </Button>
          </div>
        </div>

        {/* Earnings Summary */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <p className="text-body-large-semibold text-foreground mt-5">
              {t('rewards.earningsSummary')}
            </p>
          </div>
          <div className="flex gap-2 py-4">
            {earningsData.map((item) => (
              <EarningsCard key={item.label} item={item} />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-body-large-semibold text-foreground mb-2">
            {t('rewards.rewardHistory')}
          </p>
        </div>
        <div>
          {rewardHistory.length > 0 ? (
            rewardHistory.map((group) => (
              <div key={group.date} className="mb-4">
                <p className="text-body-large-regular text-muted-foreground mb-2">{group.date}</p>
                <div className="border-border bg-background overflow-hidden rounded border px-4">
                  {group.items.map((item, index) => (
                    <div
                      className="text-body-large-regular text-muted-foreground"
                      key={`${group.date}-${item.pair}-${index}`}
                    >
                      <RewardHistoryItem item={item} />
                      {index < group.items.length - 1 ? <div className="bg-border h-px" /> : null}
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-muted-foreground py-8 text-center">
              {t('rewards.noRewardHistory')}
            </div>
          )}
        </div>
      </>
    );
  };

  return <div className="flex-1 overflow-y-auto px-5 pb-4">{renderContent()}</div>;
}

function RewardsCenterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<RewardTab>('rewardCenter');

  useEffect(() => {
    const tab = searchParams.get('tab');

    if (tab === 'rewardCenter' || tab === 'referral') {
      setActiveTab(tab);
      return;
    }

    setActiveTab('rewardCenter');
  }, [searchParams]);

  const handleTabChange = (tab: RewardTab) => {
    setActiveTab(tab);

    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="bg-background flex h-dvh flex-col">
      <Header label={t('rewards.title')} />
      <div className="bg-background border-b border-neutral-200 mx-6 dark:border-neutral-800">
        <div className="flex w-full flex-row items-center">
          {rewardTabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <Button
                key={tab.id}
                type="button"
                variant="white-contained"
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  'flex h-full flex-1 items-center justify-center rounded-none border-b-2 border-transparent px-0 py-2 text-neutral-500 transition-colors',
                  isActive && 'text-primary-500 border-b-primary-500 py-2',
                )}
              >
                <span
                  className={cn(
                    'transition-colors',
                    isActive
                      ? 'text-body-large-semibold! text-primary-500'
                      : 'text-body-large-regular!',
                  )}
                >
                  {t(`rewardsCenter.tabs.${tab.id}`, tab.label)}
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeTab === 'rewardCenter' ? <RewardsCenterContent /> : <MyReferral hideHeader />}
      </div>
    </div>
  );
}

export default memo(RewardsCenterScreen);
