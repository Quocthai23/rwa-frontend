'use client';

import { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RefObject } from 'react';
import { Button } from '@/components/shared/atoms/button';
import { useGetData } from '@/context/GetdataContext';
import { useTheme } from '@/theme';
import { useDiscoverComments } from '../../../hooks/useDiscoverComments';
import { useDiscoverPosts } from '../../../hooks/useDiscoverPosts';
import { DiscoverPostCard } from '../../DiscoverPostCard';
import { PostFeedList } from '../shared/PostFeedList';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type BookmarksTabProps = {
  onSetAuthorFollowingStateRef?: RefObject<
    ((authorId: string, nextFollowing: boolean) => void) | null
  >;
  onSuggestedCreatorsUpdateRef?: RefObject<
    ((userId: string, nextFollowing: boolean) => void) | null
  >;
};

const DISCOVER_BASE_PATH = '/discover';
const BOOKMARK_TAB_ID = 'bookmark';

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

export function BookmarksTab({
  onSetAuthorFollowingStateRef,
  onSuggestedCreatorsUpdateRef,
}: BookmarksTabProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname() || DISCOVER_BASE_PATH;
  const searchParams = useSearchParams();
  const sharedPostSlugFromPath = useMemo(() => getSharedPostSlugFromPathname(pathname), [pathname]);
  const [sharedPostSlugParam, setSharedPostSlugParam] = useState(sharedPostSlugFromPath);
  const sharedPostIdParam = searchParams.get('id')?.trim() || '';
  const sharedPostAutoOpenedIdRef = useRef<string | null>(null);
  const isClosingSharedPostRef = useRef(false);
  const hasPushedSharedPostHistoryRef = useRef(false);
  const { me } = useGetData();
  const { mode } = useTheme();
  const postsState = useDiscoverPosts({
    mode: 'bookmarks',
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
    params.set('tab', BOOKMARK_TAB_ID);
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
      params.set('tab', BOOKMARK_TAB_ID);
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
      ) : (
        <PostFeedList
          commentsState={commentsState}
          onOpenAuthorProfile={handleOpenAuthorProfile}
          onToggleComments={openSharedPostDetail}
          refetchPost={postsState.reloadPosts}
          posts={postsState.posts}
          postsState={postFeedState}
          emptyMessage={t('discover.web.noBookmarkedPosts', 'No bookmarks yet.')}
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
