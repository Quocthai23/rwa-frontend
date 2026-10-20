'use client';

import { Bell01, CheckCircle, ChevronLeft, Settings01 } from '@untitledui/icons';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import NotificationCard from '@/components/featured/notification/components/NotificationCard';
import {
  NOTIFICATION_TABS,
  type NotificationItem,
  type NotificationTabId,
} from '@/components/featured/notification/components/notification.types';
import {
  getNotificationErrorMessage,
  useNotifications,
  useReadAllNotifications,
  useReadNotification,
} from '@/hook/useNotifications';

export default function NotificationAppScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [requestedTake, setRequestedTake] = useState(20);
  const [activeTab, setActiveTab] = useState<NotificationTabId>('all');
  const [actionOnly, setActionOnly] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, error, isError, isLoading, isFetching, refetch } = useNotifications({
    category: activeTab === 'all' ? undefined : activeTab,
    isRead: unreadOnly ? false : undefined,
    requiresAction: actionOnly ? true : undefined,
    skip: 0,
    take: requestedTake,
  });
  const readAllMutation = useReadAllNotifications();
  const readMutation = useReadNotification();
  const notifications = useMemo(() => data?.notifications ?? [], [data?.notifications]);

  const unreadTotal = data?.unreadTotal ?? notifications.filter((item) => !item.read).length;
  const hasMore = notifications.length < (data?.total ?? notifications.length);

  const filteredNotifications = notifications;

  const unreadCount =
    activeTab === 'all' ? unreadTotal : (data?.unreadByCategory?.[activeTab] ?? 0);

  const handleMarkAllAsRead = () => {
    if (unreadTotal === 0 || readAllMutation.isPending) {
      return;
    }

    readAllMutation.mutate();
  };

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.read && !readMutation.isPending) {
      readMutation.mutate(item.id);
    }

    if (item.targetUrl) {
      router.push(item.targetUrl);
    }
  };

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <header className="border-border/70 bg-background/95 sticky top-0 z-20 border-b backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <button
            type="button"
            aria-label={t('common.back', 'Back')}
            onClick={() => router.back()}
            className="hover:bg-muted flex size-10 items-center justify-center rounded-full transition-colors"
          >
            <ChevronLeft size={22} />
          </button>

          <div className="min-w-0 flex-1 text-center">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-h3-semibold truncate">
                {t('notifications.title', 'Notifications')}
              </h1>
            </div>
            <p className="text-body-small-regular text-muted-foreground mt-1 truncate">
              {t('notifications.summary', '{{items}} items, {{unread}} unread', {
                items: data?.total ?? 0,
                unread: unreadCount,
              })}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label={t('notificationSettings.title')}
              onClick={() => router.push('/notifications/settings')}
              className="hover:bg-muted flex size-10 items-center justify-center rounded-full"
            >
              <Settings01 size={21} />
            </button>
            <button
              type="button"
              aria-label={t('notifications.markAllAsRead', 'Mark all as read')}
              onClick={handleMarkAllAsRead}
              className="hover:bg-muted flex size-10 items-center justify-center rounded-full transition-colors"
              disabled={readAllMutation.isPending || unreadTotal === 0}
            >
              <CheckCircle size={22} />
            </button>
          </div>
        </div>
      </header>

      <main className="relative flex-1 overflow-hidden pb-12">
        <div className="absolute inset-x-0 top-0 h-44" />

        <div className="relative space-y-4 px-4 py-4 pb-6">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={actionOnly}
                  onChange={(e) => {
                    setRequestedTake(20);
                    setActionOnly(e.target.checked);
                  }}
                />
                {t('notifications.actionOnly', 'Needs action')}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={unreadOnly}
                  onChange={(event) => {
                    setRequestedTake(20);
                    setUnreadOnly(event.target.checked);
                  }}
                />
                {t('notifications.onlyUnread', 'Only show unread')}
              </label>
            </div>
            <div className="scrollbar-neutral-slim flex gap-2 overflow-x-auto pb-1">
              {NOTIFICATION_TABS.map((tab) => {
                const isActive = tab.id === activeTab;
                const count =
                  tab.id === 'all' ? unreadTotal : (data?.unreadByCategory?.[tab.id] ?? 0);

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setRequestedTake(20);
                      setActiveTab(tab.id);
                    }}
                    className={`text-body-large-semibold inline-flex items-center gap-2 border-b-2 px-4 py-2 whitespace-nowrap transition-colors ${
                      isActive ? 'border-primary-500' : 'hover:border-border border-transparent'
                    }`}
                  >
                    <span className={isActive ? 'text-primary-500' : 'text-foreground'}>
                      {t(tab.labelKey, tab.labelDefault)}
                    </span>
                    <span
                      className={`text-caption-medium inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 ${
                        isActive
                          ? 'bg-primary-500 text-white'
                          : 'bg-background border-border text-foreground border'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div>
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
                  <button
                    type="button"
                    onClick={() => void refetch()}
                    className="bg-primary-500 text-body-small-semibold mt-4 rounded-full px-4 py-2 text-white"
                  >
                    {t('common.retry', 'Retry')}
                  </button>
                </div>
              ) : filteredNotifications.length > 0 ? (
                filteredNotifications.map((item) => (
                  <NotificationCard
                    key={item.id}
                    item={item}
                    onClick={() => handleNotificationClick(item)}
                  />
                ))
              ) : (
                <div className="bg-background flex min-h-72 flex-col items-center justify-center px-6 py-10 text-center">
                  <div className="bg-primary-500/10 mb-4 flex size-14 items-center justify-center rounded-2xl">
                    <Bell01 className="text-primary-500 size-6" />
                  </div>
                  <h3 className="text-h3-semibold text-foreground">
                    {hasMore
                      ? t('notifications.loadedEmptyTitle')
                      : t('notifications.empty.title', 'No notifications')}
                  </h3>
                  <p className="text-body-small-regular text-muted-foreground mt-2 max-w-sm">
                    {hasMore
                      ? t('notifications.loadedEmptyDescription')
                      : t(
                          'notifications.empty.description',
                          'You are caught up for this category.',
                        )}
                  </p>
                </div>
              )}
            </div>
            {hasMore && !isError && (
              <button
                type="button"
                disabled={isFetching}
                onClick={() => setRequestedTake((take) => take + 20)}
                className="border-border bg-background hover:bg-muted w-full rounded-lg border px-4 py-3 text-sm font-medium disabled:opacity-50"
              >
                {isFetching ? t('common.loading') : t('common.loadMore')}
              </button>
            )}
            {(readAllMutation.isError || readMutation.isError) && (
              <p role="alert" className="px-3 text-sm text-red-600 dark:text-red-400">
                {t('apiErrors.generic')}
              </p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
