'use client';

import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { type NotificationItem } from './notification.types';

type NotificationCardProps = {
  className?: string;
  item: NotificationItem;
  onClick?: () => void;
};

export default function NotificationCard({ className, item, onClick }: NotificationCardProps) {
  const { t } = useTranslation();
  const isInteractive = typeof onClick === 'function';
  const isUnread = !item.read;

  return (
    <article
      className={cn(
        'border-border bg-background border-b dark:bg-neutral-900',
        !isUnread && 'opacity-60',
        className,
      )}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={!isInteractive}
        className={cn(
          'w-full text-left',
          isInteractive && 'hover:bg-muted/40 cursor-pointer transition-colors',
          !isInteractive && 'cursor-default',
        )}
      >
        <div className="flex min-h-[104px] items-center justify-between gap-4 px-4 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-col items-start justify-between gap-1 sm:flex-row sm:gap-3">
              <h3 className="text-body-large-semibold text-foreground line-clamp-2 break-words">
                {t(item.title.key, {
                  ...item.title.values,
                  defaultValue: item.title.defaultValue,
                })}
              </h3>
              <span
                className={cn(
                  'text-body-small-regular text-muted-foreground shrink-0 whitespace-nowrap',
                  isUnread
                    ? 'text-muted-foreground dark:text-neutral-400'
                    : 'dark:text-neutral-500',
                )}
              >
                {item.timestamp}
              </span>
            </div>

            {item.requiresAction && (
              <span className="text-primary-500 bg-primary-500/10 mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium">
                {t('notifications.actionOnly', 'Needs action')}
              </span>
            )}
            <p
              className={cn(
                'text-body-large-regular mt-0.5 line-clamp-2',
                isUnread
                  ? 'text-muted-foreground dark:text-neutral-300'
                  : 'text-muted-foreground dark:text-neutral-400',
              )}
            >
              {t(item.description.key, {
                ...item.description.values,
                defaultValue: item.description.defaultValue,
              })}
            </p>
          </div>

          <span
            className={cn(
              'text-body-small-regular mt-0.5 size-2 shrink-0 rounded-full',
              isUnread ? 'bg-primary-500' : 'bg-transparent',
            )}
            aria-hidden="true"
          />
        </div>
      </button>
    </article>
  );
}
