// types/order.ts
export enum OrderType {
  MARKET = 'Market Execution',
  LIMIT = 'Limit',
  STOP = 'Stop',
  MODIFY = 'Modify Position',
}

export enum OrderStatus {
  NEW = 0,
  PARTIALLY_FILLED = 1,
  FILLED = 2,
  CANCELLED = 3,
  REJECTED = 4,
}

export enum OrderSide {
  BUY = 0,
  SELL = 1,
}

export enum OrderTypeCode {
  MARKET = 0,
  LIMIT = 1,
  STOP = 2,
}

export enum ClosedBy {
  MANUAL = 0,
  TAKE_PROFIT = 1,
  STOP_LOSS = 2,
  LIQUIDATION = 3,
}

export const ORDER_TYPES = {
  LIMIT: 'LIMIT',
  MARKET: 'MARKET',
} as const;

export { OrderSide as ORDER_SIDES, OrderTypeCode as ORDER_TYPE_CODES, ClosedBy as CLOSED_BY };

export type CreateOrderPayload = {
  accountId: string;
  leverage: number;
  orderType: OrderTypeCode.MARKET | OrderTypeCode.LIMIT | OrderTypeCode.STOP;
  quantity: number;
  side: OrderSide;
  stopLossPrice?: number;
  symbol: string; // "XAUUSD"
  takeProfitPrice?: number;
  price?: number; // Required for limit orders
};

export type CreateOrderResponse = {
  orderId: string;
  status: string;
};

export type GetOrdersParams = {
  accountId: string; // required

  orderType?: OrderTypeCode;
  side?: OrderSide;

  skip?: number; // default 0
  sortBy?: OrdersSortBy; // default createdAt
  sortDir?: SortDir; // default desc
  status?: number[]; // default [0, 1, 2, 3]
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
  filledQuantity: string;
  id: string;
  initialMargin: string;
  leverage: number;
  orderType: number;
  price: string | null;
  quantity: string;
  remainingQuantity: string;
  side: number;
  status: number;
  symbol: string;
  updatedAt: string;
  // Optional fields for UI
  currentPrice?: number;
  realisedPL?: string;
  stopLossPrice?: string;
  takeProfitPrice?: string;
  trailingStop?: string;
  value?: string;
  symbolName?: string;
};

export type OrdersSortBy = 'createdAt' | 'orderType' | 'quantity' | 'side' | 'symbol';

export type SortDir = 'asc' | 'desc';
