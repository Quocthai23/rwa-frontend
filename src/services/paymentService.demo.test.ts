import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAccountStore } from '@/store/useAccountStore';
import type { Account } from '@/types/account';
const post = vi.hoisted(() => vi.fn());
vi.mock('./apiClient', () => ({ apiClient: { post } }));
import { withdraw, transferAPI, payosCheckout, createWallet } from './paymentService';
afterEach(() => {
  vi.unstubAllGlobals();
  useAccountStore.setState({ selectedAccount: null });
  post.mockReset();
});
describe('payment entry points in Demo', () => {
  it('rejects before any payment network call', async () => {
    vi.stubGlobal('window', {});
    useAccountStore.setState({
      selectedAccount: { id: 'demo', accountTypeId: 'account-type-demo-standard' } as Account,
    });
    expect(() => withdraw({} as never)).toThrow('live-mode-required');
    expect(() => transferAPI({} as never)).toThrow('live-mode-required');
    expect(() => createWallet({} as never)).toThrow('live-mode-required');
    await expect(payosCheckout({} as never)).rejects.toThrow('live-mode-required');
    expect(post).not.toHaveBeenCalled();
  });
});
