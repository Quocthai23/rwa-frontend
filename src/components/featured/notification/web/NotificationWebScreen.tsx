'use client';

import { Bell01, CheckCircle, X } from '@untitledui/icons';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import type { UIEvent } from 'react';
import { useTranslation } from 'react-i18next';

import NotificationCard from '@/components/featured/notification/components/NotificationCard';
import {
  NOTIFICATION_TABS,
  type NotificationItem,
  type NotificationTabId,
} from '@/components/featured/notification/components/notification.types';
import { Button } from '@/components/shared/atoms/button';
import { Switch } from '@/components/shared/atoms/web/switch';
import {
  getNotificationErrorMessage,
  useNotifications,
  useReadAllNotifications,
  useReadNotification,
} from '@/hook/useNotifications';

type NotificationWebScreenProps = {
  inSheet?: boolean;
  onClose?: () => void;
};

const NOTIFICATIONS_PAGE_SIZE = 20;
const NOTIFICATIONS_SCROLL_THRESHOLD_PX = 120;

export default function NotificationWebScreen({
  inSheet = false,
  onClose,
}: NotificationWebScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<NotificationTabId>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [requestedTake, setRequestedTake] = useState(NOTIFICATIONS_PAGE_SIZE);
  const notificationQueryParams = useMemo(
    () => ({
      isRead: showUnreadOnly ? false : undefined,
      skip: 0,
      take: requestedTake,
    }),
    [requestedTake, showUnreadOnly],
  );
  const { data, error, isError, isLoading, isFetching, refetch } =
    useNotifications(notificationQueryParams);
  const readAllMutation = useReadAllNotifications();
  const readMutation = useReadNotification();
  const notifications = useMemo(() => data?.notifications ?? [], [data?.notifications]);
  const totalNotifications = data?.total ?? notifications.length;
  const hasMoreNotifications = notifications.length < totalNotifications;
  const isLoadingMore = isFetching && requestedTake > NOTIFICATIONS_PAGE_SIZE;

  const filteredNotifications = useMemo(() => {
    const tabFiltered =
      activeTab === 'all'
        ? notifications
        : notifications.filter((item) => item.category === activeTab);
    return showUnreadOnly ? tabFiltered.filter((item) => !item.read) : tabFiltered;
  }, [activeTab, notifications, showUnreadOnly]);

  const unreadTotal = useMemo(
    () => data?.unreadTotal ?? notifications.filter((item) => !item.read).length,
    [data?.unreadTotal, notifications],
  );

  const tabCounts = useMemo(
    () =>
      NOTIFICATION_TABS.reduce<Record<NotificationTabId, number>>(
        (acc, tab) => ({
          ...acc,
          [tab.id]:
            tab.id === 'all'
              ? notifications.filter((item) => !item.read).length
              : notifications.filter((item) => item.category === tab.id && !item.read).length,
        }),
        { all: 0, system: 0, trading: 0, user: 0 },
      ),
    [notifications],
  );

  const handleMarkAllAsRead = () => {
    if (unreadTotal === 0 || readAllMutation.isPending) {
      return;
    }

    void readAllMutation.mutateAsync();
  };

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.read && !readMutation.isPending) {
      void readMutation.mutateAsync(item.id);
    }

    if (!item.targetUrl) {
      return;
    }

    if (onClose) {
      onClose();
    }

    router.push(item.targetUrl);
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
      return;
    }
    router.back();
  };

  const handleUnreadOnlyChange = useCallback((nextValue: boolean) => {
    setRequestedTake(NOTIFICATIONS_PAGE_SIZE);
    setShowUnreadOnly(nextValue);
  }, []);

  const handleNotificationsScroll = useCallback(
    (event: UIEvent<HTMLElement>) => {
      const target = event.currentTarget;
      const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;

      if (
        distanceToBottom <= NOTIFICATIONS_SCROLL_THRESHOLD_PX &&
        hasMoreNotifications &&
        !isLoading &&
        !isFetching
      ) {
        setRequestedTake((prev) => prev + NOTIFICATIONS_PAGE_SIZE);
      }
    },
    [hasMoreNotifications, isFetching, isLoading],
  );

  return (
    <div
      className={
        inSheet
          ? 'bg-background h-[min(38.5rem,calc(100dvh-2rem))] w-[min(43.75rem,calc(100vw-2rem))] dark:bg-neutral-900'
          : 'bg-background h-[calc(100dvh-72px)] p-4 dark:bg-neutral-900'
      }
    >
      <div
        className={`border-border bg-background flex flex-col overflow-hidden rounded border dark:bg-neutral-900 ${
          inSheet ? 'h-full w-full max-w-none' : 'mx-auto h-full w-full max-w-280'
        }`}
      >
        <header className="border-border flex min-h-14 items-center justify-between gap-3 border-b px-5 py-3">
          <h1 className="text-body-large-semibold text-foreground truncate">
            {t('notifications.title', 'Notifications')}
          </h1>

          <div className="flex items-center gap-3">
            <label className="text-body-large-semibold text-foreground inline-flex cursor-pointer items-center gap-2 whitespace-nowrap">
              <Switch
                checked={showUnreadOnly}
                onCheckedChange={handleUnreadOnlyChange}
                className="data-[state=checked]:bg-primary-500 h-4 w-[27px] border-0 p-0 data-[state=unchecked]:bg-neutral-200 [&>[data-slot=switch-thumb]]:h-3 [&>[data-slot=switch-thumb]]:w-3 [&>[data-slot=switch-thumb]]:shadow-[0px_0.8px_2.4px_0px_rgba(16,24,40,0.1)] [&>[data-slot=switch-thumb][data-state=checked]]:translate-x-3.5 [&>[data-slot=switch-thumb][data-state=unchecked]]:translate-x-0.5"
              />
              <span className="text-body-large-semibold text-foreground">
                {t('notifications.onlyUnread', 'Only show unread')}
              </span>
            </label>

            <Button
              variant="white-contained"
              className="text-muted-foreground hover:text-foreground h-8 w-8 rounded p-0"
              onClick={handleMarkAllAsRead}
              aria-label={t('notifications.markAllAsRead', 'Mark all as read')}
              disabled={readAllMutation.isPending || unreadTotal === 0}
            >
              <CheckCircle className="size-5" />
            </Button>

            <Button
              variant="white-contained"
              className="text-muted-foreground hover:text-foreground h-8 w-8 rounded p-0"
              onClick={handleClose}
              aria-label={t('common.close', 'Close')}
            >
              <X className="size-5" />
            </Button>
          </div>
        </header>

        <main className="flex min-h-0 flex-1">
          <div className="grid h-full w-full grid-cols-1 lg:grid-cols-[217px_minmax(0,1fr)]">
            <aside className="border-border flex flex-col justify-between border-b p-4 lg:border-r lg:border-b-0 lg:px-4 lg:py-6">
              <div className="space-y-4">
                {NOTIFICATION_TABS.map((tab) => {
                  const isActive = tab.id === activeTab;
                  const count = tabCounts[tab.id];

                  return (
                    <Button
                      key={tab.id}
                      type="button"
                      variant="white-contained"
                      onClick={() => setActiveTab(tab.id)}
                      className={`h-10 w-full items-center justify-between rounded px-3 py-2 transition-colors ${
                        isActive
                          ? 'border-primary-500 bg-primary-500/10 text-primary-500 border'
                          : 'border-border text-foreground hover:bg-muted/30 border'
                      }`}
                    >
                      <span
                        className={`text-body-large-semibold ${isActive ? 'text-primary-500' : ''}`}
                      >
                        {t(tab.labelKey, tab.labelDefault)}
                      </span>
                      <span
                        className={`text-caption-medium inline-flex size-6 items-center justify-center rounded-full ${
                          isActive
                            ? 'bg-primary-500 text-white'
                            : 'border-border text-foreground border bg-transparent'
                        }`}
                      >
                        {count}
                      </span>
                    </Button>
                  );
                })}
              </div>

              <div className="border-border rounded border px-3 py-2">
                <p className="text-body-small-regular text-muted-foreground">
                  {t('notifications.unreadLabel', 'Unread')}
                </p>
                <p className="text-body-large-semibold text-foreground">{unreadTotal}</p>
              </div>
            </aside>

            <section
              className="scrollbar-neutral-slim min-h-0 overflow-y-auto"
              onScroll={handleNotificationsScroll}
            >
              {isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="bg-background border-border h-24 animate-pulse border-b"
                  />
                ))
              ) : isError ? (
                <div className="bg-background flex min-h-72 flex-col items-center justify-center px-6 py-10 text-center">
                  <div className="bg-primary-500/10 mb-4 flex size-14 items-center justify-center rounded-2xl">
                    <Bell01 className="text-primary-500 size-6" />
                  </div>
                  <h3 className="text-h3-semibold text-foreground">
                    {t('notifications.loadFailedTitle', 'Unable to load notifications')}
                  </h3>
                  <p className="text-body-small-regular text-muted-foreground mt-2 max-w-sm">
                    {getNotificationErrorMessage(error)}
                  </p>
                  <Button
                    variant="primary-contained"
                    className="mt-4 px-3 py-2"
                    onClick={() => void refetch()}
                  >
                    <span className="text-button-large-semibold">{t('common.retry', 'Retry')}</span>
                  </Button>
                </div>
              ) : filteredNotifications.length > 0 ? (
                <>
                  {filteredNotifications.map((item) => (
                    <NotificationCard
                      key={item.id}
                      item={item}
                      onClick={() => handleNotificationClick(item)}
                    />
                  ))}
                  {isLoadingMore
                    ? Array.from({ length: 2 }).map((_, index) => (
                        <div
                          key={`notification-loading-more-${index}`}
                          className="bg-background border-border h-24 animate-pulse border-b"
                        />
                      ))
                    : null}
                </>
              ) : (
                <div className="bg-background flex min-h-72 flex-col items-center justify-center px-6 py-10 text-center">
                  <div className="bg-primary-500/10 mb-4 flex size-14 items-center justify-center rounded-2xl">
                    <Bell01 className="text-primary-500 size-5" />
                  </div>
                  <h3 className="text-h3-semibold text-foreground">
                    {t('notifications.empty.title', 'No notifications')}
                  </h3>
                  <p className="text-body-small-regular text-muted-foreground mt-2 max-w-sm">
                    {t('notifications.empty.description', 'You are caught up for this category.')}
                  </p>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
