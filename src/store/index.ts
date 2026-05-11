/**
 * Migration Layer / Adapter
 * 
 * Provides backward-compatible exports from old store names
 * Maps old imports to new unified stores
 * 
 * Allows gradual migration without breaking all existing components
 */

import { useRealtimeStore as useRealtimeStoreNew } from './realtimeStore';
import { useOrderSocketStore as useOrderSocketStoreNew } from './orderSocketStore';

/**
 * Backward compatible export for useMarketSocketStore
 * Old: import { useMarketSocketStore } from '@/store/marketSocketStore'
 * New: automatically routes to useRealtimeStore
 */
export const useMarketSocketStore = useRealtimeStoreNew;

/**
 * Backward compatible export for useTradingRealtimeSocketStore
 * Old: import { useTradingRealtimeSocketStore } from '@/store/tradingRealtimeSocketStore'
 * New: automatically routes to useRealtimeStore
 */
export const useTradingRealtimeSocketStore = useRealtimeStoreNew;

/**
 * New, recommended exports
 */
export const useRealtimeStore = useRealtimeStoreNew;
export const useOrderSocketStore = useOrderSocketStoreNew;
