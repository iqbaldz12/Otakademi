import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the client bundle small and the server output portable.
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  // Emit a self-contained server bundle so the Docker runtime image only needs
  // the standalone output plus static assets, not the full node_modules tree.
  output: "standalone",

  /**
   * Keep Prisma out of the bundler.
   *
   * Its runtime does dynamic `fs` access to locate the query engine, which makes
   * the tracer pull the entire project into the server output. Marking it
   * external leaves it as a plain runtime require.
   */
  serverExternalPackages: ["@prisma/client", "prisma", ".prisma/client"],

  images: {
    // Local assets only, so no remote patterns needed.
    formats: ["image/avif", "image/webp"],
    /**
     * Next 16 narrowed the default allowed qualities to [75]; anything else is
     * coerced to the nearest allowed value. The brand lockup and emblem are flat
     * artwork with fine curves, so 90 is declared explicitly to keep the edges
     * clean. 75 stays available for everything else.
     */
    qualities: [75, 90],
  },

  // Long-lived caching for static assets; HTML stays revalidated by Next.
  async headers() {
    return [
      {
        source: "/brand/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
