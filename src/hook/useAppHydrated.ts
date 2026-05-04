'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';

export function useAppHydrated() {
  const [hydrated, setHydrated] = useState(() => {
    if (typeof window === 'undefined') return false;
    return useAppStore.persist?.hasHydrated?.() ?? true;
  });

  useEffect(() => {
    const persistApi = useAppStore.persist;
    if (!persistApi) {
      return;
    }

    const unsubHydrate = persistApi.onHydrate(() => setHydrated(false));
    const unsubFinishHydration = persistApi.onFinishHydration(() => setHydrated(true));

    return () => {
      unsubHydrate();
      unsubFinishHydration();
    };
  }, []);

  return hydrated;
}
