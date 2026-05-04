'use client';

import { Suspense } from 'react';
import Reward from '@/components/featured/rewards/Reward';

export default function RewardsPage() {
  return (
    <Suspense fallback={null}>
      <Reward />
    </Suspense>
  );
}
