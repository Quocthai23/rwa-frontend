'use client';

import { Suspense } from 'react';
import DiscoverAppScreen from '@/components/featured/discover/app/DiscoverAppScreen';
import { AppLayout } from '@/components/layouts/AppLayout';

export function DiscoverAppPage() {
  return (
    <AppLayout>
      <Suspense>
        <DiscoverAppScreen />
      </Suspense>
    </AppLayout>
  );
}
