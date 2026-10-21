import { describe, expect, it } from 'vitest';

import { resolveRouteExperience, supportsWebExperience } from './resolveExperience';

describe('buyout trading experience', () => {
  it('supports the desktop experience for a buyout trading symbol route', () => {
    expect(supportsWebExperience('/buyout-trading/MTX-BUYOUT-DEMO')).toBe(true);
    expect(resolveRouteExperience('/buyout-trading/MTX-BUYOUT-DEMO', 'web')).toBe('web');
  });

  it('keeps the mobile experience on a mobile viewport', () => {
    expect(resolveRouteExperience('/buyout-trading/MTX-BUYOUT-DEMO', 'app')).toBe('app');
  });
});

describe('notification settings experience', () => {
  it('uses desktop navigation on desktop and mobile navigation on mobile', () => {
    expect(resolveRouteExperience('/notifications/settings', 'web')).toBe('web');
    expect(resolveRouteExperience('/notifications/settings', 'app')).toBe('app');
  });
});
