'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthHydrated } from '@/hook/useAuthHydrated';
import { useToast } from '@/hook/useToast';
import { localizeApiError } from '@/i18n/apiErrors';
import { postApi, type ListedPostCommentItem } from '@/services/postService';
import { useAuthStore } from '@/store/authStore';
import type { DiscoverPostComment } from '../components/DiscoverPostCard';
import { DISCOVER_COMMENTS_PAGE_SIZE, DISCOVER_USER_PLACEHOLDER_ICON } from './constants';

type UseDiscoverCommentsOptions = {
  onCommentCountChange?: (postId: string, delta: number) => void;
};

const omitKey = <T extends Record<string, unknown>>(source: T, key: string): T => {
  const next = { ...source };
  delete next[key];
  return next;
};

export type UseDiscoverCommentsReturn = {
  clearPostState: (postId: string) => void;
  commentDraftByPostId: Record<string, string>;
  commentsByPostId: Record<string, DiscoverPostComment[]>;
  commentsTotalByPostId: Record<string, number>;
  createComment: (postId: string) => Promise<void>;
  deleteComment: (postId: string, commentId: string) => Promise<void>;
  isCommentsOpenByPostId: Record<string, boolean>;
  isCreatingCommentByPostId: Record<string, boolean>;
  isDeletingCommentById: Record<string, boolean>;
  isLikingCommentById: Record<string, boolean>;
  isUpdatingCommentById: Record<string, boolean>;
  isLoadingCommentsByPostId: Record<string, boolean>;
  isLoadingMoreCommentsByPostId: Record<string, boolean>;
  loadMoreComments: (postId: string) => void;
  setCommentDraft: (postId: string, value: string) => void;
  toggleCommentLike: (postId: string, commentId: string) => Promise<void>;
  toggleComments: (postId: string) => void;
  updateComment: (postId: string, commentId: string, content: string) => Promise<void>;
};

export function useDiscoverComments(
  options?: UseDiscoverCommentsOptions,
): UseDiscoverCommentsReturn {
  const { onCommentCountChange } = options || {};

  const { t } = useTranslation();
  const router = useRouter();
  const { showError } = useToast();
  const hasHydratedAuth = useAuthHydrated();
  const user = useAuthStore((state) => state.user);

  const [commentDraftByPostId, setCommentDraftByPostId] = useState<Record<string, string>>({});
  const [commentsByPostId, setCommentsByPostId] = useState<Record<string, DiscoverPostComment[]>>(
    {},
  );
  const [commentsTotalByPostId, setCommentsTotalByPostId] = useState<Record<string, number>>({});
  const [isCommentsOpenByPostId, setIsCommentsOpenByPostId] = useState<Record<string, boolean>>({});
  const [isCreatingCommentByPostId, setIsCreatingCommentByPostId] = useState<
    Record<string, boolean>
  >({});
  const [isDeletingCommentById, setIsDeletingCommentById] = useState<Record<string, boolean>>({});
  const [isLikingCommentById, setIsLikingCommentById] = useState<Record<string, boolean>>({});
  const [isUpdatingCommentById, setIsUpdatingCommentById] = useState<Record<string, boolean>>({});
  const [isLoadingCommentsByPostId, setIsLoadingCommentsByPostId] = useState<
    Record<string, boolean>
  >({});
  const [isLoadingMoreCommentsByPostId, setIsLoadingMoreCommentsByPostId] = useState<
    Record<string, boolean>
  >({});

  const resetAllState = useCallback(() => {
    setCommentDraftByPostId({});
    setCommentsByPostId({});
    setCommentsTotalByPostId({});
    setIsCommentsOpenByPostId({});
    setIsCreatingCommentByPostId({});
    setIsDeletingCommentById({});
    setIsLikingCommentById({});
    setIsUpdatingCommentById({});
    setIsLoadingCommentsByPostId({});
    setIsLoadingMoreCommentsByPostId({});
  }, []);

  useEffect(() => {
    if (!hasHydratedAuth) {
      return;
    }

    if (!user) {
      resetAllState();
    }
  }, [hasHydratedAuth, resetAllState, user]);

  const mapApiCommentToDiscoverComment = useCallback(
    (comment: ListedPostCommentItem): DiscoverPostComment => {
      return {
        content: comment.content,
        createdAt: comment.createdAt,
        id: comment.id,
        isLiked: Boolean(comment.isLiked),
        likeCount: comment.likeCount || 0,
        user: {
          avatar: comment.user?.avatar || DISCOVER_USER_PLACEHOLDER_ICON,
          id: comment.user?.id || '',
          displayName: comment.user?.displayName || t('discover.web.unknownAuthor', 'Unknown author'),
          username: comment.user?.username || t('discover.web.unknownAuthor', 'Unknown author'),
        },
      };
    },
    [t],
  );

  const loadCommentsPage = useCallback(
    async (postId: string, skip: number, append: boolean) => {
      if (append) {
        setIsLoadingMoreCommentsByPostId((prev) => ({ ...prev, [postId]: true }));
      } else {
        setIsLoadingCommentsByPostId((prev) => ({ ...prev, [postId]: true }));
      }

      try {
        const response = await postApi.listPostComments(postId, {
          skip,
          sortDir: 'desc',
          take: DISCOVER_COMMENTS_PAGE_SIZE,
        });

        const mappedComments = (response.data || []).map(mapApiCommentToDiscoverComment);
        const total = typeof response.total === 'number' ? response.total : mappedComments.length;

        setCommentsTotalByPostId((prev) => ({
          ...prev,
          [postId]: total,
        }));

        setCommentsByPostId((prev) => {
          const existing = prev[postId] || [];

          if (!append) {
            return {
              ...prev,
              [postId]: mappedComments,
            };
          }

          const existingIds = new Set(existing.map((comment) => comment.id));
          const merged = [...existing];

          mappedComments.forEach((comment) => {
            if (!existingIds.has(comment.id)) {
              merged.push(comment);
              existingIds.add(comment.id);
            }
          });

          return {
            ...prev,
            [postId]: merged,
          };
        });
      } catch (error) {
        showError(
          t('discover.web.loadCommentsFailedTitle', 'Unable to load comments'),
          localizeApiError(error, t, 'apiErrors.generic'),
        );
      } finally {
        if (append) {
          setIsLoadingMoreCommentsByPostId((prev) => ({ ...prev, [postId]: false }));
        } else {
          setIsLoadingCommentsByPostId((prev) => ({ ...prev, [postId]: false }));
        }
      }
    },
    [mapApiCommentToDiscoverComment, showError, t],
  );

  const updateCommentById = useCallback(
    (
      postId: string,
      commentId: string,
      updater: (comment: DiscoverPostComment) => DiscoverPostComment,
    ) => {
      setCommentsByPostId((prev) => {
        const currentComments = prev[postId] || [];

        return {
          ...prev,
          [postId]: currentComments.map((comment) =>
            comment.id === commentId ? updater(comment) : comment,
          ),
        };
      });
    },
    [],
  );

  const toggleComments = useCallback(
    (postId: string) => {
      const isOpen = Boolean(isCommentsOpenByPostId[postId]);
      const hasLoadedComments = (commentsByPostId[postId] || []).length > 0;
      const isLoadingComments = Boolean(isLoadingCommentsByPostId[postId]);

      setIsCommentsOpenByPostId((prev) => ({
        ...prev,
        [postId]: !isOpen,
      }));

      if (!isOpen && !hasLoadedComments && !isLoadingComments) {
        void loadCommentsPage(postId, 0, false);
      }
    },
    [commentsByPostId, isCommentsOpenByPostId, isLoadingCommentsByPostId, loadCommentsPage],
  );

  const loadMoreComments = useCallback(
    (postId: string) => {
      const loadedComments = commentsByPostId[postId] || [];
      const totalComments = commentsTotalByPostId[postId] ?? loadedComments.length;

      if (
        Boolean(isLoadingCommentsByPostId[postId]) ||
        Boolean(isLoadingMoreCommentsByPostId[postId])
      ) {
        return;
      }

      if (loadedComments.length >= totalComments) {
        return;
      }

      void loadCommentsPage(postId, loadedComments.length, true);
    },
    [
      commentsByPostId,
      commentsTotalByPostId,
      isLoadingCommentsByPostId,
      isLoadingMoreCommentsByPostId,
      loadCommentsPage,
    ],
  );

  const setCommentDraft = useCallback((postId: string, value: string) => {
    setCommentDraftByPostId((prev) => ({
      ...prev,
      [postId]: value,
    }));
  }, []);

  const createComment = useCallback(
    async (postId: string) => {
      if (!user) {
        showError(
          t('discover.web.loginRequiredTitle', 'Login required'),
          t('discover.web.loginRequiredComment', 'Please log in to comment on posts.'),
        );
        router.push('/login');
        return;
      }

      const content = (commentDraftByPostId[postId] || '').trim();
      if (!content || Boolean(isCreatingCommentByPostId[postId])) {
        return;
      }

      setIsCreatingCommentByPostId((prev) => ({
        ...prev,
        [postId]: true,
      }));

      try {
        await postApi.createPostComment(postId, { content });

        setCommentDraftByPostId((prev) => ({
          ...prev,
          [postId]: '',
        }));

        onCommentCountChange?.(postId, 1);

        setIsCommentsOpenByPostId((prev) => ({
          ...prev,
          [postId]: true,
        }));

        await loadCommentsPage(postId, 0, false);
      } catch (error) {
        showError(
          t('discover.web.createCommentFailedTitle', 'Unable to create comment'),
          localizeApiError(error, t, 'apiErrors.generic'),
        );
      } finally {
        setIsCreatingCommentByPostId((prev) => ({
          ...prev,
          [postId]: false,
        }));
      }
    },
    [
      commentDraftByPostId,
      isCreatingCommentByPostId,
      loadCommentsPage,
      onCommentCountChange,
      router,
      showError,
      t,
      user,
    ],
  );

  const deleteComment = useCallback(
    async (postId: string, commentId: string) => {
      if (Boolean(isDeletingCommentById[commentId])) {
        return;
      }

      const existingComments = commentsByPostId[postId] || [];
      const hasComment = existingComments.some((comment) => comment.id === commentId);
      if (!hasComment) {
        return;
      }

      setIsDeletingCommentById((prev) => ({
        ...prev,
        [commentId]: true,
      }));

      try {
        await postApi.deletePostComment(commentId);

        setCommentsByPostId((prev) => ({
          ...prev,
          [postId]: (prev[postId] || []).filter((comment) => comment.id !== commentId),
        }));

        setCommentsTotalByPostId((prev) => ({
          ...prev,
          [postId]: Math.max(0, (prev[postId] ?? existingComments.length) - 1),
        }));

        onCommentCountChange?.(postId, -1);
      } catch (error) {
        showError(
          t('discover.web.deleteCommentFailedTitle', 'Unable to delete comment'),
          localizeApiError(error, t, 'apiErrors.generic'),
        );
      } finally {
        setIsDeletingCommentById((prev) => omitKey(prev, commentId));
      }
    },
    [commentsByPostId, isDeletingCommentById, onCommentCountChange, showError, t],
  );

  const updateComment = useCallback(
    async (postId: string, commentId: string, nextContent: string) => {
      if (Boolean(isUpdatingCommentById[commentId])) {
        return;
      }

      const normalizedContent = nextContent.trim();
      if (!normalizedContent) {
        return;
      }

      const existingComment = (commentsByPostId[postId] || []).find(
        (comment) => comment.id === commentId,
      );
      if (!existingComment) {
        return;
      }

      if (existingComment.content.trim() === normalizedContent) {
        return;
      }

      setIsUpdatingCommentById((prev) => ({
        ...prev,
        [commentId]: true,
      }));

      updateCommentById(postId, commentId, (comment) => ({
        ...comment,
        content: normalizedContent,
      }));

      try {
        await postApi.updatePostComment(commentId, { content: normalizedContent });
      } catch (error) {
        updateCommentById(postId, commentId, () => existingComment);

        showError(
          t('discover.web.updateCommentFailedTitle', 'Unable to update comment'),
          localizeApiError(error, t, 'apiErrors.generic'),
        );
      } finally {
        setIsUpdatingCommentById((prev) => omitKey(prev, commentId));
      }
    },
    [commentsByPostId, isUpdatingCommentById, showError, t, updateCommentById],
  );

  const toggleCommentLike = useCallback(
    async (postId: string, commentId: string) => {
      if (!user) {
        router.push('/login');
        return;
      }

      if (Boolean(isLikingCommentById[commentId])) {
        return;
      }

      const existingComment = (commentsByPostId[postId] || []).find(
        (comment) => comment.id === commentId,
      );
      if (!existingComment) {
        return;
      }

      const nextLiked = !existingComment.isLiked;
      updateCommentById(postId, commentId, (comment) => ({
        ...comment,
        isLiked: nextLiked,
        likeCount: Math.max(0, comment.likeCount + (nextLiked ? 1 : -1)),
      }));

      setIsLikingCommentById((prev) => ({
        ...prev,
        [commentId]: true,
      }));

      try {
        const response = await postApi.toggleCommentLike(commentId);
        if (typeof response?.isLiked === 'boolean') {
          updateCommentById(postId, commentId, (comment) => {
            if (comment.isLiked === response.isLiked) {
              return comment;
            }

            return {
              ...comment,
              isLiked: response.isLiked,
              likeCount: Math.max(0, comment.likeCount + (response.isLiked ? 1 : -1)),
            };
          });
        }
      } catch (error) {
        updateCommentById(postId, commentId, () => existingComment);
        showError(
          t('discover.web.toggleCommentLikeFailedTitle', 'Unable to update comment like'),
          localizeApiError(error, t, 'apiErrors.generic'),
        );
      } finally {
        setIsLikingCommentById((prev) => omitKey(prev, commentId));
      }
    },
    [commentsByPostId, isLikingCommentById, showError, t, updateCommentById, user, router],
  );

  const clearPostState = useCallback(
    (postId: string) => {
      const commentIds = (commentsByPostId[postId] || []).map((comment) => comment.id);

      setCommentDraftByPostId((prev) => omitKey(prev, postId));
      setCommentsByPostId((prev) => omitKey(prev, postId));
      setCommentsTotalByPostId((prev) => omitKey(prev, postId));
      setIsCommentsOpenByPostId((prev) => omitKey(prev, postId));
      setIsCreatingCommentByPostId((prev) => omitKey(prev, postId));
      setIsLoadingCommentsByPostId((prev) => omitKey(prev, postId));
      setIsLoadingMoreCommentsByPostId((prev) => omitKey(prev, postId));
      setIsUpdatingCommentById((prev) => {
        let next = prev;

        commentIds.forEach((commentId) => {
          if (next === prev) {
            next = { ...prev };
          }
          delete next[commentId];
        });

        return next;
      });
    },
    [commentsByPostId],
  );

  return useMemo(
    () => ({
      clearPostState,
      commentDraftByPostId,
      commentsByPostId,
      commentsTotalByPostId,
      createComment,
      deleteComment,
      isCommentsOpenByPostId,
      isCreatingCommentByPostId,
      isDeletingCommentById,
      isLikingCommentById,
      isUpdatingCommentById,
      isLoadingCommentsByPostId,
      isLoadingMoreCommentsByPostId,
      loadMoreComments,
      setCommentDraft,
      toggleCommentLike,
      toggleComments,
      updateComment,
    }),
    [
      clearPostState,
      commentDraftByPostId,
      commentsByPostId,
      commentsTotalByPostId,
      createComment,
      deleteComment,
      isCommentsOpenByPostId,
      isCreatingCommentByPostId,
      isDeletingCommentById,
      isLikingCommentById,
      isUpdatingCommentById,
      isLoadingCommentsByPostId,
      isLoadingMoreCommentsByPostId,
      loadMoreComments,
      setCommentDraft,
      toggleCommentLike,
      toggleComments,
      updateComment,
    ],
  );
}
