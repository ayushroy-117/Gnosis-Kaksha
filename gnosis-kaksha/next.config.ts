import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static optimization
  staticPageGenerationTimeout: 120,
  // Disable image optimization if not needed
  images: {
    unoptimized: false,
  },
};

export default nextConfig;
