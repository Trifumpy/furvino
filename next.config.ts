import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  eslint: { ignoreDuringBuilds: process.env.DISABLE_LINT_DURING_BUILD === "1" },
  typescript: { ignoreBuildErrors: process.env.DISABLE_TS_ERRORS === "1" },
  images: {
    domains: [
      "stack.furvino.com",
      "cdn.furvino.com",
      "stack.furvino.org",
      "cdn.furvino.org",
      "localhost",
      // placeholders and third-party avatars
      "placehold.co",
      "images.clerk.dev",
    ],
    minimumCacheTTL: 31536000,
  },
};

export default nextConfig;