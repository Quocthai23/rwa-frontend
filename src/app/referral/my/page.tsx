'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import MyReferral from '@/components/featured/referral/MyReferral';
import MyReferralWeb from '@/components/featured/referral/web/MyReferralWeb';
import { resolveRouteExperience } from '@/lib/experience/resolveExperience';
import { useExperience } from '@/lib/experience/useExperience';

export default function MyReferralPage() {
  const pathname = usePathname() || '/referral/my';
  const viewportExperience = useExperience();
  const experience = resolveRouteExperience(pathname, viewportExperience);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setHasMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!hasMounted) return null;

  return (
    <Suspense fallback={null}>{experience === 'web' ? <MyReferralWeb /> : <MyReferral />}</Suspense>
  );
}
