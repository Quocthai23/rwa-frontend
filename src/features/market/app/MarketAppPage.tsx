'use client';

import MarketAppScreen from '@/components/featured/market/app/MarketAppScreen';
import { AppLayout } from '@/components/layouts/AppLayout';
import { useMarketViewModel } from '../shared/hooks/useMarketViewModel';

export function MarketAppPage() {
  const { isRefreshing } = useMarketViewModel();

  return (
    <AppLayout>
      <div className="bg-background min-h-dvh">
        {isRefreshing ? <span className="sr-only">Refreshing market data</span> : null}
        <MarketAppScreen />
      </div>
    </AppLayout>
  );
}
