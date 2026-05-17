# 🚀 SPOT TRADING MIGRATION GUIDE
## Position Model → Portfolio/Asset Ownership Model

**Document Version:** 1.0  
**Date:** May 15, 2026  
**Status:** Active Development  
**Target:** Complete transition to Spot Trading by Q2 2026

---

## 📋 TABLE OF CONTENTS

1. [EXECUTIVE SUMMARY](#executive-summary)
2. [CURRENT STATE ANALYSIS](#current-state-analysis)
3. [SPOT MODEL OVERVIEW](#spot-model-overview)
4. [DETAILED MIGRATION PLAN](#detailed-migration-plan)
5. [COMPONENT REFACTORING](#component-refactoring)
6. [SERVICE LAYER CHANGES](#service-layer-changes)
7. [TYPE SYSTEM UPDATES](#type-system-updates)
8. [REAL-TIME DATA ARCHITECTURE](#real-time-data-architecture)
9. [TRADING WORKFLOWS](#trading-workflows)
10. [TESTING STRATEGY](#testing-strategy)
11. [ROLLOUT PLAN](#rollout-plan)

---

## EXECUTIVE SUMMARY

### Current State (Position Trading - Margin/Leverage)
```
Position Model:
├─ Leverage: 1x-100x
├─ Margin: Calculate & track
├─ Liquidation: Risk management required
├─ Lifecycle: Open → Close → History
└─ Asset: Underlying + contractSize
```

### Target State (Spot Trading - Asset Ownership)
```
Portfolio Model:
├─ Ownership: Direct asset holding
├─ No leverage/margin
├─ No liquidation risk
├─ Lifecycle: Buy → Hold → Sell
└─ Asset: Full ownership (100%)
```

### Key Differences

| Aspect | Position (Current) | Spot (Target) |
|--------|-------------------|---------------|
| **Model** | Derivative/Leveraged | Direct Ownership |
| **Capital** | Margin = leverageMultiplier | Full Amount |
| **Risk** | Liquidation Risk | Only Market Risk |
| **Lifecycle** | Open → Modify TP/SL → Close | Buy → Hold → Sell |
| **Data Model** | Position | PortfolioItem |
| **Calculation** | PnL + Funding + Fees | PnL + Trading Fees |
| **Components** | PositionTab, ClosePosition | PortfolioTab, BuyPanel |
| **Hooks** | usePosition, useClosePositions | usePortfolio, useBuyAsset |
| **Features Removed** | Leverage, Margin, TP/SL | - |
| **Features Added** | Asset transfer, Dividend claims | - |

---

## CURRENT STATE ANALYSIS

### ✅ Already Implemented (Spot Components)

#### Portfolio Hook (`usePortfolio.ts`)
```typescript
✅ usePortfolioOverview()        // Get total portfolio value
✅ useInfinitePortfolioItems()   // Paginated asset holdings
✅ usePortfolioItem()             // Single asset details
```

**Status:** 95% Complete - Ready to extend

#### Portfolio Service (`portfolioService.ts`)
```typescript
✅ getPortfolioOverview()         // /user/portfolio/overview
✅ getPortfolioItems()            // /user/portfolio/items (custom BFF endpoint)
✅ getPortfolioHistory()          // /user/portfolio/history (custom)
```

**Status:** 100% Functional

#### Portfolio Type (`types/portfolio.ts`)
```typescript
✅ PortfolioItem {
  assetId, symbol, name, quantity,
  averageBuyPrice, currentPrice,
  totalValue, profitLoss, profitLossPercent,
  allocatedBalance, currency, category, lastUpdatedAt
}

✅ PortfolioOverview {
  totalValue, totalInvested, totalProfitLoss,
  totalProfitLossPercent, assets[], updatedAt
}

✅ PortfoliosResponse {
  data[], total, nextCursor
}
```

**Status:** 100% Complete

#### Web UI Component (`PortfolioTabContent.tsx`)
```typescript
✅ Portfolio table with sorting
✅ Real-time price updates via socket
✅ Profit/Loss calculation
✅ Sell action
✅ Infinite scroll pagination
```

**Status:** 95% Complete

---

### ❌ Still Position-Based (To Remove/Replace)

#### Position Hooks (`usePosition.ts`)
```typescript
❌ usePositionStats()             // Position-specific stats
❌ useInfinitePositions()         // Fetch open positions
❌ useClosePositions()            // Close position action
```

**Action:** Remove after migration complete

#### Position Components (App)
```
❌ src/components/featured/position/app/components/tab/
   ├─ PositionsTab.tsx            // Open positions
   ├─ PositionHistoryTab.tsx      // Closed positions history
   ├─ OrdersTab.tsx               // Active orders
   └─ OrderHistoryTab.tsx         // Order history
```

**Action:** Repurpose or deprecate

#### Position-Specific Logic
```typescript
❌ useOpeningOrderActions.ts
   ├─ Margin calculations
   ├─ Leverage handling
   ├─ Position closing logic
   ├─ TP/SL modification
   └─ Liquidation scenarios

❌ position.calculations.ts
   ├─ calculateOrderMargin()
   ├─ calculateLiquidationPrice()
   ├─ calculateUnrealizedPnL()     (Partial - still needed)
   └─ other leverage-specific calcs

❌ position.validate.ts
   ├─ Leverage validation
   ├─ Margin validation
   └─ Risk management checks
```

**Action:** Remove or archive

---

## SPOT MODEL OVERVIEW

### Data Model Comparison

#### Position (Current - Leverage)
```typescript
type Position = {
  id: string;                 // Position ID
  assetId: string;            // Underlying asset
  accountId: string;          // Trading account
  symbol: string;             // E.g., "AAPL"
  side: 'BUY' | 'SELL';       // Long or Short
  quantity: string;           // Amount of contracts
  leverage: number;           // 1x-100x
  margin: string;             // Capital required
  realizedPnl: string;        // Already closed profit/loss
  unrealizedPnl: string;      // Current P&L
  openPrice: string;          // Entry price
  closePrice?: string;        // Exit price
  liquidationPrice?: string;  // Where you get liquidated
  status: 0|1|2|3;            // NEW|FILLED|CLOSED|CANCELLED
  openedAt: string;           // Entry time
  closedAt?: string;          // Exit time
};
```

#### PortfolioItem (Target - Spot)
```typescript
type PortfolioItem = {
  assetId: string;              // Asset unique ID (UUID)
  symbol: string;               // E.g., "AAPL"
  name: string;                 // E.g., "Apple Inc"
  quantity: string;             // Shares owned (always positive)
  averageBuyPrice: string;      // Weighted avg cost basis
  currentPrice: string;         // Latest market price
  totalValue: string;           // quantity × currentPrice
  profitLoss: string;           // totalValue - (quantity × averageBuyPrice)
  profitLossPercent: string;    // (profitLoss / originalInvestment) × 100
  allocatedBalance: string;     // Fund allocated to buy this asset
  currency: string;             // USD, EUR, etc.
  category?: string;            // Tech, Finance, Energy, etc.
  lastUpdatedAt: string;        // Last price update
};
```

### Key Structural Differences

| Property | Position | PortfolioItem | Reason |
|----------|----------|---------------|--------|
| `side` | BUY/SELL | ❌ Removed | Always own, no shorting |
| `leverage` | 1-100x | ❌ Removed | No margin trading |
| `margin` | Calculated | ❌ Removed | No margin requirement |
| `liquidationPrice` | Yes | ❌ Removed | No liquidation risk |
| `quantity` | ±amount | Always + | Always positive ownership |
| `name` | N/A | Added | Asset friendly name |
| `averageBuyPrice` | openPrice | Weighted avg | Multiple buys tracked |
| `allocatedBalance` | N/A | Added | Fund allocation |
| `category` | N/A | Optional | Asset classification |

### Order Model (Simplified for Spot)

#### Current Order Type
```typescript
type OrderItem = {
  id: string;
  accountId: string;
  side: 'BUY' | 'SELL';           // Long/Short
  type: 'MARKET' | 'LIMIT';       // Execution type
  quantity: string;
  price?: string;                 // For LIMIT orders
  status: 0|1|2|3;                // Order status
  filledQuantity: string;         // Executed amount
  remainingQuantity: string;      // Still open
  stopLossPrice?: string;         // Position SL
  takeProfitPrice?: string;       // Position TP
  createdAt: string;
  updatedAt: string;
};
```

#### Spot Order (Simplified)
```typescript
type SpotOrderItem = {
  id: string;
  assetId: string;                // ← ADD: Asset UUID
  accountId: string;
  side: 'BUY' | 'SELL';           // Simple: buy to own, sell to divest
  type: 'MARKET' | 'LIMIT';
  quantity: string;               // Shares/amount
  price?: string;                 // For LIMIT
  executedPrice?: string;         // Actual fill price
  status: 0|1|2|3;                // Order status
  filledQuantity: string;         // Executed
  remainingQuantity: string;      // Pending
  totalCost?: string;             // quantity × executedPrice
  fee?: string;                   // Trading fee
  createdAt: string;
  updatedAt: string;
  
  // ❌ REMOVED: Position-specific fields
  // stopLossPrice, takeProfitPrice, leverage, margin
};
```

---

## DETAILED MIGRATION PLAN

### Phase 1: Foundation (Week 1-2)

#### 1.1 Create Spot-Specific Services & Hooks

**New Files:**

##### `src/services/spotOrderService.ts` (Replaces `orderService.ts`)
```typescript
/**
 * Spot Trading Order API Service
 * Simplified order execution without leverage/margin
 */

import { apiClient } from './apiClient';

export type CreateSpotOrderPayload = {
  accountId: string;
  assetId: string;              // ← Asset UUID (not symbol)
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: string;             // Amount to buy/sell
  price?: string;               // For LIMIT orders
  maxTotalCost?: number;        // For MARKET BUY protection
};

export type SpotOrderResponse = {
  orderId: string;
  assetId: string;
  side: 'BUY' | 'SELL';
  quantity: string;
  executedPrice: string;
  totalCost: string;
  fee: string;
  status: number;
  filledAt: string;
};

export const createSpotOrder = async (
  payload: CreateSpotOrderPayload
): Promise<SpotOrderResponse> => {
  // Call: POST /orders with assetId
  return apiClient.post('/orders', payload);
};

export const getSpotOrders = async (
  accountId: string,
  params?: {
    symbol?: string;
    side?: 'BUY' | 'SELL';
    status?: number[];
    fromDate?: string;
    toDate?: string;
    skip?: number;
    take?: number;
  }
): Promise<{ data: SpotOrderItem[], total: number, nextCursor?: string }> => {
  return apiClient.get('/orders', { accountId, ...params });
};

export const cancelSpotOrder = async (
  orderId: string,
  accountId: string
): Promise<void> => {
  return apiClient.patch(`/orders/${orderId}`, { accountId, cancel: true });
};
```

**Status:** Create new file (don't modify existing yet)

##### `src/hook/useSpotOrder.ts` (New)
```typescript
import { useMutation, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { 
  createSpotOrder, 
  getSpotOrders, 
  cancelSpotOrder,
  type CreateSpotOrderPayload,
  type SpotOrderResponse 
} from '@/services/spotOrderService';

/**
 * Create a spot order (buy or sell)
 */
export const useCreateSpotOrder = () => {
  return useMutation({
    mutationFn: async (payload: CreateSpotOrderPayload) => {
      return createSpotOrder(payload);
    },
  });
};

/**
 * Fetch spot orders with pagination
 */
export const useInfiniteSpotOrders = (
  params: { accountId: string; symbol?: string; side?: string },
  pageSize = 20
) => {
  return useInfiniteQuery({
    queryKey: ['spot-orders', params.accountId, params.symbol, params.side],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      return getSpotOrders(params.accountId, {
        ...params,
        skip: pageParam ? parseInt(pageParam) : 0,
        take: pageSize,
      });
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.nextCursor) return undefined;
      return lastPage.nextCursor;
    },
  });
};

/**
 * Cancel a spot order
 */
export const useCancelSpotOrder = () => {
  return useMutation({
    mutationFn: async ({ orderId, accountId }: { orderId: string; accountId: string }) => {
      return cancelSpotOrder(orderId, accountId);
    },
  });
};
```

**Status:** New file

#### 1.2 Create Spot Order Components

##### `src/components/featured/spot/BuyPanel.tsx` (New)
```typescript
/**
 * Buy panel for spot trading
 * Simple interface: Select asset → Enter amount → Buy
 */

'use client';

import { useState, useMemo } from 'react';
import { useCreateSpotOrder } from '@/hook/useSpotOrder';
import { useGetData } from '@/context/GetdataContext';
import { Button } from '@/components/shared/atoms/button';

interface BuyPanelProps {
  accountId: string;
  onSuccess?: () => void;
}

export default function BuyPanel({ accountId, onSuccess }: BuyPanelProps) {
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [quantity, setQuantity] = useState('');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [limitPrice, setLimitPrice] = useState<string>('');

  const { assets } = useGetData();
  const { mutateAsync: createOrder, isPending } = useCreateSpotOrder();

  const selectedAsset = useMemo(
    () => assets?.find(a => a.id === selectedAssetId),
    [selectedAssetId, assets]
  );

  const handleSubmit = async () => {
    if (!selectedAssetId || !quantity) return;

    try {
      await createOrder({
        accountId,
        assetId: selectedAssetId,
        side: 'BUY',
        type: orderType,
        quantity,
        price: orderType === 'LIMIT' ? limitPrice : undefined,
      });
      
      setSelectedAssetId('');
      setQuantity('');
      onSuccess?.();
    } catch (error) {
      console.error('Order creation failed:', error);
    }
  };

  return (
    <div className="space-y-4 p-4">
      {/* Asset selector */}
      {/* Quantity input */}
      {/* Order type selector */}
      {/* Price input for LIMIT */}
      <Button onClick={handleSubmit} disabled={isPending || !selectedAssetId || !quantity}>
        Buy
      </Button>
    </div>
  );
}
```

**Status:** Create new component

##### `src/components/featured/spot/SellPanel.tsx` (New)
```typescript
/**
 * Sell panel for divesting portfolio assets
 */

'use client';

import { useState, useMemo } from 'react';
import { useCancelSpotOrder } = '@/hook/useSpotOrder';
import { usePortfolioItem } from '@/hook/usePortfolio';

interface SellPanelProps {
  accountId: string;
  assetId: string;
  onSuccess?: () => void;
}

export default function SellPanel({ accountId, assetId, onSuccess }: SellPanelProps) {
  const [quantity, setQuantity] = useState('');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [limitPrice, setLimitPrice] = useState<string>('');

  const { data: portfolioItem } = usePortfolioItem({ accountId, assetId });
  const { mutateAsync: sellOrder, isPending } = useCreateSpotOrder();

  const handleSubmit = async () => {
    if (!quantity || !portfolioItem) return;

    const qtyNumber = parseFloat(quantity);
    const ownershipNumber = parseFloat(portfolioItem.quantity);

    if (qtyNumber > ownershipNumber) {
      // Error: cannot sell more than owned
      return;
    }

    try {
      await sellOrder({
        accountId,
        assetId,
        side: 'SELL',
        type: orderType,
        quantity,
        price: orderType === 'LIMIT' ? limitPrice : undefined,
      });

      onSuccess?.();
    } catch (error) {
      console.error('Sell order failed:', error);
    }
  };

  return (
    <div className="space-y-4 p-4">
      {/* Current holding: {portfolioItem?.quantity} */}
      {/* Sell quantity input */}
      {/* Order type selector */}
      {/* Price input for LIMIT */}
    </div>
  );
}
```

**Status:** Create new component

#### 1.3 Update Type Definitions

##### Update `src/types/orders.ts`

**Add SpotOrder types:**
```typescript
/**
 * Spot Trading Order - simplified without leverage/margin
 */
export type SpotOrderItem = {
  id: string;
  assetId: string;              // ← Asset UUID
  accountId: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: string;
  price?: string;               // For LIMIT orders
  executedPrice?: string;       // Actual execution price
  status: number;               // 0=NEW, 1=PARTIAL, 2=FILLED, 3=CANCELLED
  filledQuantity: string;
  remainingQuantity: string;
  totalCost?: string;           // Filled qty × executedPrice
  fee?: string;                 // Trading fee
  createdAt: string;
  updatedAt: string;
};

export type SpotOrdersResponse = {
  data: SpotOrderItem[];
  total: number;
  nextCursor?: string;
};

/**
 * Payload for creating spot orders
 */
export type CreateSpotOrderPayload = {
  accountId: string;
  assetId: string;              // Must be UUID, not symbol
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: string;
  price?: string;               // Required for LIMIT
  maxTotalCost?: number;        // Optional: protect against slippage on MARKET BUY
};

// Keep existing OrderItem for backwards compatibility (during transition)
```

**Status:** Add new types, keep old for compatibility

#### 1.4 Constants Updates

##### Update `src/constants/api.ts`

```typescript
// New Spot endpoints
export const SPOT_ORDERS_ENDPOINTS = {
  CREATE: '/orders',            // POST
  LIST: '/orders',              // GET
  CANCEL: (id: string) => `/orders/${id}`,  // PATCH
  GET_ONE: (id: string) => `/orders/${id}`, // GET
} as const;

// Keep existing ORDERS_ENDPOINTS for legacy (gradual migration)
export const ORDERS_ENDPOINTS = {
  CREATE: '/orders',
  LIST: '/orders',
  // ... existing
} as const;
```

**Status:** Add without removing old constants

---

### Phase 2: Component Migration (Week 2-3)

#### 2.1 Portfolio Web Screen (Main Screen)

**File:** `src/components/featured/position/web/PositionWebScreen.tsx`

**Current Tabs:**
```
├─ Portfolio (NEW - Spot focus)
├─ Open Orders
├─ Position History (❌ REMOVE)
└─ Order History
```

**Target Tabs (Spot Model):**
```
├─ Assets/Portfolio (Ownership view)
├─ Active Orders (Buy/Sell orders)
└─ Transaction History (All trades)
```

**Changes:**

```typescript
type PositionWebTab = 
  // New spots tabs
  | 'assets'              // Main portfolio view
  | 'active-orders'       // Current buy/sell orders
  | 'transaction-history' // All buy/sell transactions
  
  // Keep during transition
  | 'portfolio' | 'orders' | 'position-history' | 'order-history';

// Deprecate position-history tab
// Replace with transaction-history (consolidates sells)
```

**Effort:** 30 minutes refactor

#### 2.2 Replace PositionsTab with AssetsTab

**Old File:** `src/components/featured/position/app/components/tab/PositionsTab.tsx`  
**New File:** `src/components/featured/spot/AssetsTab.tsx`

**Comparison:**

| Aspect | PositionsTab | AssetsTab |
|--------|-------------|-----------|
| **Shows** | Open leveraged positions | Asset holdings |
| **Actions** | Close position, Modify TP/SL | Sell, Buy more, View history |
| **Data Source** | `useInfinitePositions()` | `useInfinitePortfolioItems()` |
| **Columns** | Entry price, Leverage, Liquidation price | Buy price, Current price, Gain/Loss % |
| **Real-time** | Position updates | Price updates |
| **Socket Events** | Position changes | Price updates |

**New Component Structure:**

```typescript
// src/components/featured/spot/AssetsTab.tsx

interface Asset Tab Props {
  accountId: string;
}

export default function AssetsTab({ accountId }: AssetsTabProps) {
  // Use useInfinitePortfolioItems instead of useInfinitePositions
  // Show: symbol, quantity, averageBuyPrice, currentPrice, profitLoss
  // Actions: 
  //   - Sell (opens SellPanel)
  //   - View details (asset breakdown)
  //   - Buy more (opens BuyPanel)
}
```

**Effort:** 2 hours refactor

#### 2.3 Simplify OrdersTab

**File:** `src/components/featured/spot/ActiveOrdersTab.tsx`

**Current OrdersTab:**
```
Shows: All orders with MODIFY capability
- Modify quantity, price
- Modify TP/SL
- Cancel order
```

**New ActiveOrdersTab (Spot):**
```
Shows: Simple buy/sell orders only
- View filled quantity, remaining
- Cancel pending order (before fill)
- No TP/SL modification
```

**Changes:**
```typescript
type SpotActiveOrder = {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: string;
  price?: string;
  filledQuantity: string;
  remainingQuantity: string;
  status: number;
  createdAt: string;
};

// Remove position-specific fields:
// - stopLossPrice, takeProfitPrice
// - leverage, margin, liquidationPrice
```

**Effort:** 1.5 hours refactor

#### 2.4 Transaction History (New)

**File:** `src/components/featured/spot/TransactionHistoryTab.tsx`

**Shows:**
```
All completed buy/sell orders:
- Date, Symbol, Side (BUY/SELL)
- Quantity, Fill Price, Total Cost
- Fee, Net Proceeds
- Status (FILLED, CANCELLED, REJECTED)
```

**Data Source:**
```typescript
// Fetch completed orders (status = FILLED)
const { data: transactions } = useSpotOrderHistory({
  accountId,
  status: [2], // FILLED only
  sortBy: 'completedAt',
  sortDir: 'desc',
});
```

**Effort:** 1.5 hours new component

---

### Phase 3: Service Layer Migration (Week 3)

#### 3.1 Replace Position Services

**Delete/Archive:**
```
❌ src/services/positionService.ts
   - getPositions()
   - getPositionStats()
   - updatePosition()
   - closePositions()
   - closeAllPositions()

❌ src/hook/usePosition.ts
   - usePositionStats()
   - useInfinitePositions()
   - useClosePositions()
```

**Action Plan:**
1. Archive to `_deprecated/positionService.ts` (keep for reference)
2. Create deprecation notices in code
3. Search & update all imports
4. Remove from actual codebase after verification

**Effort:** 2 hours (find & update imports)

#### 3.2 Update Order Services

**File:** `src/services/orderService.ts`

**Changes:**
```typescript
// Keep existing for backwards compat
export const getOrders = async (...) => { ... };

// Add new Spot-specific
export const getSpotOrders = async (
  accountId: string,
  params?: SpotOrdersFilterParams
): Promise<SpotOrdersResponse> => {
  return apiClient.get('/orders', { accountId, ...params });
};

export const createSpotOrder = async (
  payload: CreateSpotOrderPayload
): Promise<SpotOrderResponse> => {
  return apiClient.post('/orders', payload);
};

// Deprecate: updateOrderAPI (only for LIMIT order price/qty)
// Spot only supports: cancel orders (no modify)
export const cancelSpotOrder = async (
  orderId: string,
  accountId: string
): Promise<void> => {
  return apiClient.patch(`/orders/${orderId}`, {
    accountId,
    cancel: true,
  });
};
```

**Effort:** 1 hour

#### 3.3 Create Spot-Specific Services

**New File:** `src/services/spotTransactionService.ts`

```typescript
/**
 * Spot Transaction History Service
 * Get all completed buy/sell transactions
 */

import { apiClient } from './apiClient';

export type SpotTransaction = {
  id: string;
  orderId: string;
  assetId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: string;
  price: string;
  totalValue: string;
  fee: string;
  netProceeds?: string;           // For SELL: totalValue - fee
  completedAt: string;
};

export type SpotTransactionFilters = {
  accountId: string;
  symbol?: string;
  side?: 'BUY' | 'SELL';
  fromDate?: string;
  toDate?: string;
  skip?: number;
  take?: number;
};

export const getSpotTransactionHistory = async (
  filters: SpotTransactionFilters
): Promise<{ data: SpotTransaction[], total: number, nextCursor?: string }> => {
  // Call GET /orders with status=FILLED
  return apiClient.get('/orders', {
    ...filters,
    status: [2], // FILLED
  });
};
```

**Effort:** 30 minutes

---

### Phase 4: Real-Time Architecture (Week 3-4)

#### 4.1 Update Market Socket Store

**File:** `src/store/marketSocketStore.ts`

**Current:**
```typescript
// Position-specific subscriptions
subscribeToPosition(positionId)
subscribeToLiquidation()
```

**Target (Spot):**
```typescript
// Asset price subscriptions
subscribeToAsset(assetId)      // Price updates
subscribeToPortfolio(accountId) // Portfolio-level updates
```

**Changes:**

```typescript
// Add new subscription types
export interface SpotSubscription {
  assetIds: Set<string>;        // Subscribe to multiple assets
  portfolioWatchers: Map<string, (portfolio: Portfolio) => void>;
}

// Add to store
const store = {
  // ... existing
  spotSubscriptions: SpotSubscription;
  
  subscribeToAsset: (assetId: string) => {
    // Subscribe to price updates for assetId
  },
  
  updateAssetPrice: (assetId: string, price: number) => {
    // Update real-time price in portfolio
  },
};
```

**Effort:** 1.5 hours

#### 4.2 Socket Message Handlers

**Update WebSocket message handler:**

```typescript
// Instead of:
// "position:123" → Position update
// "position:liquidation"

// New:
// "asset:UUID" → Asset price update
// "portfolio:account-id" → Portfolio snapshot

switch (message.type) {
  case 'asset.price':
    updateAssetPrice(message.assetId, message.price);
    break;
    
  case 'portfolio.update':
    updatePortfolioItems(message.accountId, message.items);
    break;
    
  case 'order.status':
    updateOrderStatus(message.orderId, message.status);
    break;
}
```

**Effort:** 1 hour

---

### Phase 5: Calculation Utilities (Week 4)

#### 5.1 Remove Leverage/Margin Calculations

**Delete:**
```
❌ src/components/featured/position/utils/position.calculations.ts
   ├─ calculateOrderMargin()
   ├─ calculateLiquidationPrice()
   ├─ calculateFundingRate()
   ├─ isAvailableBalanceSufficient() (for margin)
   └─ other leverage-specific calcs
```

**Keep:**
```
✅ calculateUnrealizedPnL()         (still needed)
✅ calculateRealizedPnL()            (still needed)
✅ formatDecimal()                   (utility)
```

#### 5.2 New Spot Calculations

**New File:** `src/components/featured/spot/utils/spot.calculations.ts`

```typescript
import Decimal from 'decimal.js';

/**
 * Calculate realized profit/loss for a completed transaction
 */
export function calculateRealizedPnL(
  side: 'BUY' | 'SELL',
  quantity: string,
  buyPrice: string,
  sellPrice: string,
  fee: string
): string {
  if (side === 'BUY') {
    // No PnL on buy (just adds to portfolio)
    return '0';
  }

  // SELL: (quantity × sellPrice) - (quantity × buyPrice) - fee
  const proceeds = new Decimal(quantity).times(sellPrice);
  const cost = new Decimal(quantity).times(buyPrice);
  const pnl = proceeds.minus(cost).minus(fee);
  
  return pnl.toString();
}

/**
 * Calculate portfolio asset allocation percentage
 */
export function calculateAllocationPercent(
  assetValue: string,
  totalPortfolioValue: string
): string {
  const asset = new Decimal(assetValue);
  const total = new Decimal(totalPortfolioValue);
  
  if (total.isZero()) return '0';
  
  return asset.dividedBy(total).times(100).toFixed(2);
}

/**
 * Calculate average buy price when adding to position
 */
export function calculateNewAverageBuyPrice(
  existingQty: string,
  existingAvgPrice: string,
  newQty: string,
  newPrice: string
): string {
  const existingCost = new Decimal(existingQty).times(existingAvgPrice);
  const newCost = new Decimal(newQty).times(newPrice);
  const totalQty = new Decimal(existingQty).plus(newQty);
  const totalCost = existingCost.plus(newCost);
  
  return totalCost.dividedBy(totalQty).toString();
}

/**
 * Calculate profit/loss percentage
 */
export function calculatePnLPercent(
  currentValue: string,
  costBasis: string
): string {
  const current = new Decimal(currentValue);
  const cost = new Decimal(costBasis);
  
  if (cost.isZero()) return '0';
  
  return current.minus(cost).dividedBy(cost).times(100).toString();
}
```

**Effort:** 45 minutes

#### 5.3 Validation Utilities

**New File:** `src/components/featured/spot/utils/spot.validate.ts`

```typescript
/**
 * Spot trading validation (simplified)
 */

export function validateSpotOrderPayload(payload: any): string | null {
  if (!payload.assetId) return 'Asset ID required';
  if (!payload.accountId) return 'Account ID required';
  if (!['BUY', 'SELL'].includes(payload.side)) return 'Invalid side';
  if (!['MARKET', 'LIMIT'].includes(payload.type)) return 'Invalid order type';
  
  const qty = parseFloat(payload.quantity);
  if (!qty || qty <= 0) return 'Invalid quantity';
  
  if (payload.type === 'LIMIT') {
    const price = parseFloat(payload.price);
    if (!price || price <= 0) return 'Invalid limit price';
  }
  
  return null;
}

export function validateSellQuantity(
  ownedQuantity: string,
  sellQuantity: string
): string | null {
  const owned = parseFloat(ownedQuantity);
  const sell = parseFloat(sellQuantity);
  
  if (sell <= 0) return 'Sell quantity must be positive';
  if (sell > owned) return `Cannot sell more than owned (${owned})`;
  
  return null;
}

export function validateBuyQuantity(
  availableBalance: string,
  quantity: string,
  price: string
): string | null {
  const balance = parseFloat(availableBalance);
  const qty = parseFloat(quantity);
  const price_num = parseFloat(price);
  
  const totalCost = qty * price_num;
  if (totalCost > balance) {
    return `Insufficient balance. Need $${totalCost}, have $${balance}`;
  }
  
  return null;
}
```

**Effort:** 30 minutes

---

## COMPONENT REFACTORING

### Complete Component Map

#### Web Components (Primary - Desktop)

**File: `src/components/featured/position/web/PositionWebScreen.tsx`**

```typescript
Current Structure:
├─ Tab: portfolio         ✅ Keep (uses PortfolioTabContent)
├─ Tab: orders            ⚠️ Rename to "active-orders"
├─ Tab: position-history  ❌ Remove (position-specific)
└─ Tab: order-history     ⚠️ Rename to "transaction-history"

New Structure:
├─ Tab: assets            ✅ Portfolio/Holdings view
├─ Tab: active-orders     ✅ Current buy/sell orders
└─ Tab: transaction-history ✅ Historical trades
```

**Sub-Components:**

| Component | Current | Target | Status |
|-----------|---------|--------|--------|
| `PortfolioTabContent.tsx` | Portfolio list | Spot holdings | ✅ Keep as-is |
| `OpenOrdersTabContent.tsx` | Open orders | Spot orders | ⚠️ Refactor (remove TP/SL) |
| `OrderHistoryTabContent.tsx` | Order history | Transaction history | ⚠️ Rename |
| `PositionHistoryTab.tsx` | Position history | ❌ Remove | ❌ Delete |
| `PositionWebTableShared.tsx` | Shared utilities | Spot shared utilities | ⚠️ Update |

#### Mobile Components (Secondary)

**File: `src/components/featured/position/app/PositionAppScreen.tsx`**

**Status:** Deprecate or refactor for mobile spot trading

---

## SERVICE LAYER CHANGES

### Service Layer Architecture

```
Before (Position Model):
├─ positionService.ts      (get positions, update, close)
├─ orderService.ts         (get orders, update, cancel)
└─ portfolioService.ts     (get portfolio overview)

After (Spot Model):
├─ spotOrderService.ts     (NEW: create, get, cancel orders)
├─ spotTransactionService.ts (NEW: transaction history)
├─ portfolioService.ts     (KEEP: portfolio overview, items)
└─ orderService.ts         (DEPRECATED: legacy support only)
```

### Service File Modifications

#### 1. Create `src/services/spotOrderService.ts` (NEW)

**Lines of Code:** 150-200

```typescript
// See Section 1.1 above for full implementation
```

**Dependencies:**
- `apiClient.ts`
- `types/orders.ts` (use SpotOrderItem)

**Exports:**
```typescript
export {
  createSpotOrder,
  getSpotOrders,
  cancelSpotOrder,
  getSpotOrderById,
  type CreateSpotOrderPayload,
  type SpotOrderItem,
  type SpotOrdersResponse,
}
```

#### 2. Create `src/services/spotTransactionService.ts` (NEW)

**Lines of Code:** 100-150

```typescript
// See Phase 3.3 above for full implementation
```

#### 3. Archive `src/services/positionService.ts` (DEPRECATE)

**Action:**
1. Copy to `src/_deprecated/positionService.ts`
2. Add deprecation warning:
   ```typescript
   /**
    * @deprecated Position trading no longer supported
    * Use spotOrderService.ts for spot trading
    * Kept for reference/migration purposes only
    */
   ```
3. Find all imports and update
4. Remove from codebase after 1-2 weeks confirmation

---

## TYPE SYSTEM UPDATES

### Type File Modifications

#### `src/types/orders.ts` (UPDATE)

**ADD:**
```typescript
// Spot trading types
export type SpotOrderItem = { ... };
export type SpotOrdersResponse = { ... };
export type CreateSpotOrderPayload = { ... };

// String enums (already exist, ensure consistent)
export const ORDER_SIDES = {
  BUY: 'BUY',
  SELL: 'SELL',
} as const;

export type OrderSideString = typeof ORDER_SIDES[keyof typeof ORDER_SIDES];
```

**KEEP:**
```typescript
// Legacy OrderItem for backwards compat during migration
export type OrderItem = { ... };

// But mark deprecated:
/**
 * @deprecated Use SpotOrderItem for new code
 */
export type OrderItem = { ... };
```

#### `src/types/portfolio.ts` (NO CHANGE NEEDED)

**Already Complete:**
```typescript
✅ PortfolioItem        (exactly as needed)
✅ PortfolioOverview    (perfect)
✅ PortfoliosResponse   (good)
```

#### `src/types/position.ts` (DEPRECATE)

**ADD Deprecation Notice:**
```typescript
/**
 * @deprecated Position trading no longer supported
 * Portfolio/Spot trading only - use portfolio.ts types
 */

export type Position = { ... };
```

---

## REAL-TIME DATA ARCHITECTURE

### Socket Event Mapping

#### Current (Position Events)

```
Socket Events:
├─ position:uuid:update    → { id, unrealizedPnL, currentPrice }
├─ position:uuid:close     → Position closed
├─ position:uuid:liquidate → Position liquidated
├─ order:uuid:fill         → Partial/full fill
└─ order:uuid:cancel       → Order cancelled
```

#### Target (Spot Events)

```
Socket Events:
├─ asset:uuid:price        → { assetId, price, bid, ask, volume }
├─ portfolio:account:update → { items[], totalValue }
├─ order:uuid:fill         → Partial/full fill
└─ order:uuid:cancel       → Order cancelled
└─ order:uuid:status       → Status changed

Message Structure:
{
  type: 'asset.price' | 'portfolio.update' | 'order.status',
  assetId?: string,
  accountId?: string,
  orderId?: string,
  timestamp: number,
  data: { ... }
}
```

### Store Updates

**File:** `src/store/marketSocketStore.ts`

```typescript
// Update real-time price
function updateAssetPrice(assetId: string, price: number) {
  // Update store with new price
  // Trigger portfolio recalculation
  // Notify portfolio hook to refetch portfolio items
}

// Update portfolio snapshot
function updatePortfolioSnapshot(accountId: string, items: PortfolioItem[]) {
  // Replace entire portfolio
  // Update real-time calculations
}

// Update order status
function updateOrderStatus(orderId: string, status: number) {
  // Update order display
  // May affect portfolio (BUY fill adds to portfolio)
}
```

---

## TRADING WORKFLOWS

### Workflow 1: Buy Asset (New Ownership)

```
User Flow:
1. Click "Buy" in Assets tab
2. Select asset
3. Enter quantity
4. Choose order type (MARKET/LIMIT)
5. If LIMIT: enter price
6. Click Submit

Backend Flow:
1. Validate available balance
2. Create order (POST /orders)
3. Match against order book
4. Fill order (update order.status = FILLED)
5. Update portfolio (add to holdings)
6. Emit: portfolio:account:update
7. Emit: order:uuid:status

Frontend Flow:
1. Show "Placing order..."
2. Order created response
3. Poll/socket → order filled
4. Update portfolio view
5. Show success message
6. Refresh portfolio tab
```

### Workflow 2: Sell Asset (Divest Ownership)

```
User Flow:
1. Click asset in portfolio
2. Click "Sell"
3. Enter sell quantity (max: current holding)
4. Choose order type
5. If LIMIT: enter price
6. Click Submit

Backend Flow:
1. Validate: sellQty ≤ currentHolding
2. Create order (POST /orders side=SELL)
3. Match order
4. Fill order
5. Update portfolio (reduce quantity)
6. Calculate realized PnL
7. Emit: portfolio:account:update

Frontend Flow:
1. Show SellPanel
2. Validate quantity <= owned
3. Submit order
4. Show confirmation
5. Portfolio auto-updates
6. Show transaction in history
```

### Workflow 3: View Asset Details

```
User Flow:
1. Click asset in portfolio
2. See: quantity, avg buy price, current price, gain/loss
3. See: allocation %, cost basis, current value
4. See: transaction history (all buys/sells)
5. Can BUY more or SELL

Component Hierarchy:
AssetDetailPanel
├─ AssetHeader (name, symbol, price)
├─ HoldingCard (qty, avgPrice, currentPrice, PnL)
├─ AllocationCard (% of portfolio)
├─ TransactionHistory (all trades)
└─ Actions (Buy, Sell)
```

### Workflow 4: View Transaction History

```
User Flow:
1. Click "Transaction History" tab
2. See: all completed buy/sell trades
3. Filter by: date range, asset, side
4. Sort by: date, quantity, price
5. Each row shows: date, asset, side, qty, price, fee, total

Data Source:
GET /orders?status=FILLED&accountId=...
→ Returns completed orders with execution details
```

---

## TESTING STRATEGY

### Unit Tests

#### Spot Calculations Tests

**File:** `src/components/featured/spot/utils/__tests__/spot.calculations.test.ts`

```typescript
describe('Spot Trading Calculations', () => {
  describe('calculateRealizedPnL', () => {
    it('returns 0 for BUY transactions', () => {
      const result = calculateRealizedPnL(
        'BUY',
        '10',
        '100',
        '110',
        '1'
      );
      expect(result).toBe('0');
    });

    it('calculates PnL for SELL transactions', () => {
      // qty=10, buyPrice=100, sellPrice=110, fee=1
      // PnL = (10*110) - (10*100) - 1 = 1100 - 1000 - 1 = 99
      const result = calculateRealizedPnL(
        'SELL',
        '10',
        '100',
        '110',
        '1'
      );
      expect(result).toBe('99');
    });
  });

  describe('calculateNewAverageBuyPrice', () => {
    it('calculates average for multiple buy orders', () => {
      // Existing: 10 @ $100 = $1000
      // New: 5 @ $110 = $550
      // Avg: ($1000 + $550) / (10 + 5) = $103.33
      const result = calculateNewAverageBuyPrice(
        '10',
        '100',
        '5',
        '110'
      );
      expect(parseFloat(result)).toBeCloseTo(103.33, 1);
    });
  });
});
```

#### Spot Validation Tests

**File:** `src/components/featured/spot/utils/__tests__/spot.validate.test.ts`

```typescript
describe('Spot Trading Validation', () => {
  describe('validateSpotOrderPayload', () => {
    it('returns error for missing assetId', () => {
      const error = validateSpotOrderPayload({
        side: 'BUY',
        quantity: '10',
      });
      expect(error).toBe('Asset ID required');
    });

    it('returns error for invalid side', () => {
      const error = validateSpotOrderPayload({
        assetId: 'uuid',
        side: 'SHORT', // Invalid
        quantity: '10',
      });
      expect(error).toBe('Invalid side');
    });

    it('returns null for valid payload', () => {
      const error = validateSpotOrderPayload({
        assetId: 'uuid',
        accountId: 'acc-123',
        side: 'BUY',
        type: 'MARKET',
        quantity: '10',
      });
      expect(error).toBeNull();
    });
  });

  describe('validateSellQuantity', () => {
    it('prevents selling more than owned', () => {
      const error = validateSellQuantity('10', '15');
      expect(error).toContain('Cannot sell more than owned');
    });

    it('allows selling within holding', () => {
      const error = validateSellQuantity('10', '5');
      expect(error).toBeNull();
    });
  });
});
```

### Integration Tests

#### Spot Order Creation Flow

**File:** `src/__tests__/integration/spotOrderFlow.test.ts`

```typescript
describe('Spot Order Creation Flow', () => {
  it('creates buy order and updates portfolio', async () => {
    const { renderHook, waitFor } = render();

    // 1. Create order
    const { result } = renderHook(() => useCreateSpotOrder());
    
    act(() => {
      result.current.mutateAsync({
        accountId: 'acc-123',
        assetId: 'asset-uuid',
        side: 'BUY',
        type: 'MARKET',
        quantity: '10',
      });
    });

    // 2. Wait for order creation
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    // 3. Verify portfolio updated
    const { result: portfolioResult } = renderHook(() =>
      useInfinitePortfolioItems({ accountId: 'acc-123' })
    );

    await waitFor(() => {
      const portfolioItem = portfolioResult.current.data?.pages[0].data[0];
      expect(portfolioItem?.quantity).toBe('10');
    });
  });
});
```

### E2E Tests

#### Spot Trading End-to-End

**File:** `e2e/spot-trading.e2e.ts`

```typescript
describe('Spot Trading E2E', () => {
  it('completes full buy-sell cycle', async () => {
    // 1. Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    // ...

    // 2. Navigate to trading
    await page.click('text=Trading');

    // 3. Buy asset
    await page.click('button:has-text("Buy")');
    await page.selectOption('select[name="asset"]', 'AAPL');
    await page.fill('input[name="quantity"]', '10');
    await page.click('button:has-text("Submit")');

    // 4. Verify portfolio updated
    await page.waitForSelector('text=AAPL');
    const quantity = await page.textContent('[data-testid="qty-AAPL"]');
    expect(quantity).toContain('10');

    // 5. Sell partial position
    await page.click('[data-testid="asset-AAPL"]');
    await page.click('button:has-text("Sell")');
    await page.fill('input[name="sellQty"]', '5');
    await page.click('button:has-text("Submit")');

    // 6. Verify portfolio reduced
    const newQty = await page.textContent('[data-testid="qty-AAPL"]');
    expect(newQty).toContain('5');

    // 7. Check transaction history
    await page.click('text=Transaction History');
    await page.waitForSelector('text=SELL');
  });
});
```

---

## ROLLOUT PLAN

### Timeline

#### Week 1-2: Foundation
- ✅ Create spot services & hooks
- ✅ Create spot types
- ✅ Create basic spot components (BuyPanel, SellPanel)
- ✅ Update constants

#### Week 2-3: Components
- ✅ Refactor web components
- ✅ Update portfolio displays
- ✅ Simplify order management
- ✅ Create transaction history

#### Week 3-4: Backend Integration
- ✅ Update socket architecture
- ✅ Update calculations
- ✅ Create validation utilities
- ✅ Integration testing

#### Week 4-5: Cleanup
- ✅ Archive position services
- ✅ Remove position components
- ✅ Update documentation
- ✅ Remove feature flags

### Deployment Strategy

#### Phase 1: Feature Flag (Behind FF)
```typescript
// Feature flag enabled for testing group
if (FF.ENABLE_SPOT_TRADING) {
  // Show new spot components
} else {
  // Show legacy position components
}
```

#### Phase 2: Gradual Rollout
- Day 1: 10% of users
- Day 2-3: 50% of users
- Day 4: 100% of users

#### Phase 3: Cleanup
- Week 2: Archive position code
- Week 3: Remove position components
- Week 4: Remove position services

### Monitoring & Rollback

**Metrics to Monitor:**
- Order success rate (target: >99%)
- Portfolio load time (target: <2s)
- Socket connection stability
- Error rates for spot operations

**Rollback Conditions:**
- Order success rate < 95%
- Portfolio load time > 5s
- Socket disconnection rate > 5%
- Any data corruption

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Foundation (Week 1-2)

- [ ] Create `src/services/spotOrderService.ts`
- [ ] Create `src/hook/useSpotOrder.ts`
- [ ] Add SpotOrderItem types to `src/types/orders.ts`
- [ ] Create `src/constants/SPOT_ENDPOINTS`
- [ ] Create basic `BuyPanel.tsx` component
- [ ] Create basic `SellPanel.tsx` component
- [ ] Unit tests for spot calculations
- [ ] Integration tests for order creation

### Phase 2: Components (Week 2-3)

- [ ] Refactor `PositionWebScreen.tsx` tabs
- [ ] Create/update `AssetsTab.tsx`
- [ ] Create `ActiveOrdersTab.tsx` (from OrdersTab)
- [ ] Create `TransactionHistoryTab.tsx`
- [ ] Delete position history component
- [ ] Update all table components
- [ ] Component tests for refactored components

### Phase 3: Services (Week 3)

- [ ] Create `src/services/spotTransactionService.ts`
- [ ] Update `src/services/orderService.ts` with spot methods
- [ ] Archive `src/services/positionService.ts`
- [ ] Update all imports (find & replace)
- [ ] Remove position hook exports

### Phase 4: Utilities (Week 4)

- [ ] Create spot calculations utilities
- [ ] Create spot validation utilities
- [ ] Archive position calculation utils
- [ ] Update store architecture for spot events
- [ ] Update socket handlers

### Phase 5: Testing & Cleanup

- [ ] Complete unit test coverage
- [ ] Complete integration tests
- [ ] Complete E2E tests
- [ ] Performance testing
- [ ] Remove deprecated code
- [ ] Update documentation

---

## MIGRATION CHECKLIST BY FILE

### New Files to Create

```
✅ SPOT_MIGRATION_GUIDE.md (this file)
✅ src/services/spotOrderService.ts
✅ src/services/spotTransactionService.ts
✅ src/hook/useSpotOrder.ts
✅ src/components/featured/spot/BuyPanel.tsx
✅ src/components/featured/spot/SellPanel.tsx
✅ src/components/featured/spot/AssetsTab.tsx
✅ src/components/featured/spot/ActiveOrdersTab.tsx
✅ src/components/featured/spot/TransactionHistoryTab.tsx
✅ src/components/featured/spot/utils/spot.calculations.ts
✅ src/components/featured/spot/utils/spot.validate.ts
✅ src/components/featured/spot/utils/__tests__/spot.calculations.test.ts
✅ src/components/featured/spot/utils/__tests__/spot.validate.test.ts
✅ src/__tests__/integration/spotOrderFlow.test.ts
✅ e2e/spot-trading.e2e.ts
```

### Files to Update

```
⚠️ src/types/orders.ts                    → Add SpotOrder types
⚠️ src/types/portfolio.ts                 → Add transaction type
⚠️ src/constants/api.ts                   → Add SPOT_ENDPOINTS
⚠️ src/services/orderService.ts           → Add spot methods
⚠️ src/store/marketSocketStore.ts         → Update for spot events
⚠️ src/components/featured/position/web/PositionWebScreen.tsx → Update tabs
⚠️ src/components/featured/position/web/components/tab/OpenOrdersTabContent.tsx → Simplify
⚠️ src/components/featured/position/web/components/tab/OrderHistoryTabContent.tsx → Update naming
```

### Files to Archive/Deprecate

```
📦 src/services/positionService.ts        → Archive to _deprecated
📦 src/hook/usePosition.ts                → Archive to _deprecated
📦 src/components/featured/position/app/  → Deprecate or refactor
📦 src/components/featured/position/utils/position.calculations.ts → Archive
📦 src/components/featured/position/utils/position.validate.ts → Archive
```

---

## RISK ASSESSMENT & MITIGATION

### Risk 1: Data Loss During Migration
**Likelihood:** Low | **Impact:** Critical  
**Mitigation:**
- Backup all position/order data before migration
- Keep legacy services running in parallel
- Comprehensive data validation before cleanup

### Risk 2: Real-Time Socket Breaks
**Likelihood:** Medium | **Impact:** High  
**Mitigation:**
- Extensive socket testing before rollout
- Fallback to polling if socket fails
- Monitor socket connection stability

### Risk 3: Portfolio Calculation Errors
**Likelihood:** Low | **Impact:** Medium  
**Mitigation:**
- Comprehensive unit tests
- Reconciliation between backend & frontend
- Manual verification of sample portfolios

### Risk 4: Order Execution Issues
**Likelihood:** Low | **Impact:** Critical  
**Mitigation:**
- Backend validation required
- Order confirmation flow
- Transaction audit trail

### Risk 5: Performance Degradation
**Likelihood:** Medium | **Impact:** High  
**Mitigation:**
- Load testing before rollout
- Pagination for large portfolios
- Real-time updates batching

---

## SUPPORT & DOCUMENTATION

### User Documentation
- [ ] Create "What's New: Spot Trading" guide
- [ ] FAQ for spot trading model
- [ ] Video tutorials (BUY, SELL workflows)
- [ ] Migration guide for existing users

### Developer Documentation
- [ ] Update API integration docs
- [ ] Architecture decision records (ADRs)
- [ ] Component storybook entries
- [ ] Type definitions reference

### Code Documentation
- [ ] JSDoc comments for all services
- [ ] Inline comments for complex logic
- [ ] TypeScript strict mode enabled
- [ ] Deprecation notices in old code

---

**Next Step:** Choose which Phase to start with and I'll implement the detailed code!

Would you like me to:
1. **Start with Phase 1** - Create spot services & hooks
2. **Start with Phase 2** - Refactor components
3. **Create specific component** - BuyPanel, SellPanel, etc.
4. **Modify existing** - PortfolioTabContent, OrdersTab, etc.

Which would you prefer? 🚀
