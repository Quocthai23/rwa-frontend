import { OrderSide } from '@/types/orders';

export type Position = {
  id: string;
  accountId: string;
  symbol: string;
  side: OrderSide;
  quantity: string;
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
  trailingStop?: string;
  overnightFunding?: string;
  digit?: number;
  contractSize?: number;
  symbolName?: string;
  profitCurrency?: string;
  unrealizedFees?: string;
  unrealizedSwap: string;
  realizedFees?: string;
  realizedSwap?: string;
  closedBy?: number;
};

export type PositionsResponse = {
  data: Position[];
  total: number;
  nextCursor?: string;
};

export type PositionStats = {
  positionSymbols: string[];
  fxRateSymbols: string[];
  openPositions: number;
  openOrders: number;
};
