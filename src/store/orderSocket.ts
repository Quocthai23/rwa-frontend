import { queryClient } from '@/app/provider';
import { WS_ORDER_URL } from '@/constants/env';
import { OrderItem } from '@/types/orders';
import { Position } from '@/types/position';
import { sortArray } from '@/utils/insertSorted';

const WS_URL = WS_ORDER_URL;
const WS_TICKET_ENDPOINT = '/api/ws-ticket';

const PING_INTERVAL_MS = 10_000; // send ping every 25s
const PONG_TIMEOUT_MS = 10_000; // expect pong within 10s
const RECONNECT_BASE_MS = 8_000;
const RECONNECT_MAX_MS = 30_000;
const AUTH_RETRY_CLOSE_CODES = new Set([1008, 4401, 4403]);

type Listener = (type: string, data: unknown) => void;
type SortDirection = 'asc' | 'desc' | null;

function debounce(fn: (...args: any[]) => void, delay: number) {
  let timeout: any;

  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

function updateInfiniteCacheLocally<T extends Position | OrderItem>(
  queryKeyPrefix: 'infinite-positions' | 'infinite-orders',
  newItem: T,
) {
  const caches = queryClient.getQueriesData({ queryKey: [queryKeyPrefix, 'active'] });
  if (caches.length === 0) {
    return;
  }

  const scopeIndex = 1;
  const accountIndex = 2;
  const statusIndex = queryKeyPrefix === 'infinite-positions' ? 5 : 6;
  const itemAccountId =
    typeof (newItem as { accountId?: unknown })?.accountId === 'string'
      ? ((newItem as { accountId?: string }).accountId ?? undefined)
      : undefined;

  for (const [cacheKey] of caches) {
    const keyArray = Array.isArray(cacheKey) ? cacheKey : [];
    const cacheScope =
      typeof keyArray[scopeIndex] === 'string' ? (keyArray[scopeIndex] as string) : undefined;
    const cacheAccountId =
      typeof keyArray[accountIndex] === 'string' && keyArray[accountIndex]
        ? (keyArray[accountIndex] as string)
        : undefined;
    const rawStatus = keyArray[statusIndex] as unknown;
    const statusArray = Array.isArray(rawStatus)
      ? rawStatus
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value >= 0)
      : null;

    const isActiveScope = cacheScope === 'active' || cacheScope === undefined;
    const isActiveCache = statusArray ? statusArray.includes(0) : true;
    const isSameAccount = !itemAccountId || !cacheAccountId || cacheAccountId === itemAccountId;

    if (!isActiveScope || !isActiveCache || !isSameAccount) {
      continue;
    }

    queryClient.setQueryData(cacheKey, (old: any) => {
      if (!old?.pages || !Array.isArray(old.pages)) {
        return old;
      }
      const sortBy = (keyArray[3] ?? null) as string | null;
      const sortDir = (keyArray[4] ?? null) as SortDirection;

      const allData: T[] = old.pages[0]?.data ?? [];

      const deduped = allData.filter((item) => item?.id !== newItem.id);
      const sortedData = sortArray([newItem, ...deduped], sortBy, sortDir);

      const firstPage = old.pages[0] ?? {};
      const nextCursor = firstPage?.nextCursor;
      const take = firstPage?.take;

      return {
        ...old,
        pages: [
          {
            ...firstPage,
            data: sortedData,
            nextCursor,
            take,
          },
        ],
        pageParams: Array.isArray(old.pageParams) ? [old.pageParams[0] ?? null] : old.pageParams,
      };
    });
  }
}

function insertPositionIntoCache(newPosition: Position) {
  updateInfiniteCacheLocally('infinite-positions', newPosition);
}

function insertOrderIntoCache(newOrder: OrderItem) {
  updateInfiniteCacheLocally('infinite-orders', newOrder);
}

class OrderSocketService {
  private ws: WebSocket | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private intentionalClose = false;
  private listeners = new Set<Listener>();
  private wasConnected = false;
  private handleWindowFocus: (() => void) | null = null;
  private handleWindowOnline: (() => void) | null = null;
  private currentAccountId: string | undefined = undefined;
  private invalidateStatsDebounced: ((accountId?: string) => void) | null = null;
  private refetchOrdersDebounced: (() => void) | null = null;
  private refetchPositionsDebounced: (() => void) | null = null;
  /** Start the socket (call once when user is authenticated) */
  connect(accountId?: string) {
    // If accountId changed while connected — reconnect
    if (this.ws && this.currentAccountId !== accountId) {
      this.intentionalClose = true;
      this.cleanup();
    }
    if (this.ws) return;
    this.currentAccountId = accountId;
    this.intentionalClose = false;
    this.invalidateStatsDebounced = debounce((accountId?: string) => {
      queryClient.refetchQueries({ queryKey: ['stats', accountId] });
    }, 50);

    this.refetchOrdersDebounced = debounce(() => {
      queryClient.refetchQueries({ queryKey: ['infinite-orders'], type: 'all' });
    }, 50);

    this.refetchPositionsDebounced = debounce(() => {
      queryClient.refetchQueries({ queryKey: ['infinite-positions'], type: 'all' });
    }, 50);
    this.reconnectAttempt = 0;
    this.openSocket();
    this.startBrowserListeners();
  }

  /** Tear down completely (call on logout) */
  disconnect() {
    this.intentionalClose = true;
    this.cleanup();
    this.stopBrowserListeners();
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /** Subscribe to incoming messages. Returns unsubscribe fn. */
  onMessage(listener: Listener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  // ─── Private ──────────────────────────────────────────────

  private async openSocket() {
    const ticket = await this.getWsTicket();
    if (!ticket) {
      console.warn('[OrderSocket] ⚠️ No WS ticket available - scheduling reconnect');

      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }

      return;
    }

    if (typeof window === 'undefined') {
      console.warn('[OrderSocket] ⚠️ Window unavailable – skipping connect');
      return;
    }
    const params = new URLSearchParams({ ticket });

    if (this.currentAccountId) {
      params.set('accountId', this.currentAccountId);
    }

    const url = `${WS_URL}?${params.toString()}`;

    const ws = new WebSocket(url);

    ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.wasConnected = true;
      this.startPing();
    };

    ws.onmessage = (event) => {
      const raw = typeof event.data === 'string' ? event.data : '';

      // Handle pong
      if (raw === 'pong' || raw === '{"type":"pong"}') {
        this.handlePong();

        return;
      }

      try {
        const message = JSON.parse(raw) as {
          type?: string;
          event: string;
          data?: unknown;
          timestamp?: number;
        };

        if (message.type === 'pong') {
          this.handlePong();

          return;
        }

        // If the type covers both or is unknown, invalidate both
        if (message.type?.startsWith('ws:order:') || message.type?.startsWith('ws:position:')) {
          const data = message.data as Record<string, unknown> | undefined;
          const accountId = data?.accountId as string | undefined;
          if (message.type?.startsWith('ws:order:') || message.type?.startsWith('ws:position:')) {
            this.invalidateStatsDebounced?.(accountId);
          }
          if (message.type?.includes('ws:order:created')) {
            const newOrder = message.data as OrderItem;
            if (newOrder) {
              insertOrderIntoCache(newOrder);
            }
          }
          if (message.type?.includes('ws:position:created')) {
            const data = message.data as Record<string, unknown> | undefined;
            if (data) {
              insertPositionIntoCache(message.data as Position);
            }
          }
          if (message.type?.startsWith('ws:position:updated')) {
            this.refetchPositionsDebounced?.();
          }
          if (message.type?.startsWith('ws:order:updated')) {
            this.refetchOrdersDebounced?.();
          }
          if (message.type?.startsWith('ws:position:closed')) {
            queryClient.refetchQueries({ queryKey: ['stats', accountId] });
            queryClient.refetchQueries({ queryKey: ['accounts'] });
            this.refetchPositionsDebounced?.();
          }

          if (message.type?.startsWith('ws:order:canceled')) {
            this.refetchOrdersDebounced?.();

            queryClient.refetchQueries({ queryKey: ['stats', accountId] });
          }
        }

        // Notify listeners
        for (const listener of this.listeners) {
          try {
            listener(message.type ?? 'unknown', message.data);
          } catch {
            // swallow listener errors
          }
        }
      } catch {
        console.warn('[OrderSocket] ⚠️ Non-JSON message:', raw.slice(0, 100));
      }
    };

    ws.onerror = (error) => {
      const err = error as unknown as Error & { _type?: string };

      console.error('[OrderSocket] ❌ Error event:', {
        message: err?.message,
        type: err?._type,
        readyState: ws.readyState,
      });
    };

    ws.onclose = (event) => {
      this.stopPing();
      this.ws = null;

      if (!this.intentionalClose) {
        if (this.shouldRetryAuthClose(event.code)) {
          this.scheduleReconnect(1_000);
          return;
        }

        this.scheduleReconnect();
      }
    };

    this.ws = ws;
  }

  // ─── Ticket helpers ───────────────────────────────────────

  private async getWsTicket(): Promise<string | undefined> {
    try {
      const response = await fetch(WS_TICKET_ENDPOINT, {
        body: JSON.stringify({ accountId: this.currentAccountId }),
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });

      if (!response.ok) {
        return undefined;
      }

      const payload = (await response.json()) as {
        data?: { ticket?: string };
      };

      return payload?.data?.ticket;
    } catch (error) {
      return undefined;
    }
  }

  // ─── Ping / Pong ─────────────────────────────────────────

  private startPing() {
    this.stopPing();

    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send('ping');

        // this.pongTimer = setTimeout(() => {
        //   console.warn('[OrderSocket] ⏰ Pong timeout – closing')
        //   this.ws?.close(4000, 'pong timeout')
        // }, PONG_TIMEOUT_MS)

        if (this.pongTimer) {
          clearTimeout(this.pongTimer);
        }

        this.pongTimer = setTimeout(() => {
          this.pongTimer = null;
        }, PONG_TIMEOUT_MS);
      }
    }, PING_INTERVAL_MS);
  }

  private handlePong() {
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  private stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }

    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  // ─── Reconnect ────────────────────────────────────────────

  private scheduleReconnect(delayOverrideMs?: number) {
    if (this.reconnectTimer) return;

    const delay =
      delayOverrideMs ??
      Math.min(RECONNECT_BASE_MS * Math.pow(2, this.reconnectAttempt), RECONNECT_MAX_MS);
    this.reconnectAttempt++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, delay);
  }

  private shouldRetryAuthClose(closeCode: number): boolean {
    return AUTH_RETRY_CLOSE_CODES.has(closeCode);
  }

  private cleanup() {
    this.stopPing();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  // ─── Browser listeners ───────────────────────────────────

  private startBrowserListeners() {
    this.stopBrowserListeners();

    if (typeof window === 'undefined') return;

    this.handleWindowFocus = () => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.cleanup();
        this.openSocket();
      }
    };

    this.handleWindowOnline = () => {
      if (!this.isConnected && this.wasConnected) {
        this.cleanup();
        this.openSocket();
      }
    };

    window.addEventListener('focus', this.handleWindowFocus);
    window.addEventListener('online', this.handleWindowOnline);
  }

  private stopBrowserListeners() {
    if (typeof window === 'undefined') return;

    if (this.handleWindowFocus) {
      window.removeEventListener('focus', this.handleWindowFocus);
      this.handleWindowFocus = null;
    }

    if (this.handleWindowOnline) {
      window.removeEventListener('online', this.handleWindowOnline);
      this.handleWindowOnline = null;
    }
  }
}

export const orderSocketService = new OrderSocketService();
