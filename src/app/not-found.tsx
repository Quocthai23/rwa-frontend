'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import { resolveRouteExperience } from '@/lib/experience/resolveExperience';
import { useExperience } from '@/lib/experience/useExperience';

import { NotFoundWebPage } from '@/components/featured/not-found/NotFoundWebPage';
import { NotFoundAppPage } from '@/components/featured/not-found/NotFoundAppPage';

export default function NotFoundPage() {
  const pathname = usePathname() || '/';
  const viewportExperience = useExperience();
  const experience = resolveRouteExperience(pathname, viewportExperience);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) return null;

  return experience === 'web' ? <NotFoundWebPage /> : <NotFoundAppPage />;
}
