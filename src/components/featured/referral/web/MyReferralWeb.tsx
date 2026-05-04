'use client';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import dayjs from 'dayjs';
import { Calendar, ChevronLeft, CoinsHand, FilterFunnel01 } from '@untitledui/icons';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/shared/atoms/button';
import { ACCOUNT_TYPES_ID } from '@/constants/account';
import { useToast } from '@/hook/useToast';
import { useReferralStats } from '@/hook/useReferralStats';
import { claimRewards, getCommission, getUnclaimedAmount } from '@/services/reward.service';
import { useAccountStore } from '@/store/useAccountStore';
import { CommissionPayoutDetailType } from '@/types/reward.types';
import { generateUUID } from '@/utils/uuid';

import { ReferralFilterModalWeb } from '../components/ReferralFilterModalWeb';
import { ReferralHistoryItem } from '../components/ReferralHistoryItem';

interface CommissionResponse {
  receiverId: string;
  totalAmount: string;
  details: Array<{
    date: string;
    dateDetails: Array<{
      email: string;
      volumes: Array<{
        symbol: string;
        quantity: string;
        amount: string;
      }>;
    }>;
  }>;
}

type AccountCommission = {
  account: string;
  details: { symbol: string; quantity: number; amount: number }[];
  totalLots: number;
  totalAmount: number;
};

type DateCommissionGroup = {
  date: string;
  accounts: AccountCommission[];
};

type MyReferralWebProps = {
  onBack?: () => void;
  entryFromReferral?: boolean;
};

export default function MyReferralWeb({ onBack, entryFromReferral = false }: MyReferralWebProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const selectedAccount = useAccountStore((state) => state.selectedAccount);

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }

    router.push('/home');
  };

  const [filterApplied, setFilterApplied] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [commissionData, setCommissionData] = useState<CommissionResponse | null>(null);
  const [availableAmount, setAvailableAmount] = useState('0.00');
  const [isClaiming, setIsClaiming] = useState(false);
  const isDemoAccount = selectedAccount?.accountTypeId === ACCOUNT_TYPES_ID.DEMO;

  const statsParams = useMemo(() => {
    if (filterApplied && fromDate && toDate) {
      return { fromDate, toDate };
    }
    return {};
  }, [filterApplied, fromDate, toDate]);

  const { data: referralStats } = useReferralStats(statsParams, {
    enabled: isHydrated && (!filterApplied || (Boolean(fromDate) && Boolean(toDate))),
  });

  const refreshUnclaimed = useCallback(async () => {
    try {
      const res = await getUnclaimedAmount();
      setAvailableAmount(Number(res?.availableAmount || 0).toFixed(2));
    } catch {
      setAvailableAmount('0.00');
    }
  }, []);

  useEffect(() => {
    const entry = searchParams.get('entry');
    const shouldResetFromReferral = entryFromReferral || entry === 'referral';

    if (shouldResetFromReferral) {
      sessionStorage.removeItem('referralFilterApplied');
      sessionStorage.removeItem('referralPeriod');
      sessionStorage.removeItem('referralFrom');
      sessionStorage.removeItem('referralTo');
      setFilterApplied(false);
      setFromDate('');
      setToDate('');
      setSelectedPeriod('');

      if (!entryFromReferral && entry === 'referral') {
        router.replace('/referral/my', { scroll: false });
      }

      setIsHydrated(true);
      return;
    }

    const applied = sessionStorage.getItem('referralFilterApplied') === 'true';
    setFilterApplied(applied);
    if (applied) {
      setFromDate(sessionStorage.getItem('referralFrom') || '');
      setToDate(sessionStorage.getItem('referralTo') || '');
      setSelectedPeriod(sessionStorage.getItem('referralPeriod') || '');
    } else {
      setFromDate('');
      setToDate('');
      setSelectedPeriod('');
    }
    setIsHydrated(true);
  }, [entryFromReferral, searchParams, router]);

  useEffect(() => {
    if (!isHydrated) return;

    const load = async () => {
      try {
        setIsLoading(true);
        const params = filterApplied && fromDate && toDate ? { fromDate, toDate } : undefined;
        const res = await getCommission(params);
        setCommissionData(res as unknown as CommissionResponse);
      } catch (error) {
        console.error('Failed to fetch commission data', error);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [fromDate, toDate, filterApplied, isHydrated]);

  useEffect(() => {
    if (!isHydrated || filterApplied) return;
    void refreshUnclaimed();
  }, [filterApplied, isHydrated, refreshUnclaimed]);

  const groupedByDate = useMemo<DateCommissionGroup[]>(() => {
    if (!commissionData?.details || commissionData.details.length === 0) return [];

    const dateMap = new Map<string, Map<string, AccountCommission>>();

    commissionData.details.forEach((group) => {
      const date = group.date || '';
      const accountMap = dateMap.get(date) || new Map<string, AccountCommission>();

      (group.dateDetails || []).forEach((detail) => {
        const account = detail.email || t('referral.myReferral.unknownAccount');
        const existing: AccountCommission = accountMap.get(account) || {
          account,
          details: [],
          totalLots: 0,
          totalAmount: 0,
        };

        (detail.volumes || []).forEach((v) => {
          const symbol = v.symbol || t('referral.myReferral.unknownSymbol');
          const quantity = Number(v.quantity || 0);
          const amount = Number(v.amount || 0);

          existing.details.push({ symbol, quantity, amount });
          existing.totalLots += quantity;
          existing.totalAmount += amount;
        });

        accountMap.set(account, existing);
      });

      dateMap.set(date, accountMap);
    });

    return Array.from(dateMap.entries()).map(([date, accountMap]) => ({
      date,
      accounts: Array.from(accountMap.values()),
    }));
  }, [commissionData, t]);

  const handleApplyFilter = (newFromDate: string, newToDate: string, period: string) => {
    setFromDate(newFromDate);
    setToDate(newToDate);
    setSelectedPeriod(period);
    setFilterApplied(true);
    setFilterVisible(false);

    sessionStorage.setItem('referralFilterApplied', 'true');
    sessionStorage.setItem('referralPeriod', period);
    sessionStorage.setItem('referralFrom', newFromDate);
    sessionStorage.setItem('referralTo', newToDate);
  };

  const totalEarnedValue = Number(referralStats?.totalAmountInPeriod || 0);

  const handleClaimAll = async () => {
    if (isClaiming || Number(availableAmount) <= 0) {
      return;
    }

    try {
      setIsClaiming(true);
      await claimRewards({
        type: CommissionPayoutDetailType.Commission,
        idempotencyKey: generateUUID(),
      });
      showSuccess(
        t('referral.myReferral.claimSuccessTitle'),
        t('referral.myReferral.claimSuccessMessage'),
      );
      queryClient.refetchQueries({ queryKey: ['accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['commision-stats'] });
      await refreshUnclaimed();
    } catch (error) {
      console.error(error);
      showError(
        t('referral.myReferral.claimErrorTitle'),
        t('referral.myReferral.claimErrorMessage'),
      );
    } finally {
      setIsClaiming(false);
    }
  };

  const filterModalPeriod = selectedPeriod || t('common.periods.oneWeek');
  const isFilteredEmptyState = filterApplied && groupedByDate.length === 0;
  const emptyStateTitle = isFilteredEmptyState
    ? t('referral.myReferral.filteredEmptyTitle')
    : t('referral.myReferral.emptyTitle');
  const emptyStateDescription = isFilteredEmptyState
    ? t('referral.myReferral.filteredEmptyDescription')
    : t('referral.myReferral.emptyDescription');
  const emptyStateAlt = isFilteredEmptyState
    ? t('referral.myReferral.filteredNoReferralsAlt')
    : t('referral.myReferral.noReferralsAlt');

  const historyItems = (
    <div>
      {groupedByDate.map((dateGroup) => (
        <div key={dateGroup.date} className="mb-5">
          <p className="text-body-large-regular text-muted-foreground mb-2">
            {dateGroup.date && dayjs(dateGroup.date).isSame(dayjs(), 'day')
              ? t('rewards.today')
              : dateGroup.date
                ? dayjs(dateGroup.date).format('MMM DD, YYYY')
                : t('rewards.today')}
          </p>
          <div className="mb-5">
            {dateGroup.accounts.map((group) => (
              <ReferralHistoryItem
                key={`${dateGroup.date}-${group.account}`}
                title={group.account}
                subtitle={t('referral.myReferral.lotsWithCount', {
                  count: group.totalLots.toFixed(2),
                })}
                totalEarned={`+$${group.totalAmount.toFixed(2)}`}
                details={group.details.map((x) => ({
                  symbol: x.symbol,
                  quantity: (
                    <span className="text-body-small text-success-500">
                      {x.quantity.toFixed(2)}
                    </span>
                  ),
                  amount: (
                    <span className="text-body-small text-success-500">${x.amount.toFixed(2)}</span>
                  ),
                }))}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  if (isDemoAccount) {
    return (
      <div className="bg-background flex min-h-dvh flex-col">
        <div className="flex h-15 items-center justify-between border-b border-transparent px-4">
          <button
            className="p-1"
            onClick={handleBack}
            aria-label={t('referral.myReferral.backAria')}
            type="button"
          >
            <ChevronLeft size={24} className="text-foreground" />
          </button>
          <p className="text-h3-semibold text-foreground">{t('referral.myReferral.title')}</p>
          <button className="relative p-2" type="button" aria-hidden="true">
            <FilterFunnel01 size={24} className="text-transparent" />
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 text-center">
          <p className="text-body-large-medium text-muted-foreground">
            {t('home.rewardsDemoError', { defaultValue: 'Demo accounts cannot view rewards.' })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex h-full min-h-[620px] flex-col">
      <div className="border-border flex h-15 items-center justify-between border-b px-4">
        <button
          className="p-1"
          onClick={handleBack}
          aria-label={t('referral.myReferral.backAria')}
          type="button"
        >
          <ChevronLeft size={24} className="text-foreground" />
        </button>
        <p className="text-h3-semibold text-foreground">{t('referral.myReferral.title')}</p>
        <button
          className="relative p-2"
          onClick={() => setFilterVisible(true)}
          aria-label={t('referral.myReferral.filterAria')}
          type="button"
        >
          <FilterFunnel01 size={24} className="text-foreground" />
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="px-4 pt-4">
          <p className="text-body-large-semibold text-foreground mb-3">
            {t('referral.myReferral.earningsSummary')}
          </p>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <div className="bg-card flex h-6.5 w-6.5 items-center justify-center rounded-full">
                <CoinsHand size={17.75} className="text-foreground" />
              </div>
              <span className="text-body-large-regular text-foreground">
                {t('referral.myReferral.totalEarnedLabel')}
              </span>
            </div>
            <h3 className="text-h3-semibold text-foreground">${totalEarnedValue.toFixed(2)}</h3>
          </div>
          <div className="border-border flex items-center justify-between gap-4 rounded border px-3 py-4">
            <div>
              <div className="flex flex-1 items-center gap-1">
                <div className="bg-card flex h-6.5 w-6.5 items-center justify-center rounded-full">
                  <Calendar size={17.75} className="text-foreground mt-0.5" />
                </div>
                <div>
                  <p className="text-body-large-regular text-muted-foreground">
                    {t('referral.myReferral.availableLabel')}
                  </p>
                </div>
              </div>
              <h3 className="text-h3-semibold text-foreground">${availableAmount}</h3>
            </div>
            {!isDemoAccount ? (
              <Button
                className="text-button-small-medium shrink-0 px-3 py-2"
                disabled={Number(availableAmount) <= 0 || isClaiming}
                onClick={() => void handleClaimAll()}
              >
                {t('referral.myReferral.claimAll')}
              </Button>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-transparent" />
          </div>
        ) : groupedByDate.length === 0 ? (
          <div className="mt-[20vh] flex flex-1 flex-col items-center px-4">
            <div className="mb-6 flex h-17 w-20 shrink-0 items-center justify-center">
              <Image
                src="/assets/images/referral/no-ref.svg"
                alt={emptyStateAlt}
                width={67}
                height={78}
                className="h-full w-full object-contain"
              />
            </div>
            <p className="text-body-large-semibold text-foreground mb-2 text-center">
              {emptyStateTitle}
            </p>
            <p className="text-body-large-regular text-muted-foreground text-center">
              {emptyStateDescription}
            </p>
          </div>
        ) : (
          <div className="pb-10">
            <div className="px-4 pt-5">{historyItems}</div>
          </div>
        )}
      </div>

      <ReferralFilterModalWeb
        visible={filterVisible}
        selectedPeriod={filterModalPeriod}
        fromDate={fromDate}
        toDate={toDate}
        onClose={() => setFilterVisible(false)}
        onApply={handleApplyFilter}
      />
    </div>
  );
}
