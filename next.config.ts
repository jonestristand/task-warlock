import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Optimize for Docker builds
  output: 'standalone',
};

export default nextConfig;
