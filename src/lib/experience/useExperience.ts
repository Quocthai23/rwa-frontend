'use client';

import { useEffect, useState } from 'react';

export type Experience = 'app' | 'web';

const WEB_BREAKPOINT = 1024;

export function useExperience(): Experience {
  // Keep first client render aligned with SSR output to avoid hydration mismatch.
  const [experience, setExperience] = useState<Experience>('app');

  useEffect(() => {
    const update = () => {
      setExperience(window.innerWidth > WEB_BREAKPOINT ? 'web' : 'app');
    };

    update();
    window.addEventListener('resize', update);

    return () => {
      window.removeEventListener('resize', update);
    };
  }, []);

  return experience;
}
