import { create } from 'zustand';

type TransactionState = {
  isShowQuickTrade: boolean;
  isShowTradePanel: boolean;
  quickBuy: boolean;

  setIsShowQuickTrade: (isShow: boolean) => void;
  setIsShowTradePanel: (isShow: boolean) => void;
  setQuickBuy: (isBuy: boolean) => void;

  setSymbolTrade: (symbol: string) => void;
  setTransactionType: (type: 'buy' | 'sell') => void;

  symbolTrade: string;
  toggleQuickTrade: () => void;

  toggleTradePanel: () => void;
  transactionType: 'buy' | 'sell';
};

export const useTransactionStore = create<TransactionState>((set) => ({
  isShowQuickTrade: false,
  isShowTradePanel: false,
  quickBuy: true,
  setIsShowQuickTrade: (isShow) => {
    set({ isShowQuickTrade: isShow });
  },
  setIsShowTradePanel: (isShow) => {
    set({ isShowTradePanel: isShow });
  },
  setQuickBuy: (isBuy) => {
    set({ quickBuy: isBuy });
  },
  setSymbolTrade: (symbol) => {
    set({ symbolTrade: symbol });
  },
  setTransactionType: (type) => {
    set({ transactionType: type });
  },
  symbolTrade: '',
  toggleQuickTrade: () => {
    set((state) => ({ isShowQuickTrade: !state.isShowQuickTrade }));
  },
  toggleTradePanel: () => {
    set((state) => ({ isShowTradePanel: !state.isShowTradePanel }));
  },
  transactionType: 'buy',
}));
