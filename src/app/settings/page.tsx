'use client';

import { SettingAppPage } from '@/features/settings/app/SettingAppPage';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const [isWebViewport, setIsWebViewport] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const updateViewportMode = () => {
      setIsWebViewport(window.innerWidth >= 1024);
    };

    updateViewportMode();
    window.addEventListener('resize', updateViewportMode);

    return () => {
      window.removeEventListener('resize', updateViewportMode);
    };
  }, []);

  useEffect(() => {
    if (isWebViewport === true) {
      router.replace('/account');
    }
  }, [isWebViewport, router]);

  if (isWebViewport === null) {
    return null;
  }

  if (isWebViewport === true) {
    return null;
  }

  return <SettingAppPage />;
}
