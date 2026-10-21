import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/services/apiClient';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';
type Context = { params: Promise<{ path: string[] }> };
async function proxy(request: NextRequest, context: Context) {
  const { path } = await context.params;
  const route = path.join('/');
  const allowed =
    request.method === 'GET'
      ? ['balance', 'orders', 'portfolio/overview', 'portfolio/items', 'history'].includes(route)
      : request.method === 'POST'
        ? ['orders', 'bulk-cancel', 'reset'].includes(route)
        : request.method === 'PATCH' && /^orders\/[a-f0-9-]{36}$/.test(route);
  if (!allowed) return NextResponse.json({ message: 'demo-route-not-found' }, { status: 404 });
  const endpoint = '/demo-trading/' + route;
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  let body: Record<string, unknown> | undefined;
  if (request.method !== 'GET') {
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body))
      return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
    if (body.accountId && query.accountId && body.accountId !== query.accountId)
      return NextResponse.json({ message: 'trading-account-mismatch' }, { status: 400 });
    body.accountId = body.accountId ?? query.accountId;
  }
  return withServerTokenRefresh(
    request,
    (token) => {
      const options = {
        headers: {
          Authorization: token.startsWith('Bearer ') ? token : 'Bearer ' + token,
          'x-trading-mode': 'demo',
        },
      };
      if (request.method === 'GET')
        return apiClient.get(
          endpoint,
          query,
          options,
          ['orders', 'portfolio/items', 'history'].includes(route),
        );
      if (request.method === 'PATCH') return apiClient.patch(endpoint, body as never, options);
      return apiClient.post(endpoint, body as never, options);
    },
    'demo-request-failed',
  );
}
export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
