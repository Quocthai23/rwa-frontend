'use client';

import TradeWebScreen from '@/components/featured/trade/web/TradeWebScreen';
import { WebLayout } from '@/components/layouts/WebLayout';

export function TradeWebPage({ mode = 'standard' }: { mode?: 'standard' | 'buyout' }) {
  return (
    <WebLayout>
      <TradeWebScreen mode={mode} />
    </WebLayout>
  );
}
