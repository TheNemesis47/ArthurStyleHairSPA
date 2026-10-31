import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // un layout radice per lingua → 404 globale (docs Next 16: global-not-found)
    globalNotFound: true,
  },
  images: { formats: ['image/avif', 'image/webp'] },
  // Header di base; CSP con nonce e HSTS arrivano con Caddy in produzione (docs/12, docs/13)
  headers() {
    return Promise.resolve([
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
        ],
      },
    ]);
  },
};

export default nextConfig;
