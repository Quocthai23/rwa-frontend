import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Asset } from '@/types/assets';

const state = vi.hoisted(() => ({
  distributions: [] as unknown[],
  proposals: [] as unknown[],
  failed: false,
  rentalEnabledUntil: null as null | string,
  rentalContract: null as null | { status: string; tenant: { id: string } },
  buyout: {
    isBuyer: false,
    mode: 'DYNAMIC_VND',
    schedule: {
      status: 'ACTIVE',
      totalMonths: 12,
      monthsCompleted: 1,
      claimableAmount: '112000000',
      claimablePeriods: 1,
    },
  },
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) =>
      key === 'assetManagement.overview.activeProposals'
        ? `${options?.count} active proposals`
        : key,
    i18n: { language: 'vi' },
  }),
}));
vi.mock('@/components/shared/components/TransactionDetailSheet', () => ({
  TransactionDetailSheet: ({ children }: { children: React.ReactNode }) =>
    React.createElement('section', { 'data-testid': 'shared-transaction-sheet' }, children),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/store/useAccountStore', () => ({
  useAccountStore: (selector: (s: unknown) => unknown) =>
    selector({ selectedAccount: { id: 'account' } }),
}));
vi.mock('@/hook/usePortfolio', () => ({
  usePortfolioItem: () => ({ data: { quantity: '72000' } }),
}));
vi.mock('@/lib/experience/useExperience', () => ({ useExperience: () => 'web' }));
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => selector({ user: { id: 'main' } }),
}));
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: state.buyout, isLoading: false, isError: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ isPending: false, mutate: vi.fn() }),
}));
vi.mock('@/hook/useDividends', () => ({
  useClaimDividend: () => ({ mutate: vi.fn(), isPending: false }),
  useRentalIncomeDistributions: () => ({
    data: state.distributions,
    isLoading: false,
    isError: state.failed,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/hook/useAssetManagement', () => ({
  useAssetStatus: () => ({
    data: { rentalContract: state.rentalContract, rentalEnabledUntil: state.rentalEnabledUntil },
    isLoading: false,
  }),
  useRentalApplications: () => ({ data: [], isLoading: false }),
  useCreateRentalEnablementProposal: () => ({ mutate: vi.fn() }),
  useAssetProposals: () => ({
    data: state.proposals,
    isLoading: false,
    isError: state.failed,
    refetch: vi.fn(),
  }),
  useEligibility: () => ({
    data: { eligible: true, currentHolding: '72000', requiredCurrentHolding: '72000' },
    isLoading: false,
  }),
  useBuyoutQuote: () => ({}),
  useCreateProposal: () => ({ isPending: false }),
  useCreateGovernanceProposal: () => ({ isPending: false }),
  useVoteProposal: () => ({ isPending: false }),
}));

import RentalOperationsTab from './tabs/RentalOperationsTab';
import GovernanceTab from './tabs/GovernanceTab';
import AssetOverviewTab from './tabs/AssetOverviewTab';
import { BuyoutEscrowActions } from './BuyoutEscrowActions';
import { AssetActionBadge } from './AssetActionBadge';
import { BuyoutPaymentHistory } from './BuyoutPaymentHistory';
import { GovernanceTermsFields, emptyGovernanceTerms } from './GovernanceTermsFields';
import { RentalIncomeDetailSheet } from './RentalIncomeDetailSheet';

const asset = { id: 'asset', symbol: 'TEST', name: 'Test asset' } as Asset;
beforeEach(() => {
  state.failed = false;
  state.rentalEnabledUntil = null;
  state.distributions = [];
  state.proposals = [];
  state.rentalContract = null;
});

describe('property management action surfaces', () => {
  it('shows rental income and a claim action in rental payment history, summing user accounts', () => {
    state.distributions = [
      {
        id: 'rent-period',
        totalAmount: '25000000',
        periodStart: '2026-10-20',
        claims: [
          { amount: '10000000', status: 'PENDING' },
          { amount: '5000000', status: 'PENDING' },
        ],
      },
    ];
    const html = renderToStaticMarkup(React.createElement(RentalOperationsTab, { asset }));
    expect(html).toContain('incomeHistoryTitle');
    expect(html).toContain('15.000.000');
    expect(html).toContain('rentalOperations.claimRent');
    expect(html).toContain('rentalOperations.unclaimed');
    expect(html).not.toContain('noIncomeHistory');
  });

  it('counts both rental and buyout proposals in the overview and excludes closed proposals', () => {
    state.proposals = [
      { id: 'rental', type: 'RENTAL_ENABLEMENT', status: 'ACTIVE' },
      { id: 'buyout', type: 'BUYOUT_PROPOSAL', status: 'ACTIVE' },
      { id: 'old', type: 'GENERAL', status: 'REJECTED' },
    ];
    const html = renderToStaticMarkup(React.createElement(AssetOverviewTab, { asset }));
    expect(html).toContain('2 active proposals');
    expect(html).not.toContain('1 active proposals');
  });

  it('explains that an unfunded rental has nothing to claim and directs the tenant to funding', () => {
    state.rentalContract = { status: 'PENDING_FUNDING', tenant: { id: 'main' } };
    const html = renderToStaticMarkup(React.createElement(RentalOperationsTab, { asset }));
    expect(html).toContain('awaitingPaymentExplanation');
    expect(html).toContain('href="/my-rentals"');
    expect(html).not.toContain('rentalOperations.claimRent');
  });

  it('renders both simultaneous proposal types above the collapsed creation form', () => {
    state.proposals = [
      {
        id: 'rental',
        title: 'Rental vote',
        type: 'RENTAL_ENABLEMENT',
        status: 'ACTIVE',
        viewerCanVote: true,
      },
      {
        id: 'buyout',
        title: 'Buyout vote',
        type: 'BUYOUT_PROPOSAL',
        status: 'ACTIVE',
        viewerCanVote: true,
      },
    ];
    const html = renderToStaticMarkup(React.createElement(GovernanceTab, { asset }));
    expect(html).toContain('Rental vote');
    expect(html).toContain('Buyout vote');
    expect(html.indexOf('Buyout vote')).toBeLessThan(html.indexOf('<details'));
    expect(html.match(/votingList.voteYes/g)).toHaveLength(2);
  });

  it('shows an error with retry instead of a false empty history or proposal list', () => {
    state.failed = true;
    const rental = renderToStaticMarkup(React.createElement(RentalOperationsTab, { asset }));
    const governance = renderToStaticMarkup(React.createElement(GovernanceTab, { asset }));
    expect(rental).toContain('historyError');
    expect(rental).not.toContain('noIncomeHistory');
    expect(governance).toContain('governance.loadError');
    expect(governance).not.toContain('votingList.noProposals');
  });

  it('reads the unwrapped buyout state and exposes 112 million VND with a claim button', () => {
    const html = renderToStaticMarkup(
      React.createElement(BuyoutEscrowActions, {
        proposalId: 'buyout',
        proposalStatus: 'EXECUTED',
      }),
    );
    expect(html).toContain('112.000.000');
    expect(html).toContain('availableProceeds');
    expect(html).toContain('data-variant="primary-contained"');
    expect(html).not.toContain('stateUnavailable');
  });

  it('offers rental opening, but not price changes, before rental authorization', () => {
    const html = renderToStaticMarkup(React.createElement(GovernanceTab, { asset }));
    expect(html).toContain('value="RENTAL_ENABLEMENT"');
    expect(html).not.toContain('value="RENT_CHANGE"');
    state.rentalContract = { status: 'ACTIVE', tenant: { id: 'tenant' } };
    const activeHtml = renderToStaticMarkup(React.createElement(GovernanceTab, { asset }));
    expect(activeHtml).toContain('value="RENT_CHANGE"');
    expect(activeHtml).not.toContain('value="RENTAL_ENABLEMENT"');
  });
  it('allows reopening applications after an authorization expires without losing price amendments', () => {
    state.rentalEnabledUntil = '2000-01-01T00:00:00Z';
    const html = renderToStaticMarkup(React.createElement(GovernanceTab, { asset }));
    expect(html).toContain('value="RENTAL_ENABLEMENT"');
    expect(html).toContain('value="RENT_CHANGE"');
  });
  it('collects rent and deposit explicitly and uses distinct terms for other proposals', () => {
    const render = (kind: string) =>
      renderToStaticMarkup(
        React.createElement(GovernanceTermsFields, {
          kind,
          values: emptyGovernanceTerms,
          onChange: vi.fn(),
        }),
      );
    expect(render('RENT_CHANGE')).toContain('terms.monthlyRentVnd');
    expect(render('RENT_CHANGE')).toContain('terms.depositVnd');
    expect(render('MAINTENANCE')).toContain('terms.maintenanceBudgetVnd');
    expect(render('OPERATOR_CHANGE')).toContain('terms.operatorContact');
    expect(render('ASSET_SALE')).toContain('terms.salePlan');
  });
  it('keeps twelve received periods under one closed, scrollable history section', () => {
    const periods = Array.from({ length: 12 }, (_, i) => ({
      id: String(i),
      installmentNumber: i + 1,
      recordAt: '2026-10-20',
      status: 'FUNDED',
      claims: [{ amount: '1000000', status: 'CLAIMED' }],
    }));
    const html = renderToStaticMarkup(React.createElement(BuyoutPaymentHistory, { periods }));
    expect(html.match(/<details/g)).toHaveLength(1);
    expect(html).not.toMatch(/<details[^>]* open/);
    expect(html.match(/<li /g)).toHaveLength(12);
    expect(html).toContain('max-h-72');
  });
  it('uses the shared transaction detail sheet and sums rental entitlements across accounts', () => {
    const distribution = {
      id: 'rental',
      totalAmount: '25000000',
      allocatedAmount: '25000000',
      currency: 'VND',
      periodStart: '2026-10-01',
      periodEnd: '2026-10-31',
      snapshotDate: '2026-10-01',
      status: 'READY_FOR_CLAIM',
      claims: [
        { id: 'a', amount: '10000000', status: 'PENDING' as const },
        { id: 'b', amount: '5000000', status: 'PENDING' as const },
      ],
    };
    const html = renderToStaticMarkup(
      React.createElement(RentalIncomeDetailSheet, {
        distribution,
        assetName: 'Riverside',
        claiming: false,
        onClose: vi.fn(),
        onClaim: vi.fn(),
      }),
    );
    expect(html).toContain('shared-transaction-sheet');
    expect(html).toContain('15.000.000');
    expect(html).toContain('rentalOperations.claimRent');
  });

  it('hides zero badges and displays a pending action count accessibly', () => {
    expect(renderToStaticMarkup(React.createElement(AssetActionBadge, { count: 0 }))).toBe('');
    expect(renderToStaticMarkup(React.createElement(AssetActionBadge, { count: 2 }))).toContain(
      '>2</span>',
    );
  });
});
