import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    domains: ["stack.furvino.com", "cdn.furvino.com", "stack.furvino.org", "cdn.furvino.org", "localhost"], // your trusted domains
  },
};

export default nextConfig;
