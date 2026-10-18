'use client';

import TradeAppScreen from '@/components/featured/trade/app/TradeAppScreen';
import { AppLayout } from '@/components/layouts/AppLayout';

export function TradeAppPage({ mode = 'standard' }: { mode?: 'standard' | 'buyout' }) {
  return (
    <AppLayout>
      <TradeAppScreen mode={mode} />
    </AppLayout>
  );
}
