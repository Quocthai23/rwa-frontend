import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type MarketViewType = 'spread' | 'chart';

type MarketListPreferencesState = {
  sortByIdByKey: Record<string, string>;
  viewTypeByKey: Record<string, MarketViewType>;
  filterOnlyFavoriteByKey: Record<string, boolean>;
  filterCategoriesByKey: Record<string, string[]>;
  filterStatusByKey: Record<string, string>;
  getSortById: (key: string) => string | undefined;
  setSortById: (key: string, sortById: string) => void;
  getViewType: (key: string) => MarketViewType | undefined;
  setViewType: (key: string, viewType: MarketViewType) => void;
  getFilterOnlyFavorite: (key: string) => boolean | undefined;
  setFilterOnlyFavorite: (key: string, value: boolean) => void;
  getFilterCategories: (key: string) => string[] | undefined;
  setFilterCategories: (key: string, categories: string[]) => void;
  getFilterStatus: (key: string) => string | undefined;
  setFilterStatus: (key: string, statusId: string) => void;
  clear: () => void;
};

export const useMarketListPreferencesStore = create<MarketListPreferencesState>()(
  persist(
    (set, get) => ({
      sortByIdByKey: {},
      viewTypeByKey: {},
      filterOnlyFavoriteByKey: {},
      filterCategoriesByKey: {},
      filterStatusByKey: {},
      getSortById: (key) => get().sortByIdByKey[key],
      setSortById: (key, sortById) =>
        set((state) => ({
          sortByIdByKey: {
            ...state.sortByIdByKey,
            [key]: sortById,
          },
        })),
      getViewType: (key) => get().viewTypeByKey[key],
      setViewType: (key, viewType) =>
        set((state) => ({
          viewTypeByKey: {
            ...state.viewTypeByKey,
            [key]: viewType,
          },
        })),
      getFilterOnlyFavorite: (key) => get().filterOnlyFavoriteByKey[key],
      setFilterOnlyFavorite: (key, value) =>
        set((state) => ({
          filterOnlyFavoriteByKey: {
            ...state.filterOnlyFavoriteByKey,
            [key]: value,
          },
        })),
      getFilterCategories: (key) => get().filterCategoriesByKey[key],
      setFilterCategories: (key, categories) =>
        set((state) => ({
          filterCategoriesByKey: {
            ...state.filterCategoriesByKey,
            [key]: categories,
          },
        })),
      getFilterStatus: (key) => get().filterStatusByKey[key],
      setFilterStatus: (key, statusId) =>
        set((state) => ({
          filterStatusByKey: {
            ...state.filterStatusByKey,
            [key]: statusId,
          },
        })),
      clear: () =>
        set({
          sortByIdByKey: {},
          viewTypeByKey: {},
          filterOnlyFavoriteByKey: {},
          filterCategoriesByKey: {},
          filterStatusByKey: {},
        }),
    }),
    {
      name: 'market-list-preferences',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sortByIdByKey: state.sortByIdByKey,
        viewTypeByKey: state.viewTypeByKey,
      }),
      merge: (persistedState, currentState) => {
        const base =
          (persistedState as MarketListPreferencesState) || ({} as MarketListPreferencesState);

        return {
          ...currentState,
          ...base,
          filterOnlyFavoriteByKey: {},
          filterCategoriesByKey: {},
          filterStatusByKey: {},
        };
      },
    },
  ),
);
