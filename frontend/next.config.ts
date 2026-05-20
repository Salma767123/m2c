import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tree-shake commonly-used libs with thousands of named exports so the
  // client bundle only ships the icons / utilities the app actually uses.
  // Tens of KB saved per chunk that imports from these packages.
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@tabler/icons-react',
      'date-fns',
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
