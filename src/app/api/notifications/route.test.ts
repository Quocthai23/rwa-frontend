import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ list: vi.fn(), auth: vi.fn() }));
vi.mock('@/services/notificationService', () => ({
  getNotifications: mocks.list,
  readAllNotifications: vi.fn(),
}));
vi.mock('@/app/api/_utils/auth', () => ({
  withServerTokenRefresh: async (_request: unknown, call: (token: string) => Promise<unknown>) => {
    mocks.auth();
    return Response.json(await call('server-cookie-token'));
  },
}));
import { GET } from './route';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.list.mockResolvedValue({ data: [{ id: 'notice' }], total: 240 });
});
describe('notification pagination BFF', () => {
  it('forwards server category and action filters', async () => {
    await GET(
      new NextRequest('http://localhost/api/notifications?category=finance&requiresAction=true'),
    );
    expect(mocks.list).toHaveBeenCalledWith(
      { skip: 0, take: 20, isRead: undefined, category: 'finance', requiresAction: true },
      'server-cookie-token',
    );
  });
  it('rejects unknown groups and malformed action filters', async () => {
    for (const query of ['category=unknown', 'requiresAction=yes']) {
      expect(
        (await GET(new NextRequest('http://localhost/api/notifications?' + query))).status,
      ).toBe(400);
    }
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it('passes false and deep offsets to one backend query without merging two capped lists', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/notifications?skip=120&take=20&isRead=false'),
    );
    expect(mocks.list).toHaveBeenCalledTimes(1);
    expect(mocks.list).toHaveBeenCalledWith(
      { skip: 120, take: 20, isRead: false },
      'server-cookie-token',
    );
    expect(await response.json()).toEqual({ data: [{ id: 'notice' }], total: 240 });
  });
  it('rejects malformed filters before requesting backend data', async () => {
    const response = await GET(new NextRequest('http://localhost/api/notifications?isRead=no'));
    expect(response.status).toBe(400);
    expect(mocks.list).not.toHaveBeenCalled();
  });
});
