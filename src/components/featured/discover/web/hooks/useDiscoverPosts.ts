'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useAuthHydrated } from '@/hook/useAuthHydrated';
import { useToast } from '@/hook/useToast';
import { useGetData } from '@/context/GetdataContext';
import { localizeApiError } from '@/i18n/apiErrors';
import { imageApi } from '@/services/imageService';
import { postApi, type ListedPostItem } from '@/services/postService';
import { userApi } from '@/services/userService';
import { useAuthStore } from '@/store/authStore';
import { copyText } from '@/utils/copy';
import type { DiscoverPost } from '../components/DiscoverPostCard';
import {
  DISCOVER_DEBOUNCE_MS,
  DISCOVER_POSTS_PAGE_SIZE,
  DISCOVER_USER_PLACEHOLDER_ICON,
} from './constants';

type UseDiscoverPostsOptions = {
  autoLoad?: boolean;
  followingOnly?: boolean;
  mode?: 'all' | 'bookmarks';
  onAuthorFollowingStateChange?: (authorId: string, nextFollowing: boolean) => void;
  status?: string;
  userId?: string;
};

export type RepostPostPayload = {
  content: string;
  images?: File[];
};

export type UseDiscoverPostsReturn = {
  currentUserId?: string;
  deletePost: (postId: string) => Promise<boolean>;
  hasMorePosts: boolean;
  isDeletingPostById: Record<string, boolean>;
  isLoadingMorePosts: boolean;
  isLoadingPosts: boolean;
  isRepostingPostById: Record<string, boolean>;
  loadMorePosts: () => void;
  posts: DiscoverPost[];
  postsTotal: number;
  repostPost: (postId: string, payload: RepostPostPayload) => Promise<boolean>;
  reloadPosts: () => Promise<void>;
  setAuthorFollowingState: (authorId: string, nextFollowing: boolean) => void;
  sharePost: (postId: string) => Promise<void>;
  toggleBookmark: (postId: string) => void;
  toggleFollow: (postId: string) => void;
  toggleFollowByAuthorId: (authorId: string, currentFollowing: boolean) => void;
  togglePostLike: (postId: string) => void;
  updatePostCommentCount: (postId: string, delta: number) => void;
};

export function useDiscoverPosts(options?: UseDiscoverPostsOptions): UseDiscoverPostsReturn {
  const {
    autoLoad = true,
    followingOnly = false,
    mode = 'all',
    onAuthorFollowingStateChange,
    userId,
    status,
  } = options || {};
  const isBookmarksMode = mode === 'bookmarks';
  const { t } = useTranslation();
  const router = useRouter();
  const { assets: marketAssets } = useGetData();
  const { showError, showSuccess } = useToast();
  const hasHydratedAuth = useAuthHydrated();
  const user = useAuthStore((state) => state.user);

  const [posts, setPosts] = useState<DiscoverPost[]>([]);
  const [postsTotal, setPostsTotal] = useState(0);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false);
  const [isDeletingPostById, setIsDeletingPostById] = useState<Record<string, boolean>>({});
  const [isRepostingPostById, setIsRepostingPostById] = useState<Record<string, boolean>>({});

  const postLikeTimeoutById = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const postLikeInitialStateRef = useRef<Record<string, boolean>>({});
  const postLikeDesiredStateRef = useRef<Record<string, boolean>>({});
  const followTimeoutById = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const followDesiredStateRef = useRef<Record<string, boolean>>({});
  const bookmarkTimeoutById = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const bookmarkDesiredStateRef = useRef<Record<string, boolean>>({});
  const isLoadingInitialByQueryRef = useRef<Record<string, boolean>>({});
  const hasLoadedQueryRef = useRef<Record<string, boolean>>({});

  const listQueryKey = useMemo(
    () =>
      JSON.stringify({
        followingOnly,
        mode,
        status: status || '',
        userId: userId || '',
      }),
    [followingOnly, mode, status, userId],
  );

  useEffect(() => {
    return () => {
      Object.values(postLikeTimeoutById.current).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      Object.values(followTimeoutById.current).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      Object.values(bookmarkTimeoutById.current).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      postLikeTimeoutById.current = {};
      postLikeInitialStateRef.current = {};
      postLikeDesiredStateRef.current = {};
      followTimeoutById.current = {};
      followDesiredStateRef.current = {};
      bookmarkTimeoutById.current = {};
      bookmarkDesiredStateRef.current = {};
    };
  }, []);

  const mapApiPostToDiscoverPost = useCallback(
    (post: ListedPostItem): DiscoverPost => {
      const mapPost = (item: ListedPostItem & { user?: any }, depth: number): DiscoverPost => {
        const normalizedContent = item.content?.trim() || '';
        const authorObj = item.author || item.user;
        const firstLine = normalizedContent
          .split('\n')
          .map((line) => line.trim())
          .find(Boolean);
        const authorId = authorObj?.id || '';
        const resolveMarketAsset = (assetId?: string, symbol?: string) => {
          const normalizedSymbol = symbol?.trim().toUpperCase();
          return (
            marketAssets?.find((asset) => assetId && asset.id === assetId) ||
            marketAssets?.find(
              (asset) =>
                normalizedSymbol && asset.symbol?.trim().toUpperCase() === normalizedSymbol,
            )
          );
        };
        const fallbackAssetsFromIds =
          item.assetIds?.flatMap((assetId) => {
            const matched = resolveMarketAsset(assetId);
            if (!matched) {
              return [];
            }

            return [
              {
                id: matched.id,
                symbol: matched.symbol,
                bid: matched.bid,
                ask: matched.ask,
                logo: matched.logo,
              },
            ];
          }) ?? [];
        const hydratedAssets =
          item.assets?.map((asset) => {
            const matched = resolveMarketAsset(asset.id, asset.symbol);
            return {
              id: asset.id,
              symbol: asset.symbol || matched?.symbol,
              bid: matched?.bid,
              ask: matched?.ask,
              logo: asset.logo || matched?.logo,
            };
          }) ?? [];
        const mappedAssets = (() => {
          const byId = new Map<
            string,
            { id: string; symbol?: string; bid?: string; ask?: string; logo?: string | null }
          >();

          hydratedAssets.forEach((asset) => byId.set(asset.id, asset));
          fallbackAssetsFromIds.forEach((asset) => {
            if (!byId.has(asset.id)) {
              byId.set(asset.id, asset);
            }
          });

          return Array.from(byId.values());
        })();

        return {
          assets: mappedAssets,
          id: item.id,
          slug: item.slug || item.id,
          author: {
            id: authorId,
            avatar: authorObj?.avatar || DISCOVER_USER_PLACEHOLDER_ICON,
            bio: authorObj?.bio?.trim() || undefined,
            followers:
              typeof authorObj?.followers === 'number' && Number.isFinite(authorObj.followers)
                ? Math.max(0, authorObj.followers)
                : 0,
            following:
              typeof authorObj?.following === 'number' && Number.isFinite(authorObj.following)
                ? Math.max(0, authorObj.following)
                : 0,
            handle: `@${authorObj?.username || 'unknown'}`,
            name:
              authorObj?.displayName?.trim() ||
              authorObj?.username ||
              (user?.id && authorId === user.id && user.email
                ? user.email.split('@')[0]
                : t('discover.web.unknownAuthor', 'Unknown author')),
            verified: false,
          },
          bookmarked: typeof item.isBookmarked === 'boolean' ? item.isBookmarked : isBookmarksMode,
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
          following: Boolean(authorObj?.relation?.isFollowing),
          isOwnPost: Boolean(user?.id && authorId === user.id),
          liked: Boolean(item.isLiked),
          status: item.status,
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
    [isBookmarksMode, marketAssets, t, user],
  );

  const loadPostsPage = useCallback(
    async (skip: number, append: boolean) => {
      const isInitialPage = skip === 0;
      const queryKey = listQueryKey;

      if (isInitialPage && !append && isLoadingInitialByQueryRef.current[queryKey]) {
        return;
      }

      if (append) {
        setIsLoadingMorePosts(true);
      } else {
        if (isInitialPage) {
          isLoadingInitialByQueryRef.current[queryKey] = true;
        }

        if (!hasLoadedQueryRef.current[queryKey]) {
          setPosts([]);
          setPostsTotal(0);
          setIsRepostingPostById({});
        }

        setIsLoadingPosts(true);
      }

      try {
        const response = isBookmarksMode
          ? await postApi.listBookmarkedPosts({
              skip,
              take: DISCOVER_POSTS_PAGE_SIZE,
            })
          : await postApi.listPosts({
              followingOnly,
              status,
              skip,
              sortBy: 'createdAt',
              sortDir: 'desc',
              take: DISCOVER_POSTS_PAGE_SIZE,
              userId,
            });

        const mappedPosts = (response.data || []).map(mapApiPostToDiscoverPost);
        const total = typeof response.total === 'number' ? response.total : mappedPosts.length;
        setPostsTotal(total);

        setPosts((prev) => {
          if (!append) {
            return mappedPosts;
          }

          const existingIds = new Set(prev.map((item) => item.id));
          const merged = [...prev];

          mappedPosts.forEach((item) => {
            if (!existingIds.has(item.id)) {
              merged.push(item);
              existingIds.add(item.id);
            }
          });

          return merged;
        });

        if (isInitialPage && !append) {
          hasLoadedQueryRef.current[queryKey] = true;
        }
      } catch (error) {
        showError(
          isBookmarksMode
            ? t('discover.web.loadBookmarksFailedTitle', 'Unable to load bookmarks')
            : t('discover.web.loadPostsFailedTitle', 'Unable to load posts'),
          localizeApiError(error, t, 'apiErrors.generic'),
        );
      } finally {
        if (isInitialPage && !append) {
          isLoadingInitialByQueryRef.current[queryKey] = false;
        }

        setIsLoadingPosts(false);
        setIsLoadingMorePosts(false);
      }
    },
    [
      followingOnly,
      isBookmarksMode,
      listQueryKey,
      mapApiPostToDiscoverPost,
      showError,
      status,
      t,
      userId,
    ],
  );

  useEffect(() => {
    if (!hasHydratedAuth || !autoLoad || (!user && isBookmarksMode)) {
      return;
    }

    void loadPostsPage(0, false);
  }, [autoLoad, hasHydratedAuth, loadPostsPage, user, isBookmarksMode]);

  const updatePostById = useCallback(
    (postId: string, updater: (post: DiscoverPost) => DiscoverPost) => {
      setPosts((prev) => prev.map((post) => (post.id === postId ? updater(post) : post)));
    },
    [],
  );

  const setAuthorFollowingState = useCallback((authorId: string, nextFollowing: boolean) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.author.id !== authorId) {
          return post;
        }

        return {
          ...post,
          following: nextFollowing,
        };
      }),
    );
  }, []);

  const setPostLikeState = useCallback(
    (postId: string, nextLiked: boolean) => {
      updatePostById(postId, (post) => {
        const currentLiked = Boolean(post.liked);
        if (currentLiked === nextLiked) {
          return post;
        }

        const delta = nextLiked ? 1 : -1;

        return {
          ...post,
          liked: nextLiked,
          stats: {
            ...post.stats,
            likes: Math.max(0, post.stats.likes + delta),
          },
        };
      });
    },
    [updatePostById],
  );

  const togglePostLike = useCallback(
    (postId: string) => {
      if (!user) {
        router.push('/login');
        return;
      }

      const targetPost = posts.find((post) => post.id === postId);
      if (!targetPost) {
        return;
      }

      // Store initial state only on first toggle for this post
      if (!(postId in postLikeInitialStateRef.current)) {
        postLikeInitialStateRef.current[postId] = Boolean(targetPost.liked);
      }

      const nextLiked = !Boolean(targetPost.liked);

      // Store desired state (what user wants)
      postLikeDesiredStateRef.current[postId] = nextLiked;
      setPostLikeState(postId, nextLiked);

      const existingTimeout = postLikeTimeoutById.current[postId];
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      postLikeTimeoutById.current[postId] = setTimeout(() => {
        void (async () => {
          try {
            const initialLiked = postLikeInitialStateRef.current[postId];
            const desiredLiked = postLikeDesiredStateRef.current[postId];

            // Only call API if desired state is different from initial state
            if (desiredLiked !== initialLiked) {
              const response = await postApi.togglePostLike(postId);
              if (typeof response?.isLiked === 'boolean') {
                setPostLikeState(postId, response.isLiked);
              }
            } else {
              // User spammed and ended up back at initial state, revert UI
              setPostLikeState(postId, initialLiked);
            }
          } catch (error) {
            showError(
              t('discover.web.toggleLikeFailedTitle', 'Unable to update like'),
              localizeApiError(error, t, 'apiErrors.generic'),
            );
          } finally {
            delete postLikeTimeoutById.current[postId];
            delete postLikeInitialStateRef.current[postId];
            delete postLikeDesiredStateRef.current[postId];
          }
        })();
      }, DISCOVER_DEBOUNCE_MS);
    },
    [posts, setPostLikeState, showError, t, user, router],
  );

  const toggleFollow = useCallback(
    (postId: string) => {
      if (!user) {
        router.push('/login');
        return;
      }

      const targetPost = posts.find((post) => post.id === postId);
      if (!targetPost) {
        return;
      }

      const authorId = targetPost.author.id;
      if (!authorId) {
        return;
      }

      const previousFollowing = Boolean(targetPost.following);
      const nextFollowing = !previousFollowing;

      // Store desired state
      followDesiredStateRef.current[authorId] = nextFollowing;
      // Update UI immediately (optimistic update)
      setAuthorFollowingState(authorId, nextFollowing);
      // Notify about following state change immediately
      onAuthorFollowingStateChange?.(authorId, nextFollowing);

      const existingTimeout = followTimeoutById.current[authorId];
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Debounce API call in background
      followTimeoutById.current[authorId] = setTimeout(() => {
        void (async () => {
          const desiredFollowing = followDesiredStateRef.current[authorId] ?? nextFollowing;

          try {
            // Call API in background without await
            userApi
              .upsertUserRelation(authorId, {
                action: desiredFollowing ? 'follow' : 'unfollow',
              })
              .catch((error) => {
                // Revert to initial state on error
                setAuthorFollowingState(authorId, previousFollowing);

                showError(
                  t('discover.web.toggleFollowFailedTitle', 'Unable to update following'),
                  localizeApiError(error, t, 'apiErrors.generic'),
                );
              });
          } finally {
            delete followTimeoutById.current[authorId];
            delete followDesiredStateRef.current[authorId];
          }
        })();
      }, DISCOVER_DEBOUNCE_MS);
    },
    [posts, setAuthorFollowingState, showError, t, user, router, onAuthorFollowingStateChange],
  );

  const toggleFollowByAuthorId = useCallback(
    (authorId: string, currentFollowing: boolean) => {
      const normalizedAuthorId = authorId.trim();
      if (!normalizedAuthorId) {
        return;
      }

      if (!user) {
        router.push('/login');
        return;
      }

      const previousFollowing = currentFollowing;
      const nextFollowing = !previousFollowing;

      followDesiredStateRef.current[normalizedAuthorId] = nextFollowing;
      setAuthorFollowingState(normalizedAuthorId, nextFollowing);
      onAuthorFollowingStateChange?.(normalizedAuthorId, nextFollowing);

      const existingTimeout = followTimeoutById.current[normalizedAuthorId];
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      followTimeoutById.current[normalizedAuthorId] = setTimeout(() => {
        void (async () => {
          const desiredFollowing =
            followDesiredStateRef.current[normalizedAuthorId] ?? nextFollowing;

          try {
            userApi
              .upsertUserRelation(normalizedAuthorId, {
                action: desiredFollowing ? 'follow' : 'unfollow',
              })
              .catch((error) => {
                setAuthorFollowingState(normalizedAuthorId, previousFollowing);
                onAuthorFollowingStateChange?.(normalizedAuthorId, previousFollowing);

                showError(
                  t('discover.web.toggleFollowFailedTitle', 'Unable to update following'),
                  localizeApiError(error, t, 'apiErrors.generic'),
                );
              });
          } finally {
            delete followTimeoutById.current[normalizedAuthorId];
            delete followDesiredStateRef.current[normalizedAuthorId];
          }
        })();
      }, DISCOVER_DEBOUNCE_MS);
    },
    [onAuthorFollowingStateChange, router, setAuthorFollowingState, showError, t, user],
  );

  const toggleBookmark = useCallback(
    (postId: string) => {
      if (!user) {
        router.push('/login');
        return;
      }

      const targetPost = posts.find((post) => post.id === postId);
      if (!targetPost) {
        return;
      }

      const previousBookmarked = Boolean(targetPost.bookmarked);
      const nextBookmarked = !previousBookmarked;

      // Store desired state
      bookmarkDesiredStateRef.current[postId] = nextBookmarked;
      updatePostById(postId, (post) => ({
        ...post,
        bookmarked: nextBookmarked,
      }));

      const existingTimeout = bookmarkTimeoutById.current[postId];
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      bookmarkTimeoutById.current[postId] = setTimeout(() => {
        void (async () => {
          try {
            const desiredBookmarked = bookmarkDesiredStateRef.current[postId] ?? nextBookmarked;
            const response = await postApi.togglePostBookmark(postId);
            const confirmedBookmarked =
              typeof response?.isBookmarked === 'boolean'
                ? response.isBookmarked
                : desiredBookmarked;

            if (isBookmarksMode && !confirmedBookmarked) {
              setPosts((prev) => prev.filter((post) => post.id !== postId));
              setPostsTotal((prev) => Math.max(0, prev - 1));
              return;
            }

            updatePostById(postId, (post) => ({
              ...post,
              bookmarked: confirmedBookmarked,
            }));
          } catch (error) {
            updatePostById(postId, (post) => ({
              ...post,
              bookmarked: previousBookmarked,
            }));

            showError(
              t('discover.web.toggleBookmarkFailedTitle', 'Unable to update bookmark'),
              localizeApiError(error, t, 'apiErrors.generic'),
            );
          } finally {
            delete bookmarkTimeoutById.current[postId];
            delete bookmarkDesiredStateRef.current[postId];
          }
        })();
      }, DISCOVER_DEBOUNCE_MS);
    },
    [isBookmarksMode, posts, showError, t, updatePostById, user, router],
  );

  const sharePost = useCallback(
    async (postId: string) => {
      if (typeof window === 'undefined') {
        return;
      }

      const normalizedPostId = postId.trim();
      if (!normalizedPostId) {
        return;
      }

      const shareUrl = `${window.location.origin}/discover/${encodeURIComponent(normalizedPostId)}`;
      const copied = await copyText(shareUrl);

      if (!copied) {
        showError(
          t('discover.web.copyShareLinkFailedTitle', 'Unable to copy share link'),
          t('discover.web.copyShareLinkFailedMessage', 'Please copy the link manually.'),
        );
        return;
      }

      updatePostById(normalizedPostId, (post) => ({
        ...post,
        stats: {
          ...post.stats,
          shares: post.stats.shares + 1,
        },
      }));

      showSuccess(
        t('discover.web.copyShareLinkSuccessTitle', 'Link copied'),
        t('discover.web.copyShareLinkSuccessMessage', 'Share link copied to clipboard.'),
      );
    },
    [showError, showSuccess, t, updatePostById],
  );

  const repostPost = useCallback(
    async (postId: string, payload: RepostPostPayload): Promise<boolean> => {
      const normalizedPostId = postId.trim();
      if (!normalizedPostId) {
        return false;
      }

      if (!user) {
        showError(
          t('discover.web.loginRequiredTitle', 'Login required'),
          t('discover.web.loginRequiredPost', 'Please log in to create and upload post media.'),
        );
        return false;
      }

      const normalizedContent = payload.content.trim();
      if (!normalizedContent) {
        showError(
          t('discover.web.missingContentTitle', 'Missing content'),
          t('discover.web.missingContentMessage', 'Please enter content before posting.'),
        );
        return false;
      }

      let hasPendingRequest = false;
      setIsRepostingPostById((prev) => {
        if (prev[normalizedPostId]) {
          hasPendingRequest = true;
          return prev;
        }

        return {
          ...prev,
          [normalizedPostId]: true,
        };
      });

      if (hasPendingRequest) {
        return false;
      }

      try {
        const imageFiles = payload.images || [];
        const mediaLinks =
          imageFiles.length > 0
            ? await imageApi.uploadMultipleImagesToPresignedUrl(
                imageFiles.map((file) => ({
                  uri: file,
                  fileName: file.name,
                  type: file.type,
                })),
              )
            : [];

        await postApi.createPost({
          assetIds: [],
          content: normalizedContent,
          linksUrl: mediaLinks.map((link) => ({
            type: 'image' as const,
            link,
          })),
          repostId: normalizedPostId,
        });

        updatePostById(normalizedPostId, (post) => ({
          ...post,
          stats: {
            ...post.stats,
            reposts: post.stats.reposts + 1,
          },
        }));

        showSuccess(
          t('discover.web.repostSuccessTitle', 'Success'),
          t('discover.web.repostSuccessMessage', 'Repost created successfully.'),
        );

        await loadPostsPage(0, false);
        return true;
      } catch (error) {
        showError(
          t('discover.web.repostFailedTitle', 'Unable to repost'),
          localizeApiError(error, t, 'apiErrors.generic'),
        );

        return false;
      } finally {
        setIsRepostingPostById((prev) => {
          const next = { ...prev };
          delete next[normalizedPostId];
          return next;
        });
      }
    },
    [loadPostsPage, showError, showSuccess, t, updatePostById, user],
  );

  const deletePost = useCallback(
    async (postId: string): Promise<boolean> => {
      if (Boolean(isDeletingPostById[postId])) {
        return false;
      }

      setIsDeletingPostById((prev) => ({
        ...prev,
        [postId]: true,
      }));

      try {
        await postApi.deletePost(postId);

        const pendingLikeTimeout = postLikeTimeoutById.current[postId];
        if (pendingLikeTimeout) {
          clearTimeout(pendingLikeTimeout);
          delete postLikeTimeoutById.current[postId];
        }

        setPosts((prev) => prev.filter((post) => post.id !== postId));
        setPostsTotal((prev) => Math.max(0, prev - 1));

        showSuccess(
          t('discover.web.deletePostSuccessTitle', 'Success'),
          t('discover.web.deletePostSuccessMessage', 'Post deleted successfully.'),
        );

        return true;
      } catch (error) {
        showError(
          t('discover.web.deletePostFailedTitle', 'Unable to delete post'),
          localizeApiError(error, t, 'apiErrors.generic'),
        );

        return false;
      } finally {
        setIsDeletingPostById((prev) => {
          const next = { ...prev };
          delete next[postId];
          return next;
        });
      }
    },
    [isDeletingPostById, showError, showSuccess, t],
  );

  const updatePostCommentCount = useCallback(
    (postId: string, delta: number) => {
      if (delta === 0) {
        return;
      }

      updatePostById(postId, (post) => ({
        ...post,
        stats: {
          ...post.stats,
          comments: Math.max(0, post.stats.comments + delta),
        },
      }));
    },
    [updatePostById],
  );

  const hasMorePosts = useMemo(() => posts.length < postsTotal, [posts.length, postsTotal]);

  const loadMorePosts = useCallback(() => {
    if (!user) {
      return;
    }

    if (isLoadingPosts || isLoadingMorePosts || !hasMorePosts) {
      return;
    }

    void loadPostsPage(posts.length, true);
  }, [hasMorePosts, isLoadingMorePosts, isLoadingPosts, loadPostsPage, posts.length, user]);

  const reloadPosts = useCallback(async () => {
    await loadPostsPage(0, false);
  }, [loadPostsPage]);

  return useMemo(
    () => ({
      currentUserId: user?.id,
      deletePost,
      hasMorePosts,
      isDeletingPostById,
      isLoadingMorePosts,
      isLoadingPosts,
      isRepostingPostById,
      loadMorePosts,
      posts,
      postsTotal,
      repostPost,
      reloadPosts,
      setAuthorFollowingState,
      sharePost,
      toggleBookmark,
      toggleFollow,
      toggleFollowByAuthorId,
      togglePostLike,
      updatePostCommentCount,
    }),
    [
      user?.id,
      deletePost,
      hasMorePosts,
      isDeletingPostById,
      isLoadingMorePosts,
      isLoadingPosts,
      isRepostingPostById,
      loadMorePosts,
      posts,
      postsTotal,
      repostPost,
      reloadPosts,
      setAuthorFollowingState,
      sharePost,
      toggleBookmark,
      toggleFollow,
      toggleFollowByAuthorId,
      togglePostLike,
      updatePostCommentCount,
    ],
  );
}

