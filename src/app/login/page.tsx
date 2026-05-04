'use client';

import { LoginAppPage } from '@/features/login/app/LoginAppPage';
import { LoginWebPage } from '@/features/login/web/LoginWebPage';
import { resolveRouteExperience } from '@/lib/experience/resolveExperience';
import { useExperience } from '@/lib/experience/useExperience';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const pathname = usePathname() || '/login';
  const viewportExperience = useExperience();
  const experience = resolveRouteExperience(pathname, viewportExperience);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setHasMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!hasMounted) {
    return null;
  }

  return experience === 'web' ? <LoginWebPage /> : <LoginAppPage />;
}
