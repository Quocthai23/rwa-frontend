'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { resolveRouteExperience } from './resolveExperience';
import { useExperience } from './useExperience';

export function ExperienceSync() {
  const pathname = usePathname() || '/';
  const viewportExperience = useExperience();
  const experience = resolveRouteExperience(pathname, viewportExperience);

  useEffect(() => {
    document.documentElement.dataset.experience = experience;

    return () => {
      document.documentElement.dataset.experience = 'app';
    };
  }, [experience]);

  return null;
}
