import { NextRequest } from 'next/server';

import { getAccessTokenFromRequest, upstreamErrorResponse } from '@/app/api/_utils/auth';
import { authApi } from '@/services/auth';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'User id is required' }), { status: 400 });
  }

  try {
    const accessToken = getAccessTokenFromRequest(request);
    const data = await authApi.getUserId(id, accessToken);
    return new Response(JSON.stringify({ data }), { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error, 'user-profile-fetch-failed');
  }
}
