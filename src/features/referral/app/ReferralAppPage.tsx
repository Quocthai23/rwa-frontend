'use client';

import { Suspense } from 'react';
import ReferralApp from '@/components/featured/referral/app/ReferralAppPage';

export function ReferralAppPage() {
  return (
    <Suspense>
      <ReferralApp />
    </Suspense>
  );
}
