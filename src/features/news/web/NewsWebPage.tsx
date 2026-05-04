'use client';

import NewsWebScreen from '@/components/featured/news/web/NewsWebScreen';
import { WebLayout } from '@/components/layouts/WebLayout';

export function NewsWebPage() {
  return (
    <WebLayout>
      <NewsWebScreen />
    </WebLayout>
  );
}
