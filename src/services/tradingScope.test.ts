import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAccountStore } from '@/store/useAccountStore';
import type { Account } from '@/types/account';
import { demoTradingEndpoint, assertLiveTradingMode } from './tradingScope';
const live = { id: 'live', accountTypeId: 'account-type-standard' } as Account;
const demo = { id: 'demo', accountTypeId: 'account-type-demo-standard' } as Account;
afterEach(() => {
  vi.unstubAllGlobals();
  useAccountStore.setState({ selectedAccount: null, accounts: [] });
});
describe('explicit trading service routing', () => {
  it('does not alter SSR calls', () => {
    expect(demoTradingEndpoint('live', 'orders')).toBeNull();
  });
  it('routes demo orders and portfolio only to the dedicated BFF', () => {
    vi.stubGlobal('window', {});
    useAccountStore.setState({ selectedAccount: demo, accounts: [live, demo] });
    expect(demoTradingEndpoint('demo', 'orders')).toBe('/api/demo-trading/orders');
    expect(demoTradingEndpoint('demo', 'portfolio/items')).toBe(
      '/api/demo-trading/portfolio/items',
    );
  });
  it('leaves Live service endpoints unchanged', () => {
    vi.stubGlobal('window', {});
    useAccountStore.setState({ selectedAccount: live, accounts: [live, demo] });
    expect(demoTradingEndpoint('live', 'orders')).toBeNull();
  });
  it('rejects stale Live account IDs after switching to Demo', () => {
    vi.stubGlobal('window', {});
    useAccountStore.setState({ selectedAccount: demo, accounts: [live, demo] });
    expect(() => demoTradingEndpoint('live', 'orders')).toThrow('trading-account-changed');
  });
  it('rejects a Demo ID while Live is selected', () => {
    vi.stubGlobal('window', {});
    useAccountStore.setState({ selectedAccount: live, accounts: [live, demo] });
    expect(() => demoTradingEndpoint('demo', 'orders')).toThrow('trading-account-changed');
  });
});

describe('real payments are disabled in Demo', () => {
  it('throws before payment API execution and allows Live', () => {
    vi.stubGlobal('window', {});
    useAccountStore.setState({ selectedAccount: demo });
    expect(() => assertLiveTradingMode()).toThrow('live-mode-required');
    useAccountStore.setState({ selectedAccount: live });
    expect(() => assertLiveTradingMode()).not.toThrow();
  });
});
