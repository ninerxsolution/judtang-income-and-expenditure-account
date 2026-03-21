import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  async rewrites() {
    return [
      {
        source: "/storage/announcement/image/:filename",
        destination: "/api/announcement/image/:filename",
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        hostname: "raw.githubusercontent.com",
        pathname: "/casperstack/thai-banks-logo/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
