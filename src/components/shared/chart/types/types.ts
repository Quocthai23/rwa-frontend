export type IndicatorType = 'BOLL' | 'EMA' | 'MA' | 'MACD' | 'RSI' | 'KDJ' | 'ATR' | 'none';

export type Order = {
  entryPrice: number;
  entryTime: number; // Unix timestamp in seconds
  exitPrice?: number;
  exitTime?: number;
  id: string;
  pnl?: number;
  status: 'closed' | 'open';
  stopLoss?: number;
  takeProfit?: number;
  type: 'buy' | 'sell';
  volume: number;
};

export type TimeFrame =
  | '10m'
  | '12h'
  | '12m'
  | '15m'
  | '1d'
  | '1h'
  | '1m'
  | '1M'
  | '1w'
  | '20m'
  | '2h'
  | '2m'
  | '30m'
  | '3h'
  | '3m'
  | '4h'
  | '4m'
  | '5m'
  | '6h'
  | '6m'
  | '8h';

export type UnitType = 'LOTS' | 'MARGIN';

// TradingView types
export interface TradingViewWidget {
  onChartReady: (callback: () => void) => void;
  activeChart?: () => TradingViewChart | null;
  chart?: () => TradingViewChart | null;
  remove: () => void;
  applyOverrides?: (overrides: Record<string, unknown>) => void;
}

export interface TradingViewChart {
  createOrderLine: () => Promise<TradingViewOrderLine>;
  setSymbol?: (symbol: string, callback?: () => void) => void;
  setResolution?: (resolution: string, callback?: () => void) => void;
  removeEntity: (id: string | number) => void;
  getAllStudies: () => TradingViewStudy[];
  createStudy: (name: string, isOverlay: boolean, lock: boolean) => Promise<string | number>;
  onVisibleRangeChanged?: () => TradingViewSubscribable<{ from: number; to: number }>;
  onSymbolChanged?: () => TradingViewSubscribable<TradingViewSymbolInfo>;
  getTimeScale?: () => TradingViewTimeScale;
  onStudyCreated?: () => TradingViewSubscribable<string | number>;
  onStudyRemoved?: () => TradingViewSubscribable<void>;
}

export interface TradingViewOrderLine {
  setPrice?: (price: number) => void;
  setQuantity?: (quantity: string) => void;
  setText?: (text: string) => void;
  setLineColor?: (color: string) => void;
  setLineStyle?: (style: number) => void;
  setBodyBackgroundColor?: (color: string) => void;
  setBodyTextColor?: (color: string) => void;
  setBodyBorderColor?: (color: string) => void;
  setTextAlignment?: (alignment: string) => void;
  setCancelButtonVisible?: (visible: boolean) => void;
  setModifyButtonVisible?: (visible: boolean) => void;
  setReverseButtonVisible?: (visible: boolean) => void;
  setCloseButtonVisible?: (visible: boolean) => void;
  remove?: () => void;
}

export interface TradingViewStudy {
  id?: string | number;
  name?: string;
  isOverlay?: boolean;
}

export interface TradingViewSubscribable<T> {
  subscribe: (context: null, callback: (data: T) => void) => void;
}

export interface TradingViewSymbolInfo {
  name?: string;
  ticker?: string;
  full_name?: string;
  description?: string;
  type?: string;
  session?: string;
  timezone?: string;
  minmov?: number;
  pricescale?: number;
  has_intraday?: boolean;
  has_no_volume?: boolean;
  visible_plots_set?: 'ohlcv' | 'ohlc';
  supported_resolutions?: string[];
  volume_precision?: number;
  data_status?: string;
}

export interface TradingViewTimeScale {
  barSpacingChanged: () => TradingViewSubscribable<void>;
  setBarSpacing: (spacing: number) => void;
  barSpacing: () => number;
  rightOffset?: () => number;
  setRightOffset?: (offset: number) => void;
  rightOffsetChanged?: () => TradingViewSubscribable<void>;
}

export interface TradingViewDatafeedConfiguration {
  supported_resolutions: string[];
  supports_search: boolean;
}

export interface TradingViewBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface TradingViewPeriodParams {
  firstDataRequest?: boolean;
  from?: number;
  to?: number;
  countBack?: number;
}

export interface TradingViewHistoryMetadata {
  noData: boolean;
}

export interface TradingViewSearchResult {
  symbol: string;
  ticker: string;
  full_name: string;
  description: string;
  exchange: string;
  type: string;
}

export interface Asset {
  id?: string;
  symbol?: string;
  name?: string;
  description?: string;
  digit?: number;
  category?: {
    code?: string;
  };
}
