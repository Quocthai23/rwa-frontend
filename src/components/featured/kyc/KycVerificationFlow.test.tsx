import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
const state = vi.hoisted(() => ({
  status: undefined as undefined | string,
  error: false,
  expiry: undefined as string | undefined,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/hook/useKyc', () => ({
  useKyc: () => ({
    kycStatus: state.status
      ? {
          status: state.status,
          documentExpiresAt: state.expiry,
          profile: { noExpiry: !state.expiry },
        }
      : null,
    isKycLoading: false,
    isKycError: state.error,
    isSubmitting: false,
    submitKyc: vi.fn(),
    refetchKyc: vi.fn(),
  }),
}));
import { KycVerificationFlow } from './KycVerificationFlow';
describe('responsive identity verification flow', () => {
  it('offers renewal for an expiring verified document', () => {
    state.status = 'APPROVED';
    state.error = false;
    state.expiry = new Date(Date.now() + 86400000).toISOString();
    const html = renderToStaticMarkup(<KycVerificationFlow onClose={() => {}} />);
    expect(html).toContain('verification.renew');
    state.expiry = undefined;
  });

  it('starts with document preparation and consent guidance rather than fabricated withdrawal limits', () => {
    state.status = undefined;
    state.error = false;
    const html = renderToStaticMarkup(<KycVerificationFlow onClose={() => {}} />);
    expect(html).toContain('verification.prepareDocument');
    expect(html).toContain('verification.privacy');
    expect(html).toContain('scrollbar-neutral-slim');
    expect(html).not.toContain('100,000');
  });
  it('does not offer a new submission when a review is pending or already approved', () => {
    state.status = 'PENDING';
    let html = renderToStaticMarkup(<KycVerificationFlow onClose={() => {}} />);
    expect(html).toContain('verification.pendingTitle');
    expect(html).not.toContain('verification.start');
    state.status = 'APPROVED';
    html = renderToStaticMarkup(<KycVerificationFlow onClose={() => {}} />);
    expect(html).toContain('verification.approvedTitle');
  });
  it('shows load errors instead of allowing an identity to be resubmitted with unknown status', () => {
    state.status = undefined;
    state.error = true;
    const html = renderToStaticMarkup(<KycVerificationFlow onClose={() => {}} />);
    expect(html).toContain('verification.loadError');
    expect(html).toContain('disabled');
  });
});
