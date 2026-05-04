'use client';

import { useEffect, useState } from 'react';

import { PositionAppPage } from '@/features/position/app/PositionAppPage';
import { PositionWebPage } from '@/features/position/web/PositionWebPage';
import { resolveRouteExperience } from '@/lib/experience/resolveExperience';
import { useExperience } from '@/lib/experience/useExperience';
import { usePathname } from 'next/navigation';

export default function PositionsPage() {
  const pathname = usePathname() || '/position';
  const viewportExperience = useExperience();
  const experience = resolveRouteExperience(pathname, viewportExperience);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) return null;

  return experience === 'web' ? <PositionWebPage /> : <PositionAppPage />;
}
