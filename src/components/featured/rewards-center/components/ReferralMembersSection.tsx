'use client';

import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/shared/atoms/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shared/atoms/dialog';
import { Input } from '@/components/shared/atoms/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/shared/atoms/tooltip';
import { getReferralMembers, type ReferralMember } from '@/services/referralService';
import { useAuthStore } from '@/store/authStore';
import {
  AlertCircle,
  BarChart01,
  ChevronLeft,
  ChevronRight,
  CurrencyDollar,
  Eye,
  SearchLg,
  User01,
  Users01,
} from '@untitledui/icons';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

type MemberTrail = {
  label: string;
  userId: string;
  depth: number;
};

type VolumeEntry = {
  symbol: string;
  value: string;
};

const PAGE_SIZE = 6;

const formatCompact = (value: string | number) => {
  const n = typeof value === 'number' ? value : Number(value || 0);
  if (!Number.isFinite(n)) return '0';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);
};

const getPrimaryVolumeValue = (volume: Record<string, string> | undefined) => {
  if (!volume) return '0';
  const firstValue = Object.values(volume)[0];
  return firstValue ?? '0';
};

const getVolumeEntries = (volume: Record<string, string> | undefined) => {
  if (!volume) return [];
  return Object.entries(volume).map(([symbol, value]) => ({ symbol, value }));
};

const getVolumeTotal = (volume: Record<string, string> | undefined) => {
  if (!volume) return '0';
  const total = Object.values(volume).reduce((sum, value) => sum + Number(value || 0), 0);
  return Number.isFinite(total) ? String(total) : '0';
};

const getCompactSymbol = (symbol: string) => symbol.replace(/USD$/i, '');

const getDisplayUsername = (username: string, maxLength = 28) => {
  const value = username.trim();
  if (!value) return 'Member';
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
};

const formatVolumeInline = (volume: Record<string, string> | undefined, maxItems = 3) => {
  const entries = getVolumeEntries(volume);
  if (entries.length === 0) return 'No volume';
  const visibleText = entries
    .slice(0, maxItems)
    .map((entry) => `${getCompactSymbol(entry.symbol)} ${formatCompact(entry.value)}`)
    .join(' • ');

  const hiddenCount = entries.length - maxItems;
  if (hiddenCount > 0) {
    return `${visibleText} • +${hiddenCount}`;
  }
  return visibleText;
};

const formatJoinedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const getAvatarLabel = (username: string) => username.trim().charAt(0).toUpperCase() || 'U';

export default function ReferralMembersSection() {
  const currentUser = useAuthStore((state) => state.user);
  const rootUserId = currentUser?.id;
  const { t } = useTranslation();

  const [memberTrail, setMemberTrail] = useState<MemberTrail[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [skip, setSkip] = useState(0);
  const [totalByUserId, setTotalByUserId] = useState<Record<string, number>>({});
  const [volumePopup, setVolumePopup] = useState<{
    username: string;
    entries: VolumeEntry[];
  } | null>(null);

  const activeUserId = memberTrail[memberTrail.length - 1]?.userId ?? rootUserId;
  const searchValue = debouncedSearchQuery.trim();

  useEffect(() => {
    setMemberTrail([]);
    setSkip(0);
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setTotalByUserId({});
  }, [rootUserId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setSkip(0);
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  const { data, isFetching } = useQuery({
    queryKey: ['referral-members', activeUserId, skip, searchValue],
    queryFn: () =>
      getReferralMembers({
        userId: activeUserId as string,
        skip,
        take: PAGE_SIZE,
        search: searchValue || undefined,
      }),
    enabled: Boolean(activeUserId),
    staleTime: 30 * 1000,
  });

  const members = data?.items ?? [];
  const pagination = data?.pagination;
  const summary = data?.summary;
  useEffect(() => {
    if (!activeUserId || !pagination) return;
    setTotalByUserId((current) => ({
      ...current,
      [activeUserId]: pagination.total,
    }));
  }, [activeUserId, pagination]);

  const isChangingPage = isFetching && (pagination?.skip ?? -1) !== skip;
  const showTableSkeleton = isChangingPage || (isFetching && members.length === 0);
  const showPaginationSkeleton = isChangingPage;
  const currentPage = Math.floor((pagination?.skip ?? 0) / (pagination?.take ?? PAGE_SIZE)) + 1;
  const totalPages = Math.max(
    1,
    Math.ceil((pagination?.total ?? 0) / Math.max(1, pagination?.take ?? PAGE_SIZE)),
  );

  const openMemberDetails = (member: ReferralMember) => {
    setSkip(0);
    setSearchQuery('');
    setMemberTrail((current) => [
      ...current,
      {
        label: member.email,
        userId: member.accountId,
        depth: member.depth,
      },
    ]);
  };

  const goBackTrail = () => {
    setSkip(0);
    setSearchQuery('');
    setMemberTrail((current) => current.slice(0, -1));
  };

  const trailWithRoot = useMemo<MemberTrail[]>(
    () => [
      {
        label: currentUser?.username || 'You',
        userId: rootUserId || 'root',
        depth: 0,
      },
      ...memberTrail,
    ],
    [currentUser?.username, memberTrail, rootUserId, totalByUserId],
  );

  const handleSelectTrailItem = (index: number) => {
    setSkip(0);
    setSearchQuery('');
    if (index === 0) {
      setMemberTrail([]);
      return;
    }
    setMemberTrail((current) => current.slice(0, index));
  };

  const goPrevPage = () => {
    if (!pagination) return;
    setSkip(Math.max(0, pagination.skip - pagination.take));
  };

  const goNextPage = () => {
    if (!pagination || !pagination.hasNext) return;
    setSkip(pagination.skip + pagination.take);
  };

  const goToPage = (page: number) => {
    if (!pagination) return;
    const safePage = Math.min(Math.max(page, 1), totalPages);
    setSkip((safePage - 1) * pagination.take);
  };

  const visiblePages = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 3) {
      return [1, 2, 3, 4, 5];
    }

    if (currentPage >= totalPages - 2) {
      return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
  }, [currentPage, totalPages]);

  return (
    <div className="bg-background rounded">
      <div className="border-border overflow-hidden rounded border">
        <div className="flex min-h-195">
          <div className="border-border w-65.5 border-r">
            <div className="border-border flex items-center justify-between border-b px-4 py-5">
              <p className="text-body-large-semibold text-foreground">
                {t('rewardsCenter.referralMembers.members', 'Members')}
              </p>
              <p className="text-body-large-regular text-muted-foreground">
                {pagination?.total ?? 0} {t('rewardsCenter.referralMembers.total', 'total')}
              </p>
            </div>
            <div className="scrollbar-neutral-slim max-h-177.5 overflow-y-auto">
              {trailWithRoot.map((member, index) => {
                const isSelected = index === trailWithRoot.length - 1;
                return (
                  <Button
                    key={`${member.userId}-${index}`}
                    variant="white-contained"
                    onClick={() => handleSelectTrailItem(index)}
                    aria-pressed={isSelected}
                    className={`flex w-full items-center justify-between rounded-none px-4 py-5 ${
                      isSelected
                        ? 'border-primary-500 bg-muted border-l-4'
                        : 'border-l-4 border-transparent'
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
                          {member.label}
                        </p>
                        <p className="text-body-small-regular text-muted-foreground">
                          {t('rewardsCenter.referralMembers.level', 'Level')} {member.depth}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-button-small-medium rounded px-3 py-1.5 ${isSelected ? 'bg-primary-50 text-primary-500 dark:bg-primary-500/20 dark:text-primary-300' : 'bg-muted text-muted-foreground'}`}
                    >
                      {totalByUserId[member.userId] ?? 0}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="bg-background flex-1 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-h2-semibold text-foreground">
                  {t('rewardsCenter.referralMembers.members', 'Members')}
                </p>
                <p className="text-body-small-regular text-muted-foreground">
                  {pagination?.total ?? 0} {t('rewardsCenter.referralMembers.total', 'total')}
                </p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground inline-flex h-8 w-8 items-center justify-center rounded-full"
                    aria-label="Members info"
                  >
                    <AlertCircle size={24} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={6} className="max-w-80">
                  <p className="text-left leading-relaxed">
                    Click on a member to view their referral network and see the next referral
                    levels (Level 2 and beyond). This table only shows your direct referrals (Level
                    1) by default, while deeper referral levels are available inside each
                    member&apos;s detail view.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="mb-5 grid grid-cols-3 gap-3">
              <div className="border-border rounded border p-4">
                <div className="mb-4 flex items-center justify-start">
                  <CurrencyDollar size={24} className="text-primary-500" />
                </div>
                <p className="text-body-small-regular text-muted-foreground">
                  {t('rewardsCenter.referralMembers.volume', 'Volume')}
                </p>
                <h1 className="text-h1-semibold text-foreground">
                  {formatCompact(getVolumeTotal(summary?.depthTotalVolume))}
                </h1>
              </div>
              <div className="border-border rounded border p-4">
                <div className="mb-4 flex items-center justify-start">
                  <Eye size={24} className="text-primary-500" />
                </div>
                <p className="text-body-small-regular text-muted-foreground">
                  {t('rewardsCenter.referralMembers.viewDepth', 'View Depth')}
                </p>
                <h1 className="text-h1-semibold text-foreground">{summary?.viewDepth ?? 0}</h1>
              </div>
              <div className="border-border rounded border p-4">
                <div className="mb-4 flex items-center justify-start">
                  <User01 size={24} className="text-primary-500" />
                </div>
                <p className="text-body-small-regular text-muted-foreground">
                  {t('rewardsCenter.referralMembers.directReferrals', 'Direct Referrals')}
                </p>
                <h1 className="text-h1-semibold text-foreground">{summary?.directRefCount ?? 0}</h1>
              </div>
            </div>

            <div className="border-border overflow-x-auto border">
              <table className="min-w-full">
                <thead>
                  <tr className="border-border bg-muted border-b">
                    <th className="text-body-small-regular text-muted-foreground px-4 py-3 text-left">
                      {t('rewardsCenter.referralMembers.user', 'User')}
                    </th>
                    <th className="text-body-small-regular text-muted-foreground px-4 py-3 text-center">
                      {t('rewardsCenter.referralMembers.level', 'Level')}
                    </th>
                    <th className="text-body-small-regular text-muted-foreground px-4 py-3 text-left">
                      {t('rewardsCenter.referralMembers.volume', 'Volume')}
                    </th>
                    <th className="text-body-small-regular text-muted-foreground px-4 py-3 text-right">
                      {t('rewardsCenter.referralMembers.viewDepth', 'View Depth')}
                    </th>
                    <th className="text-body-small-regular text-muted-foreground px-4 py-3 text-right">
                      {t('rewardsCenter.referralMembers.totalDescendants', 'Total Descendants')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {showTableSkeleton ? (
                    Array.from({ length: 3 }, (_, index) => (
                      <tr
                        key={`skeleton-${index}`}
                        className="border-border border-b last:border-b-0"
                      >
                        <td className="px-4 py-3">
                          <div className="bg-muted h-5 w-28 animate-pulse rounded" />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="bg-muted h-5 w-10 animate-pulse rounded" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="bg-muted h-5 w-16 animate-pulse rounded" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="bg-muted h-5 w-16 animate-pulse rounded" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="bg-muted h-5 w-12 animate-pulse rounded" />
                        </td>
                      </tr>
                    ))
                  ) : members.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-body-large-medium text-muted-foreground px-4 py-10 text-center"
                      >
                        {searchValue
                          ? t(
                              'rewardsCenter.referralMembers.noReferralsKeyword',
                              'No referrals found for this keyword',
                            )
                          : t(
                              'rewardsCenter.referralMembers.noReferralMembers',
                              'No referral members yet',
                            )}
                      </td>
                    </tr>
                  ) : (
                    members.map((row) => (
                      <tr key={row.accountId} className="border-border border-b last:border-b-0">
                        <td className="text-body-large-medium text-foreground px-4 py-3">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1"
                            onClick={() => openMemberDetails(row)}
                          >
                            {row.email}
                            <ChevronRight size={14} className="text-muted-foreground" />
                          </button>
                        </td>
                        <td className="text-body-large-medium text-foreground px-4 py-3 text-center">
                          <span className="text-body-large-medium text-foreground bg-muted rounded px-4 py-1">
                            {row.depth}
                          </span>
                        </td>
                        <td className="text-body-large-medium text-foreground px-4 py-3">
                          <div className="flex max-w-56 flex-col gap-1">
                            <span>{formatCompact(getVolumeTotal(row.volume))}</span>
                            <div
                              className="no-scrollbar max-w-56 cursor-pointer overflow-x-auto pb-1"
                              onClick={() =>
                                setVolumePopup({
                                  username: row.email,
                                  entries: getVolumeEntries(row.volume),
                                })
                              }
                              role="button"
                              tabIndex={0}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  setVolumePopup({
                                    username: row.email,
                                    entries: getVolumeEntries(row.volume),
                                  });
                                }
                              }}
                              aria-label={`View volume details of ${row.email}`}
                            >
                              <div className="flex w-max flex-nowrap gap-1 pr-1">
                                {getVolumeEntries(row.volume).map((entry) => (
                                  <span
                                    key={entry.symbol}
                                    className="text-caption-medium bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5 whitespace-nowrap"
                                  >
                                    {`${getCompactSymbol(entry.symbol)} ${formatCompact(entry.value)}`}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="text-body-large-medium text-foreground px-4 py-3 text-right">
                          {row.directRefCount}
                        </td>
                        <td className="text-body-large-medium text-foreground px-4 py-3 text-right">
                          {row.totalDescendantCount}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              {showPaginationSkeleton ? (
                <>
                  <div className="bg-muted h-4 w-40 animate-pulse rounded" />
                  <div className="flex items-center gap-2">
                    <div className="bg-muted h-8 w-8 animate-pulse rounded" />
                    {Array.from({ length: 3 }, (_, index) => (
                      <div
                        key={`pagination-skeleton-${index}`}
                        className="bg-muted h-8 w-9 animate-pulse rounded"
                      />
                    ))}
                    <div className="bg-muted h-8 w-8 animate-pulse rounded" />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-body-small-regular text-muted-foreground">
                    {t(
                      'rewardsCenter.referralMembers.showing',
                      'Showing {{count}} of {{total}} referrals',
                      {
                        count: members.length,
                        total: pagination?.total ?? 0,
                      },
                    )}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-muted-foreground rounded-full p-1 disabled:opacity-50"
                      disabled={!pagination || pagination.skip <= 0}
                      onClick={goPrevPage}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    {visiblePages[0] > 1 ? (
                      <>
                        <button
                          type="button"
                          className="text-button-small-medium text-foreground w-9 rounded py-2"
                          onClick={() => goToPage(1)}
                        >
                          1
                        </button>
                        {visiblePages[0] > 2 ? (
                          <span className="text-muted-foreground px-1">...</span>
                        ) : null}
                      </>
                    ) : null}
                    {visiblePages.map((page) => (
                      <button
                        key={page}
                        type="button"
                        className={`text-button-small-medium w-9 rounded py-2 ${
                          page === currentPage ? 'bg-primary-500 text-white' : 'text-foreground'
                        }`}
                        onClick={() => goToPage(page)}
                      >
                        {page}
                      </button>
                    ))}
                    {visiblePages[visiblePages.length - 1] < totalPages ? (
                      <>
                        {visiblePages[visiblePages.length - 1] < totalPages - 1 ? (
                          <span className="text-muted-foreground px-1">...</span>
                        ) : null}
                        <button
                          type="button"
                          className="text-button-small-medium text-foreground w-9 rounded py-2"
                          onClick={() => goToPage(totalPages)}
                        >
                          {totalPages}
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      className="text-muted-foreground rounded-full p-1 disabled:opacity-50"
                      disabled={!pagination?.hasNext}
                      onClick={goNextPage}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <Dialog
        open={Boolean(volumePopup)}
        onOpenChange={(open) => {
          if (!open) setVolumePopup(null);
        }}
      >
        <DialogContent className="border-none sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Volume details</DialogTitle>
            {volumePopup?.username ? (
              <p className="text-body-small-regular text-muted-foreground mt-1 truncate">
                Member: {getDisplayUsername(volumePopup.username)}
              </p>
            ) : null}
          </DialogHeader>
          <div className="no-scrollbar max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(volumePopup?.entries ?? []).map((entry) => (
                <div
                  key={entry.symbol}
                  className="bg-muted flex items-center justify-between rounded px-3 py-2"
                >
                  <span className="text-body-small-medium text-foreground">
                    {getCompactSymbol(entry.symbol)}
                  </span>
                  <span className="text-body-small-semibold text-foreground">
                    {formatCompact(entry.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
