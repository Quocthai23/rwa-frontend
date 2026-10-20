import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ io: vi.fn(), token: vi.fn(() => 'current-access-token') }));
vi.mock('socket.io-client', () => ({ io: mocks.io }));
vi.mock('@/utils/socketUrl', () => ({ getSocketBaseUrl: () => 'http://localhost:3001' }));
vi.mock('@/services/tokenStorage', () => ({ getSocketAccessToken: async () => mocks.token() }));

import { useRealtimeStore } from './realtimeStore';

function socket() {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  return {
    connected: false,
    on: vi.fn((event, handler) => handlers.set(event, handler)),
    emit: vi.fn(),
    disconnect: vi.fn(),
    fire(event: string, ...args: unknown[]) {
      handlers.get(event)?.(...args);
    },
  };
}

describe('shared realtime connections', () => {
  let market: ReturnType<typeof socket>;
  let trading: ReturnType<typeof socket>;

  beforeEach(() => {
    vi.useFakeTimers();
    market = socket();
    trading = socket();
    mocks.io.mockReset().mockReturnValueOnce(market).mockReturnValueOnce(trading);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    useRealtimeStore.getState().disconnect();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('shares connections across repeated hook calls and waits for both handshakes', () => {
    useRealtimeStore.getState().connect();
    useRealtimeStore.getState().connect();
    expect(mocks.io).toHaveBeenCalledTimes(2);
    expect(useRealtimeStore.getState().isConnected).toBe(false);
    market.connected = true;
    market.fire('connect');
    expect(useRealtimeStore.getState().isConnected).toBe(false);
    trading.connected = true;
    trading.fire('connect');
    expect(useRealtimeStore.getState().isConnected).toBe(true);
    expect(useRealtimeStore.getState().isReconnecting).toBe(false);
  });

  it('restores the exact asset subscriptions and clears errors after reconnecting', () => {
    useRealtimeStore.getState().connect();
    useRealtimeStore.getState().subscribeSymbol('TEST-01', 'asset-uuid-01');
    market.connected = true;
    trading.connected = true;
    market.fire('connect');
    trading.fire('connect');
    trading.connected = false;
    trading.fire('disconnect');
    trading.fire('connect_error', new Error('websocket error'));
    expect(useRealtimeStore.getState().isConnected).toBe(false);
    expect(useRealtimeStore.getState().connectionError).toBe('websocket error');
    trading.connected = true;
    trading.fire('connect');
    expect(trading.emit).toHaveBeenLastCalledWith('subscribe_market', { assetId: 'asset-uuid-01' });
    expect(market.emit).toHaveBeenCalledWith('subscribe', { symbols: ['TEST-01'] });
    expect(useRealtimeStore.getState().connectionError).toBeNull();
    expect(useRealtimeStore.getState().isConnected).toBe(true);
  });

  it('keeps retrying backend restarts and reads the latest authentication token', async () => {
    useRealtimeStore.getState().connect();
    for (const [, options] of mocks.io.mock.calls) {
      expect(options.transports).toEqual(['polling', 'websocket']);
      expect(options.reconnectionAttempts).toBe(Infinity);
    }
    const auth = mocks.io.mock.calls[1][1].auth;
    const callback = vi.fn();
    auth(callback);
    await Promise.resolve();
    expect(callback).toHaveBeenLastCalledWith({ token: 'current-access-token' });
    mocks.token.mockReturnValueOnce('refreshed-access-token');
    auth(callback);
    await Promise.resolve();
    expect(callback).toHaveBeenLastCalledWith({ token: 'refreshed-access-token' });
  });
});
