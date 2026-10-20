import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'MTX Trading',
    short_name: 'MTX',
    start_url: '/home',
    scope: '/',
    display: 'standalone',
    background_color: '#070c16',
    theme_color: '#155eef',
    icons: [{ src: '/logo/logo-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }],
  };
}
