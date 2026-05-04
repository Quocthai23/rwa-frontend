'use client';

import { useEffect, useState } from 'react';

import { NewsAppPage } from '@/features/news/app/NewsAppPage';
import { NewsWebPage } from '@/features/news/web/NewsWebPage';
import { resolveRouteExperience } from '@/lib/experience/resolveExperience';
import { useExperience } from '@/lib/experience/useExperience';
import { usePathname } from 'next/navigation';

function NewsPage() {
  const pathname = usePathname() || '/news';
  const viewportExperience = useExperience();
  const experience = resolveRouteExperience(pathname, viewportExperience);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) return null;

  return experience === 'web' ? <NewsWebPage /> : <NewsAppPage />;
}

export default NewsPage;
