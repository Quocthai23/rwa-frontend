'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { DiscoverPost } from '../DiscoverPostCard';
import { PostFeedList } from '../PostFeedList';
import { useDiscoverComments } from '../../hooks/useDiscoverComments';
import { useDiscoverPosts } from '../../hooks/useDiscoverPosts';

type WallFeedProps = {
  authorFollowState?: boolean;
  emptyMessage: string;
  onOpenAuthorProfile?: (authorId: string) => void;
  onReloadPostsReady?: ((reloadPosts?: () => Promise<void>) => void) | undefined;
  onTogglePostDetail?: (post: DiscoverPost, isOpen: boolean) => void;
  showFollowButton?: boolean;
  status?: string;
  userId?: string;
};

export function WallFeed({
  authorFollowState,
  emptyMessage,
  onOpenAuthorProfile,
  onReloadPostsReady,
  onTogglePostDetail,
  showFollowButton = true,
  status = 'APPROVED',
  userId,
}: WallFeedProps) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const {
    posts,
    hasMorePosts,
    isLoadingMorePosts,
    isLoadingPosts,
    loadMorePosts,
    reloadPosts,
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
  } = useDiscoverPosts({
    autoLoad: true,
    status,
    userId,
  });

  const commentsState = useDiscoverComments({
    onCommentCountChange: updatePostCommentCount,
  });

  const renderedPosts = useMemo(() => {
    if (typeof authorFollowState !== 'boolean' || !userId) {
      return posts;
    }

    return posts.map((post) => {
      if (post.author.id !== userId) {
        return post;
      }

      return {
        ...post,
        following: authorFollowState,
      };
    });
  }, [authorFollowState, posts, userId]);

  useEffect(() => {
    onReloadPostsReady?.(reloadPosts);

    return () => {
      onReloadPostsReady?.(undefined);
    };
  }, [onReloadPostsReady, reloadPosts]);

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
      ) : (
        <PostFeedList
          posts={renderedPosts}
          refetchPost={reloadPosts}
          postsState={{
            currentUserId,
            deletePost,
            isDeletingPostById,
            isRepostingPostById,
            repostPost,
            sharePost,
            toggleBookmark,
            toggleFollow,
            togglePostLike,
          }}
          commentsState={commentsState}
          emptyMessage={emptyMessage}
          onOpenAuthorProfile={onOpenAuthorProfile}
          onTogglePostDetail={onTogglePostDetail}
          profile
          showFollowButton={showFollowButton}
        />
      )}

      {renderedPosts.length > 0 ? (
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
    </div>
  );
}
