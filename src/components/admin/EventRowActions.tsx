"use client";

import Link from "next/link";
import { Switch } from "@/components/ui/Switch";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { Icon } from "@/components/ui/Icon";
import {
  toggleEventActive,
  deleteEventAction,
} from "@/server/actions/event.actions";
import type { EventStatusName } from "@/lib/domain";

/**
 * Per-row controls in the admin event table: activate/deactivate, edit, delete.
 *
 * The Switch maps "aktif" to PUBLISHED and "non-aktif" to CLOSED. Terminal
 * statuses (COMPLETED, CANCELLED) disable the switch with an explanation rather
 * than silently doing nothing, and DRAFT reads as non-active so publishing an
 * event is a single click.
 */
export function EventRowActions({
  eventId,
  slug,
  status,
  title,
}: {
  eventId: string;
  slug: string;
  status: EventStatusName;
  title: string;
}) {
  // SOLD_OUT still counts as active: registration is open, the seats just ran
  // out, and a waitlist is being collected.
  const isActive = status === "PUBLISHED" || status === "SOLD_OUT";

  const locked = status === "COMPLETED" || status === "CANCELLED";
  const lockedReason =
    status === "COMPLETED"
      ? "Event sudah selesai, statusnya tidak bisa diubah dari sini."
      : "Event dibatalkan. Pulihkan lewat halaman Edit.";

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Switch
        checked={isActive}
        disabled={locked}
        disabledReason={lockedReason}
        ariaLabel={`Tampilkan ${title} di halaman publik`}
        messageOn="Event aktif. Sekarang tampil di daftar kelas."
        messageOff="Event non-aktif. Sudah hilang dari daftar kelas."
        onToggle={(next) => toggleEventActive(eventId, next)}
      />

      <Link
        href={`/event/${slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-ghost btn-sm"
        title="Lihat halaman publik"
      >
        <Icon name="external" size={15} />
        <span className="sr-only-x">Lihat halaman publik {title}</span>
      </Link>

      <Link href={`/admin/event/${eventId}`} className="btn btn-outline btn-sm">
        <Icon name="edit" size={15} />
        Edit
      </Link>

      <ConfirmButton
        action={() => deleteEventAction(eventId)}
        confirmLabel="Hapus"
        successMessage={`Event "${title}" dihapus.`}
      >
        Hapus
      </ConfirmButton>
    </div>
  );
}
