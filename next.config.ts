import type { NextConfig } from 'next';

// GitHub Pages serves project sites from /<repo>, so assets need a base path.
// Vercel and local dev serve from the root, hence the env switch.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
