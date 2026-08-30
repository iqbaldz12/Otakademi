"use client";

import { useActionState, useEffect } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { toast } from "@/components/ui/toast";
import {
  saveLandingCopyAction,
  type CopyFormState,
} from "@/server/actions/content.actions";
import type { LandingCopy } from "@/server/services/content.service";

const INITIAL: CopyFormState = { ok: false };

/**
 * Editor for the landing page's fixed copy: the hero and each section heading.
 * Repeatable content (benefits, steps, etc.) is managed separately by
 * LandingBlockManager.
 */
export function LandingCopyEditor({ copy }: { copy: LandingCopy }) {
  const [state, formAction] = useActionState(saveLandingCopyAction, INITIAL);

  useEffect(() => {
    if (state.message) toast(state.message, state.ok ? "success" : "error");
  }, [state]);

  const field = (
    prop: keyof LandingCopy,
    label: string,
    opts: { textarea?: boolean; placeholder?: string } = {},
  ) => (
    <div>
      <label htmlFor={prop} className="label">
        {label}
      </label>
      {opts.textarea ? (
        <textarea
          id={prop}
          name={prop}
          rows={2}
          defaultValue={copy[prop]}
          placeholder={opts.placeholder}
          className="field resize-y"
        />
      ) : (
        <input
          id={prop}
          name={prop}
          defaultValue={copy[prop]}
          placeholder={opts.placeholder}
          className="field"
        />
      )}
    </div>
  );

  return (
    <form action={formAction} className="space-y-6">
      <div className="card p-5 sm:p-6">
        <h3 className="text-h3">Bagian Hero</h3>
        <p className="mt-1 text-sm text-navy-500">
          Bagian paling atas halaman utama.
        </p>
        <div className="mt-5 space-y-4">
          {field("heroBadge", "Badge kecil", { placeholder: "Learn · Think · Try" })}
          <div className="grid gap-4 sm:grid-cols-2">
            {field("heroTitleLine1", "Judul baris 1", { placeholder: "Upgrade Skill." })}
            {field("heroTitleLine2", "Judul baris 2 (warna aksen)", {
              placeholder: "Upgrade Cara Mikir.",
            })}
          </div>
          {field("heroSubtitle", "Deskripsi hero", { textarea: true })}
          {field("heroPrimaryCta", "Teks tombol utama", { placeholder: "Cari Kelas" })}
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <h3 className="text-h3">Judul Tiap Seksi</h3>
        <div className="mt-5 space-y-4">
          {field("benefitsTitle", "Judul seksi keunggulan")}
          {field("benefitsSubtitle", "Subjudul keunggulan", { textarea: true })}
          {field("stepsTitle", "Judul seksi cara kerja")}
          {field("stepsSubtitle", "Subjudul cara kerja", { textarea: true })}
          {field("testimonialsTitle", "Judul seksi testimoni")}
          {field("faqTitle", "Judul seksi FAQ")}
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <h3 className="text-h3">Ajakan Penutup (CTA)</h3>
        <div className="mt-5 space-y-4">
          {field("ctaTitle", "Judul CTA")}
          {field("ctaSubtitle", "Subjudul CTA", { textarea: true })}
        </div>
      </div>

      <div className="sticky bottom-4 flex justify-end">
        <div className="rounded-full bg-white/90 p-1.5 shadow-lg backdrop-blur">
          <SubmitButton size="md" icon="check" pendingText="Menyimpan...">
            Simpan Konten Landing
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
