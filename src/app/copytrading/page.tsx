'use client';

import CopyTrading from '@/components/featured/copytrading';
import CoppyTradingWeb from '@/components/featured/copytrading/CoppyTradingWeb';
import { resolveRouteExperience } from '@/lib/experience/resolveExperience';
import { useExperience } from '@/lib/experience/useExperience';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CopyTradingPage() {
  const pathname = usePathname() || '/copytrading';
  const viewportExperience = useExperience();
  const experience = resolveRouteExperience(pathname, viewportExperience);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) return null;

  return experience === 'web' ? <CoppyTradingWeb /> : <CopyTrading />;
}
