import { NextRequest, NextResponse } from 'next/server';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { getNotifications, readAllNotifications } from '@/services/notificationService';
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const skip = Number(params.get('skip') ?? 0);
  const take = Number(params.get('take') ?? 20);
  const category = params.get('category') ?? undefined;
  const actionValue = params.get('requiresAction');
  const requiresAction = actionValue === null ? undefined : actionValue === 'true';
  const isRead = params.has('isRead') ? params.get('isRead') === 'true' : undefined;
  if (
    (category !== undefined &&
      !['0', '1', '2', 'finance', 'trading', 'asset', 'user', 'security', 'system'].includes(
        category,
      )) ||
    (actionValue !== null && !['true', 'false'].includes(actionValue)) ||
    !Number.isInteger(skip) ||
    skip < 0 ||
    !Number.isInteger(take) ||
    take < 1 ||
    take > 100 ||
    (params.has('isRead') && !['true', 'false'].includes(params.get('isRead')!))
  )
    return NextResponse.json(
      { success: false, errors: { code: 'invalid-notification-query' } },
      { status: 400 },
    );
  return withServerTokenRefresh(
    request,
    (token) =>
      getNotifications(
        {
          skip,
          take,
          isRead,
          ...(category ? { category } : {}),
          ...(requiresAction !== undefined ? { requiresAction } : {}),
        },
        token,
      ),
    'notifications-fetch-failed',
  );
}
export async function PATCH(request: NextRequest) {
  return withServerTokenRefresh(
    request,
    (token) => readAllNotifications(token),
    'notifications-read-all-failed',
  );
}
