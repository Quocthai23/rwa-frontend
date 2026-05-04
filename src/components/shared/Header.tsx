'use client';

import { usePathname } from 'next/navigation';

import { resolveRouteExperience } from '@/lib/experience/resolveExperience';
import { useExperience } from '@/lib/experience/useExperience';

import AppHeader, { type SharedHeaderProps } from './header/AppHeader';
import WebHeader from './header/WebHeader';

type HeaderProps = SharedHeaderProps;

const Header = (props: HeaderProps) => {
  const pathname = usePathname() || '/';
  const viewportExperience = useExperience();
  const experience = resolveRouteExperience(pathname, viewportExperience);

  if (experience === 'web') {
    return <WebHeader {...props} />;
  }

  return <AppHeader {...props} />;
};

export default Header;
