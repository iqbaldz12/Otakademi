"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Switch";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { toast } from "@/components/ui/toast";
import {
  saveChannelAction,
  toggleChannelAction,
  deleteChannelAction,
  moveChannelAction,
  type ChannelFormState,
} from "@/server/actions/content.actions";
import { CONTACT_ICON_OPTIONS, isContactIcon } from "@/lib/domain";
import { useTransition } from "react";

export type ChannelRow = {
  id: string;
  icon: string;
  label: string;
  value: string;
  href: string;
  note: string | null;
  primary: boolean;
  active: boolean;
};

const INITIAL: ChannelFormState = { ok: false };

const EMPTY: ChannelRow = {
  id: "",
  icon: "mail",
  label: "",
  value: "",
  href: "",
  note: "",
  primary: false,
  active: true,
};

/** Safe icon lookup: unknown values fall back to a neutral glyph. */
function iconFor(name: string): IconName {
  return (isContactIcon(name) ? name : "info") as IconName;
}

/**
 * Contact-channel CMS.
 *
 * The list on the left is the live ordering shown on /kontak; the panel on the
 * right is a single create/edit form. Selecting "Edit" loads a row into the form
 * via a `key` remount so all the uncontrolled inputs pick up the new defaults.
 */
export function ChannelManager({ channels }: { channels: ChannelRow[] }) {
  const [editing, setEditing] = useState<ChannelRow | null>(null);

  const [state, formAction] = useActionState(
    saveChannelAction.bind(null, editing?.id || null),
    INITIAL,
  );

  const errors = state.errors ?? {};
  const current = editing ?? EMPTY;

  const err = (f: string) =>
    errors[f] ? (
      <p className="error-text" role="alert">
        {errors[f]}
      </p>
    ) : null;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      {/* ---------------- List ---------------- */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-navy-100 p-5">
          <div>
            <h2 className="text-h3">Kanal Kontak</h2>
            <p className="mt-0.5 text-sm text-navy-500">
              Urutan di sini menentukan urutan di halaman publik.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="btn btn-primary btn-sm"
          >
            <Icon name="plus" size={15} />
            Tambah
          </button>
        </div>

        {channels.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <Icon name="mail" size={30} className="text-navy-200" />
            <p className="text-sm text-navy-500">
              Belum ada kanal. Tambahkan lewat form di samping.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-navy-100">
            {channels.map((c, i) => (
              <li key={c.id} className="flex items-center gap-3 p-4">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-600">
                  <Icon name={iconFor(c.icon)} size={18} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-navy-900">{c.label}</span>
                    {c.primary && <Badge tone="green">Utama</Badge>}
                    {!c.active && <Badge tone="grey">Disembunyikan</Badge>}
                  </div>
                  <p className="truncate text-xs text-navy-500">{c.value}</p>
                </div>

                {/* Reorder */}
                <div className="flex flex-col">
                  <MoveButton id={c.id} direction="up" disabled={i === 0} />
                  <MoveButton
                    id={c.id}
                    direction="down"
                    disabled={i === channels.length - 1}
                  />
                </div>

                <Switch
                  checked={c.active}
                  size="sm"
                  showLabel={false}
                  ariaLabel={`Tampilkan ${c.label}`}
                  messageOn={`${c.label} ditampilkan.`}
                  messageOff={`${c.label} disembunyikan.`}
                  onToggle={(next) => toggleChannelAction(c.id, next)}
                />

                <button
                  type="button"
                  onClick={() => setEditing(c)}
                  className="btn btn-outline btn-sm"
                >
                  <Icon name="edit" size={14} />
                  Edit
                </button>

                <ConfirmButton
                  action={() => deleteChannelAction(c.id)}
                  confirmLabel="Hapus"
                  successMessage={`${c.label} dihapus.`}
                >
                  <span className="sr-only-x">Hapus {c.label}</span>
                  <Icon name="trash" size={14} />
                </ConfirmButton>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---------------- Form ---------------- */}
      <div className="card p-5 sm:p-6 lg:sticky lg:top-6 lg:self-start">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-h3">{editing ? "Edit Kanal" : "Tambah Kanal"}</h2>
          {editing && (
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="btn btn-ghost btn-sm"
            >
              <Icon name="x" size={14} />
              Batal edit
            </button>
          )}
        </div>

        {/* Remount on selection so defaultValues refresh */}
        <form key={editing?.id ?? "new"} action={formAction} className="space-y-4">
          {state.message && !state.ok && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-coral-200 bg-coral-50 p-3 text-sm font-semibold text-coral-800"
            >
              <Icon name="alert" size={16} className="mt-px" />
              {state.message}
            </div>
          )}

          <div>
            <label htmlFor="icon" className="label">
              Ikon
            </label>
            <select
              id="icon"
              name="icon"
              defaultValue={current.icon}
              className="field field-select"
            >
              {CONTACT_ICON_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {err("icon")}
          </div>

          <div>
            <label htmlFor="label" className="label">
              Nama kanal <span className="text-coral-600">*</span>
            </label>
            <input
              id="label"
              name="label"
              defaultValue={current.label}
              placeholder="WhatsApp"
              className="field"
            />
            {err("label")}
          </div>

          <div>
            <label htmlFor="value" className="label">
              Teks yang ditampilkan <span className="text-coral-600">*</span>
            </label>
            <input
              id="value"
              name="value"
              defaultValue={current.value}
              placeholder="+62 812-3456-7890"
              className="field"
            />
            {err("value")}
          </div>

          <div>
            <label htmlFor="href" className="label">
              Tautan tujuan <span className="text-coral-600">*</span>
            </label>
            <input
              id="href"
              name="href"
              defaultValue={current.href}
              placeholder="https://wa.me/62812..."
              className="field"
            />
            {err("href") ?? (
              <p className="hint">
                Gunakan https:// untuk web, mailto: untuk email, tel: untuk telepon.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="note" className="label">
              Catatan singkat
            </label>
            <input
              id="note"
              name="note"
              defaultValue={current.note ?? ""}
              placeholder="Paling cepat. Senin-Jumat, 09.00-17.00 WIB."
              className="field"
            />
            {err("note")}
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-navy-100 bg-surface p-3">
            <label htmlFor="primary" className="flex items-center gap-2.5 text-sm font-semibold">
              <input
                id="primary"
                name="primary"
                type="checkbox"
                defaultChecked={current.primary}
                className="size-4 accent-gold-500"
              />
              Tandai sebagai kanal utama (diberi aksen menonjol)
            </label>
            <label htmlFor="active" className="flex items-center gap-2.5 text-sm font-semibold">
              <input
                id="active"
                name="active"
                type="checkbox"
                defaultChecked={current.active}
                className="size-4 accent-gold-500"
              />
              Tampilkan di halaman publik
            </label>
          </div>

          <SubmitButton full size="md" icon="check" pendingText="Menyimpan...">
            {editing ? "Simpan Perubahan" : "Tambah Kanal"}
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}

/** Small reorder arrow that fires the move action. */
function MoveButton({
  id,
  direction,
  disabled,
}: {
  id: string;
  direction: "up" | "down";
  disabled: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={disabled || isPending}
      aria-label={direction === "up" ? "Naikkan urutan" : "Turunkan urutan"}
      onClick={() =>
        startTransition(async () => {
          const r = await moveChannelAction(id, direction);
          if (!r.ok && r.reason) toast(r.reason, "error");
        })
      }
      className="rounded p-0.5 text-navy-400 transition-colors hover:text-navy-800 disabled:opacity-25"
    >
      <Icon name={direction === "up" ? "chevron-down" : "chevron-down"} size={14} className={direction === "up" ? "rotate-180" : ""} />
    </button>
  );
}
