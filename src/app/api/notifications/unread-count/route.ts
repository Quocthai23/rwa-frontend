import { NextRequest, NextResponse } from 'next/server';

import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { getUnreadCount } from '@/services/notificationService';

export async function GET(request: NextRequest) {
  return withServerTokenRefresh(
    request,
    (token) => getUnreadCount(token),
    'notification-unread-count-failed',
    (data) => NextResponse.json(data, { status: 200 }),
  );
}
