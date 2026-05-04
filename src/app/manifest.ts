import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MTX Trading',
    short_name: 'MTX Trading',
    description: 'MTX trading progressive web application',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/logo/logo-192x192-white.png',
        sizes: '192x192',
        purpose: 'maskable',
        type: 'image/png',
      },
      {
        src: '/logo/logo-512x512-white.png',
        sizes: '512x512',
        purpose: 'maskable',
        type: 'image/png',
      },
      {
        src: '/logo/logo-white.png',
        sizes: '4096x4096',
        purpose: 'maskable',
        type: 'image/png',
      },

      {
        src: '/logo/logo-white.png',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  };
}
