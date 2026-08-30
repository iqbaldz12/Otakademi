import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private or non-indexable surfaces. Tickets carry a personal code, and
        // the admin/API areas have nothing to offer a crawler.
        disallow: ["/admin", "/api/", "/tiket/", "/cek-tiket?"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
