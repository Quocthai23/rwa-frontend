'use client';

import {
  DotsHorizontal,
  Calendar,
  ChevronRight,
  InfoCircle,
  LinkExternal01,
  MinusCircle,
  Share04,
  XClose,
} from '@untitledui/icons';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/shared/atoms/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/shared/atoms/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shared/atoms/dropdown-menu';
import { useToast } from '@/hook/useToast';
import { authApi } from '@/services/auth';
import { userApi, type UserRelationListItem } from '@/services/userService';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types/auth';
import { localizeApiError } from '@/i18n/apiErrors';
import { cn } from '@/lib/utils';
import { DISCOVER_USER_PLACEHOLDER_ICON } from '../../hooks/constants';
import { useProfileBlockAction } from '../../../web/hooks/useProfileBlockAction';
import { WallFeed } from './WallFeed';

type AuthorWallProps = {
  onOpenAuthorProfile?: (authorId: string) => void;
  userId: string;
};

const DEFAULT_PROFILE_BANNER = '/assets/images/market/banner-view.png';

function formatJoinedMonthYear(iso: string, locale: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(locale || 'en', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

type FollowListUser = Pick<UserRelationListItem, 'avatar' | 'id' | 'username'> & {
  displayName?: null | string;
};

function FollowListDialog({
  onOpenChange,
  open,
  type,
  userId,
  onOpenAuthorProfile,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  type: 'following' | 'followers' | null;
  userId: string;
  onOpenAuthorProfile?: (authorId: string) => void;
}) {
  const { t } = useTranslation();
  const { showError } = useToast();
  const [users, setUsers] = useState<FollowListUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId || !type) return;

    let isMounted = true;
    setIsLoading(true);

    const fetchRelations = async () => {
      try {
        const relation = type === 'following' ? 'followings' : 'follower';
        const response = await userApi.listMyRelations({
          relation,
          skip: 0,
          take: 50,
          userId,
        });

        if (isMounted) {
          setUsers(response.data ?? []);
        }
      } catch (error) {
        if (isMounted) {
          setUsers([]);
          showError(
            t('discover.web.loadUsersFailedTitle', 'Unable to load users'),
            localizeApiError(error, t, 'discover.web.loadUsersFailedMessage'),
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchRelations();

    return () => {
      isMounted = false;
    };
  }, [open, showError, t, type, userId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[80dvh] w-full max-w-md flex-col overflow-hidden rounded border-none p-0 sm:w-172 sm:max-w-[92vw] sm:rounded-lg"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">
          {' '}
          {type === 'following'
            ? t('discover.web.following', 'Following')
            : t('discover.web.followers', 'Followers')}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {t('discover.web.noUsersFound', 'No followers yet.')}
        </DialogDescription>
        <div className="bg-background border-border flex shrink-0 items-center justify-between border-b p-4 sm:p-6">
          <p className="text-foreground text-body-large-semibold">
            {type === 'following'
              ? t('discover.web.following', 'Following')
              : t('discover.web.followers', 'Followers')}
          </p>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <XClose className="size-6" />
          </button>
        </div>
        <div className="scrollbar-neutral-slim overflow-y-auto p-4 sm:p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="bg-muted h-11 w-11 shrink-0 animate-pulse rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="bg-muted h-4 w-24 animate-pulse rounded" />
                    <div className="bg-muted h-3 w-16 animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length > 0 ? (
            <div className="space-y-4">
              {users.map((u, index) => (
                <div key={u.id || index} className="flex items-center justify-between">
                  <button
                    type="button"
                    className="flex items-center gap-3 text-left transition-opacity hover:opacity-80"
                    onClick={() => {
                      if (u.id && onOpenAuthorProfile) {
                        onOpenAuthorProfile(u.id);
                        onOpenChange(false);
                      }
                    }}
                  >
                    <div className="bg-muted relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
                      <Image
                        src={u.avatar || DISCOVER_USER_PLACEHOLDER_ICON}
                        alt={u.displayName || u.username || 'User avatar'}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-foreground text-body-small-medium">
                        {u.displayName || u.username}
                      </p>
                      <p className="text-muted-foreground text-caption-regular">@{u.username}</p>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-body-small-regular py-8 text-center">
              {t('discover.web.noUsersFound', 'No followers yet.')}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AuthorWall({ onOpenAuthorProfile, userId }: AuthorWallProps) {
  const { i18n, t } = useTranslation();
  const { showInfo, showSuccess } = useToast();
  const currentUser = useAuthStore((state) => state.user);
  const { data: queriedAuthor } = useQuery({
    enabled: Boolean(userId),
    queryFn: async () => authApi.getUserId(userId),
    queryKey: ['discover-author-profile', userId],
  });

  const [author, setAuthor] = useState<User | null>(null);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);
  const [followListType, setFollowListType] = useState<'following' | 'followers' | null>(null);
  const reloadPostsRef = useRef<(() => Promise<void>) | undefined>(undefined);

  useEffect(() => {
    setAuthor(queriedAuthor ?? null);
  }, [queriedAuthor]);

  const isOwnProfile = Boolean(currentUser?.id && author?.id && currentUser.id === author.id);
  const isFollowingAuthor = Boolean(author?.isFollowing);
  const isBlockingAuthor = Boolean(author?.isBlocking);
  const canOpenFollowList = Boolean(author?.id);

  const displayName =
    author?.displayName?.trim() || author?.username || t('discover.web.guest', 'Guest Trader');
  const displayHandle = author?.username
    ? `@${author.username}`
    : t('discover.web.guestHandle', '@guest');
  const joinedLabel = useMemo(() => {
    if (!author?.createdAt) {
      return null;
    }

    const formatted = formatJoinedMonthYear(author.createdAt, i18n.language || 'en');
    if (!formatted) {
      return null;
    }

    return t('discover.web.joinedDate', 'Joined {{date}}', { date: formatted });
  }, [author?.createdAt, i18n.language, t]);
  const authorCoverAvatar =
    author && 'coverAvatar' in author
      ? (author as { coverAvatar?: null | string }).coverAvatar
      : undefined;
  const safeAuthorBanner = authorCoverAvatar || DEFAULT_PROFILE_BANNER;

  const handleToggleFollow = useCallback(() => {
    if (!author?.id || isOwnProfile || isTogglingFollow) {
      return;
    }

    const previousFollowing = Boolean(author.isFollowing);
    const nextFollowing = !previousFollowing;

    setIsTogglingFollow(true);
    setAuthor((prev) => {
      if (!prev) {
        return prev;
      }

      const followerCount = Math.max(0, (prev.followerCount ?? 0) + (nextFollowing ? 1 : -1));
      return {
        ...prev,
        followerCount,
        isFollowing: nextFollowing,
      };
    });

    void (async () => {
      try {
        const response = await userApi.upsertUserRelation(author.id, {
          action: nextFollowing ? 'follow' : 'unfollow',
        });

        setAuthor((prev) => (prev ? { ...prev, isFollowing: response.isFollowing } : prev));
      } catch {
        setAuthor((prev) => {
          if (!prev) {
            return prev;
          }

          const followerCount = Math.max(
            0,
            (prev.followerCount ?? 0) + (previousFollowing ? 1 : -1),
          );
          return {
            ...prev,
            followerCount,
            isFollowing: previousFollowing,
          };
        });
      } finally {
        setIsTogglingFollow(false);
      }
    })();
  }, [author, isOwnProfile, isTogglingFollow]);

  const profileLink = useMemo(() => {
    if (typeof window === 'undefined' || !author?.id) {
      return '';
    }

    const profileUrl = new URL(window.location.href);
    profileUrl.searchParams.set('tab', 'profile');
    profileUrl.searchParams.set('userId', author.id);
    return profileUrl.toString();
  }, [author?.id]);

  const handleShareProfile = useCallback(async () => {
    if (!profileLink) {
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          text: t('discover.web.shareProfileText', 'Check out this profile'),
          title: displayHandle,
          url: profileLink,
        });
        return;
      } catch {
        // Fall back to clipboard if share is unavailable or canceled.
      }
    }

    try {
      await navigator.clipboard.writeText(profileLink);
      showSuccess(
        t('discover.web.profileLinkCopiedTitle', 'Copied'),
        t('discover.web.profileLinkCopiedMessage', 'Profile link copied.'),
      );
    } catch {
      showInfo(
        t('discover.web.shareUnavailableTitle', 'Share unavailable'),
        t('discover.web.shareUnavailableMessage', 'Unable to share this profile right now.'),
      );
    }
  }, [displayHandle, profileLink, showInfo, showSuccess, t]);

  const handleCopyProfileLink = useCallback(async () => {
    if (!profileLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(profileLink);
      showSuccess(
        t('discover.web.profileLinkCopiedTitle', 'Copied'),
        t('discover.web.profileLinkCopiedMessage', 'Profile link copied.'),
      );
    } catch {
      showInfo(
        t('discover.web.copyUnavailableTitle', 'Copy unavailable'),
        t('discover.web.copyUnavailableMessage', 'Unable to copy profile link right now.'),
      );
    }
  }, [profileLink, showInfo, showSuccess, t]);
  const { handleBlockProfile, isBlockActionLoading } = useProfileBlockAction({
    activeProfileId: author?.id,
    isBlockingProfile: isBlockingAuthor,
    isOwnProfile,
    onRefetchSuggestedCreators: undefined,
    onReloadPosts: () => reloadPostsRef.current?.(),
    profileHandleLabel: displayHandle,
    queryUserProfile: author,
    setQueryUserProfile: setAuthor,
    showInfo,
    showSuccess,
    t,
  });

  return (
    <div className="flex w-full flex-col">
      {author ? (
        <div className="flex w-full flex-col pb-6">
          <div className="bg-muted relative h-48 w-full sm:h-60">
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${safeAuthorBanner})` }}
            />

            {!isOwnProfile && (
              <div className="absolute right-4 bottom-4 z-40 flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="white-outline"
                      className="bg-background/80 hover:bg-background text-foreground border-border h-9 w-9 rounded-full backdrop-blur-sm"
                      aria-label={t('discover.web.openProfileActions', 'Open profile actions')}
                    >
                      <DotsHorizontal className="size-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="border-border bg-card w-63 rounded border p-3 shadow-[3px_3px_12px_0px_rgba(0,0,0,0.15)]"
                  >
                    <DropdownMenuItem
                      className="text-foreground text-body-large-semibold gap-3 rounded px-3 py-4"
                      onClick={() => void handleShareProfile()}
                    >
                      <Share04 className="size-5" />
                      <span>
                        {t('discover.web.shareProfile', 'Share {{handle}}', {
                          handle: displayHandle,
                        })}
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-foreground text-body-large-semibold gap-3 rounded px-3 py-4"
                      onClick={() => void handleCopyProfileLink()}
                    >
                      <LinkExternal01 className="size-5" />
                      <span>{t('discover.web.copyProfileLink', 'Copy profile link')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-body-large-semibold gap-3 rounded px-3 py-4 text-red-500"
                      onClick={() => void handleBlockProfile()}
                      disabled={isBlockActionLoading}
                    >
                      <MinusCircle className="size-5" />
                      <span>
                        {
                          (isBlockingAuthor
                            ? t('discover.web.unblock', 'Unblock')
                            : t('discover.web.blockProfile', 'Block {{handle}}', {
                                handle: displayHandle,
                              })) as string
                        }
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  type="button"
                  variant={isFollowingAuthor ? 'primary-contained' : 'primary-contained'}
                  className={
                    isFollowingAuthor
                      ? 'text-foreground border-border min-w-20 px-3 py-2 backdrop-blur-sm'
                      : 'min-w-20 px-3 py-2'
                  }
                  onClick={isBlockingAuthor ? () => void handleBlockProfile() : handleToggleFollow}
                  disabled={isTogglingFollow || isBlockActionLoading}
                >
                  {isBlockingAuthor
                    ? t('discover.web.unblock', 'Unblock')
                    : isFollowingAuthor
                      ? t('discover.web.following', 'Following')
                      : t('discover.web.follow', 'Follow')}
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col px-4">
            <div className="relative z-5 -mt-10 flex items-end gap-3 sm:-mt-14">
              <div className="border-background bg-muted relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 shadow-sm sm:h-32 sm:w-32">
                <Image
                  src={author.avatar || DISCOVER_USER_PLACEHOLDER_ICON}
                  alt={displayName}
                  fill
                  className="object-cover object-center"
                />
              </div>
              <div className="mb-1 flex min-w-0 flex-col sm:mb-2">
                <h2 className="text-foreground text-h3-semibold sm:text-h2-semibold truncate">
                  {displayName}
                </h2>
                <p className="text-muted-foreground text-body-small-regular mt-1 truncate">
                  {displayHandle}
                </p>
              </div>
            </div>

            {joinedLabel ? (
              <div className="text-muted-foreground text-body-small-regular mt-3 flex items-center gap-1">
                <Calendar className="size-4 shrink-0" />
                <span>{joinedLabel}</span>
              </div>
            ) : null}

            {author.bio ? (
              <p className="text-muted-foreground text-body-small-regular sm:text-body-large-regular mt-3 truncate whitespace-pre-wrap">
                {author.bio}
              </p>
            ) : null}

            <div className="text-muted-foreground text-body-small-regular mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => canOpenFollowList && setFollowListType('following')}
                disabled={!canOpenFollowList}
                className={cn(
                  'transition-colors',
                  canOpenFollowList ? 'hover:text-foreground hover:underline' : 'cursor-default',
                )}
              >
                <strong className="text-foreground">{author.followingCount ?? 0}</strong>{' '}
                {t('discover.web.following', 'Following')}
              </button>
              <button
                type="button"
                onClick={() => canOpenFollowList && setFollowListType('followers')}
                disabled={!canOpenFollowList}
                className={cn(
                  'transition-colors',
                  canOpenFollowList ? 'hover:text-foreground hover:underline' : 'cursor-default',
                )}
              >
                <strong className="text-foreground">{author.followerCount ?? 0}</strong>{' '}
                {t('discover.web.followers', 'Followers')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <WallFeed
        authorFollowState={isFollowingAuthor}
        userId={userId}
        onOpenAuthorProfile={onOpenAuthorProfile}
        onReloadPostsReady={(reloadPosts) => {
          reloadPostsRef.current = reloadPosts;
        }}
        showFollowButton
        emptyMessage={t('discover.web.noAuthorPosts', 'No posts on this profile yet.')}
      />
      <FollowListDialog
        open={canOpenFollowList && Boolean(followListType)}
        onOpenChange={(open) => !open && setFollowListType(null)}
        type={followListType}
        userId={author?.id ?? ''}
        onOpenAuthorProfile={onOpenAuthorProfile}
      />
    </div>
  );
}
