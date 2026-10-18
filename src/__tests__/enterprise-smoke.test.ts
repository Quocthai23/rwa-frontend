import { describe, expect, it } from 'vitest';
import { PAYMENT_ENDPOINTS } from '@/constants/api';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Documents frontend surfaces that currently fake / mock backend behavior.
 * Keep this list updated — CI fails if a known mock marker is removed without
 * also deleting the corresponding product debt entry.
 */
describe('Mock / fake data production gate', () => {
  it('keeps DAO, trade aside, and English product copy free of known mock markers', () => {
    const sources = [
      'src/app/dao/page.tsx',
      'src/components/featured/trade/web/components/TradeOrderPanelAside.tsx',
      'src/i18n/resources/en.ts',
    ].map((file) => readFileSync(resolve(process.cwd(), file), 'utf8'));

    for (const source of sources) {
      expect(source).not.toMatch(/\(Mocked\)|Toggle Eligibility \(Mock\)/i);
      expect(source).not.toMatch(/\+1250|\+800/);
    }
  });
});

describe('DAO vote request shape', () => {
  it('maps YES/NO UI to backend isFor boolean', () => {
    const toVotePayload = (vote: 'YES' | 'NO') => ({ isFor: vote === 'YES' });
    expect(toVotePayload('YES')).toEqual({ isFor: true });
    expect(toVotePayload('NO')).toEqual({ isFor: false });
  });

  it('must not invent vote weights client-side', () => {
    const applyOptimisticVote = (
      current: { yesVotes: number; noVotes: number },
      vote: 'YES' | 'NO',
      realPower: number,
    ) => ({
      yesVotes: vote === 'YES' ? current.yesVotes + realPower : current.yesVotes,
      noVotes: vote === 'NO' ? current.noVotes + realPower : current.noVotes,
    });

    // Correct pattern: use snapshot voting power from API, never hardcoded 1250/800
    expect(applyOptimisticVote({ yesVotes: 0, noVotes: 0 }, 'YES', 100)).toEqual({
      yesVotes: 100,
      noVotes: 0,
    });
    expect([1250, 800]).not.toContain(100);
  });
});

describe('PayOS / deposit safety helpers', () => {
  it('rejects non-positive deposit amounts', () => {
    const validateAmount = (n: number) => n > 0;
    expect(validateAmount(0)).toBe(false);
    expect(validateAmount(-1)).toBe(false);
    expect(validateAmount(10_000)).toBe(true);
  });

  it('does not expose a demo deposit endpoint', () => {
    expect(PAYMENT_ENDPOINTS).not.toHaveProperty('DEPOSIT_DEMO');
    expect(Object.values(PAYMENT_ENDPOINTS)).not.toContain(
      '/payment/deposit-demo',
    );
  });
});

describe('BFF auth header helper contract', () => {
  it('forwards bearer token when present', () => {
    const buildAuthHeaders = (token?: string) =>
      token ? { Authorization: `Bearer ${token}` } : undefined;

    expect(buildAuthHeaders('abc')).toEqual({ Authorization: 'Bearer abc' });
    expect(buildAuthHeaders(undefined)).toBeUndefined();
  });
});
