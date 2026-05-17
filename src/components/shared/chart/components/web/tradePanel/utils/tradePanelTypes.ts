export interface TradePanelSheetHandle {
  open: (
    param?: 'orderLimit' | 'buySell' | 'buy' | 'sell',
    options?: {
      defaultTab?: 'Market' | 'Limit';
      quantity?: string;
    },
  ) => void;
  close: () => void;
  isOpen: () => boolean;
}
