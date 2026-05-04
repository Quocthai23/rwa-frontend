'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';

export function useAuthHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(useAuthStore.persist.hasHydrated());

    const unsubHydrate = useAuthStore.persist.onHydrate(() => setHydrated(false));
    const unsubFinishHydration = useAuthStore.persist.onFinishHydration(() => setHydrated(true));

    return () => {
      unsubHydrate();
      unsubFinishHydration();
    };
  }, []);

  return hydrated;
}
