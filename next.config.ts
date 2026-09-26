import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
// En développement, le site relaie /api et les images vers l'API PHP locale :
// tout passe par http://localhost:3001 (pas de problème de CORS ni de bloqueur de pub).
const devApi = process.env.MYLOC_DEV_API ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  // Export statique (GitHub Pages / hébergement simple) uniquement pour la version en ligne
  output: isProd ? "export" : undefined,
  distDir: "dist",
  assetPrefix: isProd ? "." : undefined,
  images: {
    unoptimized: true,
  },
  ...(isProd
    ? {}
    : {
        async rewrites() {
          return {
            beforeFiles: [{ source: "/api/:path*", destination: `${devApi}/api/:path*` }],
            afterFiles: [],
            // Images envoyées depuis l'admin : servies par l'API si le front ne les a pas
            fallback: [{ source: "/images/:path*", destination: `${devApi}/images/:path*` }],
          };
        },
      }),
};

export default nextConfig;
