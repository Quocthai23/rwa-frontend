'use client';

import { TradeAppPage } from '@/features/trade/app/TradeAppPage';
import { TradeWebPage } from '@/features/trade/web/TradeWebPage';
import { resolveRouteExperience } from '@/lib/experience/resolveExperience';
import { useExperience } from '@/lib/experience/useExperience';
import { usePathname } from 'next/navigation';

const BuyoutTradingPage = () => {
  const pathname = usePathname() || '/buyout-trading';
  const viewportExperience = useExperience();
  const experience = resolveRouteExperience(pathname, viewportExperience);

  return experience === 'web' ? <TradeWebPage mode="buyout" /> : <TradeAppPage mode="buyout" />;
};

export default BuyoutTradingPage;
