import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true,
    remotePatterns: [],
  },
  trailingSlash: true,
  basePath: '',
  // Add rewrites for development proxy to backend (works in next dev, ignored in export)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5090/api/:path*',
      },
    ];
  },
};

export default nextConfig;
