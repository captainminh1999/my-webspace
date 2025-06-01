// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // If you’ve enabled the experimental app directory already, keep it here
  reactStrictMode: true,

  images: {
    // Allow NASA APOD (and any other remote image hosts you need)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'apod.nasa.gov',
        pathname: '/**',      // match everything under that host
      },
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
