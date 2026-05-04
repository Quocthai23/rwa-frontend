'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hook/useToast';
import { postApi } from '@/services/postService';
import { DiscoverPostCard, type DiscoverPost } from '../../DiscoverPostCard';
import type { UseDiscoverCommentsReturn } from '../../../hooks/useDiscoverComments';
import type { UseDiscoverPostsReturn } from '../../../hooks/useDiscoverPosts';
import { EditPostDialog } from './EditPostDialog';

type PostFeedPostsState = Pick<
  UseDiscoverPostsReturn,
  | 'currentUserId'
  | 'deletePost'
  | 'isDeletingPostById'
  | 'isRepostingPostById'
  | 'repostPost'
  | 'sharePost'
  | 'toggleBookmark'
  | 'toggleFollow'
  | 'toggleFollowByAuthorId'
  | 'togglePostLike'
>;

type PostFeedCommentsState = Pick<
  UseDiscoverCommentsReturn,
  | 'commentDraftByPostId'
  | 'commentsByPostId'
  | 'commentsTotalByPostId'
  | 'createComment'
  | 'deleteComment'
  | 'isCommentsOpenByPostId'
  | 'isCreatingCommentByPostId'
  | 'isDeletingCommentById'
  | 'isUpdatingCommentById'
  | 'isLoadingCommentsByPostId'
  | 'isLoadingMoreCommentsByPostId'
  | 'loadMoreComments'
  | 'setCommentDraft'
  | 'toggleCommentLike'
  | 'toggleComments'
  | 'updateComment'
>;

type PostFeedListProps = {
  commentsState?: PostFeedCommentsState;
  emptyMessage?: string;
  onOpenAuthorProfile?: (authorId: string) => void;
  refetchPost?: () => Promise<void> | void;
  onToggleComments?: (postId: string) => void;
  posts: DiscoverPost[];
  postsState: PostFeedPostsState;
  showFollowButton?: boolean;
};

const HASHTAG_SYMBOL_REGEX = /#([^\s#]+)/g;

export function PostFeedList({
  commentsState,
  emptyMessage,
  onOpenAuthorProfile,
  refetchPost,
  onToggleComments,
  posts,
  postsState,
  showFollowButton = true,
}: PostFeedListProps) {
  const { t } = useTranslation();
  const { showError, showSuccess } = useToast();
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingPostDraft, setEditingPostDraft] = useState('');
  const [isSubmittingEditPost, setIsSubmittingEditPost] = useState(false);
  const [editedPostContentById, setEditedPostContentById] = useState<Record<string, string>>({});
  const [editedPostAssetById, setEditedPostAssetById] = useState<
    Record<string, DiscoverPost['assets']>
  >({});
  const [editingPostDetailById, setEditingPostDetailById] = useState<
    Record<string, { images: string[]; text: string }>
  >({});

  const selectedEditingPost = useMemo(() => {
    const basePost = posts.find((item) => item.id === editingPostId) || null;
    if (!basePost) {
      return null;
    }

    const detail = editingPostDetailById[basePost.id];
    if (!detail) {
      return basePost;
    }

    return {
      ...basePost,
      content: {
        ...basePost.content,
        images: detail.images,
        text: detail.text || basePost.content.text,
      },
    };
  }, [editingPostDetailById, editingPostId, posts]);

  const closeEditPostDialog = () => {
    setEditingPostId(null);
    setEditingPostDraft('');
  };

  const handleStartEditPost = async (post: DiscoverPost) => {
    const latestContent = editedPostContentById[post.id] ?? post.content.text;
    setEditingPostId(post.id);
    setEditingPostDraft(latestContent);

    try {
      const detail = await postApi.getPostDetail(post.slug || post.id);
      const detailContent = detail.content?.trim() || latestContent;
      const detailImages = (detail.linksUrl || [])
        .filter((mediaItem) => mediaItem.type === 'image' && typeof mediaItem.link === 'string')
        .map((mediaItem) => mediaItem.link);

      setEditingPostDetailById((prev) => ({
        ...prev,
        [post.id]: {
          images: detailImages,
          text: detailContent,
        },
      }));
      setEditingPostDraft(detailContent);
    } catch (error) {
      showError(
        'Cannot load post detail',
        error instanceof Error ? error.message : 'Failed to load post detail.',
      );
    }
  };

  const handleSaveEditedPost = async () => {
    if (!selectedEditingPost) {
      return;
    }

    const normalizedContent = editingPostDraft.trim();
    if (!normalizedContent) {
      showError('Update failed', 'Post content is required.');
      return;
    }

    const linksUrl = selectedEditingPost.content.images
      .filter(Boolean)
      .map((link) => ({ link, type: 'image' as const }));
    const taggedSymbols = new Set(
      Array.from(normalizedContent.matchAll(HASHTAG_SYMBOL_REGEX))
        .map((match) => match[1]?.trim().toUpperCase())
        .filter((symbol): symbol is string => Boolean(symbol)),
    );
    const nextAssets = selectedEditingPost.assets.filter((asset) => {
      const symbol = asset.symbol?.trim().toUpperCase();
      if (!symbol) {
        return false;
      }

      return taggedSymbols.has(symbol);
    });
    const nextAssetIds = nextAssets.map((asset) => asset.id).filter(Boolean);

    try {
      setIsSubmittingEditPost(true);
      await postApi.updatePost(selectedEditingPost.id, {
        assetIds: nextAssetIds,
        content: normalizedContent,
        linksUrl,
      });

      setEditedPostContentById((prev) => ({
        ...prev,
        [selectedEditingPost.id]: normalizedContent,
      }));
      setEditedPostAssetById((prev) => ({
        ...prev,
        [selectedEditingPost.id]: nextAssets,
      }));
      setEditingPostDetailById((prev) => ({
        ...prev,
        [selectedEditingPost.id]: {
          images: selectedEditingPost.content.images,
          text: normalizedContent,
        },
      }));
      await refetchPost?.();
      showSuccess('Post updated', 'Your post has been updated successfully.');
      closeEditPostDialog();
    } catch (error) {
      showError('Update failed', error instanceof Error ? error.message : 'Failed to update post.');
    } finally {
      setIsSubmittingEditPost(false);
    }
  };

  const handleEditPostImagesChange = (images: string[]) => {
    if (!selectedEditingPost) {
      return;
    }

    setEditingPostDetailById((prev) => ({
      ...prev,
      [selectedEditingPost.id]: {
        images,
        text: editingPostDraft.trim() || selectedEditingPost.content.text,
      },
    }));
  };

  if (posts.length === 0) {
    return (
      <div className="bg-background p-10 text-center">
        <p className="text-muted-foreground text-body-large-medium">
          {emptyMessage || t('discover.web.noPosts', 'No posts available yet.')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post, index) => {
        const comments = commentsState?.commentsByPostId?.[post.id] || [];
        const commentsTotal = commentsState?.commentsTotalByPostId?.[post.id] ?? comments.length;
        const hasMoreComments = comments.length < commentsTotal;
        const renderedPost: DiscoverPost = {
          ...post,
          assets: editedPostAssetById[post.id] ?? post.assets,
          content: {
            ...post.content,
            text:
              editingPostDetailById[post.id]?.text ??
              editedPostContentById[post.id] ??
              post.content.text,
            images: editingPostDetailById[post.id]?.images ?? post.content.images,
          },
        };

        return (
          <DiscoverPostCard
            key={post.id}
            commentDraft={commentsState?.commentDraftByPostId?.[post.id]}
            comments={comments}
            currentUserId={postsState.currentUserId}
            hasMoreComments={hasMoreComments}
            isCommentsOpen={Boolean(commentsState?.isCommentsOpenByPostId?.[post.id])}
            isCreatingComment={Boolean(commentsState?.isCreatingCommentByPostId?.[post.id])}
            isDeletingCommentById={commentsState?.isDeletingCommentById}
            isDeletingPost={Boolean(postsState.isDeletingPostById?.[post.id])}
            isLastPost={index === posts.length - 1}
            isRepostingPost={Boolean(postsState.isRepostingPostById?.[post.id])}
            isUpdatingCommentById={commentsState?.isUpdatingCommentById}
            isLoadingComments={Boolean(commentsState?.isLoadingCommentsByPostId?.[post.id])}
            isLoadingMoreComments={Boolean(commentsState?.isLoadingMoreCommentsByPostId?.[post.id])}
            onCommentDraftChange={commentsState?.setCommentDraft}
            onCreateComment={commentsState?.createComment}
            onDeleteComment={commentsState?.deleteComment}
            onDeletePost={postsState.deletePost}
            onLoadMoreComments={commentsState?.loadMoreComments}
            onRepostPost={postsState.repostPost}
            onSharePost={postsState.sharePost}
            onToggleBookmark={postsState.toggleBookmark}
            onToggleCommentLike={commentsState?.toggleCommentLike}
            onToggleComments={
              onToggleComments
                ? () => onToggleComments(renderedPost.slug || renderedPost.id)
                : commentsState?.toggleComments
            }
            onToggleFollow={postsState.toggleFollow}
            onToggleFollowByAuthorId={postsState.toggleFollowByAuthorId}
            onTogglePostLike={postsState.togglePostLike}
            onUpdateComment={commentsState?.updateComment}
            onEditPost={(postId) => {
              if (postId !== post.id) {
                return;
              }
              void handleStartEditPost(post);
            }}
            onOpenAuthorProfile={onOpenAuthorProfile}
            post={renderedPost}
            showFollowButton={showFollowButton}
          />
        );
      })}

      <EditPostDialog
        post={selectedEditingPost}
        draft={editingPostDraft}
        isApplyDisabled={editingPostDraft.trim().length === 0 || isSubmittingEditPost}
        onDraftChange={setEditingPostDraft}
        onImagesChange={handleEditPostImagesChange}
        onClose={closeEditPostDialog}
        onSubmit={handleSaveEditedPost}
      />
    </div>
  );
}
