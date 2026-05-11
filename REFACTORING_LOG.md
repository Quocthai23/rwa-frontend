# Trading Flow Refactoring Summary

**Date:** May 11, 2026  
**Status:** ✅ Refactoring Complete (Phase 1)  

---

## 1. Overview

Refactored trading/market data flow to follow unified architecture per [trading-chart-frontend.md](../trading-chart-frontend.md) requirements.

**Goals Achieved:**
- ✅ Consolidated duplicate price/realtime sources
- ✅ Unified WebSocket handling (default namespace + /trading namespace)
- ✅ Migrated from class-based to Zustand pattern
- ✅ Extracted centralized calculation logic
- ✅ Simplified order submission interface (18+ params → single context object)
- ✅ Created backward-compatible migration layer

---

## 2. Architecture Changes

### Before (Fragmented)

```
market ticker data:           trading events:
  /  namespace                  /trading namespace
    ↓                             ↓
marketSocketStore         tradingRealtimeSocketStore
    ↓                             ↓
useMarketSocketStore()   useTradingRealtimeSocketStore()
    ↓                             ↓
component uses        +    component uses
  ❌ Two price sources
  ❌ Inconsistent patterns
```

### After (Unified)

```
  / namespace  +  /trading namespace
         ↓              ↓
    [Combined]
         ↓
    realtimeStore (Zustand)
      ├─ rtBySymbol (ticker from /)
      ├─ pricesBySymbol (trading /trading)
      ├─ orderBooks, lastTrades
      ├─ getCurrentPrice() helper
      └─ Single source of truth

  /trading namespace (orders)
         ↓
    orderSocketStore (Zustand - refactored from class)
      ├─ my_order_matched events
      ├─ Account subscriptions
      └─ Clean Zustand interface
```

---

## 3. Files Created

| File | Purpose | Size |
|------|---------|------|
| `src/store/realtimeStore.ts` | Unified realtime data (NEW) | 280 LOC |
| `src/store/orderSocketStore.ts` | Refactored order socket (REFACTORED) | 180 LOC |
| `src/utils/tradingCalculations.ts` | Centralized calculations (EXTRACTED) | 350 LOC |
| `src/utils/orderSubmissionManager.ts` | Simplified order logic (NEW) | 320 LOC |
| `src/store/index.ts` | Migration layer (NEW) | 20 LOC |

---

## 4. Files Deprecated

| File | Replacement | Status |
|------|-------------|--------|
| `src/store/marketSocketStore.ts` | realtimeStore | Re-exports (compatible) |
| `src/store/tradingRealtimeSocketStore.ts` | realtimeStore | Re-exports (compatible) |
| `src/store/orderSocket.ts` | orderSocketStore | Re-exports (compatible) |

All deprecated files now:
- ⚠️ Log deprecation warning to console
- ✅ Re-export from new stores for backward compatibility
- 📋 Point to migration guide in logs

---

## 5. Store Migration Map

### Price/Market Data

**OLD:** `useMarketSocketStore` (market ticker only)  
```typescript
const { rtBySymbol } = useMarketSocketStore()
// rtBySymbol[symbol].bid / .ask / .lastPrice
```

**NEW:** `useRealtimeStore` (unified)  
```typescript
const { rtBySymbol, pricesBySymbol, getCurrentPrice } = useRealtimeStore()
// Prefers /trading namespace prices, fallback to ticker
const price = getCurrentPrice(symbol)
```

### Trading Events

**OLD:** `useTradingRealtimeSocketStore` (complex callback pattern)  
```typescript
const { onTradeMatched, onPriceUpdate } = useTradingRealtimeSocketStore()
```

**NEW:** `useRealtimeStore` (unified, simpler)  
```typescript
const { orderBooks, lastTrades, pricesBySymbol } = useRealtimeStore()
```

### Order Events

**OLD:** `orderSocketService` (class-based)  
```typescript
orderSocketService.connect(accountId)
orderSocketService.onMessage(listener)
```

**NEW:** `useOrderSocketStore` (Zustand)  
```typescript
const store = useOrderSocketStore()
store.connect()
store.subscribeAccount(accountId)
```

---

## 6. Hook Updates

| Hook | Change | Migration |
|------|--------|-----------|
| `useTradingRealtimeSocket()` | Now returns unified store data | Auto-subscribe to symbols |
| `useSymbols()` | Updated to call new store methods | Backward compatible |
| `useAccountSummaryMetrics()` | Uses `useRealtimeStore` | Direct drop-in |

---

## 7. Logic Extraction - Calculations

### New Package: `src/utils/tradingCalculations.ts`

Centralized all trade math:

| Function | Purpose |
|----------|---------|
| `validatePrice()` | Tick size + bounds checks |
| `validateAmount()` | Min/max/step validation |
| `checkBalance()` | Sufficient balance check |
| `estimateFee()` | Fee calculation |
| `validateStopPrice()` | Stop order validation |
| `validateTakeProfit()` | TP validation |
| `validateStopLoss()` | SL validation |
| `calculateMaxAmount()` | Max tradeable amount |
| `calculateQuickAmounts()` | Quick % calculations |

**Before:** Logic scattered across:
- `tradePanelSubmitOrder.ts` (18+ params)
- `position.calculations.ts` (margin/PnL)
- `tradePanelInputHelpers.ts` (scattered validation)

**After:** Single source, well-organized, reusable across components

---

## 8. Order Submission Refactoring

### New Module: `src/utils/orderSubmissionManager.ts`

**Problem:** `submitTradePanelOrder()` had 18+ parameters

```typescript
// ❌ OLD: 18+ params nightmare
submitTradePanelOrder(
  sideOverride,
  user, router, canTrade, showError, showSuccess, t,
  symbolAsset, isCreatingOrder, submitLockRef, quantity,
  volumeStepNum, minTradeSize, maxTradeSize, setQuantity,
  activeTab, transactionType, buyTpSlError, sellTpSlError,
  leverage, symbol, selectedAccountId, sellPrice, buyPrice,
  calculatedAvailableBalance, contractSizeNumber, rtBySymbol,
  limitPrice, rt, takeProfitTriggerType, stopLossTriggerType,
  takeProfitValue, stopLossValue, symbolAssetForConvert,
  createOrder, refetchPositions, refetchOrders, tradePanelRef,
  setIsSubmitLocked
)
```

**Solution:** Context object + validation pipeline

```typescript
// ✅ NEW: Clean, maintainable
const context: OrderSubmissionContext = {
  accountId, userId, symbol,
  lastPrice, bid, ask,
  availableBalance, position,
  rules, feeRate,
  form: { price, amount, orderType, side, stopPrice, ... },
  onSuccess, onError, onConfirmation
}

const result = await submitOrder(context)
```

**Benefits:**
- ✅ Self-documenting
- ✅ Easy to extend
- ✅ Type-safe
- ✅ Testable validation pipeline

---

## 9. Provider Initialization (Updated)

**File:** `src/app/provider.tsx`

**Changes:**
- ❌ Removed: `orderSocketService.connect()`
- ✅ Added: `useRealtimeStore.getState().connect()` (global)
- ✅ Added: `useOrderSocketStore.getState().connect()` (per-account)

**Flow:**
1. App boots → Realtime store connects (market + trading sockets)
2. Account selected → Order socket subscribes to account
3. Account logout → Order socket unsubscribes & disconnects

---

## 10. Migration Guide for Developers

### For Old Code Using `useMarketSocketStore`

```typescript
// ❌ OLD
import { useMarketSocketStore } from '@/store/marketSocketStore'
const { rtBySymbol } = useMarketSocketStore()

// ✅ NEW (same result, handles more data)
import { useRealtimeStore } from '@/store/realtimeStore'
const { rtBySymbol, pricesBySymbol, getCurrentPrice } = useRealtimeStore()
```

### For Old Code Using `useTradingRealtimeSocketStore`

```typescript
// ❌ OLD
import { useTradingRealtimeSocketStore } from '@/store/tradingRealtimeSocketStore'
const { onTradeMatched, latestTrades } = useTradingRealtimeSocketStore()

// ✅ NEW (simpler)
import { useRealtimeStore } from '@/store/realtimeStore'
const { lastTrades } = useRealtimeStore()
```

### For Old Code Using `orderSocketService`

```typescript
// ❌ OLD
import { orderSocketService } from '@/store/orderSocket'
orderSocketService.connect(accountId)

// ✅ NEW
import { useOrderSocketStore } from '@/store/orderSocketStore'
useOrderSocketStore.getState().connect()
useOrderSocketStore.getState().subscribeAccount(accountId)
```

### For Order Submission Logic

```typescript
// ❌ OLD: Direct function call with 18+ params
submitTradePanelOrder(sideOverride, p, ...)

// ✅ NEW: Context-based
import { submitOrder, isFormValid } from '@/utils/orderSubmissionManager'

if (isFormValid(context)) {
  const result = await submitOrder(context)
}
```

---

## 11. Backward Compatibility

**Migration Layer:** `src/store/index.ts`

All old imports still work:
- `import { useMarketSocketStore } from '@/store/marketSocketStore'` ✅
- `import { useTradingRealtimeSocketStore } from '@/store/tradingRealtimeSocketStore'` ✅
- `import { orderSocketService } from '@/store/orderSocket'` ✅

Each deprecated module:
1. ⚠️ Logs deprecation warning (console)
2. ✅ Re-exports from new unified stores
3. 📋 Points to migration guide

**Migration Timeline:**
- Phase 1 (done): Create new stores + deprecation layer
- Phase 2 (next): Update major components (ChartCommon, TradePanelWeb)
- Phase 3 (future): Remove deprecated files entirely

---

## 12. Testing Checklist

- [ ] Realtime store connects to both namespaces
- [ ] Price updates stream smoothly (throttled 200ms)
- [ ] Order events fire correctly
- [ ] Balance validation works
- [ ] Fee estimation accurate
- [ ] Component imports unchanged (compatibility)
- [ ] No console errors on start
- [ ] Mobile responsive

---

## 13. Next Steps

**Recommended Priority:**

1. **Update major components** to use new stores explicitly:
   - `src/components/shared/chart/ChartCommon.tsx`
   - `src/components/shared/chart/components/web/TradePanelWeb.tsx`
   - `src/components/featured/trade/web/components/TradeWebAsideOrderForm.tsx`

2. **Refactor TradeForm** to use `orderSubmissionManager`

3. **Remove old TradePanel.tsx** (duplicate app version)

4. **Add integration tests** for calculation utils

5. **Eventually remove** deprecated stores (after all components migrated)

---

## 14. Architecture Notes

**Key Principles Followed:**

1. **Single Source of Truth**
   - One realtime store for all market data
   - One order socket for user events

2. **Throt tling Strategy**
   - 200ms batch flush for price updates (reduce re-renders)
   - Immediate trigger for user events (order matched)

3. **Type Safety**
   - Discriminated unions for order types
   - Clear interfaces for contexts & payloads
   - Zustand store inference for types

4. **Component Purity**
   - Calculation logic isolated (no side effects)
   - Submission logic centralized
   - Components remain presentational

---

## 15. Known Issues / TODO

- [ ] orderSocket.ts class-based code still partially present (cleanup via migration)
- [ ] TradePanel.tsx (app version) - still has duplicate code
- [ ] Test order submission flow end-to-end
- [ ] Performance profile with many concurrent subscriptions

---

**Generated:** May 11, 2026  
**Author:** Refactoring Agent  
**Status:** ✅ Ready for Phase 2 rollout
