"use client";

import { useActionState, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { toast } from "@/components/ui/toast";
import {
  saveContactCopyAction,
  type CopyFormState,
} from "@/server/actions/content.actions";
import type { ContactContent } from "@/server/services/content.service";

const INITIAL: CopyFormState = { ok: false };

/**
 * Editor for the contact page's copy.
 *
 * The topics list is dynamic: rows can be added and removed on the client, then
 * submitted as parallel `topicTitle` / `topicBody` fields that the server action
 * zips back together. Everything else is a plain field.
 */
export function ContactCopyEditor({ content }: { content: ContactContent }) {
  const [state, formAction] = useActionState(saveContactCopyAction, INITIAL);

  const [topics, setTopics] = useState(
    content.topics.length > 0 ? content.topics : [{ title: "", body: "" }],
  );

  // Surface the save result as a toast.
  useEffect(() => {
    if (state.message) toast(state.message, state.ok ? "success" : "error");
  }, [state]);

  function addTopic() {
    setTopics((t) => [...t, { title: "", body: "" }]);
  }
  function removeTopic(i: number) {
    setTopics((t) => t.filter((_, idx) => idx !== i));
  }
  function patchTopic(i: number, key: "title" | "body", val: string) {
    setTopics((t) => t.map((row, idx) => (idx === i ? { ...row, [key]: val } : row)));
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="card p-5 sm:p-6">
        <h2 className="text-h3">Teks Halaman Kontak</h2>
        <p className="mt-1 text-sm text-navy-500">
          Judul, deskripsi, dan jam operasional yang tampil di halaman{" "}
          <span className="font-mono text-xs">/kontak</span>.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="heroTitle" className="label">
              Judul halaman <span className="text-coral-600">*</span>
            </label>
            <input
              id="heroTitle"
              name="heroTitle"
              defaultValue={content.heroTitle}
              className="field"
            />
          </div>

          <div>
            <label htmlFor="heroSubtitle" className="label">
              Deskripsi singkat
            </label>
            <textarea
              id="heroSubtitle"
              name="heroSubtitle"
              rows={2}
              defaultValue={content.heroSubtitle}
              className="field resize-y"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="hoursTitle" className="label">
                Judul jam operasional
              </label>
              <input
                id="hoursTitle"
                name="hoursTitle"
                defaultValue={content.hoursTitle}
                className="field"
              />
            </div>
          </div>

          <div>
            <label htmlFor="hoursBody" className="label">
              Isi jam operasional
            </label>
            <textarea
              id="hoursBody"
              name="hoursBody"
              rows={3}
              defaultValue={content.hoursBody}
              className="field resize-y"
            />
          </div>
        </div>
      </div>

      {/* Topics */}
      <div className="card p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-h3">Topik Bantuan</h2>
            <p className="mt-0.5 text-sm text-navy-500">
              Kartu berisi panduan singkat, misalnya cara konfirmasi pembayaran.
            </p>
          </div>
          <button type="button" onClick={addTopic} className="btn btn-outline btn-sm">
            <Icon name="plus" size={15} />
            Tambah
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {topics.map((topic, i) => (
            <div key={i} className="rounded-xl border border-navy-100 bg-surface p-4">
              <div className="flex items-start gap-3">
                <span className="mt-2 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-navy-200 text-xs font-extrabold text-navy-700">
                  {i + 1}
                </span>
                <div className="flex-1 space-y-2">
                  <input
                    name="topicTitle"
                    value={topic.title}
                    onChange={(e) => patchTopic(i, "title", e.target.value)}
                    placeholder="Judul topik, mis. Konfirmasi pembayaran"
                    className="field"
                    aria-label={`Judul topik ${i + 1}`}
                  />
                  <textarea
                    name="topicBody"
                    value={topic.body}
                    onChange={(e) => patchTopic(i, "body", e.target.value)}
                    rows={2}
                    placeholder="Penjelasan singkat..."
                    className="field resize-y"
                    aria-label={`Isi topik ${i + 1}`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeTopic(i)}
                  aria-label={`Hapus topik ${i + 1}`}
                  className="mt-1 rounded-lg p-2 text-navy-400 transition-colors hover:bg-coral-50 hover:text-coral-600"
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            </div>
          ))}

          {topics.length === 0 && (
            <p className="rounded-xl border border-dashed border-navy-200 p-6 text-center text-sm text-navy-400">
              Belum ada topik. Klik Tambah untuk membuat satu.
            </p>
          )}
        </div>
      </div>

      <div className="sticky bottom-4 flex justify-end">
        <div className="rounded-full bg-white/90 p-1.5 shadow-lg backdrop-blur">
          <SubmitButton size="md" icon="check" pendingText="Menyimpan...">
            Simpan Konten
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
