import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type AccountLeverageState = {
  accountLeverageById: Record<string, number>;
  clearPreferredLeverages: () => void;
  setPreferredLeverage: (accountId: string, leverage: number) => void;
  syncPreferredLeverages: (
    accounts: Array<{
      id?: string;
      leverage?: unknown;
    }>,
  ) => void;
};

export const useAccountLeverageStore = create<AccountLeverageState>()(
  persist(
    (set) => ({
      accountLeverageById: {},
      clearPreferredLeverages: () => {
        set({ accountLeverageById: {} });
      },
      setPreferredLeverage: (accountId, leverage) => {
        if (!accountId) return;

        const parsed = Number.parseInt(String(leverage), 10);
        if (!Number.isFinite(parsed) || parsed <= 0) return;

        set((state) => ({
          accountLeverageById: {
            ...state.accountLeverageById,
            [accountId]: parsed,
          },
        }));
      },
      syncPreferredLeverages: (accounts) => {
        set((state) => {
          const nextById: Record<string, number> = {};

          accounts.forEach((account) => {
            const accountId = account?.id;
            if (!accountId) {
              return;
            }

            const existingLeverage = state.accountLeverageById[accountId];
            if (Number.isFinite(existingLeverage) && existingLeverage > 0) {
              nextById[accountId] = existingLeverage;
            }

            const parsedFromApi = Number.parseInt(String(account?.leverage), 10);
            if (Number.isFinite(parsedFromApi) && parsedFromApi > 0) {
              nextById[accountId] = parsedFromApi;
            }
          });

          return { accountLeverageById: nextById };
        });
      },
    }),
    {
      name: 'account-leverage-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
