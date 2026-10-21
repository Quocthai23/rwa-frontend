import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));
vi.mock('@/services/apiClient', () => ({ apiClient: client }));
vi.mock('@/app/api/_utils/auth', () => ({
  withServerTokenRefresh: async (_request: unknown, call: (token: string) => Promise<unknown>) =>
    NextResponse.json({ data: await call('test-token') }),
}));
import { GET, POST, PATCH } from './[...path]/route';
const context = (path: string) => ({ params: Promise.resolve({ path: path.split('/') }) });
beforeEach(() => {
  vi.clearAllMocks();
  client.get.mockResolvedValue({});
  client.post.mockResolvedValue({});
  client.patch.mockResolvedValue({});
});
describe('explicit Demo BFF namespace', () => {
  it('does not proxy real payment endpoints', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/demo-trading/payment/withdraw', {
        method: 'POST',
        body: JSON.stringify({ accountId: 'demo' }),
      }),
      context('payment/withdraw'),
    );
    expect(response.status).toBe(404);
    expect(client.post).not.toHaveBeenCalled();
  });
  it('forwards only the demo header and preserves the account ID', async () => {
    await POST(
      new NextRequest('http://localhost/api/demo-trading/orders', {
        method: 'POST',
        body: JSON.stringify({
          accountId: 'demo',
          assetId: 'asset',
          side: 'BUY',
          type: 'MARKET',
          quantity: '1',
        }),
      }),
      context('orders'),
    );
    expect(client.post).toHaveBeenCalledWith(
      '/demo-trading/orders',
      expect.objectContaining({ accountId: 'demo' }),
      expect.objectContaining({ headers: expect.objectContaining({ 'x-trading-mode': 'demo' }) }),
    );
  });
  it('rejects conflicting body/query account IDs', async () => {
    const response = await PATCH(
      new NextRequest(
        'http://localhost/api/demo-trading/orders/00000000-0000-4000-8000-000000000000?accountId=live',
        { method: 'PATCH', body: JSON.stringify({ accountId: 'demo', cancel: true }) },
      ),
      context('orders/00000000-0000-4000-8000-000000000000'),
    );
    expect(response.status).toBe(400);
    expect(client.patch).not.toHaveBeenCalled();
  });
  it('keeps overview objects unwrapped and order lists paginated', async () => {
    await GET(
      new NextRequest('http://localhost/api/demo-trading/portfolio/overview?accountId=demo'),
      context('portfolio/overview'),
    );
    expect(client.get.mock.calls[0][3]).toBe(false);
    await GET(
      new NextRequest('http://localhost/api/demo-trading/orders?accountId=demo'),
      context('orders'),
    );
    expect(client.get.mock.calls[1][3]).toBe(true);
  });
});
