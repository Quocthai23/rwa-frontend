'use client';

import MarketWebScreen from '@/components/featured/market/web/MarketWebScreen';
import { WebLayout } from '@/components/layouts/WebLayout';

export function MarketWebPage() {
  return (
    <WebLayout>
      <MarketWebScreen />
    </WebLayout>
  );
}
