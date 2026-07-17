import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  distDir: "dist",
  basePath: "/myloc",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
