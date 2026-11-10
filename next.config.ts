import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PayPal redirects back through a public tunnel during local testing; the dev server
  // blocks dev assets requested from other hostnames unless they are listed here.
  allowedDevOrigins: ["*.trycloudflare.com", "*.ngrok-free.app", "*.ngrok.app"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
