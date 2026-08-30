"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { saveEventAction, type EventFormState } from "@/server/actions/event.actions";
import { EVENT_CATEGORIES, BANNER_PRESETS } from "@/lib/domain";
import { formatIDR, toDatetimeLocalValue } from "@/lib/format";

const INITIAL: EventFormState = { ok: false };

/**
 * Status options, each paired with the effect it has on the public site.
 *
 * `public` drives the inline explanation below the field, so a non-technical
 * admin can see immediately whether the event will be visible to visitors.
 */
const STATUS_CHOICES = [
  {
    value: "DRAFT",
    label: "Draft - belum dipublikasikan",
    public: false,
    effect: "Belum tampil di halaman publik. Aman untuk menyiapkan detail dulu.",
  },
  {
    value: "PUBLISHED",
    label: "Aktif - tampil & pendaftaran terbuka",
    public: true,
    effect: "Tampil di daftar kelas dan bisa didaftar peserta.",
  },
  {
    value: "CLOSED",
    label: "Non-aktif - disembunyikan dari publik",
    public: false,
    effect:
      "Hilang dari daftar kelas dan link-nya tidak bisa dibuka lagi. Data pendaftar tetap tersimpan.",
  },
  {
    value: "SOLD_OUT",
    label: "Kuota penuh - tampil, hanya waitlist",
    public: true,
    effect: "Masih tampil, tapi pendaftar baru masuk daftar tunggu.",
  },
  {
    value: "COMPLETED",
    label: "Selesai - tampil sebagai arsip",
    public: true,
    effect: "Tampil sebagai arsip, pendaftaran tertutup.",
  },
  {
    value: "CANCELLED",
    label: "Dibatalkan - disembunyikan dari publik",
    public: false,
    effect:
      "Hilang dari halaman publik. Gunakan tombol Batalkan Event agar pendaftar ikut dibatalkan.",
  },
] as const;

export type EventFormValues = {
  id?: string;
  title: string;
  category: string;
  format: string;
  venue: string;
  meetingLink: string;
  startAt: Date;
  endAt: Date;
  capacity: number;
  price: number;
  status: string;
  mentorName: string;
  mentorTitle: string;
  mentorPhoto: string;
  mentorLink: string;
  mentorLinkLabel: string;
  bannerImage: string;
  bannerColor: string;
  summary: string;
  description: string;
  outcomes: string[];
};

/**
 * Create/edit event form.
 *
 * Server action + `useActionState`, so validation lives in one place
 * (`validateEvent`) and errors come back keyed by field. Local state only drives
 * live preview bits: the colour swatch, price hint, and format-dependent labels.
 */
export function EventForm({
  initial,
  mode,
}: {
  initial: EventFormValues;
  mode: "create" | "edit";
}) {
  const [state, formAction] = useActionState(
    saveEventAction.bind(null, initial.id ?? null),
    INITIAL,
  );

  const errors = state.errors ?? {};

  const [format, setFormat] = useState(initial.format);
  const [color, setColor] = useState(initial.bannerColor);
  const [price, setPrice] = useState(String(initial.price));
  const [capacity, setCapacity] = useState(String(initial.capacity));
  const [status, setStatus] = useState(initial.status);

  const activeStatus =
    STATUS_CHOICES.find((s) => s.value === status) ?? STATUS_CHOICES[0];

  const err = (field: string) =>
    errors[field] ? (
      <p id={`${field}-error`} className="error-text" role="alert">
        {errors[field]}
      </p>
    ) : null;

  const aria = (field: string) => ({
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `${field}-error` : undefined,
  });

  const priceNum = Number(price) || 0;
  const capacityNum = Number(capacity) || 0;

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state.message && !state.ok && (
        <div
          role="alert"
          className="anim-fade flex items-start gap-2.5 rounded-xl border border-coral-200 bg-coral-50 p-4 text-sm font-semibold text-coral-800"
        >
          <Icon name="alert" size={18} className="mt-px" />
          {state.message}
        </div>
      )}

      {/* ---------------- Basics ---------------- */}
      <section className="card p-5 sm:p-6">
        <h2 className="text-h3">Informasi Dasar</h2>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="title" className="label">
              Judul event <span className="text-coral-600">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              defaultValue={initial.title}
              placeholder="AI Bukan Cuma Prompt"
              className="field"
              {...aria("title")}
            />
            {err("title")}
          </div>

          <div>
            <label htmlFor="summary" className="label">
              Ringkasan singkat
            </label>
            <input
              id="summary"
              name="summary"
              type="text"
              maxLength={200}
              defaultValue={initial.summary}
              placeholder="Satu kalimat yang menjelaskan hasil konkret dari kelas ini."
              className="field"
            />
            <p className="hint">
              Tampil di kartu event dan hasil pencarian. Maksimal 200 karakter.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="category" className="label">
                Kategori <span className="text-coral-600">*</span>
              </label>
              <input
                id="category"
                name="category"
                type="text"
                required
                list="category-options"
                defaultValue={initial.category}
                placeholder="AI & Teknologi"
                className="field"
                {...aria("category")}
              />
              {/* datalist: suggests existing categories but allows new ones */}
              <datalist id="category-options">
                {EVENT_CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              {err("category")}
            </div>

            <div>
              <label htmlFor="status" className="label">
                Status <span className="text-coral-600">*</span>
              </label>
              <select
                id="status"
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="field field-select"
                {...aria("status")}
              >
                {STATUS_CHOICES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* Spells out the public consequence of the selected status, so the
                  team never has to guess what "non-aktif" actually does. */}
              <p
                className={`mt-2 flex items-start gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold ${
                  activeStatus.public
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-navy-50 text-navy-600"
                }`}
              >
                <Icon
                  name={activeStatus.public ? "eye" : "x-circle"}
                  size={14}
                  className="mt-px shrink-0"
                />
                {activeStatus.effect}
              </p>
              {err("status")}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Schedule & place ---------------- */}
      <section className="card p-5 sm:p-6">
        <h2 className="text-h3">Jadwal &amp; Lokasi</h2>

        <div className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="startAt" className="label">
                Mulai <span className="text-coral-600">*</span>
              </label>
              <input
                id="startAt"
                name="startAt"
                type="datetime-local"
                required
                defaultValue={toDatetimeLocalValue(initial.startAt)}
                className="field"
                {...aria("startAt")}
              />
              {err("startAt") ?? <p className="hint">Waktu Indonesia Barat (WIB).</p>}
            </div>

            <div>
              <label htmlFor="endAt" className="label">
                Selesai <span className="text-coral-600">*</span>
              </label>
              <input
                id="endAt"
                name="endAt"
                type="datetime-local"
                required
                defaultValue={toDatetimeLocalValue(initial.endAt)}
                className="field"
                {...aria("endAt")}
              />
              {err("endAt")}
            </div>
          </div>

          <div>
            <span className="label">Format</span>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "ONLINE", label: "Online", icon: "monitor" as const },
                { value: "OFFLINE", label: "Offline", icon: "pin" as const },
                { value: "HYBRID", label: "Hybrid", icon: "globe" as const },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition-colors ${
                    format === opt.value
                      ? "border-gold-400 bg-gold-50 text-gold-700"
                      : "border-navy-200 text-navy-600 hover:border-navy-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="format"
                    value={opt.value}
                    checked={format === opt.value}
                    onChange={() => setFormat(opt.value)}
                    className="sr-only-x"
                  />
                  <Icon name={opt.icon} size={16} />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="venue" className="label">
                {format === "OFFLINE" ? "Lokasi" : "Platform"}{" "}
                <span className="text-coral-600">*</span>
              </label>
              <input
                id="venue"
                name="venue"
                type="text"
                defaultValue={initial.venue}
                placeholder={
                  format === "OFFLINE" ? "Bandung Creative Hub" : "Zoom"
                }
                className="field"
                {...aria("venue")}
              />
              {err("venue")}
            </div>

            <div>
              <label htmlFor="meetingLink" className="label">
                Link meeting
              </label>
              <input
                id="meetingLink"
                name="meetingLink"
                type="url"
                defaultValue={initial.meetingLink}
                placeholder="https://zoom.us/j/..."
                className="field"
              />
              <p className="hint">Hanya dibagikan ke peserta terkonfirmasi.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Capacity & price ---------------- */}
      <section className="card p-5 sm:p-6">
        <h2 className="text-h3">Kuota &amp; Harga</h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="capacity" className="label">
              Kuota peserta
            </label>
            <input
              id="capacity"
              name="capacity"
              type="number"
              min={0}
              step={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="field tnum"
              {...aria("capacity")}
            />
            {err("capacity") ?? (
              <p className="hint">
                {capacityNum === 0
                  ? "0 = tanpa batas kuota."
                  : `Setelah ${capacityNum} kursi terisi, pendaftar berikutnya masuk waitlist.`}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="price" className="label">
              Harga (IDR)
            </label>
            <input
              id="price"
              name="price"
              type="number"
              min={0}
              step={1000}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="field tnum"
              {...aria("price")}
            />
            {err("price") ?? (
              <p className="hint">
                {priceNum === 0
                  ? "0 = gratis, peserta langsung terkonfirmasi."
                  : `Tampil sebagai ${formatIDR(priceNum)}. Peserta masuk alur pembayaran.`}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ---------------- Content ---------------- */}
      <section className="card p-5 sm:p-6">
        <h2 className="text-h3">Konten</h2>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="outcomes" className="label">
              Yang akan didapat peserta
            </label>
            <textarea
              id="outcomes"
              name="outcomes"
              rows={4}
              defaultValue={initial.outcomes.join("\n")}
              placeholder={"Framework memilih tool AI\nLatihan workflow nyata\nTemplate siap pakai"}
              className="field resize-y"
            />
            <p className="hint">Satu poin per baris. Maksimal 8 poin.</p>
          </div>

          <div>
            <label htmlFor="description" className="label">
              Deskripsi lengkap
            </label>
            <textarea
              id="description"
              name="description"
              rows={7}
              defaultValue={initial.description}
              placeholder="Jelaskan konteks masalah, apa yang dibahas, dan siapa yang paling cocok ikut kelas ini."
              className="field resize-y"
            />
            <p className="hint">
              Pisahkan paragraf dengan satu baris kosong.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="mentorName" className="label">
                Nama mentor
              </label>
              <input
                id="mentorName"
                name="mentorName"
                type="text"
                defaultValue={initial.mentorName}
                placeholder="Raka Wibowo"
                className="field"
              />
            </div>
            <div>
              <label htmlFor="mentorTitle" className="label">
                Jabatan / bidang mentor
              </label>
              <input
                id="mentorTitle"
                name="mentorTitle"
                type="text"
                defaultValue={initial.mentorTitle}
                placeholder="AI Engineer, praktisi automation"
                className="field"
              />
            </div>
          </div>

          {/* Optional mentor photo */}
          <div className="sm:max-w-xs">
            <ImageUpload
              name="mentorPhoto"
              label="Foto mentor (opsional)"
              initial={initial.mentorPhoto}
              aspect="1/1"
              hint="Persegi paling bagus. Kosongkan kalau belum ada."
            />
          </div>

          {/* Optional mentor supporting link */}
          <div className="grid gap-4 sm:grid-cols-[1fr_0.6fr]">
            <div>
              <label htmlFor="mentorLink" className="label">
                Link pendukung mentor (opsional)
              </label>
              <input
                id="mentorLink"
                name="mentorLink"
                type="url"
                defaultValue={initial.mentorLink}
                placeholder="https://linkedin.com/in/..."
                className="field"
                {...aria("mentorLink")}
              />
              {err("mentorLink") ?? (
                <p className="hint">LinkedIn, portofolio, atau profil lain.</p>
              )}
            </div>
            <div>
              <label htmlFor="mentorLinkLabel" className="label">
                Label link
              </label>
              <input
                id="mentorLinkLabel"
                name="mentorLinkLabel"
                type="text"
                defaultValue={initial.mentorLinkLabel}
                placeholder="LinkedIn"
                className="field"
              />
            </div>
          </div>

          {/* Banner image (falls back to the accent colour when empty) */}
          <ImageUpload
            name="bannerImage"
            label="Foto / banner event"
            initial={initial.bannerImage}
            aspect="16/9"
            hint="Tampil di kartu event dan halaman detail. Kalau kosong, dipakai warna aksen di bawah."
          />

          {/* Accent colour: fallback + small accents even when a banner exists */}
          <div>
            <span className="label">Warna aksen (cadangan)</span>
            <div className="flex flex-wrap items-center gap-2">
              {BANNER_PRESETS.map((preset) => (
                <label
                  key={preset.value}
                  title={preset.name}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2 text-xs font-bold transition-colors ${
                    color.toUpperCase() === preset.value.toUpperCase()
                      ? "border-navy-800 bg-navy-50"
                      : "border-navy-200 hover:border-navy-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="bannerColor"
                    value={preset.value}
                    checked={color.toUpperCase() === preset.value.toUpperCase()}
                    onChange={() => setColor(preset.value)}
                    className="sr-only-x"
                  />
                  <span
                    aria-hidden="true"
                    className="size-4 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: preset.value }}
                  />
                  {preset.name}
                </label>
              ))}
            </div>
            {err("bannerColor")}

            {/* Live preview of the accent bar */}
            <div className="mt-3 overflow-hidden rounded-lg border border-navy-100">
              <div className="h-2" style={{ backgroundColor: color }} />
              <p className="bg-surface px-3 py-2 text-xs text-navy-400">
                Pratinjau garis aksen di kartu event
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Submit ---------------- */}
      <div className="flex flex-wrap items-center gap-3 border-t border-navy-100 pt-5">
        <SubmitButton size="md" icon="check" pendingText="Menyimpan...">
          {mode === "create" ? "Simpan Event" : "Simpan Perubahan"}
        </SubmitButton>
        <Link href="/admin/event" className="btn btn-ghost btn-md">
          Batal
        </Link>
      </div>
    </form>
  );
}
