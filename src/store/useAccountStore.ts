import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import type { Account } from '../types/account';

const zustandStorage: StateStorage = {
  getItem: (name) => {
    // Use sessionStorage so reload keeps selection, but closing browser resets to default.
    // Guard for SSR / non-browser environments.
    if (typeof window === 'undefined' || !window.sessionStorage) return null;

    const value = window.sessionStorage.getItem(name);

    return value ?? null;
  },
  removeItem: (name) => {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    window.sessionStorage.removeItem(name);
  },
  setItem: (name, value) => {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    window.sessionStorage.setItem(name, value);
  },
};

type AccountState = {
  accounts: Account[];
  clearSelection: () => void;
  hasHydrated: boolean;
  selectAccount: (account: Account) => void;
  selectedAccount: Account | null;
  setAccounts: (accounts: Account[]) => void;
};

export const useAccountStore = create<AccountState>()(
  persist(
    (set, get) => ({
      accounts: [],
      clearSelection: () => {
        set({ selectedAccount: null });
      },
      hasHydrated: false,
      selectAccount: (account) => {
        set({ selectedAccount: account });
      },
      selectedAccount: null,
      setAccounts: (accounts) => {
        // Prevent overwriting persisted selection before hydration finishes (common on refresh).
        if (!get().hasHydrated) {
          set({ accounts });
          return;
        }

        const { selectedAccount } = get();
        // If no account is selected, or the selected account is not in the new list,
        // select the first account from the new list.
        let newSelectedAccount = selectedAccount;

        if (accounts.length > 0) {
          const isSelectedValid =
            selectedAccount && accounts.some((a) => a.id === selectedAccount.id);
          if (!selectedAccount || !isSelectedValid) {
            newSelectedAccount = accounts.find((a) => !a.accountTypeId.includes('demo')) ?? null;
          } else {
            // Update the selected account object with latest data from the list
            newSelectedAccount =
              accounts.find((a) => a.id === selectedAccount.id) ||
              (accounts.find((a) => !a.accountTypeId.includes('demo')) ?? null);
          }
        } else {
          newSelectedAccount = null;
        }

        set({ accounts, selectedAccount: newSelectedAccount });
      },
    }),
    {
      name: 'account-storage',
      partialize: (state) => ({ selectedAccount: state.selectedAccount }), // Only persist selectedAccount
      storage: createJSONStorage(() => zustandStorage),
      onRehydrateStorage: () => (state, error) => {
        if (error || !state) return;

        // Mark hydration complete, then ensure we have a valid selection for the current accounts list.
        state.hasHydrated = true;

        const { accounts, selectedAccount } = useAccountStore.getState();
        if (accounts.length === 0) return;

        const isSelectedValid =
          selectedAccount && accounts.some((a) => a.id === selectedAccount.id);

        if (!selectedAccount || !isSelectedValid) {
          useAccountStore.setState({
            selectedAccount: accounts.find((a) => !a.accountTypeId.includes('demo')) ?? null,
          });
        } else {
          const updated =
            accounts.find((a) => a.id === selectedAccount.id) ||
            (accounts.find((a) => !a.accountTypeId.includes('demo')) ?? null);
          useAccountStore.setState({ selectedAccount: updated });
        }
      },
    },
  ),
);
