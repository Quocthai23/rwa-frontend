import { create } from 'zustand';
import { isDemoAccount } from '@/lib/trading/environment';
import { useAccountStore } from '@/store/useAccountStore';

export const useDemoNoticeStore = create<{ open: boolean; setOpen: (open: boolean) => void }>(
  (set) => ({
    open: false,
    setOpen: (open) => set({ open }),
  }),
);

export function notifyIfDemoAccount(): boolean {
  if (!isDemoAccount(useAccountStore.getState().selectedAccount)) return false;
  useDemoNoticeStore.getState().setOpen(true);
  return true;
}
