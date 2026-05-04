'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Coins01,
  CoinsHand,
  Copy07,
  Check,
  User01,
  Wallet02,
  Users01,
  CurrencyDollar,
} from '@untitledui/icons';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ACCOUNT_TYPES_ID } from '@/constants/account';
import { useAssets } from '@/hook/useAssets';
import { useToast } from '@/hook/useToast';
import { useReferralStats } from '@/hook/useReferralStats';
import { claimRewards, getCommission, getUnclaimedAmount } from '@/services/reward.service';
import { useAccountStore } from '@/store/useAccountStore';
import { useAuthStore } from '@/store/authStore';
import { CommissionPayoutDetailType } from '@/types/reward.types';
import type { Asset } from '@/types/assets';
import { generateUUID } from '@/utils/uuid';
import { cn } from '@/lib/utils';
import ReferralMembersSection from './ReferralMembersSection';
import { Button } from '@/components/shared/atoms/button';

const categoryIcons: Record<string, string> = {
  METAL: '/assets/images/referral/metals.svg',
  CRYPTO: '/assets/images/referral/Coin.svg',
  INDEX: '📊',
  FX: '💰',
  FOREX: '/assets/images/referral/forex.svg',
  STOCK: '📉',
  COMMODITY: '/assets/images/referral/metals.svg',
} as const;

type ReferralProps = {
  onBack?: () => void;
  onOpenHistory?: () => void;
  onOpenRewardStructure?: () => void;
};

type CommissionResponse = {
  receiverId: string;
  totalAmount: string;
  details: Array<{
    date?: string;
    dateDetails?: Array<{
      email: string;
      volumes: Array<{
        symbol: string;
        quantity: string;
        amount: string;
      }>;
    }>;
    email?: string;
    volumes?: Array<{
      symbol: string;
      quantity: string;
      amount: string;
    }>;
  }>;
};

type HistoryDetail = {
  amount: string;
  quantity: string;
  symbol: string;
};

type HistoryAccountGroup = {
  account: string;
  details: HistoryDetail[];
  totalLots: number;
  totalAmount: number;
};

type HistoryDateGroup = {
  date: string;
  accounts: HistoryAccountGroup[];
};

type CategoryGroup = {
  icon: string;
  label: string;
  items: Asset[];
};

const formatDateLabel = (value?: string) => {
  if (!value) return '';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('MMM DD, YYYY') : value;
};

export default function Referral({ onBack, onOpenHistory, onOpenRewardStructure }: ReferralProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const { user } = useAuthStore();
  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const { data: assets, isLoading: isAssetsLoading } = useAssets();

  const [isCopied, setIsCopied] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [availableAmount, setAvailableAmount] = useState('0.00');
  const [commissionData, setCommissionData] = useState<CommissionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [isReferralInfoExpanded, setIsReferralInfoExpanded] = useState(true);

  const referralCode = user?.referenceCode || '—';
  const today = dayjs().format('YYYY-MM-DD');
  const thirtyDaysAgo = dayjs().subtract(30, 'day').format('YYYY-MM-DD');
  const isDemoAccount = selectedAccount?.accountTypeId === ACCOUNT_TYPES_ID.DEMO;

  const { data: todayStats } = useReferralStats({ fromDate: today, toDate: today });
  const { data: monthStats } = useReferralStats({ fromDate: thirtyDaysAgo, toDate: today });

  const todayCount = todayStats?.totalReferralCount || '0';
  const monthCount = monthStats?.totalReferralCount || '0';
  const totalEarnedValue = Number(monthStats?.totalAmountInPeriod || 0);
  const availableAmountValue = Number(availableAmount || 0);
  const referralsTitle = t('referral.title') || t('referral.referrals') || 'Referrals';
  const referralsSubtitle = t('referral.referralsSubtitle') || 'Manage your referrals and earnings';

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
      return;
    }
    router.back();
  }, [onBack, router]);

  const handleOpenHistory = useCallback(() => {
    if (onOpenHistory) {
      onOpenHistory();
      return;
    }
    router.push('/referral/my?entry=referral');
  }, [onOpenHistory, router]);

  const handleOpenRewardStructure = useCallback(() => {
    if (onOpenRewardStructure) {
      onOpenRewardStructure();
      return;
    }
    router.push('/referral/reward-structure');
  }, [onOpenRewardStructure, router]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      showSuccess(t('referral.copiedTitle'), t('referral.copiedMessage'));
    } catch {
      showError(t('referral.copyFailedTitle'), t('referral.copyFailedMessage'));
    }
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [referralCode, showError, showSuccess, t]);

  const loadReferralData = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      const [commission, unclaimed] = await Promise.all([
        getCommission({ fromDate: thirtyDaysAgo, toDate: today }),
        getUnclaimedAmount({ fromDate: thirtyDaysAgo, toDate: today }),
      ]);

      setCommissionData(commission as unknown as CommissionResponse);
      setAvailableAmount(Number(unclaimed?.availableAmount || 0).toFixed(2));
    } catch (loadError) {
      console.error(loadError);
      setError(loadError instanceof Error ? loadError.message : t('rewards.fetchError'));
      setAvailableAmount('0.00');
    } finally {
      setIsLoading(false);
    }
  }, [t, thirtyDaysAgo, today]);

  useEffect(() => {
    void loadReferralData();
  }, [loadReferralData]);

  const handleClaimAll = useCallback(async () => {
    if (isClaiming || availableAmountValue <= 0) {
      return;
    }

    try {
      setIsClaiming(true);
      await claimRewards({
        type: CommissionPayoutDetailType.Commission,
        idempotencyKey: generateUUID(),
      });
      showSuccess(
        t('referral.myReferral.claimSuccessTitle', 'Claim successful'),
        t('referral.myReferral.claimSuccessMessage', 'Your referral earnings have been claimed.'),
      );
      queryClient.refetchQueries({ queryKey: ['accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['commission-stats'] });
      await loadReferralData();
    } catch (claimError) {
      console.error(claimError);
      showError(
        t('referral.myReferral.claimErrorTitle', 'Claim failed'),
        t('referral.myReferral.claimErrorMessage', 'Unable to claim referral earnings.'),
      );
    } finally {
      setIsClaiming(false);
    }
  }, [availableAmountValue, isClaiming, queryClient, showError, showSuccess, t, loadReferralData]);

  const groupedHistory = useMemo<HistoryDateGroup[]>(() => {
    const details = commissionData?.details || [];
    if (details.length === 0) return [];

    const dateMap = new Map<string, Map<string, HistoryAccountGroup>>();

    details.forEach((group) => {
      const dateLabel = formatDateLabel(group.date) || t('rewards.today');
      const accountMap = dateMap.get(dateLabel) || new Map<string, HistoryAccountGroup>();
      const dateDetails = group.dateDetails ?? [];
      const fallbackDetails = group.email
        ? [
            {
              email: group.email,
              volumes: group.volumes ?? [],
            },
          ]
        : [];

      [...dateDetails, ...fallbackDetails].forEach((detail) => {
        const account = detail.email || t('referral.myReferral.unknownAccount');
        const existing = accountMap.get(account) || {
          account,
          details: [],
          totalLots: 0,
          totalAmount: 0,
        };

        (detail.volumes || []).forEach((volume) => {
          const quantity = Number(volume.quantity || 0);
          const amount = Number(volume.amount || 0);
          existing.details.push({
            symbol: volume.symbol || t('referral.myReferral.unknownSymbol'),
            quantity: volume.quantity,
            amount: volume.amount,
          });
          existing.totalLots += quantity;
          existing.totalAmount += amount;
        });

        accountMap.set(account, existing);
      });

      dateMap.set(dateLabel, accountMap);
    });

    return Array.from(dateMap.entries()).map(([date, accountMap]) => ({
      date,
      accounts: Array.from(accountMap.values()),
    }));
  }, [commissionData, t]);

  const groupedCategories = useMemo<CategoryGroup[]>(() => {
    const grouped = (assets ?? []).reduce(
      (acc: Record<string, CategoryGroup>, asset: Asset) => {
        const categoryCode = asset.category?.code || 'OTHER';
        const categoryName = asset.category?.name || 'Other';

        if (!acc[categoryCode]) {
          acc[categoryCode] = {
            icon: categoryIcons[categoryCode] || '📦',
            label: categoryName,
            items: [],
          };
        }

        acc[categoryCode].items.push(asset);
        return acc;
      },
      {} as Record<string, CategoryGroup>,
    );

    return Object.values(grouped).sort((a, b) => a.label.localeCompare(b.label));
  }, [assets]);

  const renderHistory = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-10">
          <div className="h-6 w-6 animate-spin border-2 border-neutral-300 border-t-transparent" />
        </div>
      );
    }

    if (groupedHistory.length === 0) {
      return (
        <div className="flex flex-col items-center px-4 py-10 text-center">
          <div className="mb-6 flex h-17 w-20 shrink-0 items-center justify-center">
            <Image
              src="/assets/images/referral/no-ref.svg"
              alt={t('referral.myReferral.noReferralsAlt')}
              width={67}
              height={78}
              className="h-full w-full object-contain"
            />
          </div>
          <p className="text-body-large-semibold text-foreground mb-2">
            {t('referral.myReferral.emptyTitle', 'You haven’t invited anyone yet.')}
          </p>
          <p className="text-body-large-regular text-muted-foreground">
            {t(
              'referral.myReferral.emptyDescription',
              'Invite friends to start racking up rewards',
            )}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        {groupedHistory.map((dateGroup) => (
          <div key={dateGroup.date}>
            <p className="text-body-large-regular text-muted-foreground mb-2">{dateGroup.date}</p>
            <div className="space-y-3">
              {dateGroup.accounts.map((account) => {
                const key = `${dateGroup.date}-${account.account}`;
                const expanded = expandedHistory[key] || false;

                return (
                  <div key={key} className="border-border bg-background border px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-body-large-semibold text-foreground">
                          {account.account}
                        </p>
                        <p className="text-body-small-regular text-muted-foreground">
                          {t('referral.myReferral.lotsWithCount', {
                            count: account.totalLots.toFixed(2),
                          })}
                        </p>
                      </div>
                      <p className="text-h3-semibold text-green-500">
                        +${account.totalAmount.toFixed(2)}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="text-primary-500 hover:text-primary-600 mt-3 inline-flex items-center gap-1 text-sm font-medium transition-colors"
                      onClick={() =>
                        setExpandedHistory((current) => ({
                          ...current,
                          [key]: !current[key],
                        }))
                      }
                    >
                      <span>
                        {expanded ? 'Show Less' : t('referral.viewDetails', 'View details')}
                      </span>
                      {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {expanded ? (
                      <div className="border-border mt-3 space-y-2 border-t pt-3">
                        {account.details.map((detail, index) => (
                          <div
                            key={`${key}-${detail.symbol}-${index}`}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <p className="text-body-small-regular text-foreground">
                                {detail.symbol}
                              </p>
                              <p className="text-body-small-regular text-muted-foreground">
                                {Number(detail.quantity || 0).toFixed(2)} lots
                              </p>
                            </div>
                            <p className="text-body-small-semibold text-green-500">
                              ${Number(detail.amount || 0).toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderCategories = () => {
    if (isAssetsLoading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="bg-background px-4 py-4">
              <div className="bg-muted h-4 w-28 animate-pulse" />
              <div className="bg-muted mt-3 h-3 w-20 animate-pulse" />
            </div>
          ))}
        </div>
      );
    }

    if (groupedCategories.length === 0) {
      return (
        <div className="text-muted-foreground py-8 text-center">{t('market.noDataAvailable')}</div>
      );
    }

    return (
      <div className="space-y-3">
        {groupedCategories.map((category) => {
          const key = category.label;
          const expanded = expandedCategories[key] || false;
          const commissionValues = category.items.map((asset) =>
            Number((asset as Asset & { ibCommissionPerLot?: string }).ibCommissionPerLot || 0),
          );
          const minCommission = commissionValues.length ? Math.min(...commissionValues) : 0;
          const maxCommission = commissionValues.length ? Math.max(...commissionValues) : 0;
          const commissionRange =
            minCommission === maxCommission
              ? `$${minCommission.toFixed(2)}`
              : `$${minCommission.toFixed(2)} - $${maxCommission.toFixed(2)}`;

          return (
            <div key={category.label} className="bg-background px-4 py-4">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() =>
                  setExpandedCategories((current) => ({
                    ...current,
                    [key]: !current[key],
                  }))
                }
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center dark:bg-neutral-900">
                    {typeof category.icon === 'string' && category.icon.startsWith('/') ? (
                      <Image src={category.icon} alt={category.label} width={30} height={30} />
                    ) : (
                      <span className="text-2xl">{category.icon}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-body-large-semibold text-foreground">{category.label}</p>
                    <p className="text-muted-foreground text-xs tracking-[0.14em] uppercase">
                      {t('referral.perLot', 'Per lot')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <p className="text-body-large-semibold text-foreground">{commissionRange}</p>
                  {expanded ? (
                    <ChevronUp size={18} className="text-muted-foreground" />
                  ) : (
                    <ChevronDown size={18} className="text-muted-foreground" />
                  )}
                </div>
              </button>

              {expanded ? (
                <div className="border-border mt-3 flex flex-wrap gap-2 border-t pt-3">
                  {category.items.map((asset) => (
                    <div
                      key={asset.id}
                      className="border-border bg-card text-foreground border px-2 py-1 text-xs"
                    >
                      {asset.symbol}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  };

  if (isDemoAccount) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
        <p className="text-body-large-medium text-muted-foreground">
          {t('home.rewardsDemoError', { defaultValue: 'Demo accounts cannot view rewards.' })}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-background px-6 pt-5 pb-10">
      {error ? <div className="mb-4 p-4 text-red-500">{error}</div> : null}

      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-h3-semibold text-foreground">{referralsTitle}</h2>
          <p className="text-body-small-regular text-muted-foreground mt-1">{referralsSubtitle}</p>
        </div>
        <div className="flex flex-wrap gap-3 md:shrink-0">
          <Button
            variant="primary-ghost"
            className="border-border bg-primary-50 text-button-small-medium! text-primary-500 hover:bg-muted inline-flex items-center gap-2 rounded border-none px-3 py-2 transition-colors"
            onClick={handleCopy}
          >
            {isCopied ? <Check size={16} /> : <Copy07 size={16} />}
            {isCopied
              ? t('referral.copiedTitle', 'Copied')
              : t('referral.copyButton', 'Copy Code')}
          </Button>
          <Button
            variant="primary-contained"
            className="border-primary-500 bg-primary-500 text-button-small-medium! hover:bg-primary-600 inline-flex h-auto items-center rounded border px-3 py-2 text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            disabled={availableAmountValue <= 0 || isClaiming}
            onClick={handleClaimAll}
          >
            {isClaiming ? t('rewards.claiming') : t('referral.myReferral.claimAll', 'Claim All')}
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mb-6">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="border-border bg-background rounded border px-4 py-3.5">
            <div className="mb-4 flex items-center justify-between">
              <Wallet02 size={24} className="text-primary-500" />
            </div>
            <p className="text-body-small-regular text-muted-foreground mb-1">
              {t('referral.myReferral.availableLabel', 'Available')}
            </p>
            <h1 className="text-h1-semibold text-foreground leading-none">${availableAmount}</h1>
          </div>
          <div className="border-border bg-background rounded border px-4 py-3.5">
            <div className="mb-4 flex items-center justify-between">
              <Users01 size={24} className="text-primary-500" />
            </div>
            <p className="text-body-small-regular text-muted-foreground mb-1">
              {t('referral.referrals30d', '30D referrals')}
            </p>
            <h1 className="text-h1-semibold text-foreground leading-none">{monthCount}</h1>
          </div>
          <div className="border-border bg-background rounded border px-4 py-3.5">
            <div className="mb-4 flex items-center justify-between">
              <CurrencyDollar size={24} className="text-primary-500" />
            </div>
            <p className="text-body-small-regular text-muted-foreground mb-1">
              {t('referral.myReferral.totalEarnedLabel', 'Total Earned')}
            </p>
            <h1 className="text-h1-semibold text-foreground leading-none">
              ${totalEarnedValue.toFixed(2)}
            </h1>
          </div>
        </div>
      </div>

      <ReferralMembersSection />
    </div>
  );
}
