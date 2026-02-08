import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite compatibility: exclude from webpack bundling (server-side)
  serverExternalPackages: ["@electric-sql/pglite"],

  webpack: (config, { isServer }) => {
    // Client-side: provide fallbacks for Node.js modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        module: false,
        path: false,
      };
    }

    // Server-side: handle WASM files
    if (isServer) {
      config.experiments = {
        ...config.experiments,
        asyncWebAssembly: true,
      };
    }

    return config;
  },
};

export default nextConfig;
