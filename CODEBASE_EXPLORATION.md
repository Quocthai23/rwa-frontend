# Frontend Codebase - Key Files & Structure Analysis

## Summary
This document provides a detailed exploration of the frontend codebase structure, focusing on position/portfolio management, trading, and real-time price handling.

---

## 1. PositionWebScreen.tsx - Main Position/Portfolio View

**Path:** [src/components/featured/position/web/PositionWebScreen.tsx](src/components/featured/position/web/PositionWebScreen.tsx)

**Key Exports:**
- `PositionWebScreen` - Main React component (default export)

**Data Structures Used:**
- `PositionWebTab` - Union type: `'positions' | 'orders' | 'position-history' | 'order-history'`
- `PositionsResponse` - From positionService
- `OrderItem[]` - Order list
- `PositionStats` - Statistics about open positions/orders
- `Position` - Individual position data

**Key Features:**
- 4 main tabs: Positions, Orders, Position History, Order History
- Date range filtering for history (persisted in sessionStorage)
- Real-time price updates via `useMarketSocketStore`
- Bulk close positions functionality
- Open orders and positions display
- Account-aware data fetching with `useAccountStore`

**Custom Hooks Used:**
- `useClosePositions(accountId)` - Close positions mutation
- `useCancelOrders(accountId)` - Cancel orders mutation
- `useInfinitePositions()` - Fetch open positions with infinite scroll
- `useInfiniteOrders()` - Fetch open orders with infinite scroll
- `usePositionStats()` - Get position statistics
- `useSymbols()` - Subscribe to symbol data
- `useAuthHydrated()` - Check auth hydration
- `useMarketSocketStore()` - Access real-time prices

**Data Flow:**
1. Fetches open positions and orders via infinite queries
2. Subscribes to relevant symbols for real-time prices
3. Splits positions into profitable/losing
4. Filters orders by status (active vs history)
5. Displays in tabbed interface

---

## 2. tradePanelSubmitOrder.ts - Order Submission Logic

**Path:** [src/components/shared/chart/components/web/tradePanel/utils/tradePanelSubmitOrder.ts](src/components/shared/chart/components/web/tradePanel/utils/tradePanelSubmitOrder.ts)

**Key Exports:**
- `submitTradePanelOrder(sideOverride, params)` - Main order submission function
- `SubmitTradePanelOrderParams` - Type definition for parameters

**Order Submission Parameters:**
```typescript
{
  user: unknown;
  router: { push: (href: string) => void };
  canTrade: boolean;
  showError: (title: string, message: string) => void;
  showSuccess: (title: string, message: string) => void;
  t: TFunction; // i18next translation function
  symbolAsset: Asset | undefined;
  isCreatingOrder: boolean;
  submitLockRef: MutableRefObject<boolean>;
  quantity: string;
  volumeStepNum: number;
  minTradeSize: number;
  maxTradeSize: number;
  setQuantity: (value: string) => void;
  activeTab: TradePanelActiveTab;
  transactionType: 'buy' | 'sell';
  buyTpSlError: string | null;
  sellTpSlError: string | null;
  leverage: number;
  symbol: string;
  selectedAccountId: string;
  sellPrice: DecimalValue;
  buyPrice: DecimalValue;
  calculatedAvailableBalance: number;
  contractSizeNumber: number;
  rtBySymbol: Record<string, any>; // Real-time prices
  limitPrice: string;
  rt: { ask?: DecimalValue; bid?: DecimalValue } | undefined;
  takeProfitTriggerType: TriggerType;
  stopLossTriggerType: TriggerType;
  takeProfitValue: string;
  stopLossValue: string;
  symbolAssetForConvert: Asset | undefined;
  createOrder: (payload: CreateOrderPayload, callbacks) => void;
  refetchPositions: () => void;
  refetchOrders: () => void;
  tradePanelRef: MutableRefObject<TradePanelSheetHandle | null>;
  setIsSubmitLocked: (value: boolean) => void;
}
```

**Validation Checks:**
- User authentication
- Trading availability
- Forex market hours (only for Forex)
- Quantity validation (finite, > 0)
- Min/max trade size validation
- Available balance sufficiency
- Take profit/stop loss error checks

**Data Dependencies:**
- `Asset` data for category/market hours
- Real-time prices (`rt`, `rtBySymbol`)
- Contract size and volume step info
- Account balance

---

## 3. realtimeStore.ts - WebSocket & Real-Time Price Handling

**Path:** [src/store/realtimeStore.ts](src/store/realtimeStore.ts)

**Key Exports:**
- `useRealtimeStore` - Zustand store for real-time data
- Type definitions: `TickerMessage`, `PriceUpdate`, `TradeEvent`, `OrderBookSnapshot`, `MyOrderMatched`

**WebSocket Architecture:**
- **Two WebSocket Namespaces:**
  1. Default `/` namespace - Market ticker (candlesticks, bid/ask)
  2. `/trading` namespace - Order/trade events, order book
  
**Data Types Managed:**
```typescript
type TickerMessage = {
  assetId?: string;
  symbol?: string;
  ask?: number;
  bid?: number;
  change?: number;
  changePercent?: number;
  lastPrice?: number;
  sessionStats?: { high, low, open, prevClose };
  high?: number;
  low?: number;
  open?: number;
  prevClose?: number;
  volume?: number;
  timestamp?: number | string;
};

type PriceUpdate = {
  assetId?: string;
  symbol: string;
  lastPrice: number;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  timestamp: number;
};

type TradeEvent = {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  side: 'BUY' | 'SELL';
  timestamp: number;
};
```

**Store State:**
```typescript
{
  // Connection status
  isConnected: boolean;
  isReconnecting: boolean;
  connectionError: string | null;
  
  // Data storage
  rtBySymbol: Record<string, RT>; // From / namespace
  pricesBySymbol: Record<string, PriceUpdate>; // From /trading namespace
  orderBooks: Record<string, OrderBookSnapshot>;
  lastTrades: Record<string, TradeEvent[]>; // Last 50 per symbol
  
  // Actions
  connect: () => void;
  disconnect: () => void;
  subscribeSymbol: (symbol: string) => void;
  unsubscribeSymbol: (symbol: string) => void;
  getCurrentPrice: (symbol: string) => PriceUpdate | RT | null;
}
```

**Features:**
- Throttled updates (200ms flush interval) to reduce CPU usage
- Batched ticker updates
- Symbol subscription management
- Unified price accessor (prefers /trading namespace, fallback to ticker)
- Automatic reconnection

---

## 4. Services - API Calls

### 4.1 positionService.ts

**Path:** [src/services/positionService.ts](src/services/positionService.ts)

**API Endpoints:**
- `GET /api/position/list` - Fetch positions
- `GET /api/position/stats` - Get position statistics
- `PUT /api/position/{positionId}` - Update position (SL/TP)
- `POST /api/position/close/{positionId}` - Close single position
- `POST /api/position/bulk-close` - Bulk close positions

**Key Functions:**
```typescript
getPositions(params?: GetPositionsParams): Promise<PositionsResponse>
getPositionStats(params?: { accountId: string }): Promise<PositionStats>
updatePosition(positionId: string, params: UpdatePositionParams): Promise<unknown>
closePositions(positionId: string, accountId: string, quantity: string): Promise<unknown>
closeAllPositions(accountId: string, positionIds: string[]): Promise<void>
```

**Query Parameters (GetPositionsParams):**
```typescript
{
  accountId: string; // required
  take?: number; // pagination limit
  skip?: number;
  cursor?: string; // for cursor-based pagination
  symbol?: string;
  side?: number; // 0=BUY, 1=SELL
  fromDate?: string; // YYYY-MM-DD
  toDate?: string; // YYYY-MM-DD
  orderType?: number;
  sortBy?: 'openedAt' | 'closedAt' | 'quantity' | 'symbol' | 'side' | 'realizedPnl';
  sortDir?: 'desc' | 'asc';
  status?: number[]; // e.g., [0, 1] for open
}
```

**Data Structure (Position):**
```typescript
{
  id: string;
  accountId: string;
  symbol: string;
  side: OrderSide; // 0=BUY, 1=SELL
  quantity: string; // decimal precision
  leverage: number;
  margin: string;
  realizedPnl: string;
  openPrice: string;
  closePrice: string | null;
  totalFees: string;
  initialQuantity: string;
  isLiquidation: boolean;
  openedAt: string; // ISO date
  closedAt: string | null;
  lastUpdatedAt: string;
  status: number; // 0=Open, 1=Partially, 2=Closed, etc.
  takeProfitPrice?: string;
  stopLossPrice?: string;
  trailingStop?: string;
  overnightFunding?: string;
  contractSize?: number;
  symbolName?: string;
  profitCurrency?: string;
  unrealizedFees?: string;
  unrealizedSwap: string;
}
```

### 4.2 orderService.ts

**Path:** [src/services/orderService.ts](src/services/orderService.ts)

**API Endpoints:**
- `GET /api/order` - Fetch orders
- `PATCH /api/order?orderId={orderId}&accountId={accountId}` - Update/cancel order
- `POST /api/order?accountId={accountId}` - Bulk cancel orders

**Key Functions:**
```typescript
getOrders(accountId: string): Promise<OrderItem[]>
getOrdersListAPI(params?: GetOrdersParams): Promise<GetOrdersResponse>
updateOrderAPI(orderId: string, accountId: string, payload: UpdateOrderPayload): Promise<GetOrdersResponse>
cancelAllOrdersAPI(accountId: string, orderIds?: string[]): Promise<GetOrdersResponse>
```

**Data Structure (OrderItem):**
```typescript
{
  accountId: string;
  createdAt: string;
  filledQuantity: string;
  id: string;
  initialMargin: string;
  orderType: number; // 0=MARKET, 1=LIMIT
  price: string | null;
  quantity: string;
  remainingQuantity: string;
  side: number; // 0=BUY, 1=SELL
  status: number; // 0=NEW, 1=PARTIALLY_FILLED, 2=FILLED, 3=CANCELLED
  symbol: string;
  updatedAt: string;
  
  // Optional UI fields
  currentPrice?: number;
  realisedPL?: string;
  stopLossPrice?: string;
  takeProfitPrice?: string;
  trailingStop?: string;
  value?: string;
  symbolName?: string;
}
```

### 4.3 marketService.ts

**Path:** [src/services/marketService.ts](src/services/marketService.ts)

**Key Functions:**
- Candlestick data fetching
- Kline data with multiple timeframes
- Trending market data
- Mini charts for symbols

### 4.4 marketDataService.ts

**Path:** [src/services/marketDataService.ts](src/services/marketDataService.ts)

**Key Functions:**
```typescript
marketDataApi.getCandles(params: GetCandlesRequest): Promise<GetCandlesResponse>
marketDataApi.getReferencePrice(params: GetReferencePriceRequest): Promise<ReferencePriceResponse>
marketDataApi.getValuationHistory(params: GetValuationHistoryRequest): Promise<ValuationHistoryResponse>
```

**Resolutions Supported:** `'1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w'`

---

## 5. Custom Hooks - Key Implementation Details

### 5.1 usePosition.ts

**Path:** [src/hook/usePosition.ts](src/hook/usePosition.ts)

**Key Hooks:**
```typescript
// Fetch position statistics
usePositionStats(params: { accountId: string })

// Infinite query for paginated positions
useInfinitePositions(
  params: Omit<GetPositionsParams, 'take' | 'skip' | 'cursor'>,
  pageSize?: number,
  queryScope?: 'active' | 'history'
)

// Mutation to close positions
useClosePositions(accountId: string)
```

**Features:**
- React Query integration with infinite scroll
- Cursor-based pagination via `nextCursor`
- Cache management (TRENDING duration)
- Automatic invalidation on mutations

### 5.2 useOrder.ts

**Path:** [src/hook/useOrder.ts](src/hook/useOrder.ts)

**Key Hooks:**
```typescript
// Infinite query for paginated orders
useInfiniteOrders(
  params: Omit<GetOrdersParams, 'take' | 'skip' | 'cursor'>,
  pageSize?: number,
  queryScope?: 'active' | 'history'
)

// Mutation to cancel orders
useCancelOrders(accountId: string)
```

**Features:**
- Filters cancellable orders (status 0 or 1)
- Handles both array and object responses
- Infinite scroll pagination

### 5.3 useTradingRealtimeSocket.ts

**Path:** [src/hook/useTradingRealtimeSocket.ts](src/hook/useTradingRealtimeSocket.ts)

**Usage:**
```typescript
const {
  isConnected,
  isReconnecting,
  connectionError,
  getCurrentPrice,
  rtBySymbol,
  orderBooks,
  lastTrades,
  pricesBySymbol,
  connect,
  disconnect,
  subscribe,
  unsubscribe,
} = useTradingRealtimeSocket({ symbols: ['BTC/USD', 'ETH/USD'] });
```

**Auto-Features:**
- Auto-subscribes to provided symbols
- Auto-cleanup on unmount
- Auto-connect option (default: true)

### 5.4 useCreateOrder.ts

**Path:** [src/hook/orders/useCreateOrder.ts](src/hook/orders/useCreateOrder.ts)

**API Endpoint:** `POST /api/create-order`

**Usage:**
```typescript
const { mutate: createOrder, isPending, isError } = useCreateOrder();

createOrder({
  accountId: string;
  assetId: string; // UUID
  type: 'MARKET' | 'LIMIT';
  side: 'BUY' | 'SELL';
  quantity: string;
  price?: number; // for LIMIT orders
  maxTotalCost?: number; // for market BUY
  stopLossPrice?: number;
  takeProfitPrice?: number;
  leverage?: number;
});
```

**On Success:**
- Invalidates `['orders']` query
- Invalidates `['infinite-orders']` query
- Invalidates `['positions']` query

---

## 6. Position Management Hooks

### 6.1 useOpeningOrderActions.ts

**Path:** [src/components/featured/position/app/hooks/useOpeningOrderActions.ts](src/components/featured/position/app/hooks/useOpeningOrderActions.ts)

**Purpose:** Unified hook for creating and modifying orders

**Key Parameters:**
- `accountId`, `symbol`, `selectedSymbol`
- Pricing info: `ask`, `bid`, `leverage`, `contractSize`
- Order size: `lotText`, `minTradeSize`, `maxTradeSize`
- TP/SL: `takeProfitText`, `stopLossText`, `takeProfitEnabled`, `stopLossEnabled`
- Validation callbacks: `isTPSLValidForSide()`, `getEntryPrice()`, `getLotAsNumber()`
- UI functions: `showError()`, `showSuccess()`

**Related Hooks:**
- `useOpeningOrderInputs.ts` - Input state management
- `useOpeningOrderPricing.ts` - Price calculations

---

## 7. Position Calculation Utilities

**Path:** [src/components/featured/position/utils/position.calculations.ts](src/components/featured/position/utils/position.calculations.ts)

**Key Functions:**
```typescript
calculatePositionFields(position: Position, rtBySymbol: Record<string, Price>)
calculateOrderMargin(...)
isAvailableBalanceSufficient(...)
getPriceBySide(price: Price, side: number)
getConversionRate(symbol: string, side: number, rtBySymbol: Record<string, Price>, profitCurrency: string)
```

**Features:**
- Decimal precision arithmetic using Decimal.js
- Currency conversion for profit calculations
- PnL calculations
- Margin calculations

---

## 8. All Services Directory

**Path:** [src/services/](src/services/)

**Available Services:**
- `accountService.ts` - Account management
- `apiClient.ts` - HTTP client wrapper
- `assetsService.ts` - Asset data
- `auth.ts` - Authentication
- `baseUrl.ts` - API base URLs
- `calendarService.ts` - Economic calendar
- `externalApiClient.ts` - External APIs
- `feedbackService.ts` - Feedback submission
- `imageService.ts` - Image uploads
- `marketDataService.ts` - Historical market data
- `marketService.ts` - Market data
- `newsService.ts` - News feeds
- `notificationService.ts` - Notifications
- `orderService.ts` - Order management
- `paymentService.ts` - Payment processing
- `positionService.ts` - Position management
- `postService.ts` - Social posts
- `referralService.ts` - Referral program
- `reward.service.ts` - Rewards
- `strategyService.ts` - Copy trading strategies
- `supportService.ts` - Support tickets
- `tokenStorage.ts` - Token persistence
- `userService.ts` - User profile

---

## 9. All Custom Hooks Directory

**Path:** [src/hook/](src/hook/)

**Key Hooks by Category:**

**Position & Orders:**
- `usePosition.ts` - Position data & mutations
- `useOrder.ts` - Order data & mutations
- `orders/useCreateOrder.ts` - Order creation

**Real-Time Data:**
- `useTradingRealtimeSocket.ts` - WebSocket integration
- `useSymbols.ts` - Symbol subscriptions
- `useReferencePrice.ts` - Reference prices

**Market Data:**
- `useKlineData.ts` - Candlestick data
- `useCandlestickData.ts` - Candlestick rendering
- `useMinichartData.ts` - Mini chart data
- `useTrendingMarket.ts` - Trending assets

**Account & Auth:**
- `useAccount.ts` - Account information
- `useAccountBalance.ts` - Account balance
- `useAccountSummaryMetrics.ts` - Account stats
- `useAuthHydrated.ts` - Auth hydration check

**UI & Utilities:**
- `useToast.ts` - Toast notifications
- `useMediaQuery.ts` - Responsive design
- `useDebouncedValue.ts` - Debounced values
- `useCalendarEvents.ts` - Economic events

**Other:**
- `useAssetsMarketData.ts` - Combined asset market data
- `useNews.ts` - News feeds
- `useNotifications.ts` - Push notifications
- `useReferralStats.ts` - Referral statistics
- `useStrategyPage.ts` - Copy trading strategies
- `useValuationHistory.ts` - Historical valuations

---

## 10. Type Definitions

### 10.1 Position Type

**File:** [src/types/position.ts](src/types/position.ts)

```typescript
type Position = {
  id: string;
  accountId: string;
  symbol: string;
  side: OrderSide; // 0 = BUY, 1 = SELL
  quantity: string; // decimal
  leverage: number;
  margin: string;
  realizedPnl: string;
  openPrice: string;
  closePrice: string | null;
  totalFees: string;
  initialQuantity: string;
  isLiquidation: boolean;
  openedAt: string;
  closedAt: string | null;
  lastUpdatedAt: string;
  status: number;
  takeProfitPrice?: string;
  stopLossPrice?: string;
  unrealizedSwap: string;
};

type PositionsResponse = {
  data: Position[];
  total: number;
  nextCursor?: string;
};

type PositionStats = {
  positionSymbols: string[];
  fxRateSymbols: string[];
  openPositions: number;
  openOrders: number;
};
```

### 10.2 Order Types

**File:** [src/types/orders.ts](src/types/orders.ts)

```typescript
// Enums for display
enum OrderStatus {
  NEW = 0,
  PARTIALLY_FILLED = 1,
  FILLED = 2,
  CANCELLED = 3,
  REJECTED = 4,
}

enum OrderSide {
  BUY = 0,
  SELL = 1,
}

// API types
type CreateOrderPayload = {
  accountId: string;
  assetId: string; // UUID
  type: 'MARKET' | 'LIMIT';
  side: 'BUY' | 'SELL';
  quantity: string;
  price?: number; // for LIMIT
  maxTotalCost?: number; // for market BUY
  stopLossPrice?: number;
  takeProfitPrice?: number;
  leverage?: number;
};

type OrderItem = {
  accountId: string;
  createdAt: string;
  filledQuantity: string;
  id: string;
  initialMargin: string;
  orderType: number; // 0=MARKET, 1=LIMIT
  price: string | null;
  quantity: string;
  remainingQuantity: string;
  side: number; // 0=BUY, 1=SELL
  status: number;
  symbol: string;
  updatedAt: string;
};

type GetOrdersResponse = {
  data: OrderItem[];
  total?: number;
  nextCursor?: string;
};
```

---

## 11. API Client Architecture

**Base URLs:**
- Server-side: Uses backend API directly (via `POSITIONS_ENDPOINTS`, `ORDERS_ENDPOINTS`)
- Client-side: Uses Next.js API routes (`/api/position/*`, `/api/order/*`, etc.)
- Base URL constant: `CLIENT_BASE_URL`

**HTTP Client:** `apiClient` from `@/services/apiClient`

**Features:**
- Automatic authentication header injection
- Request/response serialization
- Error handling
- SSR support (server vs client routes)

---

## 12. State Management

**Zustand Stores:**
- `useRealtimeStore` - Real-time price updates
- `useMarketSocketStore` - Market data subscriptions
- `useAccountStore` - Selected account
- `useAuthStore` - Authentication state

**React Query:**
- Query caching with `gcTime` and `staleTime`
- Infinite queries for pagination
- Mutation callbacks for invalidation
- Window focus refetch

---

## 13. Data Flow Diagram

```
PositionWebScreen (Main Component)
    ↓
    ├── useInfinitePositions() [React Query]
    │   └── positionService.getPositions()
    │       └── GET /api/position/list
    │           ├── Real-time prices from useMarketSocketStore
    │           └── Updates rtBySymbol
    │
    ├── useInfiniteOrders() [React Query]
    │   └── orderService.getOrdersListAPI()
    │       └── GET /api/order
    │
    ├── usePositionStats()
    │   └── positionService.getPositionStats()
    │       └── GET /api/position/stats
    │
    ├── useTradingRealtimeSocket()
    │   └── useRealtimeStore
    │       └── WebSocket connections:
    │           ├── Default "/" namespace (ticker)
    │           └── "/trading" namespace (trades/orders)
    │
    └── TradePanelSubmitOrder
        ├── Validates order parameters
        ├── Checks market hours (Forex)
        └── useCreateOrder mutation
            └── POST /api/create-order
                ├── Invalidates ['orders']
                ├── Invalidates ['infinite-orders']
                └── Invalidates ['positions']
```

---

## Summary Table

| Component | Path | Purpose | Main APIs |
|-----------|------|---------|-----------|
| PositionWebScreen | `featured/position/web/PositionWebScreen.tsx` | Portfolio view with 4 tabs | GET `/api/position/*`, `/api/order/*` |
| tradePanelSubmitOrder | `shared/chart/components/web/tradePanel/utils/tradePanelSubmitOrder.ts` | Order submission logic | Validation, createOrder mutation |
| realtimeStore | `store/realtimeStore.ts` | WebSocket & real-time prices | Two WS namespaces |
| positionService | `services/positionService.ts` | Position CRUD operations | GET/PUT/POST `/api/position/*` |
| orderService | `services/orderService.ts` | Order CRUD operations | GET/PATCH/POST `/api/order*` |
| usePosition | `hook/usePosition.ts` | Position queries & mutations | React Query hooks |
| useOrder | `hook/useOrder.ts` | Order queries & mutations | React Query hooks |
| useTradingRealtimeSocket | `hook/useTradingRealtimeSocket.ts` | WebSocket wrapper | Real-time data access |
| useCreateOrder | `hook/orders/useCreateOrder.ts` | Order creation mutation | POST `/api/create-order` |

