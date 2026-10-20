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
type UseNotificationsParams = {
  category?: number | string;
  requiresAction?: boolean;
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
        unreadByCategory: response.value.unreadByCategory ?? {},
        unreadTotal: unreadTotalFromEndpoint ?? notifications.filter((item) => !item.read).length,
      };
    },
    queryKey: [...NOTIFICATIONS_QUERY_KEY, userId, params ?? {}],
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
};

export const useReadAllNotifications = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => readAllNotifications(),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_UNREAD_QUERY_KEY });
    },
  });
};

export const useReadNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => readNotification(notificationId),
    onSettled: () => {
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
