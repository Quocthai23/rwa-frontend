import { useAccountStore } from '@/store/useAccountStore';
import { isDemoAccount } from '@/lib/trading/environment';
// Only the explicit trading services use this resolver; payments/DAO are never rerouted.
export function demoTradingEndpoint(
  accountId: string | undefined | null,
  resource:
    | 'orders'
    | 'bulk-cancel'
    | 'portfolio/overview'
    | 'portfolio/items'
    | 'history'
    | 'balance'
    | 'reset',
  orderId?: string,
  write = false,
) {
  if (typeof window === 'undefined') return null;
  const { selectedAccount, accounts } = useAccountStore.getState();
  if (!accountId) {
    if (isDemoAccount(selectedAccount) || write) throw new Error('trading-account-changed');
    return null;
  }
  if (accountId !== selectedAccount?.id) {
    const requested = accounts.find((a) => a.id === accountId);
    if (write || !requested || isDemoAccount(requested) !== isDemoAccount(selectedAccount))
      throw new Error('trading-account-changed');
  }
  const account = accounts.find((a) => a.id === accountId) ?? selectedAccount;
  if (!isDemoAccount(account)) return null;
  return '/api/demo-trading/' + resource + (orderId ? '/' + encodeURIComponent(orderId) : '');
}

export function assertLiveTradingMode() {
  if (typeof window !== 'undefined' && isDemoAccount(useAccountStore.getState().selectedAccount))
    throw new Error('live-mode-required');
}
