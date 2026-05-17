// types/order.ts
/**
 * UI Display Enums
 */
export enum OrderType {
  MARKET = 'Market Execution',
  LIMIT = 'Limit',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  OPEN = 'OPEN',
  PARTIALLY_FILLED = 'PARTIALLY_FILLED',
  FILLED = 'FILLED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

/**
 * API String Enums (Used for backend communication)
 */
export const ORDER_TYPES = {
  LIMIT: 'LIMIT',
  MARKET: 'MARKET',
} as const;

export const ORDER_SIDES_API = {
  BUY: 'BUY',
  SELL: 'SELL',
} as const;

export const ORDER_SIDES = ORDER_SIDES_API;

/**
 * Order submission payload sent to backend API
 * Uses string enums and UUIDs for maximum precision and safety
 */
export type CreateOrderPayload = {
  accountId: string;
  /** Asset UUID (not symbol) - uniquely identifies the trading asset */
  assetId: string;
  /** Order type: 'MARKET' or 'LIMIT' */
  type: 'MARKET' | 'LIMIT';
  /** Order side: 'BUY' or 'SELL' */
  side: 'BUY' | 'SELL';
  /** Quantity as string to maintain decimal precision (no floating point errors) */
  quantity: string;
  /** Entry price for LIMIT orders (required for LIMIT, optional for MARKET) */
  price?: string;
  /** Maximum total cost for Market BUY orders (to prevent slippage) */
  maxTotalCost?: string;
  /** Idempotency key to prevent duplicate submissions */
  idempotencyKey?: string;
};

export type CreateOrderResponse = {
  orderId: string;
  status: string;
};

export type GetOrdersParams = {
  accountId?: string; // Optional, FE có thể bỏ qua

  orderType?: 'MARKET' | 'LIMIT';
  side?: 'BUY' | 'SELL';

  skip?: number; // default 0
  sortBy?: OrdersSortBy; // default createdAt
  sortDir?: SortDir; // default desc
  status?: ('PENDING' | 'OPEN' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED' | 'REJECTED')[];
  symbol?: string;
  take?: number; // default 20
  cursor?: string;
  // Used for server-side time range filtering (YYYY-MM-DD)
  fromDate?: string;
  toDate?: string;
};

export type GetOrdersResponse = {
  data: OrderItem[];
  total?: number;
  nextCursor?: string;
};

export type OrderItem = {
  accountId: string;
  createdAt: string;
  updatedAt: string;
  id: string;
  assetId: string;
  symbol: string;
  symbolName?: string;
  orderType: 'MARKET' | 'LIMIT';
  side: 'BUY' | 'SELL';
  status: string;
  quantity: string;
  filledQuantity: string;
  remainingQuantity: string;
  price: string | null;
  executedPrice?: string; // Actual fill price (Spot)
  totalCost?: string; // Filled qty * executedPrice
  fee?: string; // Trading fee
  // Optional fields for UI
  currentPrice?: number;
  value?: string;
};

export type OrdersSortBy = 'createdAt' | 'orderType' | 'quantity' | 'side' | 'symbol';

export type SortDir = 'asc' | 'desc';
