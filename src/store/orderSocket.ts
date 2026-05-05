import { queryClient } from '@/app/provider';
import { SOCKET_CHART_URL } from '@/constants/env';
import { OrderItem } from '@/types/orders';
import { Position } from '@/types/position';
import { sortArray } from '@/utils/insertSorted';
import { io, type Socket } from 'socket.io-client';

const WS_TICKET_ENDPOINT = '/api/ws-ticket';

const RECONNECT_BASE_MS = 8_000;
const RECONNECT_MAX_MS = 30_000;

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

function tradingNamespaceUrl(): string | null {
  const base = SOCKET_CHART_URL?.replace(/\/$/, '').trim();
  return base ? `${base}/trading` : null;
}

class OrderSocketService {
  private socket: Socket | null = null;
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
    if (this.socket && this.currentAccountId !== accountId) {
      this.intentionalClose = true;
      this.cleanup();
    }
    if (this.socket) return;
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
    void this.openSocket();
    this.startBrowserListeners();
  }

  /** Tear down completely (call on logout) */
  disconnect() {
    this.intentionalClose = true;
    this.cleanup();
    this.stopBrowserListeners();
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /** Subscribe to incoming messages. Returns unsubscribe fn. */
  onMessage(listener: Listener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  // ─── Private ──────────────────────────────────────────────

  private dispatchLegacyWsMessage(message: { type?: string; data?: unknown }) {
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
        const inner = message.data as Record<string, unknown> | undefined;
        if (inner) {
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
  }

  private async openSocket() {
    const namespaceUrl = tradingNamespaceUrl();
    if (!namespaceUrl || typeof window === 'undefined') {
      console.warn('[OrderSocket] ⚠️ NEXT_PUBLIC_SOCKET_CHART_URL missing or SSR — skip connect');
      return;
    }

    const ticket = await this.getWsTicket();
    if (!ticket) {
      console.warn(
        '[OrderSocket] ⚠️ No ticket from /api/ws-ticket — connecting with cookies only (if server allows)',
      );
    }

    const auth: Record<string, string> = {};
    if (ticket) auth.ticket = ticket;
    if (this.currentAccountId) auth.accountId = this.currentAccountId;

    const socket = io(namespaceUrl, {
      auth,
      reconnection: false,
      transports: ['polling', 'websocket'],
      withCredentials: true,
    });

    socket.on('connect', () => {
      this.reconnectAttempt = 0;
      this.wasConnected = true;
    });

    socket.on('connect_error', (err) => {
      console.error('[OrderSocket] ❌ connect_error:', err?.message ?? err);
      socket.removeAllListeners();
      socket.disconnect();
      if (this.socket === socket) {
        this.socket = null;
      }
      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }
    });

    socket.on('disconnect', (reason) => {
      this.socket = null;
      if (!this.intentionalClose) {
        const soon = reason === 'io server disconnect' ? 1_000 : undefined;
        this.scheduleReconnect(soon);
      }
    });

    socket.onAny((eventName, ...args) => {
      const raw = args[0];

      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw) as { type?: string; data?: unknown };
          if (parsed?.type?.startsWith('ws:')) {
            this.dispatchLegacyWsMessage(parsed);
          }
        } catch {
          // not JSON
        }
      } else if (raw && typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        if (typeof obj.type === 'string' && obj.type.startsWith('ws:')) {
          this.dispatchLegacyWsMessage(obj as { type: string; data?: unknown });
        }
      }

      if (eventName === 'my_order_matched') {
        this.dispatchLegacyWsMessage({ type: 'ws:order:updated', data: raw });
      }

      for (const listener of this.listeners) {
        try {
          listener(eventName, raw);
        } catch {
          // swallow listener errors
        }
      }
    });

    this.socket = socket;
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
    } catch {
      return undefined;
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
      if (!this.intentionalClose) {
        this.cleanup();
        void this.openSocket();
      }
    }, delay);
  }

  private cleanup() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // ─── Browser listeners ───────────────────────────────────

  private startBrowserListeners() {
    this.stopBrowserListeners();

    if (typeof window === 'undefined') return;

    this.handleWindowFocus = () => {
      if (!this.socket?.connected) {
        this.cleanup();
        void this.openSocket();
      }
    };

    this.handleWindowOnline = () => {
      if (!this.isConnected && this.wasConnected) {
        this.cleanup();
        void this.openSocket();
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
