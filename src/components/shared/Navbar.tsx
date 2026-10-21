'use client';

import { useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';

import { resolveRouteExperience } from '@/lib/experience/resolveExperience';
import { useExperience } from '@/lib/experience/useExperience';

import AppNavbar from './navbar/AppNavbar';
import WebNavbar from './navbar/WebNavbar';

const LOCAL_LAYOUT_NAV_ROUTES = [
  '/home',
  '/market',
  '/discover',
  '/trade',
  '/login',
  '/register',
  '/forgot-password',
];

const HYDRATION_SENSITIVE_ROUTES = ['/portfolio', '/discover', '/'];

const subscribeToMount = () => () => {};
export function Navbar() {
  const pathname = usePathname() || '/';
  const viewportExperience = useExperience();
  const hasMounted = useSyncExternalStore(
    subscribeToMount,
    () => true,
    () => false,
  );

  const shouldDelayUntilMounted = HYDRATION_SENSITIVE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (shouldDelayUntilMounted && !hasMounted) {
    return null;
  }

  const usesLocalLayoutNavbar = LOCAL_LAYOUT_NAV_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (usesLocalLayoutNavbar) {
    return null;
  }

  const experience = resolveRouteExperience(pathname, viewportExperience);

  return experience === 'web' ? <WebNavbar /> : <AppNavbar />;
}
