import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/ui/Icon";
import { EventCard } from "@/components/site/EventCard";
import { EventFilters } from "@/components/site/EventFilters";
import { listPublicEvents, listCategories } from "@/server/services/event.service";

export const metadata: Metadata = {
  title: "Kelas & Event",
  description:
    "Daftar kelas dan event Otakademi. Filter berdasarkan topik, format, harga, dan jadwal.",
  alternates: { canonical: "/event" },
};

type SearchParams = {
  category?: string;
  format?: string;
  when?: string;
  q?: string;
};

/** Skeleton shown while the filtered query runs. */
function GridSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card overflow-hidden">
          <div className="skeleton h-2 rounded-none" />
          <div className="space-y-3 p-5">
            <div className="skeleton h-4 w-20" />
            <div className="skeleton h-5 w-full" />
            <div className="skeleton h-5 w-3/4" />
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-2/3" />
            <div className="skeleton mt-4 h-9 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

async function EventGrid({ params }: { params: SearchParams }) {
  const [events, categories] = await Promise.all([
    listPublicEvents({
      category: params.category,
      format: params.format,
      when: params.when,
      search: params.q,
    }),
    listCategories(),
  ]);

  // Split so people see what they can still join before what's already gone.
  const now = new Date();
  const open = events.filter(
    (e) => e.startAt >= now && (e.status === "PUBLISHED" || e.status === "SOLD_OUT"),
  );
  const other = events.filter((e) => !open.includes(e));

  return (
    <>
      <EventFilters
        current={params}
        categories={categories}
        resultCount={events.length}
      />

      {events.length === 0 ? (
        <div className="card mt-6 flex flex-col items-center gap-3 px-6 py-16 text-center">
          <Icon name="search" size={34} className="text-navy-200" />
          <h2 className="text-h3">Tidak ada event yang cocok</h2>
          <p className="max-w-sm text-sm text-navy-500">
            Coba hapus sebagian filter, atau lihat semua event yang tersedia.
          </p>
          <Link href="/event" className="btn btn-primary btn-md mt-1">
            Lihat Semua Event
          </Link>
        </div>
      ) : (
        <>
          {open.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-4 text-h3">Bisa Didaftar Sekarang</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {open.map((event, i) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    reveal
                    delayClass={`d-${(i % 6) + 1}`}
                  />
                ))}
              </div>
            </div>
          )}

          {other.length > 0 && (
            <div className="mt-12">
              <h2 className="mb-4 text-h3 text-navy-500">Arsip Kelas</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {other.map((event, i) => (
                  <div key={event.id} className="opacity-75 transition-opacity hover:opacity-100">
                    <EventCard event={event} reveal delayClass={`d-${(i % 6) + 1}`} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

export default async function EventListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  return (
    <>
      <section className="border-b border-navy-100 bg-surface">
        <div className="container-page py-12">
          <nav aria-label="Breadcrumb" className="mb-3">
            <ol className="flex items-center gap-1.5 text-xs font-semibold text-navy-400">
              <li>
                <Link href="/" className="transition-colors hover:text-navy-700">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">
                <Icon name="chevron-right" size={13} />
              </li>
              <li className="text-navy-700">Kelas &amp; Event</li>
            </ol>
          </nav>

          <h1 className="text-h1">Kelas &amp; Event</h1>
          <p className="mt-3 max-w-2xl text-lead text-navy-500">
            Pilih sesi yang paling dekat dengan kebutuhanmu. Semua kelas dirancang
            ringkas, praktis, dan selalu meninggalkan sesuatu yang bisa langsung
            dipakai.
          </p>
        </div>
      </section>

      <section className="section pt-8">
        <div className="container-page">
          {/*
            Suspense keyed on the filter values: changing a filter shows the
            skeleton immediately instead of blocking navigation on the query.
          */}
          <Suspense
            key={`${params.category}-${params.format}-${params.when}-${params.q}`}
            fallback={
              <>
                <div className="skeleton h-48 rounded-[--radius-card]" />
                <div className="mt-8">
                  <GridSkeleton />
                </div>
              </>
            }
          >
            <EventGrid params={params} />
          </Suspense>
        </div>
      </section>
    </>
  );
}
