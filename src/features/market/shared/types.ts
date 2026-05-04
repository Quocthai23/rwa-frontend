export interface MarketTabVM {
  id: string;
  label: string;
}

export interface MarketRowVM {
  id: string;
  symbol: string;
  name: string;
  categoryCode: string;
  categoryName: string;
  askText: string;
  bidText: string;
  spreadText: string;
  digit: number;
  askValue: number;
  bidValue: number;
  initialHigh: number;
  initialLow: number;
  spreadValue: number;
  isActive: boolean;
  isFavorite: boolean;
}

export interface GetRowsOptions {
  marketOpenOnly?: boolean;
  search?: string;
}
