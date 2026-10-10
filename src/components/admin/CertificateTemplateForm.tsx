"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { toast } from "@/components/ui/toast";
import {
  saveCertificateTemplateAction,
  removeCertificateTemplateAction,
} from "@/server/actions/certificate.actions";

export type CertLayoutValues = {
  template: string | null;
  nameX: number;
  nameY: number;
  nameSize: number;
  nameColor: string;
  dateShow: boolean;
  dateX: number;
  dateY: number;
  dateSize: number;
  numberShow: boolean;
  numberX: number;
  numberY: number;
  numberSize: number;
};

/** One overlay line drawn on the live preview, sized relative to template height. */
function PreviewLabel({
  text,
  x,
  y,
  size,
  color,
  boxH,
}: {
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
  boxH: number;
}) {
  return (
    <span
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-extrabold leading-none"
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        // size is a fraction of the template HEIGHT, matching the PDF generator.
        fontSize: `${Math.max(8, size * boxH)}px`,
        color,
      }}
    >
      {text}
    </span>
  );
}

/**
 * Upload the blank template + configure where the dynamic text lands.
 *
 * Positions are fractions (0..1) of the template, so the preview overlays the
 * text at the same relative spot the PDF generator will use. The preview updates
 * live as the admin tweaks each field, and only shows a line when its toggle is
 * on — so the admin can dial the layout in before saving.
 */
export function CertificateTemplateForm({
  eventId,
  initial,
}: {
  eventId: string;
  initial: CertLayoutValues;
}) {
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(
    initial.template && !initial.template.endsWith(".pdf") ? initial.template : null,
  );
  const [isPdf, setIsPdf] = useState(initial.template?.endsWith(".pdf") ?? false);

  // Measure the rendered preview height so font sizes (fractions of height)
  // match what the PDF will produce.
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [boxH, setBoxH] = useState(400);
  useEffect(() => {
    if (!previewRef.current) return;
    const el = previewRef.current;
    const update = () => setBoxH(el.clientHeight || 400);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [preview]);

  // Live state for every adjustable value (drives the preview).
  const [nameX, setNameX] = useState(initial.nameX);
  const [nameY, setNameY] = useState(initial.nameY);
  const [nameSize, setNameSize] = useState(initial.nameSize);
  const [nameColor, setNameColor] = useState(initial.nameColor);

  const [dateShow, setDateShow] = useState(initial.dateShow);
  const [dateX, setDateX] = useState(initial.dateX);
  const [dateY, setDateY] = useState(initial.dateY);
  const [dateSize, setDateSize] = useState(initial.dateSize);

  const [numberShow, setNumberShow] = useState(initial.numberShow);
  const [numberX, setNumberX] = useState(initial.numberX);
  const [numberY, setNumberY] = useState(initial.numberY);
  const [numberSize, setNumberSize] = useState(initial.numberSize);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type === "application/pdf") {
      setIsPdf(true);
      setPreview(null);
    } else {
      setIsPdf(false);
      setPreview(URL.createObjectURL(f));
    }
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      const r = await saveCertificateTemplateAction(eventId, formData);
      toast(r.reason ?? (r.ok ? "Tersimpan." : "Gagal."), r.ok ? "success" : "error");
    });
  }

  function removeTemplate() {
    startTransition(async () => {
      const r = await removeCertificateTemplateAction(eventId);
      toast(r.reason ?? "Dihapus.", r.ok ? "success" : "error");
      if (r.ok) {
        setPreview(null);
        setIsPdf(false);
      }
    });
  }

  // Small numeric field with its own label + helper text.
  const NumField = ({
    name,
    label,
    hint,
    value,
    onChange,
    step = "0.01",
    min = "0",
    max = "1",
  }: {
    name: string;
    label: string;
    hint?: string;
    value: number;
    onChange: (n: number) => void;
    step?: string;
    min?: string;
    max?: string;
  }) => (
    <div>
      <label htmlFor={name} className="mb-1 block text-xs font-semibold text-navy-600">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="field tnum"
      />
      {hint && <p className="mt-1 text-[0.7rem] text-navy-400">{hint}</p>}
    </div>
  );

  return (
    <form action={submit} className="card space-y-6 p-5 sm:p-6">
      <div>
        <h2 className="text-h3">Template Sertifikat</h2>
        <p className="mt-0.5 text-sm text-navy-500">
          Upload desain kosong (PNG/JPG resolusi tinggi atau PDF), lalu atur posisi
          teks lewat kolom di bawah. Pratinjau memperlihatkan letak teks sebelum
          disimpan.
        </p>
      </div>

      <div>
        <label htmlFor="template" className="label">
          File template
        </label>
        <input
          id="template"
          name="template"
          type="file"
          accept="image/png,image/jpeg,application/pdf"
          onChange={onFile}
          className="block w-full text-sm text-navy-600 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-800 file:px-4 file:py-2 file:font-semibold file:text-white"
        />
        <p className="hint">
          {initial.template
            ? "Sudah ada template. Pilih file baru untuk mengganti, atau biarkan kosong."
            : "Belum ada template."}{" "}
          Maks 15 MB.
        </p>
      </div>

      {/* Live preview with overlay (image templates only) */}
      {preview && !isPdf ? (
        <div>
          <p className="mb-2 text-xs font-semibold text-navy-500">
            Pratinjau (contoh teks) — atur kolom di bawah untuk menggeser posisinya
          </p>
          <div
            ref={previewRef}
            className="relative overflow-hidden rounded-xl border border-navy-200"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Pratinjau template" className="block w-full" />
            <PreviewLabel
              text="Nama Peserta"
              x={nameX}
              y={nameY}
              size={nameSize}
              color={nameColor}
              boxH={boxH}
            />
            {dateShow && (
              <PreviewLabel
                text="Rabu, 14 Oktober 2026"
                x={dateX}
                y={dateY}
                size={dateSize}
                color={nameColor}
                boxH={boxH}
              />
            )}
            {numberShow && (
              <PreviewLabel
                text="No. OTK/CERT/2026/XXXX"
                x={numberX}
                y={numberY}
                size={numberSize}
                color={nameColor}
                boxH={boxH}
              />
            )}
          </div>
        </div>
      ) : isPdf ? (
        <p className="rounded-lg bg-navy-50 p-3 text-xs text-navy-500">
          Template PDF tidak bisa dipratinjau di sini, tapi teks tetap ditimpa saat
          generate. Pakai kolom koordinat di bawah untuk mengatur posisinya.
        </p>
      ) : (
        <p className="rounded-lg bg-navy-50 p-3 text-xs text-navy-500">
          Upload gambar template untuk melihat pratinjau posisi teks.
        </p>
      )}

      {/* Name placement */}
      <fieldset className="rounded-xl border border-navy-100 p-4">
        <legend className="px-1 text-sm font-bold text-navy-700">
          Nama Peserta <span className="font-normal text-navy-400">(wajib dicetak)</span>
        </legend>
        <p className="mb-3 text-xs text-navy-500">
          Posisi dan gaya nama lengkap peserta di atas template.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumField
            name="certNameX"
            label="Posisi Horizontal (X)"
            hint="0 = kiri, 0.5 = tengah, 1 = kanan"
            value={nameX}
            onChange={setNameX}
          />
          <NumField
            name="certNameY"
            label="Posisi Vertikal (Y)"
            hint="0 = atas, 0.5 = tengah, 1 = bawah"
            value={nameY}
            onChange={setNameY}
          />
          <NumField
            name="certNameSize"
            label="Ukuran Font"
            hint="Fraksi tinggi template. Mis. 0.06 = besar, 0.03 = kecil"
            value={nameSize}
            onChange={setNameSize}
            step="0.005"
            min="0.01"
            max="0.3"
          />
          <div>
            <label htmlFor="certNameColor" className="mb-1 block text-xs font-semibold text-navy-600">
              Warna Teks
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(nameColor) ? nameColor : "#1A2C4E"}
                onChange={(e) => setNameColor(e.target.value)}
                className="size-10 shrink-0 cursor-pointer rounded-lg border border-navy-200"
                aria-label="Pilih warna"
              />
              <input
                id="certNameColor"
                name="certNameColor"
                type="text"
                value={nameColor}
                onChange={(e) => setNameColor(e.target.value)}
                placeholder="#1A2C4E"
                className="field"
              />
            </div>
            <p className="mt-1 text-[0.7rem] text-navy-400">Kode warna hex, mis. #1A2C4E</p>
          </div>
        </div>
      </fieldset>

      {/* Date placement */}
      <fieldset className="rounded-xl border border-navy-100 p-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="certDateShow"
            checked={dateShow}
            onChange={(e) => setDateShow(e.target.checked)}
            className="size-4 accent-gold-500"
          />
          <span className="text-sm font-bold text-navy-700">Cetak Tanggal Acara</span>
        </label>
        <p className="mb-3 ml-6 text-xs text-navy-500">
          Opsional. Mencetak tanggal event (mis. &quot;Rabu, 14 Oktober 2026&quot;).
        </p>
        {dateShow ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <NumField name="certDateX" label="Posisi Horizontal (X)" hint="0 kiri – 1 kanan" value={dateX} onChange={setDateX} />
            <NumField name="certDateY" label="Posisi Vertikal (Y)" hint="0 atas – 1 bawah" value={dateY} onChange={setDateY} />
            <NumField name="certDateSize" label="Ukuran Font" hint="Fraksi tinggi, mis. 0.03" value={dateSize} onChange={setDateSize} step="0.005" min="0.01" max="0.2" />
          </div>
        ) : (
          <>
            <input type="hidden" name="certDateX" value={dateX} />
            <input type="hidden" name="certDateY" value={dateY} />
            <input type="hidden" name="certDateSize" value={dateSize} />
          </>
        )}
      </fieldset>

      {/* Number placement */}
      <fieldset className="rounded-xl border border-navy-100 p-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="certNumberShow"
            checked={numberShow}
            onChange={(e) => setNumberShow(e.target.checked)}
            className="size-4 accent-gold-500"
          />
          <span className="text-sm font-bold text-navy-700">Cetak Nomor Sertifikat</span>
        </label>
        <p className="mb-3 ml-6 text-xs text-navy-500">
          Opsional. Nomor unik otomatis (mis. &quot;No. OTK/CERT/2026/XXXX&quot;).
        </p>
        {numberShow ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <NumField name="certNumberX" label="Posisi Horizontal (X)" hint="0 kiri – 1 kanan" value={numberX} onChange={setNumberX} />
            <NumField name="certNumberY" label="Posisi Vertikal (Y)" hint="0 atas – 1 bawah" value={numberY} onChange={setNumberY} />
            <NumField name="certNumberSize" label="Ukuran Font" hint="Fraksi tinggi, mis. 0.02" value={numberSize} onChange={setNumberSize} step="0.005" min="0.01" max="0.2" />
          </div>
        ) : (
          <>
            <input type="hidden" name="certNumberX" value={numberX} />
            <input type="hidden" name="certNumberY" value={numberY} />
            <input type="hidden" name="certNumberSize" value={numberSize} />
          </>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3 border-t border-navy-100 pt-4">
        <button type="submit" disabled={isPending} className="btn btn-primary btn-md">
          <Icon name="check" size={16} />
          {isPending ? "Menyimpan..." : "Simpan Template & Tata Letak"}
        </button>
        {initial.template && (
          <button
            type="button"
            onClick={removeTemplate}
            disabled={isPending}
            className="btn btn-ghost btn-md text-coral-600"
          >
            <Icon name="trash" size={15} />
            Hapus Template
          </button>
        )}
      </div>
    </form>
  );
}
