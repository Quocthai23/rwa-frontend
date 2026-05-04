'use client';

import { HomeAppPage } from '@/features/home/app/HomeAppPage';
import { HomeWebPage } from '@/features/home/web/HomeWebPage';
import { resolveRouteExperience } from '@/lib/experience/resolveExperience';
import { useExperience } from '@/lib/experience/useExperience';
import { usePathname } from 'next/navigation';

export default function HomePage() {
  const pathname = usePathname() || '/home';
  const viewportExperience = useExperience();
  const experience = resolveRouteExperience(pathname, viewportExperience);

  return experience === 'web' ? <HomeWebPage /> : <HomeAppPage />;
}
