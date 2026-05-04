'use client';

import {
  Bookmark,
  CheckVerified01,
  MessageCircle01,
  Repeat01,
  Share07,
  ThumbsUp,
} from '@untitledui/icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';

interface FeedItemProps {
  post: {
    id: string;
    author: {
      name: string;
      avatar: string;
      verified: boolean;
      followers: number;
    };
    content: {
      title: string;
      text: string;
      images: string[];
    };
    stats: {
      likes: number;
      comments: number;
      shares: number;
      reposts: number;
    };
  };
}

export function NewsFeedItem({ post }: FeedItemProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <div className="bg-background border-border border-b p-5">
      <div className="mb-4 flex flex-row items-center">
        {post.author.avatar ? (
          <img
            src={post.author.avatar}
            alt={post.author.name}
            className="bg-muted mr-3 rounded-full object-cover"
          />
        ) : (
          <div className="bg-muted mr-3 rounded-full" />
        )}
        <div className="flex-1">
          <div className="flex flex-row items-center">
            <span className="text-body-large-semibold text-foreground mr-1">
              {post.author.name}
            </span>
            {post.author.verified && (
              <CheckVerified01
                size={18}
                color={colors.primary500}
                fill={colors.primary500}
                stroke="white"
              />
            )}
          </div>
          <div className="mt-1 flex flex-row items-center">
            <span className="text-body-large-regular text-muted-foreground">
              <span style={{ fontSize: 14 }}>👥</span> {post.author.followers.toLocaleString()}{' '}
              {t('discover.feed.followers')}
            </span>
          </div>
        </div>
        <button className="bg-primary-500 hover:bg-primary-600 rounded px-5 py-2 transition-colors">
          <span className="text-body-small-regular text-white">
            {t('discover.feed.followButton')}
          </span>
        </button>
      </div>

      {/* Content */}
      <h3 className="text-h3-semibold text-foreground mb-2">{post.content.title}</h3>
      <p className="text-h3-regular text-muted-foreground mb-4 line-clamp-4 leading-6">
        {post.content.text}
      </p>

      {/* Images - Grid Layout */}
      {post.content.images.length === 1 && (
        <div className="relative mb-4 h-40 w-full overflow-hidden rounded-xl">
          <img
            src={post.content.images[0]}
            alt={t('discover.feed.postContentAlt')}
            className="bg-muted absolute inset-0 h-full w-full object-cover"
          />
        </div>
      )}

      {post.content.images.length > 1 && (
        <div className="mb-4 flex h-32 w-full flex-row gap-2">
          {post.content.images.slice(0, 3).map((img, index) => (
            <div key={index} className="relative flex-1 overflow-hidden rounded-xl">
              <img
                src={img}
                alt={t('discover.feed.postContentAltWithIndex', { index: index + 1 })}
                className="bg-muted absolute inset-0 h-full w-full object-cover"
              />
              {index === 2 && post.content.images.length > 3 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <span className="text-h3-semibold text-white">
                    +{post.content.images.length - 3}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action Bar */}
      <div className="flex flex-row items-center justify-between">
        <div className="flex flex-1 flex-row items-center justify-between pr-8">
          <button className="flex flex-row items-center gap-2 transition-opacity hover:opacity-80">
            <ThumbsUp size={20} color={colors.neutral700} />
            <span className="text-body-small-regular text-muted-foreground">
              {post.stats.likes}
            </span>
          </button>
          <button className="flex flex-row items-center gap-2 transition-opacity hover:opacity-80">
            <MessageCircle01 size={20} color={colors.neutral700} />
            <span className="text-body-small-regular text-muted-foreground">
              {post.stats.comments}
            </span>
          </button>
          <button className="flex flex-row items-center gap-2 transition-opacity hover:opacity-80">
            <Share07 size={22} color={colors.neutral700} />
            <span className="text-body-small-regular text-muted-foreground">
              {post.stats.shares}
            </span>
          </button>
          <button className="flex flex-row items-center gap-2 transition-opacity hover:opacity-80">
            <Repeat01 size={20} color={colors.neutral700} />
            <span className="text-body-small-regular text-muted-foreground">
              {post.stats.reposts}
            </span>
          </button>
        </div>
        <button className="-mr-2 p-2 transition-opacity hover:opacity-80">
          <Bookmark size={22} color={colors.neutral700} />
        </button>
      </div>
    </div>
  );
}
