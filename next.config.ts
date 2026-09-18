// next.config.ts
import type { NextConfig } from 'next';

const SECURITY_HEADERS = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Pages are served by the Next.js runtime on Netlify, which does not apply
  // netlify.toml [[headers]] to them — those only cover static files. No CSP yet:
  // the inline theme script in layout.tsx and Google Analytics need nonces/hashes first.
  async headers() {
    return [
      { source: '/(.*)', headers: SECURITY_HEADERS },
      { source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ];
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000, // 1 year: every remote image URL here changes when its content does
    deviceSizes: [640, 768, 1024, 1280, 1600],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Only the hosts the widgets actually render through next/image. News thumbnails
    // (arbitrary publisher hosts) are plain <img> in src/components/widgets/NewsList.tsx,
    // so no wildcard is needed and /_next/image is not an open proxy.
    remotePatterns: [
      { protocol: 'https', hostname: 'apod.nasa.gov', pathname: '/apod/image/**' },
      { protocol: 'https', hostname: 'epic.gsfc.nasa.gov', pathname: '/archive/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'i.ytimg.com', pathname: '/vi/**' },
      { protocol: 'https', hostname: 'media.rawg.io', pathname: '/media/**' },
    ],
  },
};

export default nextConfig;
