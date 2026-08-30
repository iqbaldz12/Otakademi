import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { EventForm } from "@/components/admin/EventForm";
import { ActionButton } from "@/components/admin/ActionButton";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { cancelEventAction, deleteEventAction } from "@/server/actions/event.actions";
import { promoteWaitlistAction } from "@/server/actions/registration.actions";
import { getEventById } from "@/server/services/event.service";
import { db } from "@/server/db";
import { EVENT_STATUS_META, type EventStatusName } from "@/lib/domain";
import { formatIDR } from "@/lib/format";

export const metadata: Metadata = { title: "Edit Event" };
export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEventById(id);

  if (!event) notFound();

  // Quick operational picture for this specific event.
  const [waitlistCount, paidAgg, attendedCount] = await Promise.all([
    db.registration.count({ where: { eventId: id, status: "WAITLIST" } }),
    db.payment.aggregate({
      where: { status: "PAID", registration: { eventId: id } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    db.registration.count({ where: { eventId: id, status: "ATTENDED" } }),
  ]);

  const meta = EVENT_STATUS_META[event.status as EventStatusName];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/admin/event" className="btn btn-ghost btn-sm -ml-3 mb-3">
          <Icon name="arrow-left" size={16} />
          Kembali ke daftar event
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-h2">{event.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={meta.tone}>{meta.label}</Badge>
              <span className="text-xs text-navy-400">/{event.slug}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/event/${event.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm"
            >
              <Icon name="external" size={15} />
              Lihat Publik
            </Link>
            <Link
              href={`/admin/pendaftar?eventId=${event.id}`}
              className="btn btn-outline btn-sm"
            >
              <Icon name="users" size={15} />
              Peserta
            </Link>
          </div>
        </div>
      </div>

      {/* Snapshot */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          {
            label: "Kursi terisi",
            value: event.seats.isUnlimited
              ? String(event.seats.taken)
              : `${event.seats.taken}/${event.seats.capacity}`,
          },
          { label: "Waitlist", value: String(waitlistCount) },
          { label: "Lunas", value: String(paidAgg._count._all) },
          { label: "Revenue", value: formatIDR(paidAgg._sum.amount ?? 0) },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs font-semibold text-navy-400">{s.label}</p>
            <p className="mt-0.5 text-lg font-extrabold text-navy-900 tnum">{s.value}</p>
          </div>
        ))}
      </div>

      {waitlistCount > 0 && (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-navy-200 bg-navy-50 p-4">
          <p className="text-sm text-navy-700">
            <strong>{waitlistCount} orang</strong> menunggu di waitlist. Naikkan mereka
            kalau ada kursi yang terbuka.
          </p>
          <ActionButton
            action={promoteWaitlistAction.bind(null, event.id)}
            icon="trending"
            variant="navy"
            pendingText="Memproses..."
          >
            Naikkan dari Waitlist
          </ActionButton>
        </div>
      )}

      <EventForm
        mode="edit"
        initial={{
          id: event.id,
          title: event.title,
          category: event.category,
          format: event.format,
          venue: event.venue ?? "",
          meetingLink: event.meetingLink ?? "",
          startAt: event.startAt,
          endAt: event.endAt,
          capacity: event.capacity,
          price: event.price,
          status: event.status,
          mentorName: event.mentorName ?? "",
          mentorTitle: event.mentorTitle ?? "",
          mentorPhoto: event.mentorPhoto ?? "",
          mentorLink: event.mentorLink ?? "",
          mentorLinkLabel: event.mentorLinkLabel ?? "",
          bannerImage: event.bannerImage ?? "",
          bannerColor: event.bannerColor,
          summary: event.summary ?? "",
          description: event.description ?? "",
          outcomes: event.outcomes,
        }}
      />

      {/* Destructive zone, visually separated so it isn't hit by accident */}
      <section className="card border-coral-200 p-5">
        <h2 className="text-h3 text-coral-700">Zona Berisiko</h2>
        <p className="mt-1.5 text-sm text-navy-500">
          Membatalkan event akan menandai semua pendaftar aktif sebagai dibatalkan.
          Menghapus hanya bisa dilakukan kalau belum ada pendaftar aktif.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {event.status !== "CANCELLED" && (
            <ActionButton
              action={cancelEventAction.bind(null, event.id)}
              icon="x-circle"
              variant="coral"
              pendingText="Membatalkan..."
            >
              Batalkan Event
            </ActionButton>
          )}
          {/*
            `.bind` rather than an arrow function: this is a Server Component, and
            React can only hand a Client Component a reference to a server action,
            not an arbitrary closure. Binding produces such a reference.
          */}
          <ConfirmButton
            action={deleteEventAction.bind(null, event.id)}
            confirmLabel="Ya, hapus permanen"
            size="md"
            successMessage="Event dihapus."
          >
            Hapus Event
          </ConfirmButton>
        </div>
      </section>
    </div>
  );
}
