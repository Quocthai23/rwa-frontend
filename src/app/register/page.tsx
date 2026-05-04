'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import { RegisterAppPage } from '@/features/register/app/RegisterAppPage';
import { RegisterWebPage } from '@/features/register/web/RegisterWebPage';
import { resolveRouteExperience } from '@/lib/experience/resolveExperience';
import { useExperience } from '@/lib/experience/useExperience';

export default function RegisterPage() {
  const pathname = usePathname() || '/register';
  const viewportExperience = useExperience();
  const experience = resolveRouteExperience(pathname, viewportExperience);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setHasMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!hasMounted) return null;

  return experience === 'web' ? <RegisterWebPage /> : <RegisterAppPage />;
}
