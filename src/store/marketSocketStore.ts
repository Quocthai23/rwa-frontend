/**
 * DEPRECATED: marketSocketStore.ts (v1)
 * 
 * This module is deprecated and scheduled for removal.
 * Use @/store/realtimeStore (useRealtimeStore) instead.
 * 
 * For automatic backward compatibility, this re-exports from the new unified store.
 * 
 * MIGRATION GUIDE:
 * ❌ OLD: import { useMarketSocketStore } from '@/store/marketSocketStore'
 * ✅ NEW: import { useRealtimeStore } from '@/store/realtimeStore'
 */

console.warn(
  '[DEPRECATED] marketSocketStore.ts is deprecated. Use realtimeStore instead. ' +
  'See migration guide in import path.',
);

export { useRealtimeStore as useMarketSocketStore } from './realtimeStore';
export type { RT as TickerMessage } from './realtimeStore';
