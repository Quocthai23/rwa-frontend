/**
 * DEPRECATED: tradingRealtimeSocketStore.ts (v1)
 * 
 * This module is deprecated and scheduled for removal.
 * Use @/store/realtimeStore (useRealtimeStore) instead.
 * 
 * The new unified realtimeStore handles BOTH:
 * - / namespace (ticker, market data)
 * - /trading namespace (order events, prices, trades, order book)
 * 
 * MIGRATION GUIDE:
 * ❌ OLD: import { useTradingRealtimeSocketStore } from '@/store/tradingRealtimeSocketStore'
 * ✅ NEW: import { useRealtimeStore } from '@/store/realtimeStore'
 */

console.warn(
  '[DEPRECATED] tradingRealtimeSocketStore.ts is deprecated. Use realtimeStore instead. ' +
  'See migration guide in import path.',
);

export { useRealtimeStore as useTradingRealtimeSocketStore } from './realtimeStore';
export type {
  TradeEvent,
  OrderBookSnapshot,
  MyOrderMatched,
  PriceUpdate,
} from './realtimeStore';
