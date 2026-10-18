import type { NextRequest } from 'next/server';
import { apiClient } from '@/services/apiClient';
import { getAccessTokenFromRequest } from '@/app/api/_utils/auth';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: assetId } = await context.params;
  if (!assetId) {
    return Response.json({ message: 'Missing asset id' }, { status: 400 });
  }

  const accessToken = getAccessTokenFromRequest(request);
  const body = (await request.json()) as { accountId?: string };
  if (!body.accountId) {
    return Response.json({ message: 'Missing account id' }, { status: 400 });
  }
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

  const data = await apiClient.post<any>(
    `assets/${assetId}/redeem`,
    { accountId: body.accountId },
    {
      headers,
    },
  );

  return Response.json(data);
}
