'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { mapApiNotificationToItem } from '@/components/featured/notification/components/notification.types';
import {
  getNotifications,
  getUnreadCount,
  readAllNotifications,
  readNotification,
} from '@/services/notificationService';
import { useAuthStore } from '@/store/authStore';

const NOTIFICATIONS_QUERY_KEY = ['notifications'] as const;
const NOTIFICATIONS_UNREAD_QUERY_KEY = ['notifications-unread'] as const;
type NotificationsQueryData = {
  notifications: Array<{ id: string; read: boolean }>;
  total: number;
  unreadTotal: number;
};
type UseNotificationsParams = {
  category?: number;
  isRead?: boolean;
  skip?: number;
  take?: number;
};

const parseUnreadCount = (value: unknown): number | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const unreadCount = (value as { unreadCount?: unknown }).unreadCount;
  return typeof unreadCount === 'number' ? unreadCount : undefined;
};

const toErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Unexpected error';
};

export const useNotifications = (params?: UseNotificationsParams) => {
  const userId = useAuthStore((state) => state.user?.id);

  return useQuery({
    enabled: Boolean(userId),
    queryFn: async () => {
      const [response, unreadCountResult] = await Promise.allSettled([
        getNotifications(params),
        getUnreadCount(),
      ]);

      if (response.status !== 'fulfilled') {
        throw response.reason;
      }

      const notifications = response.value.data.map(mapApiNotificationToItem);
      const unreadTotalFromEndpoint =
        unreadCountResult.status === 'fulfilled'
          ? parseUnreadCount(unreadCountResult.value)
          : undefined;

      return {
        notifications,
        total: response.value.total,
        unreadTotal: unreadTotalFromEndpoint ?? notifications.filter((item) => !item.read).length,
      };
    },
    queryKey: [...NOTIFICATIONS_QUERY_KEY, userId, params ?? {}],
    placeholderData: (previousData) => previousData,
    staleTime: 30_000,
  });
};

export const useReadAllNotifications = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => readAllNotifications(),
    onMutate: async () => {
      queryClient.setQueriesData<NotificationsQueryData>(
        { queryKey: NOTIFICATIONS_QUERY_KEY },
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            notifications: current.notifications.map((item) => ({ ...item, read: true })),
            unreadTotal: 0,
          };
        },
      );
      queryClient.setQueriesData<number>({ queryKey: NOTIFICATIONS_UNREAD_QUERY_KEY }, () => 0);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_UNREAD_QUERY_KEY });
    },
  });
};

export const useReadNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => readNotification(notificationId),
    onMutate: async (notificationId: string) => {
      let didChangeUnread = false;

      queryClient.setQueriesData<NotificationsQueryData>(
        { queryKey: NOTIFICATIONS_QUERY_KEY },
        (current) => {
          if (!current) {
            return current;
          }

          const target = current.notifications.find((item) => item.id === notificationId);
          if (!target || target.read) {
            return current;
          }

          didChangeUnread = true;

          return {
            ...current,
            notifications: current.notifications.map((item) =>
              item.id === notificationId ? { ...item, read: true } : item,
            ),
            unreadTotal: Math.max(0, current.unreadTotal - 1),
          };
        },
      );

      if (didChangeUnread) {
        queryClient.setQueriesData<number>(
          { queryKey: NOTIFICATIONS_UNREAD_QUERY_KEY },
          (current) => (typeof current === 'number' ? Math.max(0, current - 1) : current),
        );
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_UNREAD_QUERY_KEY });
    },
  });
};

export const useUnreadNotificationCount = () => {
  const userId = useAuthStore((state) => state.user?.id);

  return useQuery({
    enabled: Boolean(userId),
    queryFn: async () => {
      const response = await getUnreadCount();
      return parseUnreadCount(response) ?? 0;
    },
    queryKey: [...NOTIFICATIONS_UNREAD_QUERY_KEY, userId],
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
};

export const getNotificationErrorMessage = toErrorMessage;
