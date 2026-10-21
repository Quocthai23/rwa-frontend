import type { Experience } from './useExperience';

const WEB_EXPERIENCE_ROUTES = new Set([
  '/',
  '/home',
  '/market',
  '/trade',
  '/discover',
  '/position',
  '/news',
  '/rewards-center',
  '/register',
  '/forgot-password',
  '/settings',
  '/notifications/settings',
  '/login',
]);
const WEB_EXPERIENCE_PREFIXES = ['/trade/', '/buyout-trading/', '/position', '/discover/'];

function normalizePathname(pathname: string): string {
  if (!pathname) return '/';

  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

export function supportsWebExperience(pathname: string): boolean {
  const normalizedPathname = normalizePathname(pathname);

  if (WEB_EXPERIENCE_ROUTES.has(normalizedPathname)) {
    return true;
  }

  return WEB_EXPERIENCE_PREFIXES.some((prefix) => normalizedPathname.startsWith(prefix));
}

export function resolveRouteExperience(
  pathname: string,
  viewportExperience: Experience,
): Experience {
  if (viewportExperience !== 'web') {
    return 'app';
  }

  return supportsWebExperience(pathname) ? 'web' : 'app';
}
