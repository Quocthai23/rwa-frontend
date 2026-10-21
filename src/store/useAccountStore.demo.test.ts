import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAccountStore } from './useAccountStore';
import type { Account } from '@/types/account';
const account = (id: string, type: string) => ({ id, accountTypeId: type }) as Account;
afterEach(() => {
  vi.unstubAllGlobals();
  useAccountStore.setState({ selectedAccount: null, accounts: [], hasHydrated: true });
});
describe('shared-screen Demo/Live account selection', () => {
  it('selects Demo on the same screen without navigation', () => {
    const assign = vi.fn();
    vi.stubGlobal('window', { location: { assign } });
    const demo = account('demo', 'account-type-demo-standard');
    useAccountStore.getState().selectAccount(demo);
    expect(assign).not.toHaveBeenCalled();
    expect(useAccountStore.getState().selectedAccount).toEqual(demo);
  });
  it('defaults to Live when there is no prior selection', () => {
    const live = account('live', 'account-type-standard');
    useAccountStore.setState({ hasHydrated: true, selectedAccount: null });
    useAccountStore.getState().setAccounts([account('demo', 'account-type-demo-standard'), live]);
    expect(useAccountStore.getState().selectedAccount).toEqual(live);
  });
  it('preserves Demo and updates its server balance after polling', () => {
    const demo = account('demo', 'account-type-demo-standard');
    useAccountStore.setState({ hasHydrated: true, selectedAccount: demo });
    useAccountStore
      .getState()
      .setAccounts([
        { ...demo, availableBalance: '999000000' },
        account('live', 'account-type-standard'),
      ]);
    expect(useAccountStore.getState().selectedAccount?.id).toBe('demo');
    expect(useAccountStore.getState().selectedAccount?.availableBalance).toBe('999000000');
  });
});
