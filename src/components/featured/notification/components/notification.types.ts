import type { NotificationItem as ApiNotificationItem } from '@/types/notification';
import { formatTimeAgo } from '@/utils/dateUtils';

export enum NotificationCategory {
  User = 0,
  System = 1,
  Trading = 2,
}

export enum NotificationType {
  LIKE_POST = 0,
  COMMENT_POST = 1,
  REPOST = 2,
  NEW_POST = 3,
  FOLLOW = 4,
}

export type NotificationCategoryTab = 'user' | 'system' | 'trading';

export type NotificationTabId = 'all' | NotificationCategoryTab;

export type NotificationText = {
  defaultValue: string;
  key: string;
  values?: Record<string, number | string>;
};

export type NotificationItem = {
  category: NotificationCategoryTab;
  description: NotificationText;
  id: string;
  read: boolean;
  targetUrl?: string;
  timestamp: string;
  title: NotificationText;
};

export type NotificationTab = {
  id: NotificationTabId;
  labelDefault: string;
  labelKey: string;
};

export type NotificationCategoryStyle = {
  badge: string;
  dot: string;
  label: string;
};

export const NOTIFICATION_TABS: NotificationTab[] = [
  { id: 'all', labelDefault: 'All', labelKey: 'notifications.tabs.all' },
  { id: 'user', labelDefault: 'User', labelKey: 'notifications.tabs.user' },
  { id: 'system', labelDefault: 'System', labelKey: 'notifications.tabs.system' },
  { id: 'trading', labelDefault: 'Trading', labelKey: 'notifications.tabs.trading' },
];

const CATEGORY_BY_CODE: Record<number, NotificationCategoryTab> = {
  [NotificationCategory.User]: 'user',
  [NotificationCategory.System]: 'system',
  [NotificationCategory.Trading]: 'trading',
};

const CATEGORY_ALIASES: Record<string, NotificationCategoryTab> = {
  user: 'user',
  system: 'system',
  trading: 'trading',
};

type NotificationMetadata = Record<string, unknown> | undefined;
type NotificationRenderContent = {
  description: NotificationText;
  targetUrl?: string;
  title: NotificationText;
};

const normalizeCategory = (value: unknown): NotificationCategoryTab | undefined => {
  if (typeof value === 'number') {
    return CATEGORY_BY_CODE[value];
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  return CATEGORY_ALIASES[value.trim().toLowerCase().replace(/\s+/g, '-')];
};

const parseMetadata = (raw: ApiNotificationItem['metadata']): NotificationMetadata => {
  if (!raw) {
    return undefined;
  }

  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw;
  }

  if (typeof raw !== 'string' || !raw.trim()) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return { message: raw };
  }

  return undefined;
};

const readPath = (metadata: NotificationMetadata, path: string): unknown => {
  if (!metadata) {
    return undefined;
  }

  return path.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, metadata);
};

const readMetadataString = (
  metadata: NotificationMetadata,
  paths: string[],
): string | undefined => {
  if (!metadata) {
    return undefined;
  }

  for (const path of paths) {
    const value = readPath(metadata, path);
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
};

const resolveCategory = (
  item: ApiNotificationItem,
  metadata: NotificationMetadata,
): NotificationCategoryTab => {
  return normalizeCategory(metadata?.category) ?? normalizeCategory(item.category) ?? 'user';
};

const resolveType = (
  item: ApiNotificationItem,
  metadata: NotificationMetadata,
): NotificationType | undefined => {
  const candidate = typeof item.type === 'number' ? item.type : readPath(metadata, 'type');
  return typeof candidate === 'number' ? (candidate as NotificationType) : undefined;
};

const resolveActorName = (
  type: NotificationType | undefined,
  metadata: NotificationMetadata,
): string => {
  switch (type) {
    case NotificationType.FOLLOW:
      return (
        readMetadataString(metadata, [
          'follower.username',
          'actor.username',
          'user.username',
          'username',
        ]) ?? 'Someone'
      );
    case NotificationType.LIKE_POST:
      return (
        readMetadataString(metadata, [
          'lastLiker.username',
          'liker.username',
          'actor.username',
          'user.username',
          'username',
        ]) ?? 'Someone'
      );
    case NotificationType.COMMENT_POST:
      return (
        readMetadataString(metadata, [
          'lastCommenter.username',
          'commenter.username',
          'actor.username',
          'user.username',
          'username',
        ]) ?? 'Someone'
      );
    case NotificationType.REPOST:
      return (
        readMetadataString(metadata, [
          'lastReposter.username',
          'reposter.username',
          'actor.username',
          'user.username',
          'username',
        ]) ?? 'Someone'
      );
    case NotificationType.NEW_POST:
      return (
        readMetadataString(metadata, [
          'postAuthor.username',
          'author.username',
          'actor.username',
          'user.username',
          'username',
        ]) ?? 'Someone'
      );
    default:
      return (
        readMetadataString(metadata, [
          'actor.username',
          'user.username',
          'username',
          'postAuthor.username',
          'author.username',
        ]) ?? 'Someone'
      );
  }
};

const resolvePostContent = (metadata: NotificationMetadata): string | undefined => {
  return readMetadataString(metadata, ['post.content', 'content', 'postContent', 'message']);
};

const resolveCommentContent = (metadata: NotificationMetadata): string | undefined => {
  return readMetadataString(metadata, ['comment.content', 'commentContent']);
};

const resolvePostSlug = (metadata: NotificationMetadata): string | undefined => {
  return readMetadataString(metadata, ['post.slug', 'postSlug', 'slug']);
};

const resolveProfileUserId = (
  item: ApiNotificationItem,
  metadata: NotificationMetadata,
): string | undefined => {
  return (
    readMetadataString(metadata, ['followerId', 'follower.id', 'userId', 'actor.id']) ??
    item.entityId
  );
};

const resolveTargetUrl = (
  item: ApiNotificationItem,
  type: NotificationType | undefined,
  metadata: NotificationMetadata,
): string | undefined => {
  switch (type) {
    case NotificationType.FOLLOW: {
      const userId = resolveProfileUserId(item, metadata);
      if (!userId) {
        return undefined;
      }
      return `/discover?tab=profile?userId=${encodeURIComponent(userId)}`;
    }
    case NotificationType.LIKE_POST:
    case NotificationType.COMMENT_POST:
    case NotificationType.REPOST:
    case NotificationType.NEW_POST: {
      const postSlug = resolvePostSlug(metadata);
      if (!postSlug) {
        return undefined;
      }
      return `/discover/${encodeURIComponent(postSlug)}?tab=for-you`;
    }
    default:
      return undefined;
  }
};

const resolveGenericDescription = (metadata: NotificationMetadata): NotificationText => {
  const message = readMetadataString(metadata, [
    'description',
    'message',
    'body',
    'content',
    'subtitle',
    'text',
  ]);

  if (message) {
    return {
      key: 'notifications.types.generic.withMessage',
      defaultValue: '{{message}}',
      values: { message },
    };
  }

  return {
    key: 'notifications.types.generic.description',
    defaultValue: 'You have a new notification.',
  };
};

const resolveNotificationContent = (
  item: ApiNotificationItem,
  type: NotificationType | undefined,
  category: NotificationCategoryTab,
  metadata: NotificationMetadata,
): NotificationRenderContent => {
  const actor = resolveActorName(type, metadata);
  const otherCount = Math.max(0, item.actorCount - 1);
  const postContent = resolvePostContent(metadata);
  const commentContent = resolveCommentContent(metadata);

  switch (type) {
    case NotificationType.LIKE_POST:
      return {
        title: { key: 'notifications.types.postLike.title', defaultValue: 'New like' },
        description:
          otherCount > 0 && postContent
            ? {
                key: 'notifications.types.postLike.multiWithPost',
                defaultValue: '{{actor}} and {{count}} others liked your post: "{{post}}"',
                values: { actor, count: otherCount, post: postContent },
              }
            : otherCount > 0
              ? {
                  key: 'notifications.types.postLike.multi',
                  defaultValue: '{{actor}} and {{count}} others liked your post',
                  values: { actor, count: otherCount },
                }
              : postContent
                ? {
                    key: 'notifications.types.postLike.singleWithPost',
                    defaultValue: '{{actor}} liked your post: "{{post}}"',
                    values: { actor, post: postContent },
                  }
                : {
                    key: 'notifications.types.postLike.single',
                    defaultValue: '{{actor}} liked your post',
                    values: { actor },
                  },
        targetUrl: resolveTargetUrl(item, type, metadata),
      };
    case NotificationType.COMMENT_POST:
      return {
        title: { key: 'notifications.types.postComment.title', defaultValue: 'New comment' },
        description:
          otherCount > 0 && commentContent
            ? {
                key: 'notifications.types.postComment.multiWithComment',
                defaultValue: '{{actor}} and {{count}} others commented: "{{comment}}"',
                values: { actor, count: otherCount, comment: commentContent },
              }
            : otherCount > 0
              ? {
                  key: 'notifications.types.postComment.multi',
                  defaultValue: '{{actor}} and {{count}} others commented on your post',
                  values: { actor, count: otherCount },
                }
              : commentContent
                ? {
                    key: 'notifications.types.postComment.singleWithComment',
                    defaultValue: '{{actor}} commented: "{{comment}}"',
                    values: { actor, comment: commentContent },
                  }
                : {
                    key: 'notifications.types.postComment.single',
                    defaultValue: '{{actor}} commented on your post',
                    values: { actor },
                  },
        targetUrl: resolveTargetUrl(item, type, metadata),
      };
    case NotificationType.REPOST:
      return {
        title: { key: 'notifications.types.repost.title', defaultValue: 'New repost' },
        description: postContent
          ? {
              key: 'notifications.types.repost.withPost',
              defaultValue: '{{actor}} reposted your post: "{{post}}"',
              values: { actor, post: postContent },
            }
          : {
              key: 'notifications.types.repost.single',
              defaultValue: '{{actor}} reposted your post',
              values: { actor },
            },
        targetUrl: resolveTargetUrl(item, type, metadata),
      };
    case NotificationType.NEW_POST:
      return {
        title: { key: 'notifications.types.newPost.title', defaultValue: 'New post' },
        description: postContent
          ? {
              key: 'notifications.types.newPost.withPost',
              defaultValue: '{{actor}} published a new post: "{{post}}"',
              values: { actor, post: postContent },
            }
          : {
              key: 'notifications.types.newPost.single',
              defaultValue: '{{actor}} published a new post',
              values: { actor },
            },
        targetUrl: resolveTargetUrl(item, type, metadata),
      };
    case NotificationType.FOLLOW:
      return {
        title: { key: 'notifications.types.follow.title', defaultValue: 'New follower' },
        description:
          otherCount > 0
            ? {
                key: 'notifications.types.follow.multi',
                defaultValue: '{{actor}} and {{count}} others followed you',
                values: { actor, count: otherCount },
              }
            : {
                key: 'notifications.types.follow.single',
                defaultValue: '{{actor}} followed you',
                values: { actor },
              },
        targetUrl: resolveTargetUrl(item, type, metadata),
      };
    default:
      return {
        title: {
          key: 'notifications.types.generic.title',
          defaultValue: getNotificationCategoryLabel(category),
        },
        description: resolveGenericDescription(metadata),
        targetUrl: resolveTargetUrl(item, type, metadata),
      };
  }
};

const resolveTimestamp = (createdAt: string, updatedAt?: string): string => {
  if (!createdAt && !updatedAt) return '';

  const created = createdAt ? new Date(createdAt).getTime() : 0;
  const updated = updatedAt ? new Date(updatedAt).getTime() : 0;
  const latest = updated > created ? updatedAt : createdAt;

  return latest ? formatTimeAgo(latest) : '';
};

export function mapApiNotificationToItem(item: ApiNotificationItem): NotificationItem {
  const metadata = parseMetadata(item.metadata);
  const category = resolveCategory(item, metadata);
  const type = resolveType(item, metadata);
  const content = resolveNotificationContent(item, type, category, metadata);

  return {
    id: item.id,
    category,
    description: content.description,
    read: item.isRead,
    targetUrl: content.targetUrl,
    timestamp: resolveTimestamp(item.createdAt, item.updatedAt),
    title: content.title,
  };
}

export function getNotificationCategoryLabel(category: NotificationCategoryTab): string {
  switch (category) {
    case 'user':
      return 'User';
    case 'system':
      return 'System';
    case 'trading':
      return 'Trading';
    default:
      return 'Notification';
  }
}

export function getNotificationCategoryStyle(
  category: NotificationCategoryTab,
): NotificationCategoryStyle {
  switch (category) {
    case 'user':
      return {
        badge: 'bg-primary-500/10 text-primary-500 border-primary-500/20',
        dot: 'bg-primary-500',
        label: 'from-primary-500/15 to-primary-500/5 text-primary-500',
      };
    case 'system':
      return {
        badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
        dot: 'bg-amber-500',
        label: 'from-amber-500/15 to-amber-500/5 text-amber-600',
      };
    case 'trading':
      return {
        badge: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
        dot: 'bg-sky-500',
        label: 'from-sky-500/15 to-sky-500/5 text-sky-600',
      };
    default:
      return {
        badge: 'bg-neutral-500/10 text-neutral-600 border-neutral-500/20',
        dot: 'bg-neutral-400',
        label: 'from-neutral-500/15 to-neutral-500/5 text-neutral-600',
      };
  }
}
