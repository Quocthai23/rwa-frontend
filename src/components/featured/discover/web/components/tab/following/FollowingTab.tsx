'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { RefObject, UIEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/shared/atoms/button';
import { useGetData } from '@/context/GetdataContext';
import { localizeApiError } from '@/i18n/apiErrors';
import { userApi, type SuggestedUser } from '@/services/userService';
import { useTheme } from '@/theme';
import { useDiscoverComments } from '../../../hooks/useDiscoverComments';
import { useDiscoverPosts } from '../../../hooks/useDiscoverPosts';
import { DiscoverPostCard } from '../../DiscoverPostCard';
import { PostFeedList } from '../shared/PostFeedList';
import { UserHoverTooltip } from '../../shared/UserHoverTooltip';
import Image from 'next/image';
import { DISCOVER_DEBOUNCE_MS, DISCOVER_USER_PLACEHOLDER_ICON } from '../../../hooks/constants';

const SUGGESTED_CREATORS_PAGE_SIZE = 30;
const SUGGESTIONS_SCROLL_THRESHOLD_PX = 120;
const DISCOVER_BASE_PATH = '/discover';
const FOLLOWING_TAB_ID = 'following';

const getSharedPostSlugFromPathname = (pathValue: string): string => {
  const normalizedPath = pathValue.trim();
  if (!normalizedPath.startsWith(`${DISCOVER_BASE_PATH}/`)) {
    return '';
  }

  const pathRemainder = normalizedPath.slice(`${DISCOVER_BASE_PATH}/`.length);
  const firstPathSegment = pathRemainder.split('/')[0]?.trim() || '';
  if (!firstPathSegment) {
    return '';
  }

  return decodeURIComponent(firstPathSegment);
};

type SuggestedCreator = {
  avatar?: string;
  handle: string;
  id: string;
  isFollowing: boolean;
  name: string;
  displayName: string;
};

function CreatorAvatar({ avatar, name }: { avatar?: string; name: string }) {
  return (
    <Image
      src={avatar || DISCOVER_USER_PLACEHOLDER_ICON}
      alt={name}
      width={40}
      height={40}
      unoptimized
      className="bg-muted h-10 w-10 rounded-full object-cover"
    />
  );
}

type FollowingTabProps = {
  onSetAuthorFollowingStateRef?: RefObject<
    ((authorId: string, nextFollowing: boolean) => void) | null
  >;
  onSuggestedCreatorsUpdateRef?: RefObject<
    ((userId: string, nextFollowing: boolean) => void) | null
  >;
  onSuggestedCreatorFollowStateSync?: (userId: string, nextFollowing: boolean) => void;
  onSuggestedCreatorsRegisterRef?: RefObject<
    ((userId: string, nextFollowing: boolean) => void) | null
  >;
};

export function FollowingTab({
  onSetAuthorFollowingStateRef,
  onSuggestedCreatorsUpdateRef,
  onSuggestedCreatorFollowStateSync,
  onSuggestedCreatorsRegisterRef,
}: FollowingTabProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname() || DISCOVER_BASE_PATH;
  const searchParams = useSearchParams();
  const sharedPostSlugFromPath = useMemo(() => getSharedPostSlugFromPathname(pathname), [pathname]);
  const [sharedPostSlugParam, setSharedPostSlugParam] = useState(sharedPostSlugFromPath);
  const sharedPostIdParam = searchParams.get('id')?.trim() || '';
  const { me } = useGetData();
  const { mode } = useTheme();
  const debounceTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const initialFollowStateRef = useRef<Record<string, boolean>>({});
  const desiredFollowStateRef = useRef<Record<string, boolean>>({});
  const sharedPostAutoOpenedIdRef = useRef<string | null>(null);
  const isClosingSharedPostRef = useRef(false);
  const hasPushedSharedPostHistoryRef = useRef(false);
  const postsState = useDiscoverPosts({
    followingOnly: true,
    status: 'APPROVED',
    onAuthorFollowingStateChange: (authorId, nextFollowing) => {
      onSuggestedCreatorsUpdateRef?.current?.(authorId, nextFollowing);
    },
  });
  const commentsState = useDiscoverComments({
    onCommentCountChange: postsState.updatePostCommentCount,
  });

  useEffect(() => {
    if (onSetAuthorFollowingStateRef) {
      onSetAuthorFollowingStateRef.current = postsState.setAuthorFollowingState;
    }
  }, [onSetAuthorFollowingStateRef, postsState.setAuthorFollowingState]);

  useEffect(() => {
    return () => {
      Object.values(debounceTimeoutRef.current).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      debounceTimeoutRef.current = {};
      initialFollowStateRef.current = {};
      desiredFollowStateRef.current = {};
    };
  }, []);

  const handleDeletePost = useCallback(
    async (postId: string) => {
      const hasDeleted = await postsState.deletePost(postId);
      if (!hasDeleted) {
        return false;
      }

      commentsState.clearPostState(postId);
      return true;
    },
    [commentsState, postsState],
  );

  const postFeedState = useMemo(
    () => ({
      currentUserId: postsState.currentUserId,
      deletePost: handleDeletePost,
      isDeletingPostById: postsState.isDeletingPostById,
      isRepostingPostById: postsState.isRepostingPostById,
      repostPost: postsState.repostPost,
      sharePost: postsState.sharePost,
      toggleBookmark: postsState.toggleBookmark,
      toggleFollow: postsState.toggleFollow,
      toggleFollowByAuthorId: postsState.toggleFollowByAuthorId,
      togglePostLike: postsState.togglePostLike,
    }),
    [
      handleDeletePost,
      postsState.currentUserId,
      postsState.isDeletingPostById,
      postsState.isRepostingPostById,
      postsState.repostPost,
      postsState.sharePost,
      postsState.toggleBookmark,
      postsState.toggleFollow,
      postsState.toggleFollowByAuthorId,
      postsState.togglePostLike,
    ],
  );

  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLoadingMoreSuggestions, setIsLoadingMoreSuggestions] = useState(false);
  const [hasMoreSuggestions, setHasMoreSuggestions] = useState(true);
  const [hasFetchedSuggestions, setHasFetchedSuggestions] = useState(false);
  const [suggestionsSkip, setSuggestionsSkip] = useState(0);
  const [isTogglingSuggestionById, setIsTogglingSuggestionById] = useState<Record<string, boolean>>(
    {},
  );
  const [suggestedCreators, setSuggestedCreators] = useState<SuggestedCreator[]>([]);
  const [suggestionsError, setSuggestionsError] = useState('');

  useEffect(() => {
    setSharedPostSlugParam(sharedPostSlugFromPath);
  }, [sharedPostSlugFromPath]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const syncSharedPostSlugFromLocation = () => {
      const nextSlug = getSharedPostSlugFromPathname(window.location.pathname);
      setSharedPostSlugParam(nextSlug);
      if (!nextSlug) {
        hasPushedSharedPostHistoryRef.current = false;
      }
    };

    window.addEventListener('popstate', syncSharedPostSlugFromLocation);
    return () => {
      window.removeEventListener('popstate', syncSharedPostSlugFromLocation);
    };
  }, []);

  const shouldShowSuggestions =
    Boolean(me?.id) && !postsState.isLoadingPosts && postsState.posts.length === 0;

  const activeSharedPost = useMemo(() => {
    if (!sharedPostSlugParam && !sharedPostIdParam) {
      return null;
    }

    return (
      postsState.posts.find(
        (post) => post.slug === sharedPostSlugParam || post.id === sharedPostIdParam,
      ) || null
    );
  }, [postsState.posts, sharedPostIdParam, sharedPostSlugParam]);

  const removeSharedPostIdFromUrl = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const currentPath = window.location.pathname;
    const hasDetailPath = currentPath.startsWith(`${DISCOVER_BASE_PATH}/`);
    if (!hasDetailPath) {
      setSharedPostSlugParam('');
      return;
    }

    const params = new URLSearchParams(window.location.search);
    params.set('tab', FOLLOWING_TAB_ID);
    const nextQuery = params.toString();
    const nextUrl = `${DISCOVER_BASE_PATH}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash || ''}`;
    window.history.replaceState(window.history.state, '', nextUrl);
    setSharedPostSlugParam('');
    hasPushedSharedPostHistoryRef.current = false;
  }, []);

  const openSharedPostDetail = useCallback(
    (postSlug: string) => {
      if (typeof window === 'undefined') {
        return;
      }

      const normalizedPostSlug = postSlug.trim();
      if (!normalizedPostSlug) {
        return;
      }

      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', FOLLOWING_TAB_ID);
      params.delete('id');
      const nextQuery = params.toString();
      const detailPath = `${DISCOVER_BASE_PATH}/${encodeURIComponent(normalizedPostSlug)}`;
      const nextUrl = `${nextQuery ? `${detailPath}?${nextQuery}` : detailPath}${window.location.hash || ''}`;
      window.history.pushState(window.history.state, '', nextUrl);
      setSharedPostSlugParam(normalizedPostSlug);
      hasPushedSharedPostHistoryRef.current = true;
    },
    [searchParams],
  );

  const closeSharedPostDetail = useCallback(
    (postId?: string) => {
      if (isClosingSharedPostRef.current) {
        return;
      }

      isClosingSharedPostRef.current = true;
      const targetPostId = postId || activeSharedPost?.id;
      if (targetPostId && commentsState.isCommentsOpenByPostId[targetPostId]) {
        commentsState.toggleComments(targetPostId);
      }

      removeSharedPostIdFromUrl();
    },
    [
      activeSharedPost?.id,
      commentsState.isCommentsOpenByPostId,
      commentsState.toggleComments,
      removeSharedPostIdFromUrl,
    ],
  );

  useEffect(() => {
    if (!sharedPostSlugParam && !sharedPostIdParam) {
      sharedPostAutoOpenedIdRef.current = null;
      isClosingSharedPostRef.current = false;
    }
  }, [sharedPostIdParam, sharedPostSlugParam]);

  useEffect(() => {
    if ((!sharedPostSlugParam && !sharedPostIdParam) || !activeSharedPost) {
      return;
    }

    if (sharedPostAutoOpenedIdRef.current === activeSharedPost.id) {
      return;
    }

    sharedPostAutoOpenedIdRef.current = activeSharedPost.id;

    if (commentsState.isCommentsOpenByPostId[activeSharedPost.id]) {
      return;
    }

    commentsState.toggleComments(activeSharedPost.id);
  }, [
    activeSharedPost,
    commentsState.isCommentsOpenByPostId,
    commentsState.toggleComments,
    sharedPostIdParam,
    sharedPostSlugParam,
  ]);

  const sharedPostComments = activeSharedPost
    ? commentsState.commentsByPostId[activeSharedPost.id] || []
    : [];
  const sharedPostCommentsTotal = activeSharedPost
    ? (commentsState.commentsTotalByPostId[activeSharedPost.id] ?? sharedPostComments.length)
    : 0;
  const hasMoreSharedPostComments = sharedPostComments.length < sharedPostCommentsTotal;

  const mapSuggestedUserToCreator = useCallback(
    (user: SuggestedUser): SuggestedCreator => {
      const username = String(user.username || '')
        .trim()
        .replace(/^@+/, '');
      const normalizedUserId = String(user.id || '').trim();

      return {
        id: normalizedUserId,
        isFollowing: Boolean(user.relation?.isFollowing),
        name: user.name?.trim() || username || t('discover.web.unknownAuthor', 'Unknown author'),
        handle: username ? `@${username}` : '@unknown',
        displayName:
          user.displayName?.trim() ||
          user.name?.trim() ||
          username ||
          t('discover.web.unknownAuthor', 'Unknown author'),
        avatar: user.avatar || DISCOVER_USER_PLACEHOLDER_ICON,
      };
    },
    [t],
  );

  const normalizeSuggestedCreators = useCallback(
    (users: SuggestedUser[]): SuggestedCreator[] => {
      const seenUserIds = new Set<string>();
      const normalized: SuggestedCreator[] = [];

      for (const user of users) {
        const creator = mapSuggestedUserToCreator(user);
        if (!creator.id || seenUserIds.has(creator.id)) {
          continue;
        }

        seenUserIds.add(creator.id);
        normalized.push(creator);
      }

      return normalized;
    },
    [mapSuggestedUserToCreator],
  );

  const mergeSuggestedCreators = useCallback(
    (current: SuggestedCreator[], incoming: SuggestedCreator[]) => {
      if (incoming.length === 0) {
        return current;
      }

      const existingCreatorIds = new Set(current.map((creator) => creator.id));
      const nextCreators = [...current];

      for (const creator of incoming) {
        if (!creator.id || existingCreatorIds.has(creator.id)) {
          continue;
        }

        existingCreatorIds.add(creator.id);
        nextCreators.push(creator);
      }

      return nextCreators;
    },
    [],
  );

  useEffect(() => {
    if (!shouldShowSuggestions) {
      setIsLoadingSuggestions(false);
      setIsLoadingMoreSuggestions(false);
      setHasMoreSuggestions(true);
      setHasFetchedSuggestions(false);
      setSuggestionsSkip(0);
      setIsTogglingSuggestionById({});
      setSuggestedCreators([]);
      setSuggestionsError('');
      return;
    }

    let isCancelled = false;
    setIsLoadingSuggestions(true);
    setIsLoadingMoreSuggestions(false);
    setHasMoreSuggestions(true);
    setHasFetchedSuggestions(false);
    setSuggestionsSkip(0);
    setSuggestionsError('');

    void (async () => {
      try {
        const response = await userApi.listSuggestions({
          skip: 0,
          take: SUGGESTED_CREATORS_PAGE_SIZE,
        });
        if (isCancelled) {
          return;
        }

        const normalizedCreators = normalizeSuggestedCreators(response);
        setSuggestedCreators(normalizedCreators);
        setSuggestionsSkip(response.length);
        setHasMoreSuggestions(response.length === SUGGESTED_CREATORS_PAGE_SIZE);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setSuggestionsError(
          localizeApiError(error, t, 'apiErrors.generic') ||
            t('discover.web.loadSuggestedCreatorsFailed', 'Unable to load suggested creators.'),
        );
      } finally {
        if (!isCancelled) {
          setIsLoadingSuggestions(false);
          setHasFetchedSuggestions(true);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [normalizeSuggestedCreators, shouldShowSuggestions, t]);

  const loadMoreSuggestedCreators = useCallback(() => {
    if (
      !shouldShowSuggestions ||
      isLoadingSuggestions ||
      isLoadingMoreSuggestions ||
      !hasMoreSuggestions
    ) {
      return;
    }

    setIsLoadingMoreSuggestions(true);
    setSuggestionsError('');

    void (async () => {
      try {
        const response = await userApi.listSuggestions({
          skip: suggestionsSkip,
          take: SUGGESTED_CREATORS_PAGE_SIZE,
        });
        const normalizedCreators = normalizeSuggestedCreators(response);

        setSuggestedCreators((prev) => mergeSuggestedCreators(prev, normalizedCreators));
        setSuggestionsSkip((prev) => prev + response.length);
        setHasMoreSuggestions(response.length === SUGGESTED_CREATORS_PAGE_SIZE);
      } catch (error) {
        setSuggestionsError(
          localizeApiError(error, t, 'apiErrors.generic') ||
            t('discover.web.loadSuggestedCreatorsFailed', 'Unable to load suggested creators.'),
        );
      } finally {
        setIsLoadingMoreSuggestions(false);
      }
    })();
  }, [
    hasMoreSuggestions,
    isLoadingMoreSuggestions,
    isLoadingSuggestions,
    mergeSuggestedCreators,
    normalizeSuggestedCreators,
    shouldShowSuggestions,
    suggestionsSkip,
    t,
  ]);

  const handleSuggestionsScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const target = event.currentTarget;
      const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;

      if (distanceToBottom <= SUGGESTIONS_SCROLL_THRESHOLD_PX) {
        loadMoreSuggestedCreators();
      }
    },
    [loadMoreSuggestedCreators],
  );

  const handleToggleSuggestedFollow = useCallback(
    (userId: string) => {
      const normalizedUserId = userId.trim();

      if (!normalizedUserId) return;

      const targetCreator = suggestedCreators.find((creator) => creator.id === normalizedUserId);
      if (!targetCreator) return;

      const currentFollowing = Boolean(targetCreator.isFollowing);
      const nextFollowing = !currentFollowing;

      if (!(normalizedUserId in initialFollowStateRef.current)) {
        initialFollowStateRef.current[normalizedUserId] = currentFollowing;
      }

      desiredFollowStateRef.current[normalizedUserId] = nextFollowing;

      setSuggestedCreators((prev) =>
        prev.map((creator) =>
          creator.id === normalizedUserId ? { ...creator, isFollowing: nextFollowing } : creator,
        ),
      );

      onSuggestedCreatorFollowStateSync?.(normalizedUserId, nextFollowing);
      const existingTimeout = debounceTimeoutRef.current[normalizedUserId];
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      debounceTimeoutRef.current[normalizedUserId] = setTimeout(() => {
        const initial = initialFollowStateRef.current[normalizedUserId];
        const desired = desiredFollowStateRef.current[normalizedUserId];

        if (desired === initial) {
          delete debounceTimeoutRef.current[normalizedUserId];
          delete initialFollowStateRef.current[normalizedUserId];
          delete desiredFollowStateRef.current[normalizedUserId];
          return;
        }

        setIsTogglingSuggestionById((prev) => ({
          ...prev,
          [normalizedUserId]: true,
        }));

        void (async () => {
          try {
            await userApi.upsertUserRelation(normalizedUserId, {
              action: desired ? 'follow' : 'unfollow',
            });
          } catch {
            setSuggestedCreators((prev) =>
              prev.map((creator) =>
                creator.id === normalizedUserId ? { ...creator, isFollowing: initial } : creator,
              ),
            );

            onSuggestedCreatorFollowStateSync?.(normalizedUserId, initial);
          } finally {
            setIsTogglingSuggestionById((prev) => {
              const next = { ...prev };
              delete next[normalizedUserId];
              return next;
            });

            delete debounceTimeoutRef.current[normalizedUserId];
            delete initialFollowStateRef.current[normalizedUserId];
            delete desiredFollowStateRef.current[normalizedUserId];
          }
        })();
      }, DISCOVER_DEBOUNCE_MS);
    },
    [onSuggestedCreatorFollowStateSync, suggestedCreators],
  );

  useEffect(() => {
    if (!onSuggestedCreatorsRegisterRef) {
      return;
    }

    onSuggestedCreatorsRegisterRef.current = (userId: string, nextFollowing: boolean) => {
      setSuggestedCreators((prev) =>
        prev.map((creator) =>
          creator.id === userId ? { ...creator, isFollowing: nextFollowing } : creator,
        ),
      );
    };
  }, [onSuggestedCreatorsRegisterRef]);

  const handleOpenSuggestedProfile = useCallback(
    (userId: string) => {
      const normalizedUserId = userId.trim();
      if (!normalizedUserId) {
        return;
      }
      router.replace(
        `${DISCOVER_BASE_PATH}?tab=profile?userId=${encodeURIComponent(normalizedUserId)}`,
        {
          scroll: false,
        },
      );
    },
    [router],
  );

  const handleOpenAuthorProfile = useCallback(
    (authorId: string) => {
      const normalizedAuthorId = authorId.trim();
      if (!normalizedAuthorId) {
        return;
      }
      router.replace(
        `${DISCOVER_BASE_PATH}?tab=profile?userId=${encodeURIComponent(normalizedAuthorId)}`,
        {
          scroll: false,
        },
      );
    },
    [router, searchParams],
  );

  if (!me?.id) {
    return (
      <div className="flex h-full items-center justify-center px-4 py-6">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
          <Image
            src={
              mode === 'dark'
                ? '/assets/images/position/group-dark.svg'
                : '/assets/images/position/Group.svg'
            }
            alt="Welcome illustration"
            width={300}
            height={300}
            priority
            className="h-auto w-full max-w-[300px]"
          />
          <h2 className="text-primary-500 mt-6 text-3xl font-semibold sm:text-5xl">
            Welcome to MTX Trading
          </h2>
          <p className="mt-3 text-base text-neutral-900 dark:text-white">
            Sign in to view your balance and personalized data.
          </p>
          <div className="mt-7 grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="neutral-contained"
              className="text-body-large-semibold h-11 w-full text-neutral-900 dark:text-white"
              onClick={() => router.push('/login')}
            >
              {t('auth.login.title', { defaultValue: 'Login' })}
            </Button>
            <Button
              type="button"
              variant="primary-contained"
              className="text-body-large-semibold text-foreground h-11 w-full"
              onClick={() => router.push('/register')}
            >
              {t('auth.register.title', { defaultValue: 'Register' })}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {postsState.isLoadingPosts && postsState.posts.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3].map((index) => (
            <div
              key={index}
              className="bg-background border-border animate-pulse rounded border p-5"
            >
              <div className="bg-muted h-5 w-1/2 rounded" />
              <div className="bg-muted mt-3 h-4 w-full rounded" />
              <div className="bg-muted mt-2 h-4 w-3/4 rounded" />
              <div className="bg-muted mt-4 h-36 w-full rounded" />
            </div>
          ))}
        </div>
      ) : shouldShowSuggestions ? (
        <div className="space-y-4">
          <div className="bg-background rounded p-6">
            <div
              className="scrollbar-neutral-slim h-full space-y-3.5 overflow-y-auto pr-2"
              onScroll={handleSuggestionsScroll}
            >
              {isLoadingSuggestions ? (
                [1, 2, 3].map((index) => (
                  <div key={index} className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="bg-muted h-10 w-10 animate-pulse rounded-full" />
                      <div className="min-w-0 space-y-2">
                        <div className="bg-muted h-4 w-28 animate-pulse rounded" />
                        <div className="bg-muted h-3 w-22 animate-pulse rounded" />
                      </div>
                    </div>
                    <div className="bg-muted h-9 w-20 animate-pulse rounded" />
                  </div>
                ))
              ) : !hasFetchedSuggestions ? (
                [1, 2, 3].map((index) => (
                  <div key={index} className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="bg-muted h-10 w-10 animate-pulse rounded-full" />
                      <div className="min-w-0 space-y-2">
                        <div className="bg-muted h-4 w-28 animate-pulse rounded" />
                        <div className="bg-muted h-3 w-22 animate-pulse rounded" />
                      </div>
                    </div>
                    <div className="bg-muted h-9 w-20 animate-pulse rounded" />
                  </div>
                ))
              ) : suggestionsError && suggestedCreators.length === 0 ? (
                <p className="text-destructive text-sm">{suggestionsError}</p>
              ) : suggestedCreators.length === 0 ? (
                <p className="text-muted-foreground text-center text-sm">
                  {t('discover.web.noSuggestedCreators', 'No suggested creators')}
                </p>
              ) : (
                <>
                  {suggestedCreators.map((creator) => {
                    const isToggling = Boolean(isTogglingSuggestionById[creator.id]);

                    return (
                      <div key={creator.id} className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          className="flex min-w-0 items-center gap-3 text-left"
                          onClick={() => handleOpenSuggestedProfile(creator.id)}
                        >
                          <CreatorAvatar avatar={creator.avatar} name={creator.displayName} />
                          <div className="min-w-0">
                            <p className="text-body-large-medium text-foreground w-100 truncate hover:underline">
                              {creator.displayName}
                            </p>
                            <p className="text-body-small-regular text-muted-foreground truncate">
                              {creator.handle}
                            </p>
                          </div>
                        </button>

                        <Button
                          type="button"
                          variant="primary-contained"
                          className="text-button-small-medium px-3 py-1"
                          onClick={() => handleToggleSuggestedFollow(creator.id)}
                          disabled={isToggling}
                        >
                          {creator.isFollowing
                            ? t('discover.web.following', 'Following')
                            : t('discover.web.follow', 'Follow')}
                        </Button>
                      </div>
                    );
                  })}

                  {isLoadingMoreSuggestions
                    ? [1, 2].map((index) => (
                        <div
                          key={`suggested-creator-loading-more-${index}`}
                          className="flex items-center justify-between gap-2"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="bg-muted h-10 w-10 animate-pulse rounded-full" />
                            <div className="min-w-0 space-y-2">
                              <div className="bg-muted h-4 w-28 animate-pulse rounded" />
                              <div className="bg-muted h-3 w-22 animate-pulse rounded" />
                            </div>
                          </div>
                          <div className="bg-muted h-9 w-20 animate-pulse rounded" />
                        </div>
                      ))
                    : null}

                  {suggestionsError && suggestedCreators.length > 0 ? (
                    <p className="text-destructive text-sm">{suggestionsError}</p>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <PostFeedList
          commentsState={commentsState}
          onOpenAuthorProfile={handleOpenAuthorProfile}
          onToggleComments={openSharedPostDetail}
          refetchPost={postsState.reloadPosts}
          posts={postsState.posts}
          postsState={postFeedState}
        />
      )}

      {activeSharedPost ? (
        <DiscoverPostCard
          key={`shared-post-${activeSharedPost.id}`}
          hideCard
          commentDraft={commentsState.commentDraftByPostId[activeSharedPost.id]}
          comments={sharedPostComments}
          currentUserId={postsState.currentUserId}
          hasMoreComments={hasMoreSharedPostComments}
          isCommentsOpen={Boolean(commentsState.isCommentsOpenByPostId[activeSharedPost.id])}
          isCreatingComment={Boolean(commentsState.isCreatingCommentByPostId[activeSharedPost.id])}
          isDeletingCommentById={commentsState.isDeletingCommentById}
          isDeletingPost={Boolean(postsState.isDeletingPostById[activeSharedPost.id])}
          isRepostingPost={Boolean(postsState.isRepostingPostById[activeSharedPost.id])}
          isUpdatingCommentById={commentsState.isUpdatingCommentById}
          isLoadingComments={Boolean(commentsState.isLoadingCommentsByPostId[activeSharedPost.id])}
          isLoadingMoreComments={Boolean(
            commentsState.isLoadingMoreCommentsByPostId[activeSharedPost.id],
          )}
          onCommentDraftChange={commentsState.setCommentDraft}
          onCreateComment={commentsState.createComment}
          onDeleteComment={commentsState.deleteComment}
          onDeletePost={postFeedState.deletePost}
          onLoadMoreComments={commentsState.loadMoreComments}
          onRepostPost={postFeedState.repostPost}
          onSharePost={postFeedState.sharePost}
          onToggleBookmark={postFeedState.toggleBookmark}
          onToggleCommentLike={commentsState.toggleCommentLike}
          onToggleComments={closeSharedPostDetail}
          onToggleFollow={postFeedState.toggleFollow}
          onTogglePostLike={postFeedState.togglePostLike}
          onUpdateComment={commentsState.updateComment}
          onOpenAuthorProfile={handleOpenAuthorProfile}
          post={activeSharedPost}
        />
      ) : null}
    </>
  );
}
