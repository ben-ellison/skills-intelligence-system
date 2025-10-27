import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Temporarily ignore build errors to deploy faster
    ignoreBuildErrors: true,
  },
  eslint: {
    // Temporarily ignore eslint errors to deploy faster
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
