import Link from "next/link";
import type { Metadata } from "next";
import { Icon } from "@/components/ui/Icon";
import { EventForm } from "@/components/admin/EventForm";

export const metadata: Metadata = { title: "Buat Event" };

/** Sensible defaults: next week, 19:30-21:30 WIB, a common slot for evening classes. */
function defaultTimes() {
  const start = new Date();
  start.setDate(start.getDate() + 7);
  // 19:30 WIB == 12:30 UTC
  start.setUTCHours(12, 30, 0, 0);
  const end = new Date(start.getTime() + 2 * 3600 * 1000);
  return { start, end };
}

export default function NewEventPage() {
  const { start, end } = defaultTimes();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/admin/event" className="btn btn-ghost btn-sm -ml-3 mb-3">
          <Icon name="arrow-left" size={16} />
          Kembali ke daftar event
        </Link>
        <h1 className="text-h2">Buat Event Baru</h1>
        <p className="mt-1 text-sm text-navy-500">
          Simpan sebagai Draft dulu kalau detailnya belum final.
        </p>
      </div>

      <EventForm
        mode="create"
        initial={{
          title: "",
          category: "",
          format: "ONLINE",
          venue: "Zoom",
          meetingLink: "",
          startAt: start,
          endAt: end,
          capacity: 50,
          price: 0,
          status: "DRAFT",
          mentorName: "",
          mentorTitle: "",
          mentorPhoto: "",
          mentorLink: "",
          mentorLinkLabel: "",
          bannerImage: "",
          bannerColor: "#F96469",
          summary: "",
          description: "",
          outcomes: [],
        }}
      />
    </div>
  );
}
