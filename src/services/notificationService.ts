import { NOTIFICATION_ENDPOINTS } from '../constants/api';
import { NotificationResponse } from '../types/notification';
import { apiClient } from './apiClient';
import { CLIENT_BASE_URL } from './baseUrl';

const isServer = typeof window === 'undefined';

type NotificationQueryParams = {
  take?: number;
  skip?: number;
  isRead?: boolean;
  category?: number;
};

export const getNotifications = async (
  params: NotificationQueryParams = {},
  accessToken?: string,
): Promise<NotificationResponse> => {
  // console.log('[notificationService:getNotifications] start', {
  //   hasAccessToken: Boolean(accessToken),
  //   isServer,
  //   params,
  // });

  if (isServer) {
    if (typeof params.isRead !== 'boolean') {
      throw new Error('Server-side notification fetch requires an explicit isRead filter.');
    }

    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
    return apiClient.get<NotificationResponse>(
      NOTIFICATION_ENDPOINTS.LIST,
      params,
      { headers, skipAuth: !accessToken },
      true,
    );
  }

  return apiClient.get<NotificationResponse>('/api/notifications', params, {
    baseUrl: CLIENT_BASE_URL,
    skipAuth: false,
  });
};

/**
 * Mark all notifications as read.
 */
export const readAllNotifications = async (accessToken?: string) => {
  if (isServer) {
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
    return apiClient.patch<{ success: boolean }>(
      NOTIFICATION_ENDPOINTS.READ_ALL,
      {},
      { headers, skipAuth: !accessToken },
    );
  }

  return apiClient.patch<{ success: boolean }>(
    '/api/notifications/read-all',
    {},
    { baseUrl: CLIENT_BASE_URL },
  );
};

/**
 * Mark a single notification as read.
 */
export const readNotification = async (
  id: string,
  accessToken?: string,
): Promise<{ success: boolean }> => {
  try {
    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

      return await apiClient.patch<{ success: boolean }>(
        NOTIFICATION_ENDPOINTS.READ(id),
        {},
        { headers, skipAuth: !accessToken },
      );
    }

    return await apiClient.patch<{ success: boolean }>(
      `/api/notifications/${id}/read`,
      {},
      { baseUrl: CLIENT_BASE_URL },
    );
  } catch (error) {
    console.error(`Error reading notification ${id}:`, error);
    throw error;
  }
};

export const getUnreadCount = async (accessToken?: string) => {
  if (isServer) {
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
    return apiClient.get<{ unreadCount: number }>(
      NOTIFICATION_ENDPOINTS.UNREAD,
      {},
      { headers, skipAuth: !accessToken },
    );
  }
  return apiClient.get<{ unreadCount: number }>(
    '/api/notifications/unread-count',
    {},
    { baseUrl: CLIENT_BASE_URL },
  );
};
