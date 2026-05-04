import { NextRequest, NextResponse } from 'next/server';

import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { readAllNotifications } from '@/services/notificationService';

export async function PATCH(request: NextRequest) {
  return withServerTokenRefresh(
    request,
    (token) => readAllNotifications(token),
    'notification-read-all-failed',
    (data) => NextResponse.json(data, { status: 200 }),
  );
}
