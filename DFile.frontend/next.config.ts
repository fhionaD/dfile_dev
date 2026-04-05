import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig = {
  experimental: { inlineCss: true },
  images: { unoptimized: true },
  trailingSlash: false,
  ...(isDev
    ? {
        rewrites: async () => [
          {
            source: "/api/:path*",
            destination: "http://localhost:5090/api/:path*", // backend dev server
          },
        ],
      }
    : { output: "export" }),
};

export default nextConfig;