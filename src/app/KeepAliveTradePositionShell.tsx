'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { TradeAppPage } from '@/features/trade/app/TradeAppPage';
import { TradeWebPage } from '@/features/trade/web/TradeWebPage';
import { PositionAppPage } from '@/features/position/app/PositionAppPage';
import { PositionWebPage } from '@/features/position/web/PositionWebPage';
import { resolveRouteExperience } from '@/lib/experience/resolveExperience';
import { useExperience } from '@/lib/experience/useExperience';

const DEFAULT_SYMBOL = 'XAUUSD';

export default function KeepAliveTradePositionShell() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const viewportExperience = useExperience();
  const experience = resolveRouteExperience(pathname, viewportExperience);
  const [hasMountedTrade, setHasMountedTrade] = useState(false);
  const [hasMountedPosition, setHasMountedPosition] = useState(false);

  const isTradeRoute = pathname === '/trade' || pathname.startsWith('/trade/');
  const isPositionRoute = pathname.startsWith('/position');

  useEffect(() => {
    if (!isTradeRoute) return;
    const timer = window.setTimeout(() => setHasMountedTrade(true), 0);
    return () => window.clearTimeout(timer);
  }, [isTradeRoute]);

  useEffect(() => {
    if (!isPositionRoute) return;
    const timer = window.setTimeout(() => setHasMountedPosition(true), 0);
    return () => window.clearTimeout(timer);
  }, [isPositionRoute]);

  useEffect(() => {
    if (pathname !== '/trade') return;
    const lastSymbol =
      typeof window !== 'undefined' ? window.localStorage.getItem('lastTradeSymbol')?.trim() : '';
    const symbol = lastSymbol || DEFAULT_SYMBOL;
    router.replace(`/trade/${encodeURIComponent(symbol)}`);
  }, [pathname, router]);

  return (
    <div className="bg-background text-foreground min-h-screen">
      <div className={isTradeRoute ? 'block' : 'hidden'}>
        {hasMountedTrade && (experience === 'web' ? <TradeWebPage /> : <TradeAppPage />)}
      </div>
      <div className={isPositionRoute ? 'block' : 'hidden'}>
        {hasMountedPosition && (experience === 'web' ? <PositionWebPage /> : <PositionAppPage />)}
      </div>
    </div>
  );
}
