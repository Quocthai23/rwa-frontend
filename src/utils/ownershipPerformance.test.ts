import { describe, it, expect } from 'vitest';
import { getOwnershipPerformance } from './ownershipPerformance';
describe('ownership return relative to personal cost', () => {
  it('reports profit and loss against average purchase cost', () => {
    expect(getOwnershipPerformance({ averageBuyPrice: '100', currentPrice: '110' }).percent).toBe(
      10,
    );
    expect(getOwnershipPerformance({ averageBuyPrice: '100', currentPrice: '80' }).percent).toBe(
      -20,
    );
    expect(getOwnershipPerformance({ averageBuyPrice: '100', currentPrice: '0' }).percent).toBe(
      -100,
    );
  });
  it('does not invent a return when the basis or valuation is missing', () => {
    for (const averageBuyPrice of ['0', '', 'NaN', '-1'])
      expect(getOwnershipPerformance({ averageBuyPrice, currentPrice: '100' }).percent).toBeNull();
    for (const currentPrice of ['', 'NaN', '-1'])
      expect(getOwnershipPerformance({ averageBuyPrice: '100', currentPrice }).percent).toBeNull();
  });
});
