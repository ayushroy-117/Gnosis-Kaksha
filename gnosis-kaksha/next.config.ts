import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output standalone directory for minimal production Docker container
  output: 'standalone',
  // Enable static optimization
  staticPageGenerationTimeout: 120,
  // Disable image optimization if not needed
  images: {
    unoptimized: false,
  },
};

export default nextConfig;
