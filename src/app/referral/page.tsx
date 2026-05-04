'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import { resolveRouteExperience } from '@/lib/experience/resolveExperience';
import { useExperience } from '@/lib/experience/useExperience';
import { ReferralWebPage } from '@/features/referral/web/ReferralWebPage';
import ReferralAppPage from '@/components/featured/referral/app/ReferralAppPage';

export default function ReferralPage() {
  const pathname = usePathname() || '/referral';
  const viewportExperience = useExperience();
  const experience = resolveRouteExperience(pathname, viewportExperience);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setHasMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!hasMounted) return null;

  return experience === 'web' ? <ReferralWebPage /> : <ReferralAppPage />;
}
