'use client';

import SplashLogo from '@/components/shared/SplashLogo';
import { useAuthHydrated } from '@/hook/useAuthHydrated';
import { usePathname } from 'next/navigation';

import { MarketAppPage } from '@/features/market/app/MarketAppPage';
import { MarketWebPage } from '@/features/market/web/MarketWebPage';
import { resolveRouteExperience } from '@/lib/experience/resolveExperience';
import { useExperience } from '@/lib/experience/useExperience';

export default function MarketPage() {
  const hasHydratedAuth = useAuthHydrated();
  const pathname = usePathname() || '/market';
  const viewportExperience = useExperience();
  const experience = resolveRouteExperience(pathname, viewportExperience);

  if (!hasHydratedAuth) {
    return <SplashLogo size={300} />;
  }

  return experience === 'web' ? <MarketWebPage /> : <MarketAppPage />;
}
