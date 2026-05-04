'use client';

import { Suspense } from 'react';
import ReferralWebForm from '@/components/featured/referral/web/ReferralWebForm';

export function ReferralWebPage() {
  return (
    <Suspense>
      <ReferralWebForm />
    </Suspense>
  );
}
