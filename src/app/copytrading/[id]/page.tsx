'use client';

import CopyTradingDetail from '@/components/featured/copytrading/CopyTradingDetail';
import { WebLayout } from '@/components/layouts/WebLayout';
import { resolveRouteExperience } from '@/lib/experience/resolveExperience';
import { useExperience } from '@/lib/experience/useExperience';
import { useParams, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CopyTradingDetailPage() {
  const params = useParams();
  const pathname = usePathname() || '/copytrading';
  const viewportExperience = useExperience();
  const experience = resolveRouteExperience(pathname, viewportExperience);
  const [hasMounted, setHasMounted] = useState(false);
  const id = params?.id as string;

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) return null;

  if (experience === 'web') {
    return (
      <WebLayout>
        <CopyTradingDetail id={id} />
      </WebLayout>
    );
  }

  return <CopyTradingDetail id={id} />;
}
