'use client';

import {
  type ChangeEvent,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/shared/atoms/dialog';
import type { EditorHandle } from '@/components/shared/atoms/editor';
import { useGetData } from '@/context/GetdataContext';
import { localizeApiError } from '@/i18n/apiErrors';
import { postApi, type ListedPostItem } from '@/services/postService';
import { DiscoverPostCard, type DiscoverPost } from '../../DiscoverPostCard';
import type { ComposerImage, ComposerLinkedAsset } from '../types';
import { CreatePostComposer } from '../shared/CreatePostComposer';
import { PostFeedList } from '../shared/PostFeedList';
import { useDiscoverComposer } from '../../../hooks/useDiscoverComposer';
import { useDiscoverComments } from '../../../hooks/useDiscoverComments';
import { useDiscoverPosts } from '../../../hooks/useDiscoverPosts';
import SkeletonPost from '../profile/SkeletonPost';
import { DISCOVER_WEB_POST_CREATED_EVENT } from '../../../constants/events';

type ForYouTabProps = {
  canPost?: boolean;
  composerImages?: ComposerImage[];
  composerLinkedAssets?: ComposerLinkedAsset[];
  composerText?: string;
  currentUserName?: string;
  fileInputRef?: RefObject<HTMLInputElement | null>;
  isUploadingImages?: boolean;
  isPosting?: boolean;
  onAddComposerAsset?: (asset: ComposerLinkedAsset) => void;
  onComposerImageChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onComposerTextChange?: (value: string) => void;
  onCreatePost?: () => void;
  onToggleComposerAsset?: (asset: ComposerLinkedAsset) => void;
  onRemoveComposerImage?: (imageId: string) => void;
  onRemoveComposerAsset?: (assetId: string) => void;
  onSetAuthorFollowingStateRef?: RefObject<
    ((authorId: string, nextFollowing: boolean) => void) | null
  >;
  onSuggestedCreatorsUpdateRef?: RefObject<
    ((userId: string, nextFollowing: boolean) => void) | null
  >;
  userAvatar?: string;
};

type DiscoverComposerShareImageDetail = {
  imageUrl?: string;
};

const DISCOVER_COMPOSER_FOCUS_EVENT = 'discover:web:composer:focus';
const DISCOVER_COMPOSER_SHARE_IMAGE_EVENT = 'discover:web:composer:add-image';
const DISCOVER_COMPOSER_SHARE_IMAGE_STORAGE_KEY = 'discover:web:composer:pending-share-image';
const DISCOVER_USER_PLACEHOLDER_ICON = '/assets/images/discover/filled.png';
const DISCOVER_BASE_PATH = '/discover';
const FOR_YOU_TAB_ID = 'for-you';

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

export function ForYouTab({
  canPost,
  composerImages,
  composerLinkedAssets,
  composerText,
  currentUserName,
  fileInputRef,
  isUploadingImages,
  isPosting,
  onAddComposerAsset,
  onComposerImageChange,
  onComposerTextChange,
  onCreatePost,
  onToggleComposerAsset,
  onRemoveComposerImage,
  onRemoveComposerAsset,
  onSetAuthorFollowingStateRef,
  onSuggestedCreatorsUpdateRef,
  userAvatar,
}: ForYouTabProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname() || '/discover';
  const searchParams = useSearchParams();
  const sharedPostSlugFromPath = useMemo(() => getSharedPostSlugFromPathname(pathname), [pathname]);
  const [sharedPostSlugParam, setSharedPostSlugParam] = useState(sharedPostSlugFromPath);
  const sharedPostIdParam = searchParams.get('id')?.trim() || '';
  const { me, assets: marketAssets } = useGetData();

  const postsState = useDiscoverPosts({
    followingOnly: false,
    status: 'APPROVED',
    onAuthorFollowingStateChange: (authorId, nextFollowing) => {
      onSuggestedCreatorsUpdateRef?.current?.(authorId, nextFollowing);
    },
  });
  const commentsState = useDiscoverComments({
    onCommentCountChange: postsState.updatePostCommentCount,
  });
  const composerState = useDiscoverComposer({ onPostCreated: postsState.reloadPosts });
  useEffect(() => {
    if (onSetAuthorFollowingStateRef) {
      onSetAuthorFollowingStateRef.current = postsState.setAuthorFollowingState;
    }
  }, [onSetAuthorFollowingStateRef, postsState.setAuthorFollowingState]);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const sharedPostAutoOpenedIdRef = useRef<string | null>(null);
  const isClosingSharedPostRef = useRef(false);
  const sharedPostFetchInFlightIdRef = useRef<string | null>(null);
  const hasPushedSharedPostHistoryRef = useRef(false);
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

  const defaultFileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<EditorHandle | null>(null);
  const [sharedPostDetail, setSharedPostDetail] = useState<DiscoverPost | null>(null);
  const [sharedPostDetailError, setSharedPostDetailError] = useState('');
  const [isLoadingSharedPostDetail, setIsLoadingSharedPostDetail] = useState(false);

  const safeCanPost = canPost ?? composerState.canPost;
  const safeComposerImages = composerImages ?? composerState.composerImages;
  const safeComposerLinkedAssets = composerLinkedAssets ?? composerState.composerLinkedAssets;
  const safeComposerText = composerText ?? composerState.composerText;
  const safeCurrentUserName = currentUserName?.trim() || me?.username?.trim() || 'Guest Trader';
  const safeFileInputRef = fileInputRef ?? defaultFileInputRef;
  const safeIsUploadingImages = isUploadingImages ?? composerState.isUploadingImages;
  const safeIsPosting = isPosting ?? composerState.isPosting;
  const safeUserAvatar = userAvatar?.trim() || me?.avatar || DISCOVER_USER_PLACEHOLDER_ICON;
  const safeOnAddComposerAsset = onAddComposerAsset ?? composerState.addComposerAsset;
  const safeOnComposerImageChange =
    onComposerImageChange ?? composerState.handleComposerImageChange;
  const safeOnComposerTextChange = onComposerTextChange ?? composerState.setComposerText;
  const safeOnCreatePost = onCreatePost ?? composerState.createPost;
  const safeOnToggleComposerAsset = onToggleComposerAsset ?? composerState.toggleComposerAsset;
  const safeOnRemoveComposerImage = onRemoveComposerImage ?? composerState.removeComposerImage;
  const safeOnRemoveComposerAsset = onRemoveComposerAsset ?? composerState.removeComposerAsset;
  const isLoggedIn = Boolean(me?.id);

  const mapApiPostToDiscoverPost = useCallback(
    (post: ListedPostItem): DiscoverPost => {
      const mapPost = (item: ListedPostItem & { user?: any }, depth: number): DiscoverPost => {
        const normalizedContent = item.content?.trim() || '';
        const authorObj = item.author || item.user;
        const firstLine = normalizedContent
          .split('\n')
          .map((line) => line.trim())
          .find(Boolean);
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
            id: authorObj?.id || '',
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
              (me?.id && authorObj?.id === me.id && me.email
                ? me.email.split('@')[0]
                : t('discover.web.unknownAuthor', 'Unknown author')),
            verified: false,
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
          following: Boolean(authorObj?.relation?.isFollowing),
          isOwnPost: Boolean(me?.id && authorObj?.id === me.id),
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
    [marketAssets, t, me],
  );

  const activeSharedPost = useMemo(() => {
    if (!sharedPostSlugParam && !sharedPostIdParam) {
      return null;
    }

    return (
      postsState.posts.find(
        (post) => post.slug === sharedPostSlugParam || post.id === sharedPostIdParam,
      ) || sharedPostDetail
    );
  }, [postsState.posts, sharedPostDetail, sharedPostIdParam, sharedPostSlugParam]);
  const sharedPostFromFeed = useMemo(() => {
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
    params.set('tab', FOR_YOU_TAB_ID);
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
      params.set('tab', FOR_YOU_TAB_ID);
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
    if (typeof window === 'undefined') {
      return;
    }

    const focusComposer = () => {
      const editorHandle = textareaRef.current;
      if (!editorHandle) {
        return;
      }

      editorHandle.moveCaretToEnd();
    };

    window.addEventListener(DISCOVER_COMPOSER_FOCUS_EVENT, focusComposer as EventListener);
    return () => {
      window.removeEventListener(DISCOVER_COMPOSER_FOCUS_EVENT, focusComposer as EventListener);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const addSharedImageToComposer =
      (composerState as { addUploadedImageToComposer?: (imageUrl: string) => boolean })
        .addUploadedImageToComposer ?? (() => false);

    const handleSharedImage = (imageUrl: string) => {
      const added = addSharedImageToComposer(imageUrl);
      if (!added) {
        return;
      }

      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent(DISCOVER_COMPOSER_FOCUS_EVENT));
      }, 0);
    };

    const consumePendingSharedImage = () => {
      try {
        const raw = window.sessionStorage.getItem(DISCOVER_COMPOSER_SHARE_IMAGE_STORAGE_KEY);
        if (!raw) {
          return;
        }

        window.sessionStorage.removeItem(DISCOVER_COMPOSER_SHARE_IMAGE_STORAGE_KEY);
        const parsed = JSON.parse(raw) as DiscoverComposerShareImageDetail;
        if (!parsed?.imageUrl) {
          return;
        }

        handleSharedImage(parsed.imageUrl);
      } catch {
        // ignore malformed payload
      }
    };

    const onSharedImageEvent = (event: Event) => {
      const customEvent = event as CustomEvent<DiscoverComposerShareImageDetail>;
      const imageUrl = String(customEvent.detail?.imageUrl ?? '').trim();
      if (!imageUrl) {
        return;
      }

      handleSharedImage(imageUrl);
    };

    consumePendingSharedImage();
    window.addEventListener(
      DISCOVER_COMPOSER_SHARE_IMAGE_EVENT,
      onSharedImageEvent as EventListener,
    );
    return () => {
      window.removeEventListener(
        DISCOVER_COMPOSER_SHARE_IMAGE_EVENT,
        onSharedImageEvent as EventListener,
      );
    };
  }, [composerState]);

  useEffect(() => {
    if (!sharedPostSlugParam && !sharedPostIdParam) {
      setSharedPostDetail(null);
      setSharedPostDetailError('');
      setIsLoadingSharedPostDetail(false);
      sharedPostFetchInFlightIdRef.current = null;
      return;
    }

    const hasSharedPostInFeed = postsState.posts.some(
      (post) => post.slug === sharedPostSlugParam || post.id === sharedPostIdParam,
    );
    if (hasSharedPostInFeed) {
      setSharedPostDetail(null);
      setSharedPostDetailError('');
      setIsLoadingSharedPostDetail(false);
      sharedPostFetchInFlightIdRef.current = null;
      return;
    }

    const sharedPostRef = sharedPostSlugParam || sharedPostIdParam;
    if (!sharedPostRef) {
      return;
    }

    if (sharedPostFetchInFlightIdRef.current === sharedPostRef) {
      return;
    }

    // Avoid double work and modal churn when the target post is already available in the feed.
    if (sharedPostFromFeed) {
      setSharedPostDetail(null);
      setSharedPostDetailError('');
      setIsLoadingSharedPostDetail(false);
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
    postsState.posts,
    sharedPostDetail?.id,
    sharedPostDetail?.slug,
    sharedPostIdParam,
    sharedPostSlugParam,
    t,
  ]);

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

  const handleOpenAuthorProfile = useCallback(
    (authorId: string) => {
      const normalizedAuthorId = authorId.trim();
      if (!normalizedAuthorId) {
        return;
      }

      router.push(
        `${DISCOVER_BASE_PATH}?tab=profile?userId=${encodeURIComponent(normalizedAuthorId)}`,
      );
    },
    [router],
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

  const { hasMorePosts, isLoadingMorePosts, isLoadingPosts, loadMorePosts } = postsState;
  const feedPosts = postsState.posts;
  const sharedPostComments = activeSharedPost
    ? commentsState.commentsByPostId[activeSharedPost.id] || []
    : [];
  const sharedPostCommentsTotal = activeSharedPost
    ? (commentsState.commentsTotalByPostId[activeSharedPost.id] ?? sharedPostComments.length)
    : 0;
  const hasMoreSharedPostComments = sharedPostComments.length < sharedPostCommentsTotal;

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) {
      return;
    }

    const rootElement = target.closest('[data-discover-feed-scroll-root]') as Element | null;

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
        root: rootElement,
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
    if (typeof window === 'undefined') {
      return;
    }

    const handlePostCreated = () => {
      void postsState.reloadPosts();
    };

    window.addEventListener(DISCOVER_WEB_POST_CREATED_EVENT, handlePostCreated);
    return () => {
      window.removeEventListener(DISCOVER_WEB_POST_CREATED_EVENT, handlePostCreated);
    };
  }, [postsState.reloadPosts]);

  return (
    <div className="">
      <div className="space-y-4">
        <div className="bg-background py-4">
          {isLoggedIn ? (
            <CreatePostComposer
              canPost={safeCanPost}
              composerImages={safeComposerImages}
              composerLinkedAssets={safeComposerLinkedAssets}
              composerText={safeComposerText}
              currentUserName={safeCurrentUserName}
              fileInputRef={safeFileInputRef}
              isPosting={safeIsPosting}
              isUploadingImages={safeIsUploadingImages}
              onComposerImageChange={safeOnComposerImageChange}
              onComposerTextChange={safeOnComposerTextChange}
              onCreatePost={safeOnCreatePost}
              onLinkedAssetPicked={(assetId, symbol) =>
                safeOnAddComposerAsset({ id: assetId, symbol })
              }
              onToggleComposerAsset={safeOnToggleComposerAsset}
              onRemoveComposerImage={safeOnRemoveComposerImage}
              onRemoveComposerAsset={safeOnRemoveComposerAsset}
              textareaRef={textareaRef}
              userAvatar={safeUserAvatar}
            />
          ) : null}

          {postsState.isLoadingPosts && postsState.posts.length === 0 ? (
            <div className="space-y-4">
              {[1, 2, 3].map((index) => (
                <div key={index} className="mt-4 px-4">
                  <SkeletonPost />
                </div>
              ))}
            </div>
          ) : (
            <PostFeedList
              commentsState={commentsState}
              onOpenAuthorProfile={handleOpenAuthorProfile}
              onToggleComments={openSharedPostDetail}
              refetchPost={postsState.reloadPosts}
              posts={feedPosts}
              postsState={postFeedState}
              emptyMessage={t('discover.web.noPosts', 'No posts available yet.')}
            />
          )}

          {feedPosts.length > 0 ? (
            <>
              {postsState.isLoadingMorePosts ? (
                <div className="space-y-4">
                  {[1, 2].map((index) => (
                    <div key={index} className="mt-4 px-4">
                      <SkeletonPost />
                    </div>
                  ))}
                </div>
              ) : null}

              {hasMorePosts ? (
                <div ref={loadMoreRef} className="h-1 w-full" aria-hidden="true" />
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <Dialog
        open={Boolean(sharedPostIdParam) && !activeSharedPost && Boolean(sharedPostDetailError)}
        onOpenChange={(open) => {
          if (!open) {
            closeSharedPostDetail();
          }
        }}
      >
        <DialogContent
          className="max-h-[90vh] max-w-210 overflow-y-auto border-none p-4 sm:p-6"
          onOpenAutoFocus={(e) => e.preventDefault()}
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
            <div className="mt-2">
              <SkeletonPost />
            </div>
          ) : null}

          {!isLoadingSharedPostDetail && sharedPostDetailError ? (
            <p className="text-destructive mt-2 text-sm">{sharedPostDetailError}</p>
          ) : null}

          {!isLoadingSharedPostDetail && !sharedPostDetailError && activeSharedPost ? (
            <div className="mt-2">
              <PostFeedList
                commentsState={commentsState}
                onOpenAuthorProfile={handleOpenAuthorProfile}
                refetchPost={postsState.reloadPosts}
                posts={[activeSharedPost]}
                postsState={postFeedState}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
