'use client';

import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { resolveRouteExperience } from '@/lib/experience/resolveExperience';
import { useExperience } from '@/lib/experience/useExperience';

const KeepAliveTradePositionShell = dynamic(() => import('./KeepAliveTradePositionShell'), {
  ssr: false,
});

function TradePositionKeepAliveGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const viewportExperience = useExperience();
  const experience = resolveRouteExperience(pathname, viewportExperience);

  const useKeepAliveTradePosition = experience !== 'web';

  if (useKeepAliveTradePosition) {
    return <KeepAliveTradePositionShell />;
  }

  return <>{children}</>;
}

export default function RouteKeepAliveSwitch({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const isTradeOrPositionRoute =
    pathname === '/trade' || pathname.startsWith('/trade/') || pathname.startsWith('/position');

  if (!isTradeOrPositionRoute) {
    return <>{children}</>;
  }

  return <TradePositionKeepAliveGate>{children}</TradePositionKeepAliveGate>;
}
