"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Icon } from "@/components/ui/Icon";
import { toast } from "@/components/ui/toast";

/**
 * Image picker that uploads immediately and stores the resulting path.
 *
 * The file is sent to /api/uploads as soon as it's chosen, so the surrounding
 * form only ever submits a short string path (kept in a hidden input) rather
 * than the binary. That keeps the event save fast and lets us show a live
 * preview and a remove button. Progressive enhancement isn't a goal here: this
 * is an admin-only control that always runs with JS.
 */
export function ImageUpload({
  name,
  label,
  initial,
  aspect = "16/9",
  hint,
}: {
  name: string;
  label: string;
  initial?: string | null;
  /** CSS aspect-ratio for the preview box. */
  aspect?: string;
  hint?: string;
}) {
  const [path, setPath] = useState<string>(initial ?? "");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const body = new FormData();
      body.set("file", file);

      const res = await fetch("/api/uploads", { method: "POST", body });
      const data = (await res.json()) as
        | { ok: true; path: string }
        | { ok: false; reason: string };

      if (!res.ok || !data.ok) {
        toast(data.ok ? "Gagal mengunggah." : data.reason, "error");
        return;
      }

      setPath(data.path);
      toast("Gambar terunggah.", "success");
    } catch {
      toast("Gagal mengunggah. Periksa koneksi lalu coba lagi.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="label">{label}</span>

      {/* The value the form actually submits. */}
      <input type="hidden" name={name} value={path} readOnly />

      {path ? (
        <div className="relative overflow-hidden rounded-xl border border-navy-100 bg-surface">
          <div style={{ aspectRatio: aspect }} className="relative w-full">
            <Image
              src={path}
              alt="Pratinjau"
              fill
              sizes="(max-width: 640px) 100vw, 400px"
              className="object-cover"
            />
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-navy-100 bg-white p-2">
            <span className="truncate px-1 text-xs text-navy-400">{path}</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="btn btn-outline btn-sm"
              >
                <Icon name="edit" size={14} />
                Ganti
              </button>
              <button
                type="button"
                onClick={() => setPath("")}
                className="btn btn-danger btn-sm"
              >
                <Icon name="trash" size={14} />
                Hapus
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          style={{ aspectRatio: aspect }}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-navy-300 bg-surface text-navy-400 transition-colors hover:border-gold-500 hover:bg-gold-50/40 disabled:opacity-60"
        >
          {busy ? (
            <>
              <span className="anim-spin size-6 rounded-full border-2 border-current border-t-transparent" />
              <span className="text-xs font-semibold">Mengunggah...</span>
            </>
          ) : (
            <>
              <Icon name="download" size={24} className="rotate-180" />
              <span className="text-sm font-bold">Pilih gambar</span>
              <span className="text-xs">PNG, JPG, atau WEBP - maks 4 MB</span>
            </>
          )}
        </button>
      )}

      {hint && <p className="hint">{hint}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          // Reset so choosing the same file again still fires onChange.
          e.target.value = "";
        }}
      />
    </div>
  );
}
