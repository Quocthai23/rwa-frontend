'use client';

import { Suspense } from 'react';
import NewsAppScreen from '@/components/featured/news/app/NewsAppScreen';
import { AppLayout } from '@/components/layouts/AppLayout';

export function NewsAppPage() {
  return (
    <AppLayout>
      <Suspense>
        <NewsAppScreen />
      </Suspense>
    </AppLayout>
  );
}
