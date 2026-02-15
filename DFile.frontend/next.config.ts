import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: 'export', // <--- Add this
  images: {
    unoptimized: true, // <--- Add this for static export compatibility
    remotePatterns: [... ]
  },
};
export default nextConfig;
