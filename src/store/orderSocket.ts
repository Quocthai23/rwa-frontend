/**
 * DEPRECATED: orderSocket.ts (v1, class-based)
 * 
 * This module is deprecated and scheduled for removal.
 * Use @/store/orderSocketStore (useOrderSocketStore) instead.
 * 
 * The new orderSocketStore uses Zustand pattern for consistency
 * with the rest of the application architecture.
 * 
 * MIGRATION GUIDE:
 * ❌ OLD: import { orderSocketService } from '@/store/orderSocket'
 *        orderSocketService.connect(accountId)
 * 
 * ✅ NEW: import { useOrderSocketStore } from '@/store/orderSocketStore'
 *        const store = useOrderSocketStore.getState()
 *        store.connect()
 *        store.subscribeAccount(accountId)
 */

console.warn(
  '[DEPRECATED] orderSocket.ts (class-based) is deprecated. Use orderSocketStore instead. ' +
  'See /memories/repo/REFACTORING_LOG.md for migration guide.',
);

// For compatibility during transition
export { useOrderSocketStore as orderSocketService } from './orderSocketStore';
