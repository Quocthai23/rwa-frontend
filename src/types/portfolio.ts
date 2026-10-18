/**
 * Portfolio types for Spot trading model
 * Replaces Position concept with asset holdings management
 */

export type PortfolioItem = {
  assetId: string;
  symbol: string;
  name: string;
  quantity: string;
  availableQuantity?: string;
  lockedQuantity?: string;
  averageBuyPrice: string;
  currentPrice: string;
  totalValue: string; // quantity * currentPrice
  profitLoss: string; // Current value - Original cost
  profitLossPercent: string;
  allocatedBalance: string;
  currency: string;
  category?: string;
  lastUpdatedAt: string;
};

export type PortfolioOverview = {
  totalValue: string;
  totalInvested: string;
  totalProfitLoss: string;
  totalProfitLossPercent: string;
  assets: PortfolioItem[];
  updatedAt: string;
};

export type PortfoliosResponse = {
  data: PortfolioItem[];
  total: number;
  nextCursor?: string;
};
