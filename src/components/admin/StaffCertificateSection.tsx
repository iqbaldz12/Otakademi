"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/toast";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import {
  saveStaffTemplateAction,
  addStaffAction,
  removeStaffAction,
  generateStaffCertificateAction,
  sendStaffCertificateAction,
} from "@/server/actions/staff-certificate.actions";

type Role = "MODERATOR" | "SPEAKER";

export type StaffTemplateValues = {
  template: string | null;
  nameX: number;
  nameY: number;
  nameSize: number;
  nameColor: string;
  numberShow: boolean;
  numberX: number;
  numberY: number;
  numberSize: number;
  qrShow: boolean;
  qrX: number;
  qrY: number;
  qrSize: number;
};

export type StaffItem = {
  id: string;
  name: string;
  email: string | null;
  certificateNumber: string | null;
  sentAt: string | null;
};

/** Triggers a browser download from a base64 PDF. */
function downloadBase64(filename: string, base64: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Admin section for moderator/speaker certificates of one role: upload template
 * + name/QR layout (with live preview), manage the list of people, and
 * generate/download or email each certificate.
 */
export function StaffCertificateSection({
  eventId,
  role,
  roleLabel,
  prefix,
  initialTemplate,
  staff,
}: {
  eventId: string;
  role: Role;
  roleLabel: string;
  /** Field-name prefix matching the Event columns: "mod" or "spk". */
  prefix: "mod" | "spk";
  initialTemplate: StaffTemplateValues;
  staff: StaffItem[];
}) {
  const [isPending, startTransition] = useTransition();

  // ---- Template preview + layout state ----
  const [preview, setPreview] = useState<string | null>(
    initialTemplate.template && !initialTemplate.template.endsWith(".pdf")
      ? initialTemplate.template
      : null,
  );
  const [isPdf, setIsPdf] = useState(initialTemplate.template?.endsWith(".pdf") ?? false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [boxH, setBoxH] = useState(300);
  const [boxW, setBoxW] = useState(480);
  useEffect(() => {
    if (!boxRef.current) return;
    const el = boxRef.current;
    const update = () => {
      setBoxH(el.clientHeight || 300);
      setBoxW(el.clientWidth || 480);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [preview]);

  const [nameX, setNameX] = useState(initialTemplate.nameX);
  const [nameY, setNameY] = useState(initialTemplate.nameY);
  const [nameSize, setNameSize] = useState(initialTemplate.nameSize);
  const [nameColor, setNameColor] = useState(initialTemplate.nameColor);
  const [numberShow, setNumberShow] = useState(initialTemplate.numberShow);
  const [numberX, setNumberX] = useState(initialTemplate.numberX);
  const [numberY, setNumberY] = useState(initialTemplate.numberY);
  const [numberSize, setNumberSize] = useState(initialTemplate.numberSize);
  const [qrShow, setQrShow] = useState(initialTemplate.qrShow);
  const [qrX, setQrX] = useState(initialTemplate.qrX);
  const [qrY, setQrY] = useState(initialTemplate.qrY);
  const [qrSize, setQrSize] = useState(initialTemplate.qrSize);

  // ---- Add form state ----
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");

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

  function saveTemplate(formData: FormData) {
    startTransition(async () => {
      const r = await saveStaffTemplateAction(eventId, role, formData);
      toast(r.reason ?? (r.ok ? "Tersimpan." : "Gagal."), r.ok ? "success" : "error");
    });
  }

  function addPerson() {
    startTransition(async () => {
      const r = await addStaffAction(eventId, role, newName, newEmail);
      toast(r.reason ?? "Ditambahkan.", r.ok ? "success" : "error");
      if (r.ok) {
        setNewName("");
        setNewEmail("");
      }
    });
  }

  function generate(id: string) {
    startTransition(async () => {
      const r = await generateStaffCertificateAction(id);
      if (r.ok) {
        downloadBase64(r.filename, r.dataBase64);
        toast("Sertifikat diunduh.", "success");
      } else {
        toast(r.reason, "error");
      }
    });
  }

  function sendEmail(id: string) {
    startTransition(async () => {
      const r = await sendStaffCertificateAction(eventId, id);
      toast(r.reason ?? (r.ok ? "Terkirim." : "Gagal."), r.ok ? "success" : "error");
    });
  }

  const n = (name: string, label: string, v: number, set: (x: number) => void, step = "0.01", min = "0", max = "1", hint?: string) => (
    <div>
      <label htmlFor={name} className="mb-1 block text-xs font-semibold text-navy-600">{label}</label>
      <input id={name} name={name} type="number" step={step} min={min} max={max}
        value={v} onChange={(e) => set(Number(e.target.value))} className="field tnum" />
      {hint && <p className="mt-1 text-[0.7rem] text-navy-400">{hint}</p>}
    </div>
  );

  return (
    <div className="card p-5 sm:p-6">
      <h2 className="text-h3">Sertifikat {roleLabel}</h2>
      <p className="mt-0.5 text-sm text-navy-500">
        Upload template {roleLabel.toLowerCase()}, atur posisi nama & QR, lalu kelola
        daftar namanya. Nomor otomatis per event.
      </p>

      {/* ---- Template + layout form ---- */}
      <form action={saveTemplate} className="mt-5 space-y-5">
        <div>
          <label htmlFor={`${prefix}-template`} className="label">File template</label>
          <input
            id={`${prefix}-template`}
            name="template"
            type="file"
            accept="image/png,image/jpeg,application/pdf"
            onChange={onFile}
            className="block w-full text-sm text-navy-600 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-800 file:px-4 file:py-2 file:font-semibold file:text-white"
          />
          <p className="hint">
            {initialTemplate.template ? "Sudah ada template. Pilih file baru untuk mengganti." : "Belum ada template."} Maks 15 MB.
          </p>
        </div>

        {preview && !isPdf ? (
          <div
            ref={boxRef}
            className="relative overflow-hidden rounded-xl border border-navy-200"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Pratinjau" className="block w-full" />
            <span
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-extrabold leading-none"
              style={{ left: `${nameX * 100}%`, top: `${nameY * 100}%`, fontSize: `${Math.max(8, nameSize * boxH)}px`, color: nameColor }}
            >
              Nama {roleLabel}
            </span>
            {numberShow && (
              <span
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-semibold leading-none"
                style={{ left: `${numberX * 100}%`, top: `${numberY * 100}%`, fontSize: `${Math.max(7, numberSize * boxH)}px`, color: nameColor }}
              >
                No. OTK/EVT-XXXX/{prefix === "mod" ? "MOD" : "NRS"}-01/2026
              </span>
            )}
            {qrShow && (
              <span
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 bg-white p-0.5 shadow-sm"
                style={{ left: `${qrX * 100}%`, top: `${qrY * 100}%`, width: `${qrSize * Math.min(boxW, boxH)}px`, height: `${qrSize * Math.min(boxW, boxH)}px` }}
              >
                <span className="grid h-full w-full grid-cols-4 grid-rows-4 gap-px">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <span key={i} className={(i * 7 + 3) % 3 === 0 ? "bg-navy-900" : "bg-transparent"} />
                  ))}
                </span>
              </span>
            )}
          </div>
        ) : isPdf ? (
          <p className="rounded-lg bg-navy-50 p-3 text-xs text-navy-500">
            Template PDF tidak bisa dipratinjau, tapi teks & QR tetap ditimpa saat generate.
          </p>
        ) : (
          <p className="rounded-lg bg-navy-50 p-3 text-xs text-navy-500">
            Upload gambar template untuk melihat pratinjau posisi.
          </p>
        )}

        <fieldset className="rounded-xl border border-navy-100 p-4">
          <legend className="px-1 text-sm font-bold text-navy-700">Posisi Nama</legend>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            {n(`${prefix}NameX`, "Posisi Horizontal (X)", nameX, setNameX, "0.01", "0", "1", "0 kiri – 1 kanan")}
            {n(`${prefix}NameY`, "Posisi Vertikal (Y)", nameY, setNameY, "0.01", "0", "1", "0 atas – 1 bawah")}
            {n(`${prefix}NameSize`, "Ukuran Font", nameSize, setNameSize, "0.005", "0.01", "0.3", "Fraksi tinggi, mis. 0.06")}
            <div>
              <label htmlFor={`${prefix}NameColor`} className="mb-1 block text-xs font-semibold text-navy-600">Warna</label>
              <div className="flex items-center gap-2">
                <input type="color" value={/^#[0-9a-f]{6}$/i.test(nameColor) ? nameColor : "#1A2C4E"} onChange={(e) => setNameColor(e.target.value)} className="size-10 shrink-0 cursor-pointer rounded-lg border border-navy-200" aria-label="Warna" />
                <input id={`${prefix}NameColor`} name={`${prefix}NameColor`} type="text" value={nameColor} onChange={(e) => setNameColor(e.target.value)} className="field" />
              </div>
            </div>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-navy-100 p-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" name={`${prefix}NumberShow`} checked={numberShow} onChange={(e) => setNumberShow(e.target.checked)} className="size-4 accent-gold-500" />
            <span className="text-sm font-bold text-navy-700">Cetak Nomor Sertifikat</span>
          </label>
          <p className="mb-3 ml-6 text-xs text-navy-500">
            Nomor unik otomatis per event, mis. OTK/EVT-XXXX/{prefix === "mod" ? "MOD" : "NRS"}-01/2026.
          </p>
          {numberShow ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {n(`${prefix}NumberX`, "Posisi Horizontal (X)", numberX, setNumberX, "0.01", "0", "1", "0 kiri – 1 kanan")}
              {n(`${prefix}NumberY`, "Posisi Vertikal (Y)", numberY, setNumberY, "0.01", "0", "1", "0 atas – 1 bawah")}
              {n(`${prefix}NumberSize`, "Ukuran Font", numberSize, setNumberSize, "0.005", "0.01", "0.2", "fraksi tinggi, mis. 0.02")}
            </div>
          ) : (
            <>
              <input type="hidden" name={`${prefix}NumberX`} value={numberX} />
              <input type="hidden" name={`${prefix}NumberY`} value={numberY} />
              <input type="hidden" name={`${prefix}NumberSize`} value={numberSize} />
            </>
          )}
        </fieldset>

        <fieldset className="rounded-xl border border-navy-100 p-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" name={`${prefix}QrShow`} checked={qrShow} onChange={(e) => setQrShow(e.target.checked)} className="size-4 accent-gold-500" />
            <span className="text-sm font-bold text-navy-700">QR Verifikasi</span>
          </label>
          {qrShow ? (
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              {n(`${prefix}QrX`, "Posisi Horizontal (X)", qrX, setQrX, "0.01", "0", "1", "pusat QR")}
              {n(`${prefix}QrY`, "Posisi Vertikal (Y)", qrY, setQrY, "0.01", "0", "1", "pusat QR")}
              {n(`${prefix}QrSize`, "Ukuran QR", qrSize, setQrSize, "0.005", "0.05", "0.4", "fraksi sisi terpendek")}
            </div>
          ) : (
            <>
              <input type="hidden" name={`${prefix}QrX`} value={qrX} />
              <input type="hidden" name={`${prefix}QrY`} value={qrY} />
              <input type="hidden" name={`${prefix}QrSize`} value={qrSize} />
            </>
          )}
        </fieldset>

        <button type="submit" disabled={isPending} className="btn btn-primary btn-md">
          <Icon name="check" size={16} />
          Simpan Template {roleLabel}
        </button>
      </form>

      {/* ---- People list + actions ---- */}
      <div className="mt-6 border-t border-navy-100 pt-5">
        <h3 className="text-sm font-extrabold text-navy-900">Daftar {roleLabel}</h3>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={`Nama ${roleLabel.toLowerCase()}`} className="field sm:flex-1" />
          <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email (opsional)" className="field sm:flex-1" />
          <button type="button" onClick={addPerson} disabled={isPending || !newName.trim()} className="btn btn-outline btn-md shrink-0">
            <Icon name="plus" size={15} />
            Tambah
          </button>
        </div>

        {staff.length === 0 ? (
          <p className="mt-3 text-sm text-navy-400">Belum ada {roleLabel.toLowerCase()}.</p>
        ) : (
          <ul className="mt-3 divide-y divide-navy-100">
            {staff.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-navy-900">{s.name}</p>
                  <p className="text-xs text-navy-400">
                    {s.email || "tanpa email"}
                    {s.certificateNumber && <span className="ml-2 font-mono">{s.certificateNumber}</span>}
                  </p>
                </div>
                {s.sentAt && <Badge tone="green" dot>Terkirim</Badge>}
                <button type="button" onClick={() => generate(s.id)} disabled={isPending} className="btn btn-outline btn-sm">
                  <Icon name="download" size={14} />
                  PDF
                </button>
                <button type="button" onClick={() => sendEmail(s.id)} disabled={isPending || !s.email} title={s.email ? "" : "Isi email dulu"} className="btn btn-ghost btn-sm">
                  <Icon name="mail" size={14} />
                  Email
                </button>
                <ConfirmButton
                  action={() => removeStaffAction(eventId, s.id)}
                  confirmLabel="Hapus"
                  successMessage={`${s.name} dihapus.`}
                  ariaLabel={`Hapus ${s.name}`}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
