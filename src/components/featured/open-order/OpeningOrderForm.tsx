'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SplashLogo from '@/components/shared/SplashLogo';

export default function OpeningOrderForm() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/trade');
  }, [router]);

  return <SplashLogo size={300} />;
}
