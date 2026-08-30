"use client";

import { useState, useTransition } from "react";
import { useActionState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Switch";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { toast } from "@/components/ui/toast";
import {
  saveBlockAction,
  toggleBlockAction,
  deleteBlockAction,
  moveBlockAction,
  type BlockFormState,
} from "@/server/actions/content.actions";
import {
  LANDING_SECTION_META,
  BENEFIT_ICON_OPTIONS,
  isContactIcon,
  type LandingSection,
} from "@/lib/domain";

export type BlockRow = {
  id: string;
  section: string;
  icon: string | null;
  title: string;
  body: string;
  meta: string | null;
  active: boolean;
};

const INITIAL: BlockFormState = { ok: false };

function glyph(name: string | null): IconName {
  return (name && isContactIcon(name) ? name : "sparkles") as IconName;
}

/**
 * CRUD manager for one landing section (benefits, steps, testimonials, or FAQ).
 *
 * The same component drives every section; `LANDING_SECTION_META` tells it which
 * fields to show and how to label them. The list is the live public ordering;
 * the form on the right creates or edits a single block.
 */
export function LandingBlockManager({
  section,
  blocks,
}: {
  section: LandingSection;
  blocks: BlockRow[];
}) {
  const meta = LANDING_SECTION_META[section];
  const [editing, setEditing] = useState<BlockRow | null>(null);

  const [state, formAction] = useActionState(
    saveBlockAction.bind(null, editing?.id || null),
    INITIAL,
  );

  const errors = state.errors ?? {};
  const err = (f: string) =>
    errors[f] ? (
      <p className="error-text" role="alert">
        {errors[f]}
      </p>
    ) : null;

  const current = editing;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      {/* -------- List -------- */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-navy-100 p-5">
          <div>
            <h3 className="text-h3">{meta.label}</h3>
            <p className="mt-0.5 text-sm text-navy-500">
              {blocks.length} item &middot; urutan sesuai tampilan publik
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

        {blocks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <Icon name="layout" size={28} className="text-navy-200" />
            <p className="text-sm text-navy-500">
              Belum ada {meta.singular.toLowerCase()}. Tambah lewat form di samping.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-navy-100">
            {blocks.map((b, i) => (
              <li key={b.id} className="flex items-start gap-3 p-4">
                {meta.hasIcon &&
                  (meta.iconIsGlyph ? (
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold-50 text-gold-600">
                      <Icon name={glyph(b.icon)} size={18} />
                    </span>
                  ) : (
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-sm font-extrabold text-navy-700 tnum">
                      {b.icon || i + 1}
                    </span>
                  ))}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-navy-900">{b.title}</span>
                    {b.meta && <span className="text-xs text-navy-400">· {b.meta}</span>}
                    {!b.active && <Badge tone="grey">Disembunyikan</Badge>}
                  </div>
                  <p className="line-2 text-xs text-navy-500">{b.body}</p>
                </div>

                <div className="flex flex-col">
                  <MoveBtn id={b.id} direction="up" disabled={i === 0} />
                  <MoveBtn id={b.id} direction="down" disabled={i === blocks.length - 1} />
                </div>

                <Switch
                  checked={b.active}
                  size="sm"
                  showLabel={false}
                  ariaLabel={`Tampilkan ${b.title}`}
                  messageOn={`"${b.title}" ditampilkan.`}
                  messageOff={`"${b.title}" disembunyikan.`}
                  onToggle={(next) => toggleBlockAction(b.id, next)}
                />

                <button
                  type="button"
                  onClick={() => setEditing(b)}
                  className="btn btn-outline btn-sm"
                >
                  <Icon name="edit" size={14} />
                </button>

                <ConfirmButton
                  action={() => deleteBlockAction(b.id)}
                  confirmLabel="Hapus"
                  successMessage="Item dihapus."
                >
                  <Icon name="trash" size={14} />
                </ConfirmButton>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* -------- Form -------- */}
      <div className="card p-5 sm:p-6 lg:sticky lg:top-6 lg:self-start">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-h3">
            {editing ? `Edit ${meta.singular}` : `Tambah ${meta.singular}`}
          </h3>
          {editing && (
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="btn btn-ghost btn-sm"
            >
              <Icon name="x" size={14} />
              Batal
            </button>
          )}
        </div>

        <form key={editing?.id ?? "new"} action={formAction} className="space-y-4">
          <input type="hidden" name="section" value={section} />

          {state.message && !state.ok && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-coral-200 bg-coral-50 p-3 text-sm font-semibold text-coral-800"
            >
              <Icon name="alert" size={16} className="mt-px" />
              {state.message}
            </div>
          )}

          {/* Icon: glyph picker (BENEFIT) or short label (STEP) */}
          {meta.hasIcon &&
            (meta.iconIsGlyph ? (
              <div>
                <label htmlFor="icon" className="label">
                  Ikon
                </label>
                <select
                  id="icon"
                  name="icon"
                  defaultValue={current?.icon ?? "target"}
                  className="field field-select"
                >
                  {BENEFIT_ICON_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label htmlFor="icon" className="label">
                  Nomor / label langkah
                </label>
                <input
                  id="icon"
                  name="icon"
                  defaultValue={current?.icon ?? ""}
                  placeholder="01"
                  maxLength={4}
                  className="field tnum"
                />
              </div>
            ))}

          <div>
            <label htmlFor="title" className="label">
              {meta.titleLabel} <span className="text-coral-600">*</span>
            </label>
            <input
              id="title"
              name="title"
              defaultValue={current?.title ?? ""}
              className="field"
            />
            {err("title")}
          </div>

          {meta.hasMeta && (
            <div>
              <label htmlFor="meta" className="label">
                {meta.metaLabel}
              </label>
              <input
                id="meta"
                name="meta"
                defaultValue={current?.meta ?? ""}
                placeholder="Content Strategist"
                className="field"
              />
            </div>
          )}

          <div>
            <label htmlFor="body" className="label">
              {meta.bodyLabel} <span className="text-coral-600">*</span>
            </label>
            <textarea
              id="body"
              name="body"
              rows={4}
              defaultValue={current?.body ?? ""}
              className="field resize-y"
            />
            {err("body")}
          </div>

          <label
            htmlFor="active"
            className="flex items-center gap-2.5 rounded-xl border border-navy-100 bg-surface p-3 text-sm font-semibold"
          >
            <input
              id="active"
              name="active"
              type="checkbox"
              defaultChecked={current ? current.active : true}
              className="size-4 accent-gold-500"
            />
            Tampilkan di halaman publik
          </label>

          <SubmitButton full size="md" icon="check" pendingText="Menyimpan...">
            {editing ? "Simpan Perubahan" : `Tambah ${meta.singular}`}
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}

function MoveBtn({
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
      aria-label={direction === "up" ? "Naikkan" : "Turunkan"}
      onClick={() =>
        startTransition(async () => {
          const r = await moveBlockAction(id, direction);
          if (!r.ok && r.reason) toast(r.reason, "error");
        })
      }
      className="rounded p-0.5 text-navy-400 transition-colors hover:text-navy-800 disabled:opacity-25"
    >
      <Icon
        name="chevron-down"
        size={14}
        className={direction === "up" ? "rotate-180" : ""}
      />
    </button>
  );
}
