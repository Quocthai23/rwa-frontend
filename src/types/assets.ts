/**
 * Trading Asset Types
 */

export type Category = {
  code: string;
  description: string;
  id: string;
  marginMultiplier: string;
  name: string;
};

export type CategoriesResponse = {
  data: Category[];
};

export type SwapRates = {
  [day: number]: number;
};

export type Asset = {
  ask: string;
  bid: string;
  category: {
    // "code": "FOREX",
    // "name": "Forex",
    // "description": "Foreign exchange currency pairs",
    // "marginMultiplier": "1"
    code: string;
    description: string;
    marginMultiplier: string;
    name: string;
  };
  categoryId: string;
  chartMode: number;
  contractSize: string;
  createdAt: string;
  digit: number;
  id: string;
  isActive: boolean;
  isFavorite?: boolean;
  isHot?: boolean;
  marginCurrency: string;
  marginMultiplier: string;
  maxTradeSize: string;
  minTradeSize: string;
  name: string;
  profitCurrency: string;
  spread: string;
  symbol: string;
  updatedAt: string;
  volumeStep?: string;
  pipSize?: string;
  logo?: string;
  swapLong?: string;
  swapShort?: string;
  swapRates?: SwapRates;
};

export type AssetMarketData = {
  sellPrice?: number;
  buyPrice?: number;
  spread?: number;
  volume?: number;
  sellPercent?: number;
  buyPercent?: number;
  chgPercent?: number;
  low?: number;
  lastUpdated?: string;
  source?: string;
};

export type ToggleFavoriteAssetRequest = {
  assetId: string;
};

export type ToggleFavoriteAssetResponse = {
  isFavorite: boolean;
};

export type AssetItem = Asset;

export type AssetsResponse = {
  data: Asset[];
  total: number;
};

export type GetAssetsParams = {
  categoryCode?: string;
  search?: string; // debounced search
  skip?: number; // default 0
  take?: number; // default 20
};

export type GetAssetsResponse = AssetsResponse;
