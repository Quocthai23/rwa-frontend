'use client';

import { useEffect, useState } from 'react';

import { DiscoverAppPage } from '@/features/discover/app/DiscoverAppPage';
import { DiscoverWebPage } from '@/features/discover/web/DiscoverWebPage';
import { resolveRouteExperience } from '@/lib/experience/resolveExperience';
import { useExperience } from '@/lib/experience/useExperience';
import { usePathname } from 'next/navigation';

function DiscoverPage() {
  const pathname = usePathname() || '/discover';
  const viewportExperience = useExperience();
  const experience = resolveRouteExperience(pathname, viewportExperience);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) return null;

  return experience === 'web' ? <DiscoverWebPage /> : <DiscoverAppPage />;
}

export default DiscoverPage;
