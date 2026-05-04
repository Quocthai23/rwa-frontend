'use client';
import { Plus } from '@untitledui/icons';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/shared/atoms/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/shared/atoms/dialog';
import { useAuthHydrated } from '@/hook/useAuthHydrated';
import { useGetData } from '@/context/GetdataContext';
import { localizeApiError } from '@/i18n/apiErrors';
import { useDiscoverPosts } from '../discover/app/hooks/useDiscoverPosts';
import { useDiscoverComments } from '../discover/app/hooks/useDiscoverComments';
import { type DiscoverPost } from '../discover/app/components/DiscoverPostCard';
import { PostFeedList } from '../discover/app/components/PostFeedList';
import { MyWall } from '../discover/app/components/wall/MyWall';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { postApi, type ListedPostItem } from '@/services/postService';
import { userApi, type SuggestedUser } from '@/services/userService';

const DISCOVER_USER_PLACEHOLDER_ICON = '/assets/images/discover/filled.png';
const DISCOVER_BASE_PATH = '/discover';
const FOLLOWING_SUGGESTIONS_TAKE = 20;

type SuggestedCreator = {
  avatar?: string;
  handle: string;
  id: string;
  isFollowing: boolean;
  name: string;
};

const getSharedPostSlugFromPathname = (pathname: string): string => {
  const normalizedPath = pathname.trim();
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

type DiscoverSubTabId = 'for-you' | 'following' | 'profile' | 'bookmarks';

const VALID_DISCOVER_SUB_TABS: DiscoverSubTabId[] = [
  'for-you',
  'following',
  'profile',
  'bookmarks',
];

function DiscoverSubTabFeed({
  followingOnly = false,
  mode = 'all',
  discoverTab,
  profile = false,
  showFollowButton = true,
  emptyMessage,
  onOpenAuthorProfile,
  userId,
}: {
  followingOnly?: boolean;
  mode?: 'all' | 'bookmarks';
  discoverTab: 'bookmarks' | 'for-you' | 'following';
  profile?: boolean;
  showFollowButton?: boolean;
  emptyMessage: string;
  onOpenAuthorProfile?: (authorId: string) => void;
  userId?: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname() || '/discover';
  const searchParams = useSearchParams();
  const sharedPostSlugFromPath = useMemo(() => getSharedPostSlugFromPathname(pathname), [pathname]);
  const [sharedPostSlugParam, setSharedPostSlugParam] = useState(sharedPostSlugFromPath);
  const sharedPostIdParam = searchParams.get('id')?.trim() || '';
  const sharedPostRef = sharedPostSlugParam || sharedPostIdParam;
  const user = useAuthStore((state) => state.user);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const sharedPostFetchInFlightIdRef = useRef<string | null>(null);
  const autoOpenedCommentsPostIdRef = useRef<string | null>(null);
  const [sharedPostDetail, setSharedPostDetail] = useState<DiscoverPost | null>(null);
  const [sharedPostDetailError, setSharedPostDetailError] = useState('');
  const [isLoadingSharedPostDetail, setIsLoadingSharedPostDetail] = useState(false);
  const [suggestedCreators, setSuggestedCreators] = useState<SuggestedCreator[]>([]);
  const [isLoadingSuggestedCreators, setIsLoadingSuggestedCreators] = useState(false);
  const [suggestedCreatorsError, setSuggestedCreatorsError] = useState('');
  const [isTogglingSuggestedFollowById, setIsTogglingSuggestedFollowById] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    setSharedPostSlugParam(sharedPostSlugFromPath);
  }, [sharedPostSlugFromPath]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const syncSharedPostSlugFromLocation = () => {
      setSharedPostSlugParam(getSharedPostSlugFromPathname(window.location.pathname));
    };

    window.addEventListener('popstate', syncSharedPostSlugFromLocation);
    return () => {
      window.removeEventListener('popstate', syncSharedPostSlugFromLocation);
    };
  }, []);
  const {
    posts,
    hasMorePosts,
    isLoadingMorePosts,
    isLoadingPosts,
    loadMorePosts,
    currentUserId,
    deletePost,
    isDeletingPostById,
    isRepostingPostById,
    repostPost,
    sharePost,
    toggleBookmark,
    toggleFollow,
    togglePostLike,
    updatePostCommentCount,
  } = useDiscoverPosts({ autoLoad: true, followingOnly, mode, status: 'APPROVED', userId });

  const commentsState = useDiscoverComments({
    onCommentCountChange: updatePostCommentCount,
  });

  const { assets } = useGetData();

  const mapApiPostToDiscoverPost = useCallback(
    (post: ListedPostItem): DiscoverPost => {
      const mapPost = (item: ListedPostItem, depth: number): DiscoverPost => {
        const normalizedContent = item.content?.trim() || '';
        const firstLine = normalizedContent
          .split('\n')
          .map((line) => line.trim())
          .find(Boolean);

        return {
          id: item.id,
          slug: item.slug || item.id,
          author: {
            id: item.author?.id || '',
            avatar: item.author?.avatar || DISCOVER_USER_PLACEHOLDER_ICON,
            followers: 0,
            handle: `@${item.author?.username || 'unknown'}`,
            username: item.author?.username || t('discover.web.unknownAuthor', 'Unknown author'),
            verified: false,
            displayName: item.author?.displayName?.trim() || item.author?.username || '',
          },
          bookmarked: Boolean(item.isBookmarked),
          content: {
            images: (item.linksUrl || [])
              .filter(
                (mediaItem) => mediaItem.type === 'image' && typeof mediaItem.link === 'string',
              )
              .map((mediaItem) => mediaItem.link),
            text: normalizedContent || t('discover.web.emptyPostContent', 'No content'),
            title:
              firstLine ||
              normalizedContent ||
              t('discover.web.defaultPostTitle', 'My Trading Insight'),
          },
          createdAt: item.createdAt,
          following: Boolean(item.author?.relation?.isFollowing),
          isOwnPost: Boolean(user?.id && item.author?.id === user.id),
          liked: Boolean(item.isLiked),
          repost: depth < 1 && item.repost ? mapPost(item.repost, depth + 1) : undefined,
          stats: {
            comments: item.commentCount || 0,
            likes: item.likeCount || 0,
            reposts: item.repostCount || 0,
            shares: item.shareCount || 0,
          },
        };
      };

      return mapPost(post, 0);
    },
    [t, user?.id],
  );

  const activeSharedPost = useMemo(() => {
    if (!sharedPostRef) {
      return null;
    }

    return (
      posts.find((post) => post.slug === sharedPostSlugParam || post.id === sharedPostIdParam) ||
      sharedPostDetail
    );
  }, [posts, sharedPostDetail, sharedPostIdParam, sharedPostRef, sharedPostSlugParam]);

  const feedPosts = useMemo(() => posts, [posts]);
  const hasOpenCommentsSheet = useMemo(
    () => Object.values(commentsState.isCommentsOpenByPostId || {}).some(Boolean),
    [commentsState.isCommentsOpenByPostId],
  );

  const shouldShowFollowingSuggestions =
    followingOnly && !isLoadingPosts && !sharedPostRef && posts.length === 0 && Boolean(user?.id);

  const mapSuggestedUserToCreator = useCallback(
    (suggestedUser: SuggestedUser): SuggestedCreator => {
      const normalizedUsername = String(suggestedUser.username || '')
        .trim()
        .replace(/^@+/, '');

      return {
        id: String(suggestedUser.id || '').trim(),
        name:
          suggestedUser.displayName?.trim() ||
          suggestedUser.name?.trim() ||
          normalizedUsername ||
          t('discover.web.unknownAuthor', 'Unknown author'),
        handle: normalizedUsername ? `@${normalizedUsername}` : '@unknown',
        avatar: suggestedUser.avatar || DISCOVER_USER_PLACEHOLDER_ICON,
        isFollowing: Boolean(suggestedUser.relation?.isFollowing),
      };
    },
    [t],
  );

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
    params.set('discoverTab', discoverTab);
    params.delete('id');
    const nextQuery = params.toString();
    const nextUrl = `${DISCOVER_BASE_PATH}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash || ''}`;
    window.history.replaceState(window.history.state, '', nextUrl);
    setSharedPostSlugParam('');
  }, [discoverTab]);

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
      params.set('discoverTab', discoverTab);
      params.delete('id');
      const nextQuery = params.toString();
      const detailPath = `${DISCOVER_BASE_PATH}/${encodeURIComponent(normalizedPostSlug)}`;
      const nextUrl = `${nextQuery ? `${detailPath}?${nextQuery}` : detailPath}${window.location.hash || ''}`;
      window.history.pushState(window.history.state, '', nextUrl);
      setSharedPostSlugParam(normalizedPostSlug);
    },
    [discoverTab, searchParams],
  );

  const closeSharedPostDetail = useCallback(() => {
    if (activeSharedPost && commentsState.isCommentsOpenByPostId[activeSharedPost.id]) {
      commentsState.toggleComments(activeSharedPost.id);
    }

    removeSharedPostIdFromUrl();
  }, [activeSharedPost, commentsState, removeSharedPostIdFromUrl]);

  useEffect(() => {
    if (!sharedPostRef || !activeSharedPost) {
      autoOpenedCommentsPostIdRef.current = null;
      return;
    }

    if (autoOpenedCommentsPostIdRef.current === activeSharedPost.id) {
      return;
    }

    autoOpenedCommentsPostIdRef.current = activeSharedPost.id;
    if (!commentsState.isCommentsOpenByPostId[activeSharedPost.id]) {
      commentsState.toggleComments(activeSharedPost.id);
    }
  }, [
    activeSharedPost,
    commentsState.isCommentsOpenByPostId,
    commentsState.toggleComments,
    sharedPostRef,
  ]);

  useEffect(() => {
    if (!sharedPostRef) {
      setSharedPostDetail(null);
      setSharedPostDetailError('');
      setIsLoadingSharedPostDetail(false);
      sharedPostFetchInFlightIdRef.current = null;
      return;
    }

    const hasSharedPostInFeed = posts.some(
      (post) => post.slug === sharedPostSlugParam || post.id === sharedPostIdParam,
    );
    if (hasSharedPostInFeed) {
      setSharedPostDetail(null);
      setSharedPostDetailError('');
      setIsLoadingSharedPostDetail(false);
      sharedPostFetchInFlightIdRef.current = null;
      return;
    }

    if (sharedPostFetchInFlightIdRef.current === sharedPostRef) {
      return;
    }

    let isCancelled = false;
    if (
      sharedPostDetail?.slug !== sharedPostSlugParam &&
      sharedPostDetail?.id !== sharedPostIdParam
    ) {
      setSharedPostDetail(null);
    }
    setSharedPostDetailError('');
    setIsLoadingSharedPostDetail(true);
    sharedPostFetchInFlightIdRef.current = sharedPostRef;

    void (async () => {
      try {
        const detail = await postApi.getPostDetail(sharedPostRef);
        if (isCancelled) {
          return;
        }

        setSharedPostDetail(mapApiPostToDiscoverPost(detail));
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setSharedPostDetailError(
          localizeApiError(error, t, 'apiErrors.generic') ||
            t('discover.web.loadPostDetailFailedMessage', 'Unable to load post detail.'),
        );
      } finally {
        if (!isCancelled) {
          setIsLoadingSharedPostDetail(false);
        }

        if (sharedPostFetchInFlightIdRef.current === sharedPostRef) {
          sharedPostFetchInFlightIdRef.current = null;
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [
    mapApiPostToDiscoverPost,
    posts,
    sharedPostDetail?.id,
    sharedPostDetail?.slug,
    sharedPostIdParam,
    sharedPostRef,
    sharedPostSlugParam,
    t,
  ]);

  const handleToggleFollow = useCallback(
    (postId: string) => {
      if (!user?.id) {
        router.push('/login');
        return;
      }

      toggleFollow(postId);
    },
    [router, toggleFollow, user?.id],
  );

  const postFeedState = useMemo(
    () => ({
      currentUserId,
      deletePost,
      isDeletingPostById,
      isRepostingPostById,
      repostPost,
      sharePost,
      toggleBookmark,
      toggleFollow: handleToggleFollow,
      togglePostLike,
    }),
    [
      currentUserId,
      deletePost,
      handleToggleFollow,
      isDeletingPostById,
      isRepostingPostById,
      repostPost,
      sharePost,
      toggleBookmark,
      togglePostLike,
    ],
  );

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) {
          return;
        }

        if (isLoadingPosts || isLoadingMorePosts || !hasMorePosts) {
          return;
        }

        loadMorePosts();
      },
      {
        root: null,
        rootMargin: '220px 0px',
        threshold: 0,
      },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [hasMorePosts, isLoadingMorePosts, isLoadingPosts, loadMorePosts]);

  useEffect(() => {
    if (!shouldShowFollowingSuggestions) {
      setSuggestedCreators([]);
      setSuggestedCreatorsError('');
      setIsLoadingSuggestedCreators(false);
      return;
    }

    let isCancelled = false;
    setIsLoadingSuggestedCreators(true);
    setSuggestedCreatorsError('');

    void (async () => {
      try {
        const response = await userApi.listSuggestions({
          skip: 0,
          take: FOLLOWING_SUGGESTIONS_TAKE,
        });

        if (isCancelled) {
          return;
        }

        const nextCreators = response
          .map(mapSuggestedUserToCreator)
          .filter((creator) => creator.id.length > 0);

        setSuggestedCreators(nextCreators);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setSuggestedCreatorsError(
          localizeApiError(error, t, 'apiErrors.generic') ||
            t('discover.web.loadSuggestedCreatorsFailed', 'Unable to load suggested creators.'),
        );
      } finally {
        if (!isCancelled) {
          setIsLoadingSuggestedCreators(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [mapSuggestedUserToCreator, shouldShowFollowingSuggestions, t]);

  const handleToggleSuggestedFollow = useCallback(
    (creatorId: string) => {
      if (!user?.id) {
        router.push('/login');
        return;
      }

      const normalizedCreatorId = creatorId.trim();
      if (!normalizedCreatorId) {
        return;
      }

      const targetCreator = suggestedCreators.find((creator) => creator.id === normalizedCreatorId);
      if (!targetCreator) {
        return;
      }

      const previousFollowing = Boolean(targetCreator.isFollowing);
      const nextFollowing = !previousFollowing;

      setSuggestedCreators((prev) =>
        prev.map((creator) =>
          creator.id === normalizedCreatorId ? { ...creator, isFollowing: nextFollowing } : creator,
        ),
      );
      setIsTogglingSuggestedFollowById((prev) => ({
        ...prev,
        [normalizedCreatorId]: true,
      }));

      void (async () => {
        try {
          await userApi.upsertUserRelation(normalizedCreatorId, {
            action: nextFollowing ? 'follow' : 'unfollow',
          });
        } catch {
          setSuggestedCreators((prev) =>
            prev.map((creator) =>
              creator.id === normalizedCreatorId
                ? { ...creator, isFollowing: previousFollowing }
                : creator,
            ),
          );
        } finally {
          setIsTogglingSuggestedFollowById((prev) => {
            const next = { ...prev };
            delete next[normalizedCreatorId];
            return next;
          });
        }
      })();
    },
    [router, suggestedCreators, user?.id],
  );

  return (
    <div className="space-y-4">
      {isLoadingPosts && posts.length === 0 ? (
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
      ) : shouldShowFollowingSuggestions ? (
        <div className="bg-background rounded">
          <p className="text-foreground mb-3 text-sm font-semibold">
            {t('discover.web.suggestedCreators', 'Suggested creators')}
          </p>

          {isLoadingSuggestedCreators ? (
            <div className="space-y-3">
              {[1, 2, 3].map((index) => (
                <div key={index} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="bg-muted h-10 w-10 animate-pulse rounded-full" />
                    <div className="space-y-2">
                      <div className="bg-muted h-4 w-24 animate-pulse rounded" />
                      <div className="bg-muted h-3 w-16 animate-pulse rounded" />
                    </div>
                  </div>
                  <div className="bg-muted h-9 w-20 animate-pulse rounded" />
                </div>
              ))}
            </div>
          ) : suggestedCreatorsError ? (
            <p className="text-destructive text-sm">{suggestedCreatorsError}</p>
          ) : suggestedCreators.length === 0 ? (
            <p className="text-muted-foreground text-sm">{emptyMessage}</p>
          ) : (
            <div className="space-y-3">
              {suggestedCreators.map((creator) => {
                const isToggling = Boolean(isTogglingSuggestedFollowById[creator.id]);

                return (
                  <div key={creator.id} className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      className="flex min-w-0 items-center gap-3 text-left"
                      onClick={() => {
                        if (onOpenAuthorProfile) {
                          onOpenAuthorProfile(creator.id);
                          return;
                        }

                        router.push(`/profile/${creator.id}`);
                      }}
                    >
                      <Image
                        src={creator.avatar || DISCOVER_USER_PLACEHOLDER_ICON}
                        alt={creator.name}
                        width={40}
                        height={40}
                        unoptimized
                        className="bg-muted h-10 w-10 rounded-full object-cover"
                      />
                      <div className="min-w-0">
                        <p className="text-foreground truncate text-sm font-medium">
                          {creator.name}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">{creator.handle}</p>
                      </div>
                    </button>

                    <Button
                      type="button"
                      variant="primary-contained"
                      className="h-9 px-3 text-sm"
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
            </div>
          )}
        </div>
      ) : (
        <PostFeedList
          assets={assets}
          posts={feedPosts}
          postsState={postFeedState}
          commentsState={commentsState}
          emptyMessage={emptyMessage}
          onOpenAuthorProfile={onOpenAuthorProfile}
          onTogglePostDetail={(post, isOpen) => {
            if (isOpen) {
              removeSharedPostIdFromUrl();
              return;
            }
            openSharedPostDetail(post.slug);
          }}
          profile={profile}
          showFollowButton={showFollowButton}
        />
      )}

      {feedPosts.length > 0 ? (
        <>
          {isLoadingMorePosts ? (
            <div className="space-y-4">
              {[1, 2].map((index) => (
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
          ) : null}

          {hasMorePosts ? (
            <div ref={loadMoreRef} className="h-1 w-full" aria-hidden="true" />
          ) : null}
        </>
      ) : null}

      <Dialog
        open={Boolean(sharedPostRef) && !hasOpenCommentsSheet}
        onOpenChange={(open) => {
          if (!open) {
            closeSharedPostDetail();
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="border-border flex h-[85vh] max-h-[85vh] w-[calc(100vw-1rem)] max-w-2xl flex-col overflow-hidden p-0"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <DialogTitle className="sr-only">
            {t('discover.web.sharedPostDetailTitle', 'Shared post detail')}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t(
              'discover.web.sharedPostDetailDescription',
              'View post detail and comments in a modal dialog.',
            )}
          </DialogDescription>

          {isLoadingSharedPostDetail ? (
            <div className="space-y-4 p-5">
              <div className="flex items-center gap-3">
                <div className="bg-muted size-10 animate-pulse rounded-full" />
                <div className="space-y-2">
                  <div className="bg-muted h-4 w-32 animate-pulse rounded" />
                  <div className="bg-muted h-3 w-20 animate-pulse rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="bg-muted h-4 w-full animate-pulse rounded" />
                <div className="bg-muted h-4 w-5/6 animate-pulse rounded" />
                <div className="bg-muted h-4 w-4/6 animate-pulse rounded" />
              </div>
              <div className="bg-muted h-48 w-full animate-pulse rounded-xl" />
            </div>
          ) : null}

          {!isLoadingSharedPostDetail && sharedPostDetailError ? (
            <div className="p-5">
              <p className="text-destructive text-center text-sm">{sharedPostDetailError}</p>
            </div>
          ) : null}

          {!isLoadingSharedPostDetail && !sharedPostDetailError && activeSharedPost ? (
            <PostFeedList
              assets={assets}
              posts={[activeSharedPost]}
              postsState={postFeedState}
              commentsState={commentsState}
              onOpenAuthorProfile={onOpenAuthorProfile}
              onTogglePostDetail={(post, isOpen) => {
                if (isOpen) {
                  removeSharedPostIdFromUrl();
                  return;
                }
                openSharedPostDetail(post.slug);
              }}
              profile={profile}
              showFollowButton={showFollowButton}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function HomeFeed() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasHydratedAuth = useAuthHydrated();
  const user = useAuthStore((state) => state.user);
  const [activeSubTab, setActiveSubTab] = useState<DiscoverSubTabId>('for-you');
  const subTabContainerRef = useRef<HTMLDivElement | null>(null);
  const subTabRefs = useRef<Record<DiscoverSubTabId, HTMLButtonElement | null>>({
    'for-you': null,
    following: null,
    profile: null,
    bookmarks: null,
  });
  const shouldShowLoginPrompt =
    hasHydratedAuth &&
    !user?.id &&
    (activeSubTab === 'following' || activeSubTab === 'profile' || activeSubTab === 'bookmarks');

  const scrollSubTabToCenter = useCallback((tab: DiscoverSubTabId, smooth = true) => {
    const container = subTabContainerRef.current;
    const tabElement = subTabRefs.current[tab];
    if (!container || !tabElement) {
      return;
    }

    const containerWidth = container.clientWidth;
    const tabCenter = tabElement.offsetLeft + tabElement.offsetWidth / 2;
    const targetScrollLeft = Math.max(0, tabCenter - containerWidth / 2);
    const maxScrollLeft = Math.max(0, container.scrollWidth - containerWidth);

    container.scrollTo({
      left: Math.min(targetScrollLeft, maxScrollLeft),
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  useEffect(() => {
    const subTabParam = searchParams.get('discoverTab');
    if (!subTabParam) {
      return;
    }

    const normalized = subTabParam.toLowerCase().trim() as DiscoverSubTabId;
    const matchedTab = VALID_DISCOVER_SUB_TABS.find((tab) => tab === normalized);
    if (matchedTab) {
      window.setTimeout(() => setActiveSubTab(matchedTab), 0);
    }
  }, [searchParams]);

  useEffect(() => {
    scrollSubTabToCenter(activeSubTab, false);
  }, [activeSubTab, scrollSubTabToCenter]);

  const handleSubTabChange = (tab: DiscoverSubTabId) => {
    setActiveSubTab(tab);
    scrollSubTabToCenter(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('discoverTab', tab);
    params.delete('userId');
    router.replace(`${DISCOVER_BASE_PATH}?${params.toString()}`, { scroll: false });
  };

  const handleOpenAuthorProfile = (authorId: string) => {
    const normalizedAuthorId = authorId.trim();
    if (!normalizedAuthorId) {
      return;
    }

    if (user?.id === normalizedAuthorId) {
      setActiveSubTab('profile');
      const params = new URLSearchParams(searchParams.toString());
      params.set('discoverTab', 'profile');
      params.delete('userId');
      router.replace(`${DISCOVER_BASE_PATH}?${params.toString()}`, { scroll: false });
    } else {
      router.push(`/profile/${normalizedAuthorId}`);
    }
  };

  return (
    <div className="w-full pb-12">
      <div className="bg-background pt-safe sticky top-[calc(env(safe-area-inset-top)+4.5rem)] z-40 px-1">
        <div
          ref={subTabContainerRef}
          className="no-scrollbar mb-2 flex h-12 flex-row items-center gap-3 overflow-x-auto"
        >
          {[
            { id: 'for-you' as const, label: t('discover.web.forYou', 'For You') },
            { id: 'following' as const, label: t('discover.web.following', 'Following') },
            { id: 'profile' as const, label: t('discover.web.profile', 'Profile') },
            { id: 'bookmarks' as const, label: t('discover.web.bookmarks', 'Bookmarks') },
          ].map((tab) => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  subTabRefs.current[tab.id] = el;
                }}
                type="button"
                onClick={() => handleSubTabChange(tab.id)}
                className={cn(
                  'text-body-small-semibold relative flex h-10 shrink-0 items-center justify-center px-4 whitespace-nowrap transition-colors',
                  isActive ? 'text-primary-500' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span className="text-body-large-semibold">{tab.label}</span>
                <span
                  className={cn(
                    'absolute inset-x-0 bottom-0 h-0.5 rounded-full transition-colors',
                    isActive ? 'bg-primary-500' : 'bg-transparent',
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-3">
        {shouldShowLoginPrompt ? (
          <div className="mt-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="neutral-contained"
              className="text-body-large-semibold mx-auto h-11 w-[80%] text-neutral-900 dark:text-white"
              onClick={() => router.push('/login')}
            >
              {t('auth.login.title', { defaultValue: 'Login' })}
            </Button>
            <Button
              type="button"
              variant="primary-contained"
              className="text-body-large-semibold text-foreground mx-auto h-11 w-[80%]"
              onClick={() => router.push('/register')}
            >
              {t('auth.register.title', { defaultValue: 'Register' })}
            </Button>
          </div>
        ) : null}

        {!shouldShowLoginPrompt && activeSubTab === 'for-you' ? (
          <DiscoverSubTabFeed
            discoverTab="for-you"
            onOpenAuthorProfile={handleOpenAuthorProfile}
            emptyMessage={t('discover.web.noPosts', 'No posts available yet.')}
          />
        ) : null}

        {!shouldShowLoginPrompt && activeSubTab === 'following' ? (
          <DiscoverSubTabFeed
            discoverTab="following"
            followingOnly
            onOpenAuthorProfile={handleOpenAuthorProfile}
            emptyMessage={t(
              'discover.web.noFollowingPosts',
              'Follow authors to see their posts here.',
            )}
          />
        ) : null}

        {!shouldShowLoginPrompt && activeSubTab === 'profile' ? (
          <MyWall onOpenAuthorProfile={handleOpenAuthorProfile} />
        ) : null}

        {!shouldShowLoginPrompt && activeSubTab === 'bookmarks' ? (
          <DiscoverSubTabFeed
            discoverTab="bookmarks"
            onOpenAuthorProfile={handleOpenAuthorProfile}
            mode="bookmarks"
            emptyMessage={t('discover.web.noBookmarkedPosts', 'No bookmarks yet.')}
          />
        ) : null}
      </div>
      {user && (
        <Button
          type="button"
          variant="primary-contained"
          className="fixed right-4 bottom-24 z-30 h-12 w-12 p-0 md:bottom-24 [&_svg]:!h-5 [&_svg]:!w-5 [&_svg]:!text-white"
          onClick={() => router.push('/discover?tab=feed&composer=create', { scroll: false })}
        >
          <Plus />
        </Button>
      )}
    </div>
  );
}
