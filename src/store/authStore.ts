import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import type { User } from '../types/auth';

const zustandStorage: StateStorage = {
  getItem: (name) => {
    const value = localStorage.getItem(name);

    return value ?? null;
  },
  removeItem: (name) => {
    localStorage.removeItem(name);
  },
  setItem: (name, value) => {
    localStorage.setItem(name, value);
  },
};

type AuthState = {
  completeOnboarding: () => void;
  hasSeenOnboarding: boolean;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (partial: Partial<User>) => void;
  user: undefined | User;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      completeOnboarding: () => set({ hasSeenOnboarding: true }),
      hasSeenOnboarding: false,
      isAuthenticated: false,
      login: (user) => set({ isAuthenticated: true, user }),
      logout: () => {
        localStorage.removeItem('mfa-flow');
        localStorage.removeItem('authenticator-app-data');
        localStorage.removeItem('authenticator-app-verified');
        localStorage.removeItem('mfa-setup-totp');
        set({ isAuthenticated: false, user: undefined });
      },
      updateUser: (partial) =>
        set((state) => ({
          user: state.user != null ? { ...state.user, ...partial } : state.user,
        })),
      user: undefined,
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        hasSeenOnboarding: state.hasSeenOnboarding,
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
