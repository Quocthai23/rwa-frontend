import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { FeatureId } from '@/constants/featuresConfig';

// Constants
const SEARCH_HISTORY_LIMIT = 20;

// Types
export type Language = string;
type CurrencyCode = 'EUR' | 'GBP' | 'JPY' | 'USD' | 'VND';

interface AppState {
  // Auth
  accessToken: string | undefined;
  clearAuth: () => void;
  refreshToken: string | undefined;
  setAccessToken: (accessToken: string) => void;
  setRefreshToken: (refreshToken: string) => void;

  // Theme
  isDarkMode: boolean;
  toggleTheme: () => void;

  // Language
  language: 'vi-VN' | Language | undefined;
  setLanguage: (language: 'vi-VN' | Language) => void;

  // Currency
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;

  // Search history
  addSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;
  searchHistory: string[];

  // UI state
  isFirstLaunch: boolean;
  setFirstLaunch: (value: boolean) => void;

  // Quick Access
  quickAccessKeys: string[];
  setQuickAccessKeys: (keys: string[]) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth
      accessToken: undefined,
      refreshToken: undefined,
      clearAuth: () => {
        set({
          accessToken: undefined,
          refreshToken: undefined,
        });
      },
      setAccessToken: (accessToken: string) => {
        set({ accessToken });
      },
      setRefreshToken: (refreshToken: string) => set({ refreshToken }),

      // Theme
      isDarkMode: false,
      toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

      // Language
      language: undefined,
      setLanguage: (language) => set({ language }),

      // Currency
      currency: 'USD',
      setCurrency: (currency) => set({ currency }),

      // Search history
      searchHistory: [],
      addSearchHistory: (query: string) =>
        set((state) => {
          const filtered = state.searchHistory.filter((q) => q !== query);

          return {
            searchHistory: [query, ...filtered].slice(0, SEARCH_HISTORY_LIMIT),
          };
        }),
      clearSearchHistory: () => set({ searchHistory: [] }),

      // UI state
      isFirstLaunch: true,
      setFirstLaunch: (value: boolean) => set({ isFirstLaunch: value }),

      // Quick Access
      quickAccessKeys: [
        FeatureId.Deposit,
        FeatureId.Withdraw,
        FeatureId.Transfer,
        FeatureId.History,
        FeatureId.Social,
        FeatureId.Copy,
      ],
      setQuickAccessKeys: (keys: string[]) => set({ quickAccessKeys: keys }),
    }),
    {
      name: 'app-storage-v2',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
