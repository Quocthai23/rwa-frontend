import { NextRequest, NextResponse } from 'next/server';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { getNotifications, readAllNotifications } from '@/services/notificationService';
import type { NotificationItem } from '@/types/notification';

const latestTimestamp = (item: NotificationItem) => {
  const created = item.createdAt ? new Date(item.createdAt).getTime() : 0;
  const updated = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
  return Math.max(created, updated);
};

const sortByLatestDesc = (items: NotificationItem[]) => {
  return [...items].sort((left, right) => latestTimestamp(right) - latestTimestamp(left));
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const skip = Number(searchParams.get('skip') || 0);
  const take = Number(searchParams.get('take') || 20);
  const isReadParam = searchParams.get('isRead');
  const isRead = isReadParam !== null ? isReadParam === 'true' : undefined;

  return withServerTokenRefresh(
    request,
    async (token) => {
      if (typeof isRead === 'boolean') {
        const target = await getNotifications({ skip, take, isRead }, token);
        const unreadReference = isRead
          ? await getNotifications({ skip: 0, take: 1, isRead: false }, token)
          : target;

        // Ensure returned list is ordered by latest timestamp (createdAt | updatedAt)
        const sortedData = {
          ...target,
          data: sortByLatestDesc(target.data),
        };

        return {
          data: sortedData,
          success: true,
          unreadTotal: unreadReference.total,
        };
      }

      const aggregateTake = Math.min(Math.max(skip + take, take), 100);
      const [unread, read] = await Promise.all([
        getNotifications({ skip: 0, take: aggregateTake, isRead: false }, token),
        getNotifications({ skip: 0, take: aggregateTake, isRead: true }, token),
      ]);

      const merged = sortByLatestDesc([...unread.data, ...read.data]).slice(skip, skip + take);

      return {
        data: {
          data: merged,
          total: unread.total + read.total,
          unreadTotal: unread.total,
        },
        success: true,
      };
    },
    'notifications-fetch-failed',
    (payload) => NextResponse.json(payload, { status: 200 }),
  );
}

export async function PATCH(request: NextRequest) {
  return withServerTokenRefresh(
    request,
    (token) => readAllNotifications(token),
    'notifications-read-all-failed',
    (data) => NextResponse.json(data, { status: 200 }),
  );
}
