'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import SplashLogo from '@/components/shared/SplashLogo';
import { useExperience } from '@/lib/experience/useExperience';

export default function RootPage() {
  const router = useRouter();
  const experience = useExperience();

  useEffect(() => {
    router.replace(experience === 'web' ? '/market' : '/home');
  }, [experience, router]);

  return <SplashLogo size={300} />;
}
