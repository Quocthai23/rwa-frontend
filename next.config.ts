import type { NextConfig } from "next";

const resolveSocketProxyTarget = (): string | null => {
  const raw = process.env.NEXT_PUBLIC_SOCKET_URL ?? process.env.NEXT_PUBLIC_SOCKET_CHART_URL;
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol === 'ws:') {
      url.protocol = 'http:';
    } else if (url.protocol === 'wss:') {
      url.protocol = 'https:';
    }
    return url.origin;
  } catch {
    return null;
  }
};

const socketProxyTarget = resolveSocketProxyTarget();

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
    // Allow all remote image URLs for next/image.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
      },
      {
        protocol: 'http',
        hostname: '192.168.56.1',
        port: '3001',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ];
  },
  async rewrites() {
    if (!socketProxyTarget) {
      return [];
    }

    return [
      {
        source: '/socket.io/:path*',
        destination: `${socketProxyTarget}/socket.io/:path*`,
      },
    ];
  },
};

export default nextConfig;
