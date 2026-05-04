'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
    BarLineChart,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  CoinsHand,
  Copy07,
  CurrencyDollar,
  User01,
  Users01,
  Wallet02,
} from '@untitledui/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/shared/atoms/button';
import { ACCOUNT_TYPES_ID } from '@/constants/account';
import { useToast } from '@/hook/useToast';
import { useReferralStats } from '@/hook/useReferralStats';
import { claimRewards, getUnclaimedAmount } from '@/services/reward.service';
import { getReferralMembers, type ReferralMember } from '@/services/referralService';
import { useAccountStore } from '@/store/useAccountStore';
import { useAuthStore } from '@/store/authStore';
import { CommissionPayoutDetailType } from '@/types/reward.types';
import { copyText } from '@/utils/copy';
import { generateUUID } from '@/utils/uuid';

type MyReferralProps = {
  onBack?: () => void;
  entryFromReferral?: boolean;
  hideHeader?: boolean;
};

type MemberTrail = {
  label: string;
  userId: string;
  depth: number;
};

const PAGE_SIZE = 5;

const formatCompact = (value: string | number) => {
  const n = typeof value === 'number' ? value : Number(value || 0);
  if (!Number.isFinite(n)) return '0';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);
};

const getVolumeTotal = (volume: Record<string, string> | undefined) => {
  if (!volume) return '0';
  const total = Object.values(volume).reduce((sum, item) => sum + Number(item || 0), 0);
  return Number.isFinite(total) ? String(total) : '0';
};

const getVolumeEntries = (volume: Record<string, string> | undefined) => {
  if (!volume) return [];
  return Object.entries(volume);
};

const compactSymbol = (symbol: string) => symbol.replace(/USD$/i, '');

const getAvatarLabel = (email: string) => email.trim().charAt(0).toUpperCase() || 'M';

const getDisplayEmail = (email: string, fallback: string, maxLength = 18) => {
  if (!email) return fallback;
  return email.length > maxLength ? `${email.slice(0, maxLength)}...` : email;
};

export default function MyReferral({
  onBack,
  entryFromReferral = false,
  hideHeader = false,
}: MyReferralProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const currentUser = useAuthStore((state) => state.user);

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
  const [availableAmount, setAvailableAmount] = useState('0.00');
  const [isClaiming, setIsClaiming] = useState(false);
  const [isReferralCodeCopied, setIsReferralCodeCopied] = useState(false);
  const copyResetTimeoutRef = useRef<number | null>(null);
  const [memberTrail, setMemberTrail] = useState<MemberTrail[]>([]);
  const [skip, setSkip] = useState(0);
  const [totalByUserId, setTotalByUserId] = useState<Record<string, number>>({});
  const isDemoAccount = selectedAccount?.accountTypeId === ACCOUNT_TYPES_ID.DEMO;
  const rootUserId = currentUser?.id;
  const activeUserId = memberTrail[memberTrail.length - 1]?.userId ?? rootUserId;

  const { data: referralStats } = useReferralStats(
    {},
    {
      enabled: isHydrated,
    },
  );

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
      setFilterApplied(false);

      if (!entryFromReferral && entry === 'referral') {
        router.replace('/referral/my', { scroll: false });
      }

      setIsHydrated(true);
      return;
    }

    const applied = sessionStorage.getItem('referralFilterApplied') === 'true';
    setFilterApplied(applied);
    setIsHydrated(true);
  }, [entryFromReferral, searchParams, router]);

  useEffect(() => {
    if (!isHydrated || filterApplied) return;
    void refreshUnclaimed();
  }, [filterApplied, isHydrated, refreshUnclaimed]);

  const totalEarnedValue = Number(referralStats?.totalAmountInPeriod || 0);
  const totalReferrals = Number(referralStats?.totalReferralCount || 0);

  const { data: membersData, isFetching: isMembersLoading } = useQuery({
    queryKey: ['referral-members-mobile', activeUserId, skip],
    queryFn: () =>
      getReferralMembers({
        userId: activeUserId as string,
        skip,
        take: PAGE_SIZE,
      }),
    enabled: Boolean(activeUserId),
    staleTime: 30 * 1000,
  });

  const members = membersData?.items ?? [];
  const membersPagination = membersData?.pagination;
  const membersSummary = membersData?.summary;
  const currentPage =
    Math.floor((membersPagination?.skip ?? 0) / (membersPagination?.take ?? PAGE_SIZE)) + 1;
  const totalPages = Math.max(
    1,
    Math.ceil((membersPagination?.total ?? 0) / Math.max(1, membersPagination?.take ?? PAGE_SIZE)),
  );

  useEffect(() => {
    if (!activeUserId || !membersPagination) return;
    setTotalByUserId((current) => ({
      ...current,
      [activeUserId]: membersPagination.total,
    }));
  }, [activeUserId, membersPagination]);

  useEffect(() => {
    setSkip(0);
  }, [activeUserId]);

  const openMemberDetails = (member: ReferralMember) => {
    if (!member.hasChildren) return;
    setSkip(0);
    setMemberTrail((current) => [
      ...current,
      {
        label: member.email,
        userId: member.accountId,
        depth: member.depth,
      },
    ]);
  };

  const trailWithRoot = useMemo<MemberTrail[]>(
    () => [
      {
        label: currentUser?.username || t('common.you', { defaultValue: 'You' }),
        userId: rootUserId || 'root',
        depth: 0,
      },
      ...memberTrail,
    ],
    [currentUser?.username, memberTrail, rootUserId, t],
  );

  const handleSelectTrailItem = (index: number) => {
    setSkip(0);
    if (index === 0) {
      setMemberTrail([]);
      return;
    }
    setMemberTrail((current) => current.slice(0, index));
  };

  const visiblePages = useMemo(() => {
    if (totalPages <= 3) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }
    if (currentPage <= 2) {
      return [1, 2, 3];
    }
    if (currentPage >= totalPages - 1) {
      return [totalPages - 2, totalPages - 1, totalPages];
    }
    return [currentPage - 1, currentPage, currentPage + 1];
  }, [currentPage, totalPages]);

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

  const handleCopyReferralLink = async () => {
    const referralCode = currentUser?.referenceCode?.trim();

    if (!referralCode) {
      showError(
        t('referral.copyFailedTitle', { defaultValue: 'Copy failed' }),
        t('referral.copyFailedMessage', {
          defaultValue: 'Cannot copy referral code. Please try again.',
        }),
      );
      return;
    }

    const isCopied = await copyText(referralCode);

    if (isCopied) {
      showSuccess(
        t('referral.copiedTitle', { defaultValue: 'Copied' }),
        t('referral.copiedMessage', { defaultValue: 'Referral code copied to clipboard' }),
      );
      setIsReferralCodeCopied(true);
      if (copyResetTimeoutRef.current) {
        window.clearTimeout(copyResetTimeoutRef.current);
      }
      copyResetTimeoutRef.current = window.setTimeout(() => {
        setIsReferralCodeCopied(false);
      }, 3000);
      return;
    }

    showError(
      t('referral.copyFailedTitle', { defaultValue: 'Copy failed' }),
      t('referral.copyFailedMessage', {
        defaultValue: 'Cannot copy referral code. Please try again.',
      }),
    );
  };

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current) {
        window.clearTimeout(copyResetTimeoutRef.current);
      }
    };
  }, []);

  if (isDemoAccount) {
    return (
      <div className={`bg-background flex flex-col ${hideHeader ? 'min-h-0 flex-1' : 'min-h-dvh'}`}>
        {!hideHeader && (
          <div className="flex h-15 items-center justify-between px-4">
            <button
              className="p-1"
              onClick={handleBack}
              aria-label={t('referral.myReferral.backAria')}
              type="button"
            >
              <ChevronLeft size={24} className="text-foreground" />
            </button>
            <p className="text-h3-semibold text-foreground">{t('referral.myReferral.title')}</p>
            <div className="h-8 w-8" />
          </div>
        )}

        <div className="flex h-[60vh] flex-col items-center justify-center px-4 text-center">
          <p className="text-body-large-medium text-muted-foreground">
            {t('rewards.demoAccountNotApplicable')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-background flex flex-col px-4 ${hideHeader ? 'min-h-0 flex-1' : 'min-h-dvh'}`}
    >
      {!hideHeader ? (
        <div className="flex h-15 items-center justify-between">
          <button
            className="p-1"
            onClick={handleBack}
            aria-label={t('referral.myReferral.backAria')}
            type="button"
          >
            <ChevronLeft size={24} className="text-foreground" />
          </button>
          <p className="text-h3-semibold text-foreground">{t('referral.myReferral.title')}</p>
          <div className="h-8 w-8" />
        </div>
      ) : (
        <>
          <div className="flex flex-col items-start pt-5">
            <p className="text-body-large-semibold text-foreground">
              {t('referral.myReferral.title', { defaultValue: 'Referral' })}
            </p>
            <p className="text-body-large-regular text-muted-foreground">
              {t('referral.referralsSubtitle', {
                defaultValue: 'Manage your referrals and earnings',
              })}
            </p>
          </div>
        </>
      )}

      <div
        className={
          hideHeader
            ? 'scrollbar-neutral-slim flex min-h-0 flex-1 flex-col overflow-y-auto pb-6'
            : 'flex flex-col pb-6'
        }
      >
        <div className="pt-4">
          <div className="mb-4">
            <div className="mb-6.5 flex max-w-full items-center justify-between gap-2">
              <Button
                className="text-button-small-medium bg-primary-50 min-w-0 flex-1 border-none px-2.5 py-3"
                variant="neutral-outline"
                onClick={() => void handleCopyReferralLink()}
              >
                {isReferralCodeCopied ? (
                  <Check size={20} className="text-primary-500" />
                ) : (
                  <Copy07 size={20} className="text-primary-500" />
                )}
                <span className="text-primary-500">
                  {isReferralCodeCopied
                    ? t('referral.copiedTitle', { defaultValue: 'Copied' })
                    : t('referral.copyButton', { defaultValue: 'Copy Referral Code' })}
                </span>
              </Button>
              <Button
                className="text-button-small-medium min-w-0 flex-1 px-2.5 py-3"
                disabled={Number(availableAmount) <= 0 || isClaiming}
                onClick={() => void handleClaimAll()}
              >
                {t('referral.myReferral.claimAll')}
              </Button>
            </div>

            <div className="mb-2 grid grid-cols-2 gap-2">
              <div className="border-border rounded border p-4">
                <Wallet02 size={24} className="text-primary-500 mb-4" />
                <p className="text-body-small-regular text-muted-foreground">
                  {t('referral.myReferral.availableLabel')}
                </p>
                <p className="text-h1-semibold text-foreground">${availableAmount}</p>
              </div>
              <div className="border-border rounded border p-4">
                <Users01 size={24} className="text-primary-500 mb-4" />
                <p className="text-body-small-regular text-muted-foreground">
                  {t('referral.referrals', { defaultValue: 'Referrals' })}
                </p>
                <p className="text-h1-semibold text-foreground">{totalReferrals}</p>
              </div>
            </div>

            <div className="border-border rounded border p-4">
              <CurrencyDollar size={24} className="text-primary-500 mb-4" />
              <p className="text-body-small-regular text-muted-foreground">
                {t('referral.myReferral.totalEarnedLabel')}
              </p>
              <p className="text-h1-semibold text-foreground">${totalEarnedValue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="border-border rounded border p-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-body-large-semibold text-foreground">
              {t('rewardsCenter.referralMembers.members', { defaultValue: 'Members' })}
            </p>
            <p className="text-body-large-regular text-muted-foreground">
              {membersPagination?.total ?? 0}{' '}
              {t('rewardsCenter.referralMembers.total', { defaultValue: 'total' })}
            </p>
          </div>

          <div className="-mx-4 mb-3 space-y-2">
            {trailWithRoot.map((member, index) => {
              const isSelected = index === trailWithRoot.length - 1;
              return (
                <button
                  key={`${member.userId}-${index}`}
                  type="button"
                  onClick={() => handleSelectTrailItem(index)}
                  className={`relative flex w-full items-center justify-between px-4 py-3 ${
                    isSelected
                      ? 'bg-muted before:bg-primary-500 before:absolute before:top-0 before:left-0 before:h-full before:w-1 before:content-[""]'
                      : 'border-border'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="bg-primary-500 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                      <span className="text-body-large-semibold text-white">
                        {getAvatarLabel(member.label)}
                      </span>
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="text-body-large-semibold text-foreground truncate">
                        {getDisplayEmail(
                          member.label,
                          t('referral.myReferral.memberFallback', { defaultValue: 'Member' }),
                        )}
                      </p>
                      <p className="text-body-large-regular text-muted-foreground">
                        {t('referral.myReferral.levelLabel', {
                          defaultValue: 'Level {{level}}',
                          level: member.depth,
                        })}
                      </p>
                    </div>
                  </div>
                  <span className="text-body-small-medium bg-primary-50 text-primary-500 rounded px-3 py-2">
                    {totalByUserId[member.userId] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="border-border rounded-md border p-3">
              <div className="mb-4 flex items-center justify-between">
                <CurrencyDollar size={24} className="text-primary-500" />
              </div>
              <p className="text-body-small-regular text-muted-foreground">
                {t('rewardsCenter.referralMembers.volume', { defaultValue: 'Volume' })}
              </p>
              <p className="text-h1-semibold text-foreground">
                ${formatCompact(getVolumeTotal(membersSummary?.depthTotalVolume))}
              </p>
            </div>
            <div className="border-border rounded-md border p-3">
              <div className="mb-4 flex items-center justify-between">
                <BarLineChart size={24} className="text-primary-500" />
              </div>
              <p className="text-body-small-regular text-muted-foreground">
                {t('rewardsCenter.referralMembers.trades', { defaultValue: 'Trades' })}
              </p>
              <p className="text-h1-semibold text-foreground">{membersSummary?.viewDepth ?? 0}</p>
            </div>
            <div className="border-border col-span-2 rounded-md border p-3">
              <div className="mb-4 flex items-center justify-between">
                <User01 size={24} className="text-primary-500" />
              </div>
              <p className="text-body-small-regular text-muted-foreground">
                {t('rewardsCenter.referralMembers.directReferrals', {
                  defaultValue: 'Direct referrals',
                })}
              </p>
              <p className="text-h1-semibold text-foreground">
                {membersSummary?.directRefCount ?? 0}
              </p>
            </div>
          </div>
          {!isHydrated || isMembersLoading ? (
            <div className="space-y-3">
              {Array.from({ length: PAGE_SIZE }).map((_, index) => (
                <div
                  key={`member-skeleton-${index}`}
                  className="border-border w-full border-b px-0 py-3 last:border-b-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="bg-muted mb-3 h-5 w-40 animate-pulse rounded" />
                      <div className="mb-2 flex gap-8">
                        <div className="space-y-2">
                          <div className="bg-muted h-3 w-14 animate-pulse rounded" />
                          <div className="bg-muted h-5 w-16 animate-pulse rounded" />
                        </div>
                        <div className="space-y-2">
                          <div className="bg-muted h-3 w-14 animate-pulse rounded" />
                          <div className="bg-muted h-5 w-10 animate-pulse rounded" />
                        </div>
                        <div className="space-y-2">
                          <div className="bg-muted h-3 w-10 animate-pulse rounded" />
                          <div className="bg-muted h-5 w-12 animate-pulse rounded" />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="bg-muted h-6 w-18 animate-pulse rounded" />
                        <div className="bg-muted h-6 w-18 animate-pulse rounded" />
                      </div>
                    </div>
                    <div className="bg-muted h-7 w-14 animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {members.length === 0 ? (
                <div className="rounded-lg border px-4 py-8 text-center">
                  <p className="text-body-large-medium text-muted-foreground">
                    {t('rewardsCenter.referralMembers.noReferralMembers', {
                      defaultValue: 'No referral members yet',
                    })}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => (
                    <button
                      key={member.accountId}
                      type="button"
                      onClick={() => openMemberDetails(member)}
                      className="border-border w-full border-b px-0 py-3 text-left last:border-b-0"
                    >
                      <div className="flex items-start justify-between gap-2">
                          <p className="text-body-large-semibold text-foreground mb-3 truncate">
                            {getDisplayEmail(
                              member.email,
                              t('referral.myReferral.memberFallback', { defaultValue: 'Member' }),
                              24,
                            )}
                          </p>
                        <span className="text-caption-medium text-muted-foreground bg-muted rounded px-2 py-1">
                          {t('referral.myReferral.levelShortLabel', {
                            defaultValue: 'Lv {{level}}',
                            level: member.depth,
                          })}
                        </span>
                      </div>
                      <div className="mb-2 flex gap-8">
                            <div>
                              <p className="text-body-small-regular text-muted-foreground">
                                {t('rewardsCenter.referralMembers.volume', {
                                  defaultValue: 'Volume',
                                })}
                              </p>
                              <p className="text-body-large-semibold text-foreground">
                                {formatCompact(getVolumeTotal(member.volume))}
                              </p>
                            </div>
                            <div>
                              <p className="text-body-small-regular text-muted-foreground">
                                {t('rewardsCenter.referralMembers.trades', {
                                  defaultValue: 'Trades',
                                })}
                              </p>
                              <p className="text-body-large-semibold text-foreground">
                                {member.directRefCount}
                              </p>
                            </div>
                            <div>
                              <p className="text-body-small-regular text-muted-foreground">
                                {t('rewardsCenter.referralMembers.totalDescendants', {
                                  defaultValue: 'Team',
                                })}
                              </p>
                              <p className="text-body-large-semibold text-foreground">
                                {member.totalDescendantCount}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {getVolumeEntries(member.volume).map(([symbol, value]) => (
                              <span
                                key={`${member.accountId}-${symbol}`}
                                className="text-caption-medium text-primary-500 bg-primary-50 rounded px-2 py-1"
                              >
                                {compactSymbol(symbol)} {formatCompact(value)}
                              </span>
                            ))}
                          </div>
                    </button>
                  ))}

                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="text-body-small-regular text-muted-foreground">
                      {t('rewardsCenter.referralMembers.showing', {
                        defaultValue: 'Showing {{count}} of {{total}} referrals',
                        count: members.length,
                        total: membersPagination?.total ?? 0,
                      })}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSkip((currentPage - 2) * PAGE_SIZE)}
                        disabled={currentPage <= 1}
                        className="text-muted-foreground rounded p-1 disabled:opacity-40"
                        aria-label={t('common.previous', { defaultValue: 'Previous page' })}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      {visiblePages.map((page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setSkip((page - 1) * PAGE_SIZE)}
                          className={`h-8 min-w-8 rounded-md px-2 text-sm font-medium ${
                            page === currentPage ? 'bg-primary-500 text-white' : 'text-foreground'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setSkip(currentPage * PAGE_SIZE)}
                        disabled={!membersPagination?.hasNext}
                        className="text-muted-foreground rounded p-1 disabled:opacity-40"
                        aria-label={t('common.next', { defaultValue: 'Next page' })}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
