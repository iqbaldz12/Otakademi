import type { MetadataRoute } from "next";
import { db } from "@/server/db";
import { PUBLIC_VISIBLE_STATUS } from "@/lib/domain";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Dynamic sitemap: static pages plus every publicly visible event.
 *
 * Admin routes, registration forms, and ticket pages are excluded on purpose;
 * they're either private or have no standalone search value.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/event`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/tentang`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/institusi`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/faq`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/kontak`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE}/cek-tiket`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/kebijakan/privasi`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/kebijakan/ketentuan`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/kebijakan/refund`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/kebijakan/kode-etik`, changeFrequency: "yearly", priority: 0.2 },
  ];

  let eventRoutes: MetadataRoute.Sitemap = [];

  try {
    const events = await db.event.findMany({
      // Mirrors PUBLIC_VISIBLE_STATUS: never advertise a hidden event to crawlers.
      where: { status: { in: PUBLIC_VISIBLE_STATUS } },
      select: { slug: true, updatedAt: true, startAt: true },
    });

    const now = new Date();

    eventRoutes = events.map((e) => ({
      url: `${SITE}/event/${e.slug}`,
      lastModified: e.updatedAt,
      // Upcoming events change often; past ones are effectively frozen.
      changeFrequency: e.startAt > now ? ("daily" as const) : ("yearly" as const),
      priority: e.startAt > now ? 0.8 : 0.3,
    }));
  } catch (err) {
    // A database hiccup shouldn't make the sitemap 500; serve static routes.
    console.error("[sitemap] could not load events", err);
  }

  return [...staticRoutes, ...eventRoutes];
}
