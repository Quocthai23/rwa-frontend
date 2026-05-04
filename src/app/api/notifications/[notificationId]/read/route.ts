import { NextRequest, NextResponse } from 'next/server';

import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { readNotification } from '@/services/notificationService';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> },
) {
  const { notificationId } = await params;

  return withServerTokenRefresh(
    request,
    (token) => readNotification(notificationId, token),
    'notification-read-failed',
    (data) => NextResponse.json(data, { status: 200 }),
  );
}
