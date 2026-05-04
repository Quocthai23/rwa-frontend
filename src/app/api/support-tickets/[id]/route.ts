import { NextRequest, NextResponse } from 'next/server';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { supportApi } from '@/services/supportService';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  return withServerTokenRefresh(
    request,
    (token) => supportApi.getTicketById(id, token),
    'support-detail-failed',
    (data) => NextResponse.json({ data, success: true }, { status: 200 }),
  );
}
