import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
type TestEvent = Record<string, unknown> & { waitUntil: (promise: Promise<unknown>) => void };
const source = readFileSync('public/sw.js', 'utf8');
function setup(session = 'owner') {
  const handlers = new Map<string, (event: TestEvent) => void>(),
    show = vi.fn().mockResolvedValue(undefined),
    navigate = vi.fn().mockResolvedValue(undefined),
    focus = vi.fn().mockResolvedValue(undefined);
  const fetch = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ data: { id: session } }) });
  runInNewContext(source, {
    URL,
    fetch,
    self: {
      location: { origin: 'https://mtx.example' },
      registration: { showNotification: show },
      clients: {
        claim: vi.fn(),
        matchAll: async () => [{ url: 'https://mtx.example/home', navigate, focus }],
        openWindow: vi.fn(),
      },
      skipWaiting: vi.fn(),
      addEventListener: (name: string, call: (event: TestEvent) => void) =>
        handlers.set(name, call),
    },
  });
  return { handlers, show, fetch, navigate, focus };
}
async function dispatch(handler: ((event: TestEvent) => void) | undefined, data: Record<string, unknown>) {
  let task: Promise<unknown> | undefined;
  handler?.({
    ...data,
    waitUntil: (promise: Promise<unknown>) => {
      task = promise;
    },
  });
  await task;
}
describe('push notification account isolation', () => {
  it('shows the event title and a safe destination for the authenticated recipient', async () => {
    const s = setup();
    await dispatch(s.handlers.get('push'), {
      data: {
        json: () => ({
          id: 'event',
          userId: 'owner',
          title: 'Deposit completed',
          body: 'Open the app',
          url: '/transaction-history',
        }),
      },
    });
    expect(s.show).toHaveBeenCalledWith(
      'Deposit completed',
      expect.objectContaining({
        data: expect.objectContaining({ url: '/transaction-history', userId: 'owner' }),
      }),
    );
  });
  it('hides another account’s event details while keeping push user-visible', async () => {
    const s = setup('different-user');
    await dispatch(s.handlers.get('push'), {
      data: {
        json: () => ({
          id: 'secret',
          userId: 'owner',
          title: 'Private transfer',
          body: 'Sensitive amount',
          url: '/transaction-history',
        }),
      },
    });
    expect(s.show).toHaveBeenCalledWith(
      'MTX',
      expect.objectContaining({
        body: 'Open MTX to view your notifications.',
        data: { id: null, userId: null, url: '/notifications' },
      }),
    );
    expect(JSON.stringify(s.show.mock.calls)).not.toContain('Sensitive amount');
  });
  it('replaces external push links with the inbox', async () => {
    const s = setup();
    await dispatch(s.handlers.get('push'), {
      data: {
        json: () => ({ id: 'event', userId: 'owner', title: 'MTX', url: '//outside.example' }),
      },
    });
    expect(s.show.mock.calls[0][1].data.url).toBe('/notifications');
  });
  it('marks only the clicked event as read and opens its internal destination', async () => {
    const s = setup();
    await dispatch(s.handlers.get('notificationclick'), {
      notification: {
        close: vi.fn(),
        data: { id: 'event', userId: 'owner', url: '/notifications' },
      },
    });
    expect(s.fetch).toHaveBeenCalledWith(
      '/api/notifications/event/read',
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(s.navigate).toHaveBeenCalledWith('https://mtx.example/notifications');
  });
});
