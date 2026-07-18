import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  distDir: "dist",
  assetPrefix: ".",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
