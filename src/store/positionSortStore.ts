import { create } from 'zustand';
import dayjs from 'dayjs';

export type SortDirection = 'asc' | 'desc' | null;
export type TabType = 'Positions' | 'Orders' | 'Position History' | 'Order History';
export type HistoryFilterPeriod =
  | '1 month'
  | '1 week'
  | '1 year'
  | '3 months'
  | '6 months'
  | 'Custom';
export type HistoryFilterDirection = 'All' | 'Buy' | 'Sell';

export type HistoryFilter = {
  period: HistoryFilterPeriod;
  direction: HistoryFilterDirection;
  customStartDate: string;
  customEndDate: string;
};

export const DEFAULT_HISTORY_FILTER: HistoryFilter = {
  period: '1 week',
  direction: 'All',
  customStartDate: '',
  customEndDate: dayjs().format('YYYY-MM-DD'),
};

interface TabSortState {
  sort: string | null;
  direction: SortDirection;
}

interface PositionSortState {
  tabSorts: Record<TabType, TabSortState>;
  positionHistoryFilter: HistoryFilter;
  orderHistoryFilter: HistoryFilter;
  getTabSort: (tab: TabType) => TabSortState;
  setTabSort: (tab: TabType, sort: string | null, direction: SortDirection) => void;
  clearTabSort: (tab: TabType) => void;
  setPositionHistoryFilter: (filter: HistoryFilter) => void;
  setOrderHistoryFilter: (filter: HistoryFilter) => void;
  resetPositionHistoryFilter: () => void;
  resetOrderHistoryFilter: () => void;
}

export const usePositionSortStore = create<PositionSortState>((set, get) => ({
  tabSorts: {
    Positions: { sort: null, direction: null },
    Orders: { sort: null, direction: null },
    'Position History': { sort: null, direction: null },
    'Order History': { sort: null, direction: null },
  },
  positionHistoryFilter: DEFAULT_HISTORY_FILTER,
  orderHistoryFilter: DEFAULT_HISTORY_FILTER,
  getTabSort: (tab: TabType) => {
    return get().tabSorts[tab];
  },
  setTabSort: (tab: TabType, sort: string | null, direction: SortDirection) => {
    set((state) => ({
      tabSorts: {
        ...state.tabSorts,
        [tab]: { sort, direction },
      },
    }));
  },
  clearTabSort: (tab: TabType) => {
    set((state) => ({
      tabSorts: {
        ...state.tabSorts,
        [tab]: { sort: null, direction: null },
      },
    }));
  },
  setPositionHistoryFilter: (filter: HistoryFilter) => {
    set({ positionHistoryFilter: filter });
  },
  setOrderHistoryFilter: (filter: HistoryFilter) => {
    set({ orderHistoryFilter: filter });
  },
  resetPositionHistoryFilter: () => {
    set({ positionHistoryFilter: DEFAULT_HISTORY_FILTER });
  },
  resetOrderHistoryFilter: () => {
    set({ orderHistoryFilter: DEFAULT_HISTORY_FILTER });
  },
}));
