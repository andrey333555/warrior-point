import type { NextConfig } from "next";
import path from "node:path";

const projectRoot = path.resolve(process.cwd());

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Fix Turbopack picking wrong workspace root (parent lockfile)
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
