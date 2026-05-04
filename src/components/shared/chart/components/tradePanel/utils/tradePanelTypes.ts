export interface TradePanelSheetHandle {
  open: (
    param?: 'orderLimit' | 'buySell' | 'buy' | 'sell',
    options?: {
      defaultTab?: 'Market' | 'Limit' | 'Stop';
      quantity?: string;
    },
  ) => void;
  close: () => void;
  isOpen: () => boolean;
}
