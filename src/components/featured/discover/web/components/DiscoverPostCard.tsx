'use client';

import {
  Bookmark,
  CheckVerified01,
  MessageCircle01,
  RefreshCcw02,
  Share06,
  ThumbsUp,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  DotsHorizontal,
} from '@untitledui/icons';
import EmojiPicker, { Theme, type EmojiClickData } from 'emoji-picker-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { EditorHandle } from '@/components/shared/atoms/editor';
import { Button } from '@/components/shared/atoms/button';
import { Sheet, SheetContent } from '@/components/shared/atoms/web/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shared/atoms/dropdown-menu';
import { Skeleton } from '@/components/shared/atoms/skeleton';
import { toFiniteNumberFromNumberish } from '@/components/shared/chart/components/tradePanel/utils/tradePanelInputHelpers';
import { UserHoverTooltip } from './shared/UserHoverTooltip';
import { useSymbols } from '@/hook/useSymbols';
import { cn } from '@/lib/utils';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme';
import { createPortal } from 'react-dom';
import { DISCOVER_MAX_COMPOSER_IMAGES } from '../hooks/constants';
import { PostOwnerDropdown } from './tab/shared/PostOwnerDropdown';
import { CreatePostComposer } from './tab/shared/CreatePostComposer';

const USER_PLACEHOLDER_ICON = '/assets/images/discover/filled.png';

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
    displayName?: string;
  };
};

export type DiscoverPostAuthor = {
  id: string;
  avatar: string;
  bio?: string;
  followers: number;
  following: number;
  handle: string;
  name: string;
  verified: boolean;
};

export type DiscoverPostContent = {
  images: string[];
  text: string;
  title: string;
};

export type DiscoverPostAsset = {
  ask?: number | string;
  bid?: number | string;
  id: string;
  logo?: null | string;
  symbol?: string;
};

export type DiscoverPostStats = {
  comments: number;
  likes: number;
  reposts: number;
  shares: number;
};

export type DiscoverPostRepost = {
  assets: DiscoverPostAsset[];
  id: string;
  slug: string;
  author: DiscoverPostAuthor;
  bookmarked?: boolean;
  content: DiscoverPostContent;
  createdAt?: string;
  following?: boolean;
  isOwnPost?: boolean;
  liked?: boolean;
  status?: string;
  stats: DiscoverPostStats;
};

export type DiscoverPost = DiscoverPostRepost & {
  repost?: DiscoverPostRepost;
};

const formatRelativePostTime = (createdAt?: string, locale?: string): string => {
  if (!createdAt) {
    return '';
  }

  const createdAtMs = new Date(createdAt).getTime();
  if (!Number.isFinite(createdAtMs)) {
    return '';
  }

  const diffMs = Math.max(0, Date.now() - createdAtMs);
  const formatter = new Intl.RelativeTimeFormat(locale || undefined, { numeric: 'always' });
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
  isLikingCommentById?: Record<string, boolean>;
  isDeletingPost?: boolean;
  isLastPost?: boolean;
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
  onToggleFollowByAuthorId?: (authorId: string, currentFollowing: boolean) => void;
  onTogglePostLike?: (postId: string) => void;
  onSharePost?: (postId: string) => Promise<void> | void;
  onEditPost?: (postId: string) => void;
  onOpenAuthorProfile?: (authorId: string) => void;
  post: DiscoverPost;
  hideCard?: boolean;
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
        'focus-visible:ring-primary-500 flex w-auto min-w-9 cursor-pointer items-center gap-1.5 rounded-sm transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60',
        active
          ? 'text-primary-500 hover:text-primary-600'
          : 'hover:text-primary-600 text-neutral-700',
      )}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon size={20} className={cn(active && 'fill-current')} />
      <span className="text-body-large-medium">{count}</span>
    </button>
  );
}

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

type RepostPreviewCardProps = {
  isExpanded: boolean;
  onImageClick?: (images: string[], index: number) => void;
  onToggleFollowByAuthorId?: (authorId: string, currentFollowing: boolean) => void;
  onOpenOriginalPost?: (postSlug: string) => void;
  onToggleExpanded: () => void;
  relativeTime?: string;
  repost: DiscoverPostRepost;
  shouldShowContentMore: boolean;
  contentRef?: React.RefObject<HTMLParagraphElement | null>;
  onOpenAuthorProfile?: (authorId: string) => void;
};

function RepostPreviewCard({
  isExpanded,
  onImageClick,
  onToggleFollowByAuthorId,
  onOpenOriginalPost,
  onToggleExpanded,
  relativeTime,
  repost,
  shouldShowContentMore,
  contentRef,
  onOpenAuthorProfile,
}: RepostPreviewCardProps) {
  const { t } = useTranslation();
  const repostedImageList = repost.content.images.filter(Boolean);
  const normalizedRepostAuthorId = repost.author.id?.trim() || '';

  return (
    <div
      className="bg-muted/30 border-border mt-4 rounded-xl border p-3"
      onClick={(event) => {
        if (!onOpenOriginalPost) {
          return;
        }

        const target = event.target as HTMLElement;
        if (target.closest('a,button,[data-repost-ignore-open="true"]')) {
          return;
        }

        onOpenOriginalPost(repost.slug);
      }}
    >
      <button
        type="button"
        className="flex items-center gap-2.5 text-left"
        onClick={() => {
          if (!normalizedRepostAuthorId) {
            return;
          }

          onOpenAuthorProfile?.(normalizedRepostAuthorId);
        }}
        disabled={!normalizedRepostAuthorId || !onOpenAuthorProfile}
      >
        <Image
          src={repost.author.avatar || USER_PLACEHOLDER_ICON}
          alt={repost.author.name}
          width={36}
          height={36}
          className="bg-muted h-9 w-9 rounded-full object-cover"
          unoptimized
        />

        <div className="flex min-w-0 items-center gap-1.5">
          <UserHoverTooltip
            name={repost.author.name}
            handle={repost.author.handle}
            avatar={repost.author.avatar}
            bio={repost.author.bio}
            targetUserId={normalizedRepostAuthorId}
            verified={repost.author.verified}
            followers={repost.author.followers}
            following={repost.author.following}
            isFollowing={Boolean(repost.following)}
            onToggleFollow={
              onToggleFollowByAuthorId && normalizedRepostAuthorId
                ? () => {
                    onToggleFollowByAuthorId(normalizedRepostAuthorId, Boolean(repost.following));
                  }
                : undefined
            }
          >
            <p className="text-foreground text-body-large-semibold hover:text-primary-600 max-w-40 cursor-pointer truncate overflow-hidden text-ellipsis transition-colors">
              {repost.author.name}
            </p>
          </UserHoverTooltip>
          {relativeTime ? (
            <>
              <span className="text-muted-foreground text-xs" aria-hidden="true">
                •
              </span>
              <span className="text-muted-foreground text-body-small-regular">{relativeTime}</span>
            </>
          ) : null}
        </div>
      </button>

      <p
        ref={contentRef}
        className={cn(
          'text-body-small-regular mt-3 whitespace-pre-wrap',
          !isExpanded && 'line-clamp-4',
        )}
      >
        {renderPostContentWithAssetLinks(repost.content.text, repost.assets)}
      </p>
      <PostAssetTags assets={repost.assets} />
      {shouldShowContentMore ? (
        <button
          type="button"
          data-repost-ignore-open="true"
          className="text-primary-500 hover:text-primary-600 mt-1 text-sm font-medium"
          onClick={onToggleExpanded}
        >
          {isExpanded
            ? t('discover.web.seeLess', 'See less')
            : t('discover.web.seeMore', 'See more')}
        </button>
      ) : null}

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
              key={`${repost.id}-nested-repost-image-${index}`}
              className={cn(
                'bg-muted relative overflow-hidden',
                onImageClick && 'cursor-pointer transition-opacity hover:opacity-90',
                repostedImageList.length === 1 ? 'h-80' : 'h-30 sm:h-36',
              )}
              data-repost-ignore-open="true"
              onClick={() => onImageClick?.(repostedImageList, index)}
            >
              <Image
                src={image}
                alt={`nested-repost-image-${repost.id}-${index + 1}`}
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
  isLikingCommentById,
  isDeletingPost,
  isLastPost = false,
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
  onToggleFollowByAuthorId,
  onTogglePostLike,
  onSharePost,
  onEditPost,
  onOpenAuthorProfile,
  post,
  hideCard = false,
  showFollowButton = true,
}: DiscoverPostCardProps) {
  const searchParams = useSearchParams();
  const { mode } = useTheme();
  const imageList = post.content.images.filter(Boolean);
  const renderedComments = comments || [];
  console.log('Rendered comments for post', renderedComments);
  const commentInputValue = commentDraft || '';
  const emojiPickerTheme = mode === 'dark' ? Theme.DARK : Theme.LIGHT;
  const { t, i18n } = useTranslation();
  const postRelativeTime = useMemo(
    () => formatRelativePostTime(post.createdAt, i18n.language),
    [post.createdAt, i18n.language],
  );
  const repostRelativeTime = useMemo(
    () => formatRelativePostTime(post.repost?.createdAt, i18n.language),
    [post.repost?.createdAt, i18n.language],
  );

  // Remove collapsed content - always render full content, let CSS line-clamp handle visual clipping

  // States for expanded content
  const [isExpandedPostContent, setIsExpandedPostContent] = useState(false);
  const [isExpandedRepostContent, setIsExpandedRepostContent] = useState(false);
  const [isExpandedCommentRepostContent, setIsExpandedCommentRepostContent] = useState(false);
  const [isExpandedCommentPreview, setIsExpandedCommentPreview] = useState(false);
  const [isExpandedCommentContentById, setIsExpandedCommentContentById] = useState<
    Record<string, boolean>
  >({});
  const [isExpandedRepostPreview, setIsExpandedRepostPreview] = useState(false);
  const [isCommentEmojiPickerOpen, setIsCommentEmojiPickerOpen] = useState(false);

  // States for editing comments
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentDraft, setEditingCommentDraft] = useState('');

  // States for repost modal
  const [isRepostModalOpen, setIsRepostModalOpen] = useState(false);
  const [repostContent, setRepostContent] = useState('');
  const [repostImages, setRepostImages] = useState<RepostComposerImage[]>([]);
  const [linkedAssets, setLinkedAssets] = useState<ComposerLinkedAsset[]>([]);

  // States for image zoom
  const [zoomImageList, setZoomImageList] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Refs for measuring DOM overflow
  const postContentRef = useRef<HTMLParagraphElement | null>(null);
  const commentPreviewContentRef = useRef<HTMLParagraphElement | null>(null);
  const repostContentRef = useRef<HTMLParagraphElement | null>(null);
  const commentContentRefsMap = useRef<Record<string, HTMLParagraphElement | null>>({});

  // States for tracking overflow
  const [postContentOverflow, setPostContentOverflow] = useState(false);
  const [commentPreviewOverflow, setCommentPreviewOverflow] = useState(false);
  const [repostContentOverflow, setRepostContentOverflow] = useState(false);
  const [commentContentOverflowMap, setCommentContentOverflowMap] = useState<
    Record<string, boolean>
  >({});

  const me = useAuthStore((state) => state.user);
  const safeCurrentUserName = me?.username?.trim() || 'Guest Trader';
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

  // Refs for UI interactions
  const dragStart = useRef({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const commentsScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const commentsAutoLoadTriggerRef = useRef<HTMLDivElement | null>(null);
  const hasTriggeredCommentsAutoLoadRef = useRef(false);
  const commentInputRef = useRef<HTMLInputElement | null>(null);
  const commentEmojiPickerContainerRef = useRef<HTMLDivElement | null>(null);
  const repostTextareaRef = useRef<EditorHandle | null>(null);
  const repostImageInputRef = useRef<HTMLInputElement | null>(null);
  const repostObjectUrlRegistry = useRef<Set<string>>(new Set());

  // Measure DOM overflow
  const measureOverflow = (ref: React.RefObject<HTMLParagraphElement | null>) => {
    const el = ref.current;
    if (!el) return false;
    return el.scrollHeight > el.clientHeight;
  };

  useLayoutEffect(() => {
    setPostContentOverflow(measureOverflow(postContentRef));
  }, [post.content.text, isExpandedPostContent]);

  useLayoutEffect(() => {
    setCommentPreviewOverflow(measureOverflow(commentPreviewContentRef));
  }, [post.content.text, isExpandedCommentPreview]);

  useLayoutEffect(() => {
    setRepostContentOverflow(measureOverflow(repostContentRef));
  }, [post.repost?.content.text, isExpandedRepostContent]);

  // Measure comment content overflow for each comment
  useLayoutEffect(() => {
    const overflowMap: Record<string, boolean> = {};
    renderedComments.forEach((comment) => {
      const ref = commentContentRefsMap.current[comment.id];
      overflowMap[comment.id] = ref ? ref.scrollHeight > ref.clientHeight : false;
    });
    setCommentContentOverflowMap(overflowMap);
  }, [renderedComments, isExpandedCommentContentById]);

  const shouldShowPostContentMore = postContentOverflow || isExpandedPostContent;
  const shouldShowCommentPreviewMore = commentPreviewOverflow || isExpandedCommentPreview;
  const shouldShowRepostContentMore = repostContentOverflow || isExpandedRepostContent;

  useEffect(() => {
    const registry = repostObjectUrlRegistry.current;

    return () => {
      registry.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      registry.clear();
    };
  }, []);

  useEffect(() => {
    setIsExpandedPostContent(false);
    setIsExpandedRepostContent(false);
    setIsExpandedCommentRepostContent(false);
    setIsExpandedCommentPreview(false);
    setIsExpandedCommentContentById({});
    setIsExpandedRepostPreview(false);
    setIsCommentEmojiPickerOpen(false);
  }, [post.id, post.content.text, post.repost?.content.text]);

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

  const openImageModal = (images: string[], index: number) => {
    const normalizedImages = images.filter(Boolean);
    if (normalizedImages.length === 0 || index < 0 || index >= normalizedImages.length) {
      return;
    }

    setZoomImageList(normalizedImages);
    setSelectedImageIndex(index);
    resetImageView();
  };

  const closeImageModal = () => {
    setZoomImageList([]);
    setSelectedImageIndex(null);
    resetImageView();
  };

  useEffect(() => {
    if (selectedImageIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && selectedImageIndex > 0) {
        e.preventDefault();
        e.stopPropagation();
        setSelectedImageIndex(selectedImageIndex - 1);
        resetImageView();
      } else if (e.key === 'ArrowRight' && selectedImageIndex < zoomImageList.length - 1) {
        e.preventDefault();
        e.stopPropagation();
        setSelectedImageIndex(selectedImageIndex + 1);
        resetImageView();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeImageModal();
      }
    };

    // Dùng capture phase để event chạy trước Focus Trap của Dialog
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [selectedImageIndex, zoomImageList.length]);

  useEffect(() => {
    if (selectedImageIndex !== null) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [selectedImageIndex]);

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
    setIsExpandedRepostPreview(false);
    resetRepostComposer();
  };

  const handlePrevImage = (event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.stopPropagation();

    if (selectedImageIndex !== null && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
      resetImageView();
    }
  };

  const handleNextImage = (event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.stopPropagation();

    if (selectedImageIndex !== null && selectedImageIndex < zoomImageList.length - 1) {
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

  const handleCommentEmojiSelect = (emojiData: EmojiClickData) => {
    const nextEmoji = emojiData.emoji;
    const input = commentInputRef.current;

    if (!input) {
      onCommentDraftChange?.(post.id, `${commentInputValue}${nextEmoji}`);
      return;
    }

    const selectionStart = input.selectionStart ?? commentInputValue.length;
    const selectionEnd = input.selectionEnd ?? selectionStart;
    const nextValue = `${commentInputValue.slice(0, selectionStart)}${nextEmoji}${commentInputValue.slice(selectionEnd)}`;
    const nextCursor = selectionStart + nextEmoji.length;

    onCommentDraftChange?.(post.id, nextValue);

    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(nextCursor, nextCursor);
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
        root: commentsScrollContainerRef.current,
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
  const handleOpenOriginalRepost = useCallback(
    (repostPostSlug: string) => {
      if (typeof window === 'undefined') {
        return;
      }

      const normalizedPostSlug = repostPostSlug.trim();
      if (!normalizedPostSlug) {
        return;
      }

      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', 'for-you');
      params.delete('id');
      const nextQuery = params.toString();
      const detailPath = `/discover/${encodeURIComponent(normalizedPostSlug)}`;
      const nextUrl = `${nextQuery ? `${detailPath}?${nextQuery}` : detailPath}${window.location.hash || ''}`;
      window.history.pushState(window.history.state, '', nextUrl);
      window.dispatchEvent(new PopStateEvent('popstate'));
    },
    [searchParams],
  );

  return (
    <article className={cn('mt-4 px-4', hideCard && 'hidden')}>
      <header className="mb-4 flex items-center justify-between gap-3">
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
            alt={post.author.name}
            width={40}
            height={40}
            className="bg-muted h-10 w-10 rounded-full object-cover"
            unoptimized
          />

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <UserHoverTooltip
                name={post.author.name}
                handle={post.author.handle}
                avatar={post.author.avatar}
                bio={post.author.bio}
                targetUserId={normalizedAuthorId}
                verified={post.author.verified}
                followers={post.author.followers}
                following={post.author.following}
                isFollowing={Boolean(post.following)}
                onToggleFollow={
                  onToggleFollowByAuthorId && normalizedAuthorId
                    ? () => {
                        onToggleFollowByAuthorId(normalizedAuthorId, Boolean(post.following));
                      }
                    : undefined
                }
              >
                <p className="text-foreground text-body-large-semibold hover:text-primary-600 max-w-40 cursor-pointer truncate overflow-hidden text-ellipsis transition-colors">
                  {post.author.name}
                </p>
              </UserHoverTooltip>

              {post.author.verified ? (
                <CheckVerified01 size={18} className="text-primary-500" />
              ) : null}

              {postRelativeTime ? (
                <>
                  <span className="text-muted-foreground text-xs" aria-hidden="true">
                    •
                  </span>
                  <span className="text-muted-foreground text-body-small-regular">
                    {postRelativeTime}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </button>

        {post.isOwnPost ? (
          <PostOwnerDropdown
            onEdit={() => onEditPost?.(post.id)}
            onDelete={() => onDeletePost?.(post.id)}
            isDeleting={isDeletingPost}
          />
        ) : showFollowButton ? (
          <Button
            variant="primary-contained"
            className="text-button-small-medium hover:bg-primary-400 px-3 py-2"
            onClick={() => onToggleFollow?.(post.id)}
          >
            {post.following
              ? t('discover.web.following', 'Following')
              : t('discover.web.follow', 'Follow')}
          </Button>
        ) : null}
      </header>

      <div>
        <p
          ref={postContentRef}
          className={cn(
            'text-body-small-regular whitespace-pre-wrap',
            !isExpandedPostContent && 'line-clamp-4',
          )}
        >
          {renderPostContentWithAssetLinks(post.content.text, post.assets)}
        </p>
        <PostAssetTags assets={post.assets} />
        {shouldShowPostContentMore ? (
          <button
            type="button"
            className="text-primary-500 hover:text-primary-600 mt-1 text-sm font-medium"
            onClick={() => setIsExpandedPostContent((prev) => !prev)}
          >
            {isExpandedPostContent
              ? t('discover.web.seeLess', 'See less')
              : t('discover.web.seeMore', 'See more')}
          </button>
        ) : null}
      </div>

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
              onClick={() => openImageModal(imageList, index)}
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
            <div className="absolute inset-0 z-40 flex items-center justify-center rounded-sm bg-black/60 px-4 text-center text-sm font-semibold text-white sm:text-base">
              {t('discover.web.pendingApproval', 'Đang chờ phê duyệt')}
            </div>
          ) : null}
        </div>
      ) : null}

      {post.repost ? (
        <RepostPreviewCard
          repost={post.repost}
          relativeTime={repostRelativeTime}
          shouldShowContentMore={shouldShowRepostContentMore}
          isExpanded={isExpandedRepostContent}
          onImageClick={openImageModal}
          onToggleFollowByAuthorId={onToggleFollowByAuthorId}
          onOpenOriginalPost={handleOpenOriginalRepost}
          onToggleExpanded={() => setIsExpandedRepostContent((prev) => !prev)}
          contentRef={repostContentRef}
          onOpenAuthorProfile={onOpenAuthorProfile}
        />
      ) : null}

      <footer
        className={cn(
          'border-border mt-3 flex items-center justify-between pb-4',
          !isLastPost && 'border-b',
        )}
      >
        {post.status !== 'PENDING' ? (
          <>
            <div className="flex flex-wrap items-center gap-4">
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
                className="hover:text-primary-600 rounded p-1.5 text-neutral-700 transition-colors"
                onClick={() => void onSharePost?.(post.slug)}
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
                    : 'hover:text-primary-600 text-neutral-700',
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

          if (!open && selectedImageIndex !== null) {
            return;
          }

          onToggleComments?.(post.id);
        }}
      >
        <SheetContent
          side="center"
          title={t('discover.web.post', 'Post')}
          showCloseButton
          className="border-border grid h-[70dvh] max-h-[70dvh] min-h-0 w-250 max-w-2xl! grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="border-border border-b px-5 py-4">
            <p className="text-body-large-semibold text-foreground">
              {t('discover.web.post', 'Post')}
            </p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div
              ref={commentsScrollContainerRef}
              className="scrollbar-neutral-slim h-full min-h-0 flex-1 touch-pan-y space-y-4 overflow-y-auto overscroll-contain px-5 pt-3 pb-4 [-webkit-overflow-scrolling:touch]"
            >
              <div className="border-border border-b pb-4">
                <header className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Image
                      src={post.author.avatar || USER_PLACEHOLDER_ICON}
                      alt={post.author.name}
                      width={40}
                      height={40}
                      className="bg-muted h-10 w-10 rounded-full object-cover"
                      unoptimized
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <UserHoverTooltip
                          name={post.author.name}
                          handle={post.author.handle}
                          avatar={post.author.avatar}
                          bio={post.author.bio}
                          targetUserId={normalizedAuthorId}
                          verified={post.author.verified}
                          followers={post.author.followers}
                          following={post.author.following}
                          isFollowing={Boolean(post.following)}
                          onToggleFollow={
                            onToggleFollowByAuthorId && normalizedAuthorId
                              ? () => {
                                  onToggleFollowByAuthorId(
                                    normalizedAuthorId,
                                    Boolean(post.following),
                                  );
                                }
                              : undefined
                          }
                        >
                          <p className="text-foreground text-body-large-semibold hover:text-primary-600 max-w-40 cursor-pointer truncate overflow-hidden text-ellipsis">
                            {post.author.name}
                          </p>
                        </UserHoverTooltip>

                        {postRelativeTime ? (
                          <>
                            <span className="text-muted-foreground text-xs" aria-hidden="true">
                              •
                            </span>
                            <span className="text-muted-foreground text-body-small-regular">
                              {postRelativeTime}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </header>

                <div>
                  <p
                    ref={commentPreviewContentRef}
                    className={cn(
                      'text-body-small-regular whitespace-pre-wrap',
                      !isExpandedCommentPreview && 'line-clamp-4',
                    )}
                  >
                    {renderPostContentWithAssetLinks(post.content.text, post.assets)}
                  </p>
                  <PostAssetTags assets={post.assets} />
                  {shouldShowCommentPreviewMore ? (
                    <button
                      type="button"
                      className="text-primary-500 hover:text-primary-600 mt-1 text-sm font-medium"
                      onClick={() => setIsExpandedCommentPreview((prev) => !prev)}
                    >
                      {isExpandedCommentPreview
                        ? t('discover.web.seeLess', 'See less')
                        : t('discover.web.seeMore', 'See more')}
                    </button>
                  ) : null}
                </div>

                {imageList.length > 0 ? (
                  <div
                    className={cn(
                      'mt-4 grid gap-2 overflow-hidden',
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
                          'bg-muted relative cursor-pointer overflow-hidden rounded-sm transition-opacity hover:opacity-90',
                          imageList.length === 1 ? 'h-90' : 'h-36 sm:h-44',
                        )}
                        onClick={() => openImageModal(imageList, index)}
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
                          <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-xl font-semibold text-white">
                            +{imageList.length - 3}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}

                {post.repost ? (
                  <RepostPreviewCard
                    repost={post.repost}
                    relativeTime={repostRelativeTime}
                    shouldShowContentMore={shouldShowRepostContentMore}
                    isExpanded={isExpandedCommentRepostContent}
                    onImageClick={openImageModal}
                    onToggleFollowByAuthorId={onToggleFollowByAuthorId}
                    onOpenOriginalPost={handleOpenOriginalRepost}
                    onToggleExpanded={() => setIsExpandedCommentRepostContent((prev) => !prev)}
                    onOpenAuthorProfile={onOpenAuthorProfile}
                  />
                ) : null}

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-4">
                    <PostActionButton
                      active={Boolean(post.liked)}
                      count={post.stats.likes}
                      icon={ThumbsUp}
                      label={t('discover.web.likes', 'Likes')}
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
                      className="hover:text-primary-600 rounded p-1.5 text-neutral-700 transition-colors"
                      onClick={() => void onSharePost?.(post.slug)}
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
                          : 'hover:text-primary-600 text-neutral-700',
                      )}
                      onClick={() => onToggleBookmark?.(post.id)}
                      aria-label={t('discover.web.bookmarks', 'Bookmarks')}
                    >
                      <Bookmark size={20} className={cn(post.bookmarked && 'fill-current')} />
                    </button>
                  </div>
                </div>
              </div>

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
                <p className="text-muted-foreground text-sm">
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
                    const isExpandedCommentContent = Boolean(
                      isExpandedCommentContentById[comment.id],
                    );
                    const commentRelativeTime = formatRelativePostTime(
                      comment.createdAt,
                      i18n.language,
                    );
                    const shouldShowCommentContentMore = Boolean(
                      commentContentOverflowMap[comment.id] || isExpandedCommentContent,
                    );
                    return (
                      <div key={comment.id} className="bg-background border-border rounded pb-3">
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
                              width={40}
                              height={40}
                              className="bg-muted h-10 w-10 rounded-full object-cover"
                              unoptimized
                            />
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-1.5">
                                <button
                                  type="button"
                                  className="text-left"
                                  onClick={() => onOpenAuthorProfile?.(normalizedCommentAuthorId)}
                                  disabled={!canOpenCommentAuthorProfile}
                                >
                                  <p className="text-foreground text-body-large-semibold hover:text-primary-600 max-w-40 cursor-pointer truncate overflow-hidden text-ellipsis transition-colors">
                                    {comment.user.displayName || comment.user.username}
                                  </p>
                                </button>
                                <p className="text-muted-foreground text-xs">
                                  {commentRelativeTime ||
                                    new Date(comment.createdAt).toLocaleString()}
                                </p>
                              </div>

                              {canDeleteComment ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      className="text-muted-foreground hover:text-foreground hover:bg-muted rounded p-1 transition-colors disabled:opacity-60"
                                      disabled={isDeletingComment || isUpdatingComment}
                                      aria-label={t(
                                        'discover.web.commentActions',
                                        'Comment actions',
                                      )}
                                    >
                                      <DotsHorizontal size={16} />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className="bg-background w-32 border-none"
                                    style={{ boxShadow: '3px 3px 12px 0px rgba(0, 0, 0, 0.15)' }}
                                  >
                                    {canEditComment && !isEditingComment ? (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          startEditingComment(comment.id, comment.content)
                                        }
                                      >
                                        {t('discover.web.edit', 'Edit')}
                                      </DropdownMenuItem>
                                    ) : null}
                                    <DropdownMenuItem
                                      onClick={() => onDeleteComment?.(post.id, comment.id)}
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      {isDeletingComment
                                        ? t('discover.web.deleting', 'Deleting...')
                                        : t('discover.web.delete', 'Delete')}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
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
                                      : t('common.save', 'Save')}
                                  </Button>

                                  <Button
                                    type="button"
                                    variant="neutral-ghost"
                                    className="h-7 px-2 text-xs"
                                    onClick={cancelEditingComment}
                                    disabled={isUpdatingComment}
                                  >
                                    {t('common.cancel', 'Cancel')}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-1">
                                <p
                                  ref={(el) => {
                                    if (el) {
                                      commentContentRefsMap.current[comment.id] = el;
                                    }
                                  }}
                                  className={cn(
                                    'text-foreground text-sm leading-6 whitespace-pre-wrap',
                                    !isExpandedCommentContent && 'line-clamp-4',
                                  )}
                                >
                                  {comment.content}
                                </p>
                                {shouldShowCommentContentMore ? (
                                  <button
                                    type="button"
                                    className="text-primary-500 hover:text-primary-600 mt-1 text-sm font-medium"
                                    onClick={() =>
                                      setIsExpandedCommentContentById((prev) => ({
                                        ...prev,
                                        [comment.id]: !prev[comment.id],
                                      }))
                                    }
                                  >
                                    {isExpandedCommentContent
                                      ? t('discover.web.seeLess', 'See less')
                                      : t('discover.web.seeMore', 'See more')}
                                  </button>
                                ) : null}
                              </div>
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
                              disabled={isDeletingComment || isUpdatingComment || isLikingComment}
                            >
                              <ThumbsUp
                                size={16}
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
                  className="space-y-3"
                >
                  {isLoadingMoreComments && (
                    <div className="space-y-3">
                      {[...Array(2)].map((_, index) => (
                        <div
                          key={`loading-comment-skeleton-${index}`}
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
                  )}
                </div>
              ) : null}
            </div>

            <div className="border-border border-t px-5 py-3">
              <div className="flex items-center gap-2">
                <input
                  ref={commentInputRef}
                  type="text"
                  value={commentInputValue}
                  onChange={(event) => onCommentDraftChange?.(post.id, event.target.value)}
                  placeholder={t('discover.web.writeAComment', 'Write a comment')}
                  className="border-border focus:border-primary-500 text-foreground placeholder:text-muted-foreground h-10 w-full rounded border px-3 text-sm outline-none"
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
                    <div className="absolute right-0 bottom-11 z-50">
                      <EmojiPicker
                        open={isCommentEmojiPickerOpen}
                        onEmojiClick={handleCommentEmojiSelect}
                        autoFocusSearch={false}
                        lazyLoadEmojis
                        theme={emojiPickerTheme}
                        previewConfig={{ showPreview: false }}
                        className="scrollbar-neutral-slim"
                        width={310}
                        height={340}
                      />
                    </div>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="primary-contained"
                  className="h-10 px-4 text-sm"
                  onClick={() => onCreateComment?.(post.id)}
                  disabled={isCreatingComment || commentInputValue.trim().length === 0}
                >
                  {isCreatingComment
                    ? t('discover.web.posting', 'Posting...')
                    : t('discover.web.comment', 'Comment')}
                </Button>
              </div>
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

          if (!open && selectedImageIndex !== null) {
            return;
          }

          closeRepostModal();
        }}
      >
        <SheetContent
          side="center"
          className="border-border scrollbar-neutral-slim max-h-[90vh] max-w-2xl overflow-y-auto p-0"
          title={t('discover.web.repostDialogTitle', 'Create repost')}
          showCloseButton={!isRepostingPost}
        >
          <div className="border-border border-b px-5 py-4">
            <p className="text-body-large-semibold text-foreground">
              {t('discover.web.shareInsights', 'Share your insights')}
            </p>
          </div>

          <div className="space-y-4 px-5 pt-4 pb-5">
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
                  alt={post.author.name}
                  width={36}
                  height={36}
                  className="bg-muted h-9 w-9 rounded-full object-cover"
                  unoptimized
                />

                <div className="flex min-w-0 items-center gap-1.5">
                  <UserHoverTooltip
                    name={post.author.name}
                    handle={post.author.handle}
                    avatar={post.author.avatar}
                    bio={post.author.bio}
                    targetUserId={normalizedAuthorId}
                    verified={post.author.verified}
                    followers={post.author.followers}
                    following={post.author.following}
                    isFollowing={Boolean(post.following)}
                    onToggleFollow={
                      onToggleFollowByAuthorId && normalizedAuthorId
                        ? () => {
                            onToggleFollowByAuthorId(normalizedAuthorId, Boolean(post.following));
                          }
                        : undefined
                    }
                  >
                    <p className="text-foreground hover:text-primary-600 cursor-pointer truncate overflow-hidden text-sm font-semibold text-ellipsis transition-colors">
                      <span className="truncate">{post.author.name}</span>
                    </p>
                  </UserHoverTooltip>
                  {postRelativeTime ? (
                    <>
                      <span className="text-muted-foreground text-xs" aria-hidden="true">
                        •
                      </span>
                      <span className="text-muted-foreground text-body-small-regular">
                        {postRelativeTime}
                      </span>
                    </>
                  ) : null}
                </div>
              </button>

              <p
                className={cn(
                  'text-body-small-regular whitespace-pre-wrap',
                  !isExpandedRepostPreview && 'line-clamp-4',
                )}
              >
                {renderPostContentWithAssetLinks(post.content.text, post.assets)}
              </p>
              <PostAssetTags assets={post.assets} />
              {shouldShowPostContentMore ? (
                <button
                  type="button"
                  className="text-primary-500 hover:text-primary-600 mt-1 text-sm font-medium"
                  onClick={() => setIsExpandedRepostPreview((prev) => !prev)}
                >
                  {isExpandedRepostPreview
                    ? t('discover.web.seeLess', 'See less')
                    : t('discover.web.seeMore', 'See more')}
                </button>
              ) : null}

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
                      className={cn(
                        'bg-muted relative cursor-pointer overflow-hidden rounded-sm transition-opacity hover:opacity-90',
                        imageList.length === 1 ? 'h-90' : 'h-36 sm:h-44',
                      )}
                      onClick={() => openImageModal(imageList, index)}
                    >
                      <Image
                        src={image}
                        alt={`repost-preview-${post.id}-image-${index + 1}`}
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
      {typeof window !== 'undefined' && selectedImageIndex !== null
        ? createPortal(
            <div
              className="fixed inset-0 z-9999 flex items-center justify-center bg-black/80 p-4"
              style={{ pointerEvents: 'auto' }}
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
                  className="absolute -top-10 -right-10 z-10 rounded-full p-2 text-white transition-colors hover:bg-white/20 sm:top-2 sm:right-2"
                  onClick={closeImageModal}
                  aria-label={t('common.close', 'Close')}
                >
                  <X size={24} />
                </button>

                {/* Image Container */}
                <div
                  ref={imageContainerRef}
                  className="flex h-[90vh] w-[90vw] items-center justify-center overflow-hidden rounded-lg bg-black"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <Image
                    ref={imageRef}
                    src={zoomImageList[selectedImageIndex]}
                    alt={`Zoomed image ${selectedImageIndex + 1}`}
                    width={1200}
                    height={900}
                    className={cn(
                      'object-contain transition-transform duration-200 select-none',
                      zoomLevel > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : '',
                      isDragging ? 'duration-0' : '',
                    )}
                    unoptimized
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                    style={{
                      transform: `translate(${position.x}px, ${position.y}px) scale(${zoomLevel})`,
                      maxWidth: '100%',
                      maxHeight: '100%',
                    }}
                  />
                </div>

                {/* Zoom Controls */}
                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/50 px-3 py-2">
                  <button
                    type="button"
                    className="rounded p-1 text-white transition-colors hover:bg-white/20"
                    onClick={() => handleZoom('out')}
                    disabled={zoomLevel <= 1}
                    aria-label={t('discover.web.zoomOut', 'Zoom out')}
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
                    aria-label={t('discover.web.zoomIn', 'Zoom in')}
                  >
                    <ZoomIn size={18} />
                  </button>
                </div>

                {/* Navigation */}
                {zoomImageList.length > 1 && (
                  <>
                    {/* Previous Button */}
                    {selectedImageIndex > 0 && (
                      <button
                        type="button"
                        className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/40"
                        onClick={handlePrevImage}
                        aria-label={t('discover.web.previousImage', 'Previous image')}
                      >
                        <ChevronLeft size={24} />
                      </button>
                    )}

                    {/* Next Button */}
                    {selectedImageIndex < zoomImageList.length - 1 && (
                      <button
                        type="button"
                        className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/40"
                        onClick={handleNextImage}
                        aria-label={t('discover.web.nextImage', 'Next image')}
                      >
                        <ChevronRight size={24} />
                      </button>
                    )}

                    {/* Image Counter */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
                      {selectedImageIndex + 1} / {zoomImageList.length}
                    </div>
                  </>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </article>
  );
}
