// next.config.ts
import type { NextConfig } from 'next';
import { BASELINE_POLICY } from './src/lib/csp';

const SECURITY_HEADERS = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // The part of the Content-Security-Policy that needs no nonce. HTML pages get the
  // full policy from netlify/edge-functions/csp.ts, which replaces this header;
  // this is what is left if that function is off or bypassed, and what `next dev` serves.
  { key: 'Content-Security-Policy', value: BASELINE_POLICY },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Pages are served by the Next.js runtime on Netlify, which does not apply
  // netlify.toml [[headers]] to them — those only cover static files. The script
  // policy is not here: pages are ISR, so their nonce is added per response at
  // the edge (src/lib/csp.ts explains the trade-off).
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
    // Every `quality` the widgets ask for, plus 75 for an <Image> that names none. Since Next 16 a value
    // that is not listed here is rounded to the nearest one that is — and the list defaults to [75].
    qualities: [60, 65, 70, 75, 80],
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
