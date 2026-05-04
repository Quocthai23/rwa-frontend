'use client';

import {
  Bookmark,
  CheckVerified01,
  MessageCircle01,
  RefreshCcw02,
  Share06,
  ThumbsUp,
  Trash01,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from '@untitledui/icons';
import EmojiPicker, { Theme, type EmojiClickData } from 'emoji-picker-react';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import type { EditorHandle } from '@/components/shared/atoms/editor';
import { toFiniteNumberFromNumberish } from '@/components/shared/chart/components/tradePanel/utils/tradePanelInputHelpers';
import { useSymbols } from '@/hook/useSymbols';
import { Button } from '@/components/shared/atoms/button';
import { Skeleton } from '@/components/shared/atoms/skeleton';
import { Sheet, SheetContent } from '@/components/shared/atoms/web/sheet';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme';
import { cn } from '@/lib/utils';
import { DISCOVER_MAX_COMPOSER_IMAGES } from '../hooks/constants';
import { PostOwnerDropdown } from './PostOwnerDropdown';
import { CreatePostComposer } from '../../web/components/tab/shared/CreatePostComposer';

const USER_PLACEHOLDER_ICON = '/assets/images/discover/filled.png';
const IMAGE_SWIPE_THRESHOLD_PX = 48;

type RepostComposerImage = {
  file: File;
  id: string;
  previewUrl: string;
};

type RepostPostPayload = {
  assetIds?: string[];
  content: string;
  images?: File[];
};

type ComposerLinkedAsset = {
  id: string;
  symbol: string;
};

export type DiscoverPostComment = {
  content: string;
  createdAt: string;
  id: string;
  isLiked: boolean;
  likeCount: number;
  user: {
    avatar: string;
    id: string;
    username: string;
    displayName: string;
  };
};

export type DiscoverPostAuthor = {
  id: string;
  avatar: string;
  bio?: string;
  followers: number;
  following?: number;
  handle?: string;
  name?: string;
  username: string;
  displayName?: string;
  verified?: boolean;
  relation?: {
    isBlockedBy?: boolean;
    isBlocking?: boolean;
    isFollowing?: boolean;
  };
};

export type DiscoverPostContent = {
  images: string[];
  text: string;
  title: string;
};

export type DiscoverPostStats = {
  comments: number;
  likes: number;
  reposts: number;
  shares: number;
};

export type DiscoverPostAsset = {
  ask?: number | string;
  bid?: number | string;
  id: string;
  logo?: null | string;
  name?: string;
  symbol?: string;
};

export type DiscoverPostRepost = {
  id: string;
  author: DiscoverPostAuthor;
  assetIds?: string[];
  assets?: DiscoverPostAsset[];
  bookmarked?: boolean;
  commentCount?: number;
  content: DiscoverPostContent;
  createdAt?: string;
  createdById?: string;
  edited?: boolean;
  following?: boolean;
  isOwnPost?: boolean;
  liked?: boolean;
  isLiked?: boolean;
  isBookmarked?: boolean;
  linksUrl?: Array<{
    link: string;
    type?: string;
  }>;
  likeCount?: number;
  note?: null | string;
  repostCount?: number;
  repostOfId?: null | string;
  shareCount?: number;
  status?: 'APPROVED' | 'PENDING' | 'REJECTED' | string;
  stats: DiscoverPostStats;
  slug: string;
  updatedAt?: string;
  viewCount?: number;
};

export type DiscoverPost = DiscoverPostRepost & {
  repost?: DiscoverPostRepost;
};

const formatRelativePostTime = (createdAt?: string): string => {
  if (!createdAt) {
    return '';
  }

  const createdAtMs = new Date(createdAt).getTime();
  if (!Number.isFinite(createdAtMs)) {
    return '';
  }

  const diffMs = Math.max(0, Date.now() - createdAtMs);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'always' });
  const diffMinutes = Math.floor(diffMs / (60 * 1000));

  if (diffMinutes < 60) {
    return formatter.format(-Math.max(1, diffMinutes), 'minute');
  }

  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  if (diffHours < 24) {
    return formatter.format(-Math.max(1, diffHours), 'hour');
  }

  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  return formatter.format(-Math.max(1, diffDays), 'day');
};

type DiscoverPostCardProps = {
  commentDraft?: string;
  comments?: DiscoverPostComment[];
  currentUserId?: string;
  hasMoreComments?: boolean;
  isCommentsOpen?: boolean;
  isCreatingComment?: boolean;
  isDeletingCommentById?: Record<string, boolean>;
  isDeletingPost?: boolean;
  isLikingCommentById?: Record<string, boolean>;
  isRepostingPost?: boolean;
  isUpdatingCommentById?: Record<string, boolean>;
  isLoadingComments?: boolean;
  isLoadingMoreComments?: boolean;
  onCommentDraftChange?: (postId: string, value: string) => void;
  onCreateComment?: (postId: string) => void;
  onDeleteComment?: (postId: string, commentId: string) => void;
  onDeletePost?: (postId: string) => void;
  onLoadMoreComments?: (postId: string) => void;
  onRepostPost?: (postId: string, payload: RepostPostPayload) => Promise<boolean>;
  onUpdateComment?: (postId: string, commentId: string, content: string) => Promise<void>;
  onToggleCommentLike?: (postId: string, commentId: string) => void;
  onToggleComments?: (postId: string) => void;
  onToggleBookmark?: (postId: string) => void;
  onToggleFollow?: (postId: string) => void;
  onTogglePostLike?: (postId: string) => void;
  onSharePost?: (postId: string) => Promise<void> | void;
  onEditPost?: (postSlug: string) => void;
  onOpenAuthorProfile?: (authorId: string) => void;
  post: DiscoverPost;
  profile?: boolean;
  showFollowButton?: boolean;
};

type PostActionButtonProps = {
  active?: boolean;
  count: number;
  disabled?: boolean;
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
};

const URL_OR_HASHTAG_REGEX = /(https?:\/\/[^\s]+)|#[A-Za-z0-9_]+/g;
const TRAILING_URL_PUNCTUATION_REGEX = /[),.!?;:]+$/;

const renderPostContentWithAssetLinks = (content: string, assets: DiscoverPostAsset[]) => {
  const assetSymbolSet = new Set(
    assets
      .map((asset) => asset.symbol?.trim().toUpperCase())
      .filter((symbol): symbol is string => Boolean(symbol)),
  );

  const chunks: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(URL_OR_HASHTAG_REGEX)) {
    const token = match[0];
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex) {
      chunks.push(content.slice(lastIndex, matchIndex));
    }

    if (token.startsWith('http://') || token.startsWith('https://')) {
      const trailingPunctuation = token.match(TRAILING_URL_PUNCTUATION_REGEX)?.[0] || '';
      const url = trailingPunctuation ? token.slice(0, -trailingPunctuation.length) : token;
      chunks.push(
        <a
          key={`url-${matchIndex}`}
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          className="text-primary-500 hover:text-primary-600 transition-colors"
        >
          {url}
        </a>,
      );

      if (trailingPunctuation) {
        chunks.push(trailingPunctuation);
      }

      lastIndex = matchIndex + token.length;
      continue;
    }

    const symbol = token.slice(1).toUpperCase();
    if (assetSymbolSet.has(symbol)) {
      chunks.push(
        <Link
          key={`${symbol}-${matchIndex}`}
          href={`/trade/${encodeURIComponent(symbol)}`}
          className="text-primary-500 hover:text-primary-600 transition-colors"
        >
          {token}
        </Link>,
      );
    } else {
      chunks.push(token);
    }

    lastIndex = matchIndex + token.length;
  }

  if (lastIndex < content.length) {
    chunks.push(content.slice(lastIndex));
  }

  return chunks.length > 0 ? chunks : content;
};

type PostAssetTagsProps = {
  assets: DiscoverPostAsset[];
};

function PostAssetTags({ assets }: PostAssetTagsProps) {
  const visibleAssets = useMemo(() => assets.filter((asset) => Boolean(asset.symbol)), [assets]);
  const symbolsToSubscribe = useMemo(
    () =>
      visibleAssets
        .map((asset) => asset.symbol?.trim().toUpperCase())
        .filter((symbol): symbol is string => Boolean(symbol)),
    [visibleAssets],
  );
  const rtBySymbol = useMarketSocketStore((state) => state.rtBySymbol);

  useSymbols(symbolsToSubscribe, symbolsToSubscribe.length > 0);

  if (visibleAssets.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {visibleAssets.map((asset) => {
        const symbol = asset.symbol?.trim().toUpperCase() || '';
        const rt = symbol ? rtBySymbol?.[symbol] : undefined;
        const bid = toFiniteNumberFromNumberish(rt?.bid) ?? toFiniteNumberFromNumberish(asset.bid);
        const ask =
          toFiniteNumberFromNumberish(rt?.ask) ??
          toFiniteNumberFromNumberish(asset.ask ?? asset.bid);

        return (
          <Link
            key={asset.id}
            href={`/trade/${encodeURIComponent(symbol)}`}
            className="bg-muted text-foreground hover:text-primary-500 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs transition-colors"
          >
            {asset.logo ? (
              <Image
                src={asset.logo}
                alt={symbol || 'asset'}
                width={14}
                height={14}
                className="size-3.5 shrink-0 rounded-full"
                unoptimized
              />
            ) : null}
            <span className="text-primary-500 text-body-small-medium">{symbol}</span>
            <span className="text-body-small-medium inline-flex items-center gap-1 tabular-nums">
              <span
                className={cn(
                  typeof bid === 'number'
                    ? 'text-red-500 dark:text-red-400'
                    : 'text-muted-foreground',
                )}
              >
                {typeof bid === 'number' ? bid.toFixed(2) : '-'}
              </span>
              <span className="text-muted-foreground">/</span>
              <span
                className={cn(
                  typeof ask === 'number'
                    ? 'text-green-500 dark:text-green-400'
                    : 'text-muted-foreground',
                )}
              >
                {typeof ask === 'number' ? ask.toFixed(2) : '-'}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function PostActionButton({
  active,
  count,
  disabled,
  icon: Icon,
  label,
  onClick,
}: PostActionButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-auto min-w-9 items-center gap-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        active
          ? 'text-primary-500 hover:text-primary-600'
          : 'text-muted-foreground hover:text-foreground',
      )}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon size={20} className={cn(active && 'fill-current')} />
      <span className="text-sm font-medium">{count}</span>
    </button>
  );
}

export function DiscoverPostCard({
  commentDraft,
  comments,
  currentUserId,
  hasMoreComments,
  isCommentsOpen,
  isCreatingComment,
  isDeletingCommentById,
  isDeletingPost,
  isLikingCommentById,
  isRepostingPost,
  isUpdatingCommentById,
  isLoadingComments,
  isLoadingMoreComments,
  onCommentDraftChange,
  onCreateComment,
  onDeleteComment,
  onDeletePost,
  onLoadMoreComments,
  onRepostPost,
  onUpdateComment,
  onToggleCommentLike,
  onToggleComments,
  onToggleBookmark,
  onToggleFollow,
  onTogglePostLike,
  onSharePost,
  onEditPost,
  onOpenAuthorProfile,
  post,
  profile: _profile = false,
  showFollowButton = true,
}: DiscoverPostCardProps) {
  const { t } = useTranslation();
  const { mode } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const imageList = post.content.images.filter(Boolean);
  const repostedImageList = post.repost?.content.images.filter(Boolean) || [];
  const renderedComments = comments || [];
  const commentInputValue = commentDraft || '';

  const postRelativeTime = useMemo(() => formatRelativePostTime(post.createdAt), [post.createdAt]);

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentDraft, setEditingCommentDraft] = useState('');
  const [localCommentDraft, setLocalCommentDraft] = useState('');
  const [isRepostModalOpen, setIsRepostModalOpen] = useState(false);
  const [repostContent, setRepostContent] = useState('');
  const [repostImages, setRepostImages] = useState<RepostComposerImage[]>([]);
  const [linkedAssets, setLinkedAssets] = useState<ComposerLinkedAsset[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const me = useAuthStore((state) => state.user);
  const safeCurrentUserName =
    me?.displayName?.trim() || me?.username?.trim() || post.author.displayName || 'Guest Trader';
  const safeUserAvatar = me?.avatar || USER_PLACEHOLDER_ICON;
  const repostComposerImages = useMemo(
    () =>
      repostImages.map((image) => ({
        id: image.id,
        previewUrl: image.previewUrl,
        status: 'uploaded' as const,
      })),
    [repostImages],
  );
  const dragStart = useRef({ x: 0, y: 0 });
  const touchStartPoint = useRef<{ x: number; y: number } | null>(null);
  const touchDelta = useRef({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const commentInputRef = useRef<HTMLInputElement | null>(null);
  const commentEmojiPickerContainerRef = useRef<HTMLDivElement | null>(null);
  const commentsAutoLoadTriggerRef = useRef<HTMLDivElement | null>(null);
  const hasTriggeredCommentsAutoLoadRef = useRef(false);
  const repostTextareaRef = useRef<EditorHandle | null>(null);
  const repostImageInputRef = useRef<HTMLInputElement | null>(null);
  const repostObjectUrlRegistry = useRef<Set<string>>(new Set());
  const [isCommentEmojiPickerOpen, setIsCommentEmojiPickerOpen] = useState(false);
  const emojiPickerTheme = mode === 'dark' ? Theme.DARK : Theme.LIGHT;
  const commentComposerValue = onCommentDraftChange ? commentInputValue : localCommentDraft;

  useEffect(() => {
    setLocalCommentDraft(commentInputValue);
  }, [commentInputValue, post.id]);

  useEffect(() => {
    const registry = repostObjectUrlRegistry.current;

    return () => {
      registry.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      registry.clear();
    };
  }, []);

  const resetRepostComposer = () => {
    setRepostContent('');
    setLinkedAssets([]);
    setRepostImages((prev) => {
      prev.forEach((image) => {
        URL.revokeObjectURL(image.previewUrl);
        repostObjectUrlRegistry.current.delete(image.previewUrl);
      });

      return [];
    });

    if (repostImageInputRef.current) {
      repostImageInputRef.current.value = '';
    }
  };

  const removeRepostImage = (imageId: string) => {
    setRepostImages((prev) => {
      const target = prev.find((image) => image.id === imageId);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        repostObjectUrlRegistry.current.delete(target.previewUrl);
      }

      return prev.filter((image) => image.id !== imageId);
    });
  };

  const handleRepostImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (repostImageInputRef.current) {
      repostImageInputRef.current.value = '';
    }

    if (files.length === 0) {
      return;
    }

    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      return;
    }

    const remainingSlots = DISCOVER_MAX_COMPOSER_IMAGES - repostImages.length;
    if (remainingSlots <= 0) {
      return;
    }

    const nextFiles = imageFiles.slice(0, remainingSlots);
    const nextImages = nextFiles.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      repostObjectUrlRegistry.current.add(previewUrl);

      return {
        file,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        previewUrl,
      };
    });

    setRepostImages((prev) => [...prev, ...nextImages]);
  };

  const resetImageView = () => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
  };

  const clampPosition = (nextPosition: { x: number; y: number }, zoom = zoomLevel) => {
    const imageContainer = imageContainerRef.current;
    const image = imageRef.current;

    if (!imageContainer || !image || zoom <= 1) {
      return { x: 0, y: 0 };
    }

    const { width: containerWidth, height: containerHeight } =
      imageContainer.getBoundingClientRect();
    const baseImageWidth = image.clientWidth;
    const baseImageHeight = image.clientHeight;

    if (!containerWidth || !containerHeight || !baseImageWidth || !baseImageHeight) {
      return { x: 0, y: 0 };
    }

    const maxOffsetX = Math.max(0, (baseImageWidth * zoom - containerWidth) / 2);
    const maxOffsetY = Math.max(0, (baseImageHeight * zoom - containerHeight) / 2);

    return {
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, nextPosition.x)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, nextPosition.y)),
    };
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditingCommentDraft('');
  };

  const startEditingComment = (commentId: string, content: string) => {
    setEditingCommentId(commentId);
    setEditingCommentDraft(content);
  };

  const closeImageModal = () => {
    setSelectedImageIndex(null);
    resetImageView();
  };

  const openRepostModal = () => {
    if (!onRepostPost) {
      return;
    }

    setIsRepostModalOpen(true);
  };

  const closeRepostModal = () => {
    if (isRepostingPost) {
      return;
    }

    setIsRepostModalOpen(false);
    resetRepostComposer();
  };

  const handlePrevImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
      resetImageView();
    }
  };

  const handleNextImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex < imageList.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
      resetImageView();
    }
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setZoomLevel((prev) => {
      const next = direction === 'in' ? Math.min(prev + 0.2, 3) : Math.max(prev - 0.2, 1);

      if (next <= 1) {
        setPosition({ x: 0, y: 0 });
        setIsDragging(false);
      } else {
        setPosition((prevPosition) => clampPosition(prevPosition, next));
      }

      return next;
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoom('in');
    } else {
      handleZoom('out');
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1) {
      return;
    }

    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoomLevel <= 1) {
      return;
    }

    setPosition(
      clampPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      }),
    );
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) {
      return;
    }

    const touch = event.touches[0];
    touchStartPoint.current = { x: touch.clientX, y: touch.clientY };
    touchDelta.current = { x: 0, y: 0 };
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartPoint.current || event.touches.length !== 1) {
      return;
    }

    const touch = event.touches[0];
    touchDelta.current = {
      x: touch.clientX - touchStartPoint.current.x,
      y: touch.clientY - touchStartPoint.current.y,
    };
  };

  const handleTouchEnd = () => {
    if (!touchStartPoint.current) {
      return;
    }

    const { x, y } = touchDelta.current;
    touchStartPoint.current = null;
    touchDelta.current = { x: 0, y: 0 };

    if (Math.abs(x) < IMAGE_SWIPE_THRESHOLD_PX || Math.abs(x) < Math.abs(y)) {
      return;
    }

    if (x < 0) {
      handleNextImage();
      return;
    }

    handlePrevImage();
  };

  const saveEditedComment = async (commentId: string) => {
    if (!onUpdateComment) {
      cancelEditingComment();
      return;
    }

    const normalized = editingCommentDraft.trim();
    if (!normalized) {
      return;
    }

    await onUpdateComment(post.id, commentId, normalized);
    cancelEditingComment();
  };

  const focusCommentComposer = () => {
    const input = commentInputRef.current;
    if (!input) {
      return;
    }

    input.focus({ preventScroll: true });

    const cursorPosition = input.value.length;
    input.setSelectionRange(cursorPosition, cursorPosition);
  };

  const handleCommentEmojiSelect = (emojiData: EmojiClickData) => {
    const nextEmoji = emojiData.emoji;
    const input = commentInputRef.current;
    if (!input) {
      const nextValue = `${commentComposerValue}${nextEmoji}`;
      if (onCommentDraftChange) {
        onCommentDraftChange(post.id, nextValue);
      } else {
        setLocalCommentDraft(nextValue);
      }
      return;
    }

    const selectionStart = input.selectionStart ?? commentComposerValue.length;
    const selectionEnd = input.selectionEnd ?? selectionStart;
    const nextValue = `${commentComposerValue.slice(0, selectionStart)}${nextEmoji}${commentComposerValue.slice(selectionEnd)}`;
    const nextCursorPosition = selectionStart + nextEmoji.length;

    if (onCommentDraftChange) {
      onCommentDraftChange(post.id, nextValue);
    } else {
      setLocalCommentDraft(nextValue);
    }
    requestAnimationFrame(() => {
      input.focus({ preventScroll: true });
      input.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
  };

  const handleToggleLinkedAsset = useCallback((asset: ComposerLinkedAsset) => {
    setLinkedAssets((prev) => {
      const exists = prev.some((item) => item.id === asset.id);

      if (exists) {
        return prev.filter((item) => item.id !== asset.id);
      }

      return [...prev, asset];
    });
  }, []);

  const submitRepost = async () => {
    if (!onRepostPost || isRepostingPost) {
      return;
    }

    const normalized = repostContent.trim();
    if (!normalized) {
      return;
    }

    const assetIds = linkedAssets.map((asset) => asset.id).filter(Boolean);
    const hasReposted = await onRepostPost(post.id, {
      assetIds: assetIds.length > 0 ? assetIds : undefined,
      content: normalized,
      images: repostImages.map((image) => image.file),
    });
    if (!hasReposted) {
      return;
    }

    setIsRepostModalOpen(false);
    resetRepostComposer();
  };

  useEffect(() => {
    if (!isLoadingMoreComments) {
      hasTriggeredCommentsAutoLoadRef.current = false;
    }
  }, [isLoadingMoreComments]);

  useEffect(() => {
    if (!isCommentsOpen) {
      return;
    }

    const timer = window.setTimeout(() => {
      focusCommentComposer();
    }, 50);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isCommentsOpen]);

  useEffect(() => {
    if (!isCommentEmojiPickerOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!commentEmojiPickerContainerRef.current?.contains(event.target as Node)) {
        setIsCommentEmojiPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCommentEmojiPickerOpen]);

  useEffect(() => {
    if (!isCommentsOpen) {
      setIsCommentEmojiPickerOpen(false);
    }
  }, [isCommentsOpen]);

  useEffect(() => {
    const target = commentsAutoLoadTriggerRef.current;
    if (!target || !isCommentsOpen || !hasMoreComments || !onLoadMoreComments) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) {
          return;
        }

        if (isLoadingMoreComments || hasTriggeredCommentsAutoLoadRef.current) {
          return;
        }

        hasTriggeredCommentsAutoLoadRef.current = true;
        onLoadMoreComments(post.id);
      },
      {
        root: null,
        rootMargin: '120px 0px',
        threshold: 0.1,
      },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [
    hasMoreComments,
    isCommentsOpen,
    isLoadingMoreComments,
    onLoadMoreComments,
    post.id,
    renderedComments.length,
  ]);

  const activeEditingCommentId =
    isCommentsOpen && renderedComments.some((comment) => comment.id === editingCommentId)
      ? editingCommentId
      : null;
  const normalizedAuthorId = post.author.id?.trim() || '';
  const normalizedRepostAuthorId = post.repost?.author.id?.trim() || '';
  const handleOpenOriginalRepost = useCallback(
    (repostPostSlug: string) => {
      const normalizedPostSlug = repostPostSlug.trim();
      if (!normalizedPostSlug) {
        return;
      }

      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', 'for-you');
      params.delete('id');
      const nextQuery = params.toString();
      const detailPath = `/discover/${encodeURIComponent(normalizedPostSlug)}`;
      router.push(`${nextQuery ? `${detailPath}?${nextQuery}` : detailPath}`, { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <article className="mt-4">
      <header className="mb-4 flex items-start justify-between gap-3">
        <button
          type="button"
          className="flex min-w-0 items-center gap-2 text-left"
          onClick={() => {
            if (!normalizedAuthorId) {
              return;
            }

            onOpenAuthorProfile?.(normalizedAuthorId);
          }}
          disabled={!normalizedAuthorId || !onOpenAuthorProfile}
        >
          <Image
            src={post.author.avatar}
            alt={post.author.displayName || 'Author'}
            width={50}
            height={50}
            className="bg-muted h-12.5 w-12.5 rounded-full object-cover"
            unoptimized
          />

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-foreground w-50 truncate text-base leading-5 font-semibold">
                {post.author.displayName}
              </p>

              {post.author.verified ? (
                <CheckVerified01 size={18} className="text-primary-500" />
              ) : null}
            </div>
            {postRelativeTime ? (
              <p className="text-foreground text-body-small-regular mt-1">{postRelativeTime}</p>
            ) : null}
          </div>
        </button>

        {post.isOwnPost ? (
          <PostOwnerDropdown
            onEdit={() => onEditPost?.(post.slug || post.id)}
            onDelete={() => onDeletePost?.(post.id)}
            isDeleting={isDeletingPost}
          />
        ) : showFollowButton && !_profile ? (
          <Button
            type="button"
            variant={post.following ? 'primary-contained' : 'primary-contained'}
            className="h-9 min-w-24 px-4 text-sm font-medium"
            onClick={() => onToggleFollow?.(post.id)}
          >
            {post.following
              ? t('discover.web.following', 'Following')
              : t('discover.web.follow', 'Follow')}
          </Button>
        ) : null}
      </header>

      <p className="text-body-small-regular leading-7">
        {renderPostContentWithAssetLinks(post.content.text, post.assets || [])}
      </p>
      <PostAssetTags assets={post.assets || []} />

      {imageList.length > 0 ? (
        <div
          className={cn(
            'relative mt-4 grid gap-2 overflow-hidden',
            imageList.length === 1
              ? 'grid-cols-1'
              : imageList.length === 2
                ? 'grid-cols-2'
                : 'grid-cols-3',
          )}
        >
          {imageList.slice(0, 3).map((image, index) => (
            <div
              key={`${post.id}-image-${index}`}
              className={cn(
                'bg-muted relative cursor-pointer overflow-hidden rounded-sm transition-opacity hover:opacity-90',
                imageList.length === 1 ? 'h-90' : 'h-36 sm:h-44',
              )}
              onClick={() => setSelectedImageIndex(index)}
            >
              <Image
                src={image}
                alt={`post-${post.id}-image-${index + 1}`}
                width={400}
                height={400}
                className="h-full w-full object-cover"
                unoptimized
              />
              {index === 2 && imageList.length > 3 ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-xl font-semibold text-white">
                  +{imageList.length - 3}
                </div>
              ) : null}
            </div>
          ))}
          {post.status === 'PENDING' ? (
            <div className="absolute inset-0 z-30 flex items-center justify-center rounded-sm bg-black/60 px-4 text-center text-sm font-semibold text-white sm:text-base">
              {t('discover.web.pendingApproval', 'Đang chờ phê duyệt')}
            </div>
          ) : null}
        </div>
      ) : null}

      {post.repost ? (
        <div
          className="bg-muted/30 border-border mt-4 rounded-xl border p-3"
          onClick={(event) => {
            const target = event.target as HTMLElement;
            if (target.closest('button,[data-repost-ignore-open=\"true\"]')) {
              return;
            }

            handleOpenOriginalRepost(post.repost?.slug || '');
          }}
        >
          <button
            type="button"
            className="flex items-center gap-2.5 text-left"
            data-repost-ignore-open="true"
            onClick={() => {
              if (!normalizedRepostAuthorId) {
                return;
              }

              onOpenAuthorProfile?.(normalizedRepostAuthorId);
            }}
            disabled={!normalizedRepostAuthorId || !onOpenAuthorProfile}
          >
            <Image
              src={post.repost.author.avatar || USER_PLACEHOLDER_ICON}
              alt={post.repost.author.displayName || 'Author'}
              width={36}
              height={36}
              className="bg-muted h-9 w-9 rounded-full object-cover"
              unoptimized
            />

            <div className="min-w-0">
              <p className="text-foreground w-30 truncate text-sm font-semibold">
                {post.repost.author.displayName}
              </p>
            </div>
          </button>

          <p className="text-foreground mt-2 text-sm leading-6 whitespace-pre-wrap">
            {renderPostContentWithAssetLinks(post.repost.content.text, post.repost.assets || [])}
          </p>
          <PostAssetTags assets={post.repost.assets || []} />

          {repostedImageList.length > 0 ? (
            <div
              className={cn(
                'mt-3 grid gap-2 overflow-hidden rounded-lg',
                repostedImageList.length === 1
                  ? 'grid-cols-1'
                  : repostedImageList.length === 2
                    ? 'grid-cols-2'
                    : 'grid-cols-3',
              )}
            >
              {repostedImageList.slice(0, 3).map((image, index) => (
                <div
                  key={`${post.repost?.id}-nested-repost-image-${index}`}
                  className={cn(
                    'bg-muted relative overflow-hidden',
                    repostedImageList.length === 1 ? 'h-80' : 'h-30 sm:h-36',
                  )}
                >
                  <Image
                    src={image}
                    alt={`nested-repost-image-${post.repost?.id}-${index + 1}`}
                    width={400}
                    height={400}
                    className="h-full w-full object-cover"
                    unoptimized
                  />

                  {index === 2 && repostedImageList.length > 3 ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-lg font-semibold text-white">
                      +{repostedImageList.length - 3}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <footer className="border-border mt-4 flex items-center justify-between border-b pb-4">
        {post.status !== 'PENDING' ? (
          <>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <PostActionButton
                active={Boolean(post.liked)}
                count={post.stats.likes}
                icon={ThumbsUp}
                label={t('discover.web.likes', 'Likes')}
                onClick={() => onTogglePostLike?.(post.id)}
              />
              <PostActionButton
                active={Boolean(isCommentsOpen)}
                count={post.stats.comments}
                icon={MessageCircle01}
                label={t('discover.web.comment', 'Comment')}
                onClick={() => onToggleComments?.(post.id)}
              />

              <PostActionButton
                count={post.stats.reposts}
                disabled={!onRepostPost || isRepostingPost}
                icon={RefreshCcw02}
                label={t('discover.web.repostAction', 'Repost')}
                onClick={openRepostModal}
              />
            </div>
            <div>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground rounded p-1.5 transition-colors"
                onClick={() => void onSharePost?.(post?.slug)}
                aria-label={t('common.share', 'Share')}
              >
                <Share06 size={20} />
              </button>
              <button
                type="button"
                className={cn(
                  'rounded p-1.5 transition-colors',
                  post.bookmarked
                    ? 'text-primary-500 hover:text-primary-600'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => onToggleBookmark?.(post.id)}
                aria-label={t('discover.web.bookmarks', 'Bookmarks')}
              >
                <Bookmark size={20} className={cn(post.bookmarked && 'fill-current')} />
              </button>
            </div>
          </>
        ) : null}
      </footer>

      <Sheet
        open={Boolean(isCommentsOpen)}
        onOpenChange={(open) => {
          if (open === Boolean(isCommentsOpen)) {
            return;
          }

          onToggleComments?.(post.id);
        }}
      >
        <SheetContent
          side="center"
          title={t('discover.web.postCommentsTitle', 'Post comments')}
          showCloseButton={false}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            if (typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches) {
              focusCommentComposer();
            }
          }}
          className="border-border grid h-[85dvh] max-h-[85dvh] min-h-0 w-[calc(100vw-1rem)] max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0"
        >
          <div className="border-border flex items-center justify-between border-b px-5 py-4">
            <p className="text-body-large-semibold text-foreground">
              {t('discover.web.post', 'Post')}
            </p>
            <button
              type="button"
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-1.5 transition-colors"
              onClick={() => onToggleComments?.(post.id)}
              aria-label={t('common.close', 'Close')}
            >
              <X size={24} strokeWidth={2.2} />
            </button>
          </div>

          <div className="scrollbar-neutral-slim min-h-0 touch-pan-y overflow-y-auto overscroll-contain px-5 pt-3 [-webkit-overflow-scrolling:touch]">
            <div className="space-y-4 pb-4">
              <div className="border-border space-y-3 border-b pb-3">
                <div className="flex items-center gap-2.5">
                  <Image
                    src={post.author.avatar || USER_PLACEHOLDER_ICON}
                    alt={post.author.displayName || 'Author'}
                    width={36}
                    height={36}
                    className="bg-muted h-9 w-9 rounded-full object-cover"
                    unoptimized
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-foreground w-30 truncate text-sm font-semibold">
                        {post.author.displayName}
                      </p>
                      {postRelativeTime ? (
                        <span className="text-muted-foreground text-xs">{postRelativeTime}</span>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground w-30 truncate text-xs">
                      {post.author.handle}
                    </p>
                  </div>
                </div>

                <p className="text-foreground text-sm leading-6 whitespace-pre-wrap">
                  {renderPostContentWithAssetLinks(post.content.text, post.assets || [])}
                </p>
                <PostAssetTags assets={post.assets || []} />

                {imageList.length > 0 ? (
                  <div
                    className={cn(
                      'grid gap-2 overflow-hidden rounded-lg',
                      imageList.length === 1
                        ? 'grid-cols-1'
                        : imageList.length === 2
                          ? 'grid-cols-2'
                          : 'grid-cols-3',
                    )}
                  >
                    {imageList.slice(0, 3).map((image, index) => (
                      <div
                        key={`${post.id}-comment-preview-${index}`}
                        className={cn(
                          'bg-muted relative overflow-hidden',
                          imageList.length === 1 ? 'h-68' : 'h-32',
                        )}
                      >
                        <Image
                          src={image}
                          alt={`comment-preview-${post.id}-image-${index + 1}`}
                          width={400}
                          height={400}
                          className="h-full w-full object-cover"
                          unoptimized
                        />

                        {index === 2 && imageList.length > 3 ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-lg font-semibold text-white">
                            +{imageList.length - 3}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}

                {post.repost ? (
                  <div
                    className="bg-muted/30 border-border mt-3 rounded-xl border p-3"
                    onClick={(event) => {
                      const target = event.target as HTMLElement;
                      if (target.closest('button,[data-repost-ignore-open=\"true\"]')) {
                        return;
                      }

                      handleOpenOriginalRepost(post.repost?.slug || '');
                    }}
                  >
                    <button
                      type="button"
                      className="flex items-center gap-2.5 text-left"
                      data-repost-ignore-open="true"
                      onClick={() => {
                        if (!normalizedRepostAuthorId) {
                          return;
                        }

                        onOpenAuthorProfile?.(normalizedRepostAuthorId);
                      }}
                      disabled={!normalizedRepostAuthorId || !onOpenAuthorProfile}
                    >
                      <Image
                        src={post.repost.author.avatar || USER_PLACEHOLDER_ICON}
                        alt={post.repost.author.displayName || 'Author'}
                        width={36}
                        height={36}
                        className="bg-muted h-9 w-9 rounded-full object-cover"
                        unoptimized
                      />

                      <div className="min-w-0">
                        <p className="text-foreground w-30 truncate text-sm font-semibold">
                          {post.repost.author.displayName}
                        </p>
                      </div>
                    </button>

                    <p className="text-foreground mt-2 text-sm leading-6 whitespace-pre-wrap">
                      {renderPostContentWithAssetLinks(
                        post.repost.content.text,
                        post.repost.assets || [],
                      )}
                    </p>
                    <PostAssetTags assets={post.repost.assets || []} />

                    {repostedImageList.length > 0 ? (
                      <div
                        className={cn(
                          'mt-3 grid gap-2 overflow-hidden rounded-lg',
                          repostedImageList.length === 1
                            ? 'grid-cols-1'
                            : repostedImageList.length === 2
                              ? 'grid-cols-2'
                              : 'grid-cols-3',
                        )}
                      >
                        {repostedImageList.slice(0, 3).map((image, index) => (
                          <div
                            key={`${post.repost?.id}-comment-repost-image-${index}`}
                            className={cn(
                              'bg-muted relative overflow-hidden',
                              repostedImageList.length === 1 ? 'h-80' : 'h-30 sm:h-36',
                            )}
                          >
                            <Image
                              src={image}
                              alt={`comment-repost-image-${post.repost?.id}-${index + 1}`}
                              width={400}
                              height={400}
                              className="h-full w-full object-cover"
                              unoptimized
                            />

                            {index === 2 && repostedImageList.length > 3 ? (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-lg font-semibold text-white">
                                +{repostedImageList.length - 3}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-4">
                    <PostActionButton
                      active={Boolean(post.liked)}
                      count={post.stats.likes}
                      icon={ThumbsUp}
                      label={t('discover.web.like', 'Like')}
                      onClick={() => onTogglePostLike?.(post.id)}
                    />
                    <PostActionButton
                      count={post.stats.comments}
                      icon={MessageCircle01}
                      label={t('discover.web.comment', 'Comment')}
                    />
                    <PostActionButton
                      count={post.stats.reposts}
                      disabled={!onRepostPost || isRepostingPost}
                      icon={RefreshCcw02}
                      label={t('discover.web.repostAction', 'Repost')}
                      onClick={openRepostModal}
                    />
                  </div>

                  <div>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground rounded p-1.5 transition-colors"
                      onClick={() => void onSharePost?.(post?.slug)}
                      aria-label={t('common.share', 'Share')}
                    >
                      <Share06 size={20} />
                    </button>
                    <button
                      type="button"
                      className={cn(
                        'rounded p-1.5 transition-colors',
                        post.bookmarked
                          ? 'text-primary-500 hover:text-primary-600'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                      onClick={() => onToggleBookmark?.(post.id)}
                      aria-label={t('discover.web.bookmarks', 'Bookmarks')}
                    >
                      <Bookmark size={20} className={cn(post.bookmarked && 'fill-current')} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {isLoadingComments && renderedComments.length === 0 ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, index) => (
                      <div
                        key={`comment-skeleton-${index}`}
                        className="bg-muted/30 border-border rounded border p-3"
                      >
                        <div className="flex items-start gap-2.5">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <div className="min-w-0 flex-1 space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-3 w-full" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : renderedComments.length === 0 ? (
                  <p className="text-muted-foreground text-center text-sm">
                    {t('discover.web.noCommentsYet', 'No comments yet.')}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {renderedComments.map((comment) => {
                      const canDeleteComment = currentUserId && currentUserId === comment.user.id;
                      const canEditComment = canDeleteComment;
                      const isDeletingComment = Boolean(isDeletingCommentById?.[comment.id]);
                      const isLikingComment = Boolean(isLikingCommentById?.[comment.id]);
                      const isUpdatingComment = Boolean(isUpdatingCommentById?.[comment.id]);
                      const isEditingComment = activeEditingCommentId === comment.id;
                      const normalizedCommentAuthorId = comment.user.id?.trim() || '';
                      const canOpenCommentAuthorProfile = Boolean(
                        normalizedCommentAuthorId && onOpenAuthorProfile,
                      );

                      return (
                        <div key={comment.id} className="">
                          <div className="flex items-start gap-2.5">
                            <button
                              type="button"
                              className="shrink-0"
                              onClick={() => onOpenAuthorProfile?.(normalizedCommentAuthorId)}
                              disabled={!canOpenCommentAuthorProfile}
                              aria-label={`${comment.user.username} profile`}
                            >
                              <Image
                                src={comment.user.avatar || USER_PLACEHOLDER_ICON}
                                alt={comment.user.username}
                                width={32}
                                height={32}
                                className="bg-muted h-8 w-8 rounded-full object-cover"
                                unoptimized
                              />
                            </button>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <button
                                    type="button"
                                    className="text-left"
                                    onClick={() => onOpenAuthorProfile?.(normalizedCommentAuthorId)}
                                    disabled={!canOpenCommentAuthorProfile}
                                  >
                                    <p className="text-foreground w-30 truncate text-sm font-semibold">
                                      {comment.user.displayName}
                                    </p>
                                  </button>
                                  <p className="text-muted-foreground text-xs">
                                    {new Date(comment.createdAt).toLocaleString()}
                                  </p>
                                </div>

                                {canDeleteComment ? (
                                  <div className="flex items-center gap-1">
                                    {canEditComment && !isEditingComment ? (
                                      <Button
                                        type="button"
                                        variant="neutral-ghost"
                                        className="h-7 px-2 text-xs"
                                        onClick={() =>
                                          startEditingComment(comment.id, comment.content)
                                        }
                                        disabled={isDeletingComment || isUpdatingComment}
                                      >
                                        {t('discover.web.edit', 'Edit')}
                                      </Button>
                                    ) : null}

                                    <Button
                                      type="button"
                                      variant="red-ghost"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => onDeleteComment?.(post.id, comment.id)}
                                      disabled={isDeletingComment || isUpdatingComment}
                                    >
                                      <Trash01 size={12} />
                                      <span>
                                        {isDeletingComment
                                          ? t('discover.web.deleting', 'Deleting...')
                                          : t('discover.web.delete', 'Delete')}
                                      </span>
                                    </Button>
                                  </div>
                                ) : null}
                              </div>

                              {isEditingComment ? (
                                <div className="mt-1 space-y-2">
                                  <input
                                    type="text"
                                    value={editingCommentDraft}
                                    onChange={(event) => setEditingCommentDraft(event.target.value)}
                                    className="border-border text-foreground placeholder:text-muted-foreground h-9 w-full rounded border px-3 text-sm outline-none"
                                    disabled={isUpdatingComment}
                                  />

                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="primary-contained"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => void saveEditedComment(comment.id)}
                                      disabled={
                                        isUpdatingComment || editingCommentDraft.trim().length === 0
                                      }
                                    >
                                      {isUpdatingComment
                                        ? t('discover.web.saving', 'Saving...')
                                        : t('discover.web.save', 'Save')}
                                    </Button>

                                    <Button
                                      type="button"
                                      variant="neutral-ghost"
                                      className="h-7 px-2 text-xs"
                                      onClick={cancelEditingComment}
                                      disabled={isUpdatingComment}
                                    >
                                      {t('discover.web.cancel', 'Cancel')}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-foreground mt-1 text-sm leading-6">
                                  {comment.content}
                                </p>
                              )}

                              <button
                                type="button"
                                className={cn(
                                  'mt-2 flex items-center gap-1 text-xs transition-colors',
                                  comment.isLiked
                                    ? 'text-primary-500 hover:text-primary-600'
                                    : 'text-muted-foreground hover:text-foreground',
                                )}
                                onClick={() => onToggleCommentLike?.(post.id, comment.id)}
                                disabled={isDeletingComment || isLikingComment || isUpdatingComment}
                              >
                                <ThumbsUp
                                  size={14}
                                  className={cn(comment.isLiked && 'fill-current')}
                                />
                                <span>{comment.likeCount}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {renderedComments.length > 0 ? (
                  <div
                    ref={hasMoreComments ? commentsAutoLoadTriggerRef : undefined}
                    className="min-h-6"
                  >
                    {isLoadingMoreComments && (
                      <p className="text-muted-foreground text-xs">
                        {t('discover.web.loadingMoreComments', 'Loading more comments...')}
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="border-border bg-background border-t px-5 py-3">
            <div className="flex items-center gap-2">
              <input
                ref={commentInputRef}
                type="text"
                value={commentComposerValue}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  if (onCommentDraftChange) {
                    onCommentDraftChange(post.id, nextValue);
                  } else {
                    setLocalCommentDraft(nextValue);
                  }
                }}
                placeholder={t('discover.web.writeAComment', 'Write a comment')}
                className="border-border text-foreground placeholder:text-muted-foreground h-10 w-full rounded border px-3 text-sm outline-none"
              />
              <div ref={commentEmojiPickerContainerRef} className="relative">
                <Button
                  type="button"
                  variant="white-contained"
                  className="hover:bg-muted h-10 rounded p-0 text-lg leading-none"
                  onClick={() => setIsCommentEmojiPickerOpen((prev) => !prev)}
                  aria-label={t('discover.web.addEmoji', 'Add emoji')}
                >
                  <span aria-hidden>😊</span>
                </Button>
                {isCommentEmojiPickerOpen ? (
                  <div className="absolute -right-30 bottom-10 z-50">
                    <EmojiPicker
                      open={isCommentEmojiPickerOpen}
                      onEmojiClick={handleCommentEmojiSelect}
                      autoFocusSearch={false}
                      lazyLoadEmojis
                      theme={emojiPickerTheme}
                      previewConfig={{ showPreview: false }}
                      width={290}
                      height={300}
                    />
                  </div>
                ) : null}
              </div>
              <Button
                type="button"
                variant="primary-contained"
                className="h-10 px-4 text-sm"
                onClick={() => onCreateComment?.(post.id)}
                disabled={isCreatingComment || commentComposerValue.trim().length === 0}
              >
                {isCreatingComment
                  ? t('discover.web.posting', 'Posting...')
                  : t('discover.web.comment', 'Comment')}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet
        open={isRepostModalOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsRepostModalOpen(true);
            return;
          }

          closeRepostModal();
        }}
      >
        <SheetContent
          side="center"
          title={t('discover.web.repostDialogTitle', 'Create repost')}
          className="border-border max-h-[90vh] max-w-2xl overflow-y-auto rounded border p-0"
          showCloseButton={!isRepostingPost}
        >
          <div className="border-border border-b px-5 py-4">
            <p className="text-body-large-semibold text-foreground">
              {t('discover.web.shareInsights', 'Share your insights')}
            </p>
          </div>

          <div className="space-y-4 px-3 pt-4 pb-5">
            <CreatePostComposer
              variant="modal"
              canPost={repostContent.trim().length > 0 && Boolean(onRepostPost)}
              composerImages={repostComposerImages}
              composerLinkedAssets={linkedAssets}
              composerText={repostContent}
              currentUserName={safeCurrentUserName}
              fileInputRef={repostImageInputRef}
              isPosting={Boolean(isRepostingPost)}
              isUploadingImages={false}
              onComposerImageChange={handleRepostImageChange}
              onComposerTextChange={setRepostContent}
              onCreatePost={() => {
                void submitRepost();
              }}
              onLinkedAssetPicked={(assetId, symbol) =>
                handleToggleLinkedAsset({ id: assetId, symbol })
              }
              onToggleComposerAsset={handleToggleLinkedAsset}
              onRemoveComposerImage={removeRepostImage}
              onRemoveComposerAsset={(assetId) => {
                setLinkedAssets((prev) => prev.filter((asset) => asset.id !== assetId));
              }}
              textareaRef={repostTextareaRef}
              userAvatar={safeUserAvatar}
            />

            <div className="bg-muted/30 border-border space-y-3 rounded-lg border p-3">
              <button
                type="button"
                className="flex items-start gap-2.5 text-left"
                onClick={() => onOpenAuthorProfile?.(normalizedAuthorId)}
                disabled={!normalizedAuthorId || !onOpenAuthorProfile}
              >
                <Image
                  src={post.author.avatar || USER_PLACEHOLDER_ICON}
                  alt={post.author.displayName || 'Author'}
                  width={36}
                  height={36}
                  className="bg-muted h-9 w-9 rounded-full object-cover"
                  unoptimized
                />

                <div className="min-w-0">
                  <p className="text-foreground w-30 truncate text-sm font-semibold">
                    {post.author.displayName}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">{post.author.handle}</p>
                </div>
              </button>

              <p className="text-foreground text-sm leading-6 whitespace-pre-wrap">
                {renderPostContentWithAssetLinks(post.content.text, post.assets || [])}
              </p>
              <PostAssetTags assets={post.assets || []} />

              {imageList.length > 0 ? (
                <div
                  className={cn(
                    'grid gap-2 overflow-hidden rounded-lg',
                    imageList.length === 1
                      ? 'grid-cols-1'
                      : imageList.length === 2
                        ? 'grid-cols-2'
                        : 'grid-cols-3',
                  )}
                >
                  {imageList.slice(0, 3).map((image, index) => (
                    <div
                      key={`${post.id}-repost-preview-${index}`}
                      className="bg-muted relative h-24 overflow-hidden"
                    >
                      <Image
                        src={image}
                        alt={`repost-preview-${post.id}-image-${index + 1}`}
                        width={96}
                        height={96}
                        className="h-full w-full object-cover"
                        unoptimized
                      />

                      {index === 2 && imageList.length > 3 ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-lg font-semibold text-white">
                          +{imageList.length - 3}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="neutral-ghost"
                className="h-9 px-4 text-sm"
                onClick={closeRepostModal}
                disabled={isRepostingPost}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Image Zoom Modal */}
      {selectedImageIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={closeImageModal}
        >
          <div
            className="relative flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
            onWheel={handleWheel}
          >
            {/* Close Button */}
            <button
              type="button"
              className="absolute top-2 right-2 z-10 rounded-full bg-black/45 p-2 text-white transition-colors hover:bg-black/60"
              onClick={closeImageModal}
              aria-label="Close"
            >
              <X size={24} />
            </button>

            {/* Image Container */}
            <div
              ref={imageContainerRef}
              className="flex h-[70vh] w-[94vw] max-w-[26rem] items-center justify-center overflow-hidden rounded-lg bg-black sm:h-[90vh] sm:w-[90vw] sm:max-w-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <Image
                ref={imageRef}
                src={imageList[selectedImageIndex]}
                alt={`Zoomed image ${selectedImageIndex + 1}`}
                width={1200}
                height={900}
                className={cn(
                  'object-contain transition-transform duration-200 select-none',
                  zoomLevel > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : '',
                  isDragging ? 'duration-0' : '',
                )}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${zoomLevel})`,
                  maxWidth: '100%',
                  maxHeight: '100%',
                }}
                unoptimized
              />
            </div>

            {/* Zoom Controls */}
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/50 px-3 py-2">
              <button
                type="button"
                className="rounded p-1 text-white transition-colors hover:bg-white/20"
                onClick={() => handleZoom('out')}
                disabled={zoomLevel <= 1}
                aria-label="Zoom out"
              >
                <ZoomOut size={18} />
              </button>
              <span className="w-12 text-center text-sm font-medium text-white">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                className="rounded p-1 text-white transition-colors hover:bg-white/20"
                onClick={() => handleZoom('in')}
                disabled={zoomLevel >= 3}
                aria-label="Zoom in"
              >
                <ZoomIn size={18} />
              </button>
            </div>

            {/* Navigation */}
            {imageList.length > 1 && (
              <>
                {/* Previous Button */}
                {selectedImageIndex > 0 && (
                  <button
                    type="button"
                    className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/40"
                    onClick={handlePrevImage}
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={24} />
                  </button>
                )}

                {/* Next Button */}
                {selectedImageIndex < imageList.length - 1 && (
                  <button
                    type="button"
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/40"
                    onClick={handleNextImage}
                    aria-label="Next image"
                  >
                    <ChevronRight size={24} />
                  </button>
                )}

                {/* Image Counter */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
                  {selectedImageIndex + 1} / {imageList.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
