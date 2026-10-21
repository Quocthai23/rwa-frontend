import { describe, it, expect } from 'vitest';
import { demoOrderContext } from './demo-order-context';
const input = {
  demo: false,
  online: true,
  connected: false,
  reconnecting: false,
  limit: false,
  bid: 0,
  ask: 0,
  publicPrice: 100000,
};
describe('Demo quote policy preserves Live behavior', () => {
  it('does not fabricate Live quotes or allow disconnected Live market orders', () =>
    expect(demoOrderContext(input)).toEqual({ canTrade: false, bid: 0, ask: 0 }));
  it('uses the same public asset price for Demo when there is no order-book side', () =>
    expect(demoOrderContext({ ...input, demo: true })).toEqual({
      canTrade: true,
      bid: 100000,
      ask: 100000,
    }));
  it('always preserves available public bid/ask prices', () =>
    expect(demoOrderContext({ ...input, demo: true, bid: 99000, ask: 101000 })).toEqual({
      canTrade: true,
      bid: 99000,
      ask: 101000,
    }));
  it('does not allow either environment to place orders offline', () => {
    for (const demo of [true, false])
      expect(demoOrderContext({ ...input, demo, online: false, connected: true }).canTrade).toBe(
        false,
      );
  });
});
