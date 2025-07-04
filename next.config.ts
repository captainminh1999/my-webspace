// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // If you’ve enabled the experimental app directory already, keep it here
  reactStrictMode: true,

  images: {
    // Optimize image formats and caching for better LCP
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000, // 1 year
    deviceSizes: [640, 768, 1024, 1280, 1600],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Allow NASA APOD (and any other remote image hosts you need)
    remotePatterns: [
      { protocol: 'https', hostname: 'apod.nasa.gov', pathname: '/**'},      // match everything under that host
      { protocol: "https", hostname: "openweathermap.org", pathname: "/img/wn/**" },
      { protocol: 'https', hostname: 'mars.nasa.gov', pathname: '/**' },
      { protocol: 'https', hostname: 'api.nasa.gov', pathname: '/**' },
      { protocol: 'https', hostname: 'i.ytimg.com', pathname: '/vi/**' },
      { protocol: "https", hostname: "media.rawg.io", pathname: "/media/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      // Fallback pattern for miscellaneous hosts used by widgets
      { protocol: 'https', hostname: '**', pathname: '/**' },
      { protocol: 'http', hostname: '**', pathname: '/**' },
      // add more hosts as needed:
      // {
      //   protocol: 'https',
      //   hostname: 'example.com',
      //   pathname: '/images/**',
      // },
    ],
  },
};

export default nextConfig;
