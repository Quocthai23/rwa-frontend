'use client';

import { CheckVerified01 } from '@untitledui/icons';
import Image from 'next/image';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/shared/atoms/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/shared/atoms/tooltip';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { Check } from '@untitledui/icons';

const DISCOVER_USER_PLACEHOLDER_ICON = '/assets/images/discover/filled.png';

type UserHoverTooltipProps = {
  avatar?: string;
  bio?: string;
  children: ReactElement;
  followers?: number;
  following?: number;
  handle?: string;
  isFollowLoading?: boolean;
  isFollowing?: boolean;
  name: string;
  onToggleFollow?: () => void;
  targetUserId?: string;
  verified?: boolean;
};

export function UserHoverTooltip({
  avatar,
  bio,
  children,
  followers = 0,
  following = 0,
  handle,
  isFollowLoading = false,
  isFollowing,
  name,
  onToggleFollow,
  targetUserId,
  verified = false,
}: UserHoverTooltipProps) {
  const { t } = useTranslation();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const normalizedName = name.trim() || 'Unknown user';
  const normalizedHandle = handle?.trim() || '@unknown';
  const normalizedBio = (() => {
    const raw = bio?.trim() || '';
    if (!raw) {
      return '';
    }

    const withoutWrappingQuotes = raw.replace(/^"+|"+$/g, '').trim();
    return withoutWrappingQuotes.replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
  })();
  const safeFollowers = Number.isFinite(followers) ? Math.max(0, followers) : 0;
  const safeFollowing = Number.isFinite(following) ? Math.max(0, following) : 0;
  const normalizedTargetUserId = targetUserId?.trim() || '';
  const isCurrentUser = Boolean(
    normalizedTargetUserId && currentUserId && normalizedTargetUserId === currentUserId,
  );

  return (
    <Tooltip delayDuration={180}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        className={cn(
          'bg-background w-72 rounded-xl border p-3 shadow-xl',
          'border-border text-popover-foreground',
        )}
      >
        <div className="space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <Image
              src={avatar || DISCOVER_USER_PLACEHOLDER_ICON}
              alt={normalizedName}
              width={44}
              height={44}
              unoptimized
              className="h-11 w-11 shrink-0 rounded-full object-cover"
            />

            {onToggleFollow && !isCurrentUser ? (
              <Button
                type="button"
                variant={isFollowing ? 'white-outline' : 'primary-contained'}
                className={cn(
                  'h-8 rounded px-3 text-xs',
                  isFollowing
                    ? 'border-border !text-foreground hover:bg-accent'
                    : 'hover:bg-primary-400 !text-white',
                )}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onToggleFollow();
                }}
                disabled={isFollowLoading}
              >
                {isFollowing ? (
                  <span className="inline-flex items-center gap-1">
                    <Check className="size-3.5" />
                    {t('discover.web.following', 'Following')}
                  </span>
                ) : (
                  t('discover.web.follow', 'Follow')
                )}
              </Button>
            ) : null}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-body-large-semibold truncate">{normalizedName}</p>
              {verified ? <CheckVerified01 size={16} className="text-primary-500" /> : null}
            </div>
            <p className="text-body-small-regular text-muted-foreground">{normalizedHandle}</p>
          </div>

          {normalizedBio ? (
            <p className="text-body-small-regular text-foreground whitespace-pre-line">
              {normalizedBio}
            </p>
          ) : null}

          <p className="text-body-small-regular text-muted-foreground">
            <span>
              {safeFollowing.toLocaleString()} {t('discover.web.following', 'following')}
            </span>
            <span className="mx-1">•</span>
            <span>
              {safeFollowers.toLocaleString()} {t('discover.web.followers', 'followers')}
            </span>
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
