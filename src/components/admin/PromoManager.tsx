"use client";

import { useActionState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Switch";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import {
  createPromoAction,
  togglePromoAction,
  deletePromoAction,
} from "@/server/actions/ops.actions";

export type PromoRow = {
  id: string;
  code: string;
  type: string;
  value: number;
  quota: number;
  usage: number;
  active: boolean;
};

const INITIAL = { ok: false as boolean, message: undefined as string | undefined };

export function PromoManager({ promos }: { promos: PromoRow[] }) {
  const [state, formAction] = useActionState(createPromoAction, INITIAL);

  return (
    <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      {/* ---------- Create ---------- */}
      <div className="card p-5 sm:p-6">
        <h2 className="text-h3">Buat Promo</h2>

        <form action={formAction} className="mt-5 space-y-4">
          {state.message && (
            <div
              role="alert"
              className={`anim-fade flex items-start gap-2 rounded-xl border p-3.5 text-sm font-semibold ${
                state.ok
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-coral-200 bg-coral-50 text-coral-800"
              }`}
            >
              <Icon name={state.ok ? "check-circle" : "alert"} size={17} className="mt-px" />
              {state.message}
            </div>
          )}

          <div>
            <label htmlFor="code" className="label">
              Kode promo <span className="text-coral-600">*</span>
            </label>
            <input
              id="code"
              name="code"
              type="text"
              required
              placeholder="EARLYBIRD"
              className="field uppercase"
              autoCapitalize="characters"
            />
            <p className="hint">Huruf, angka, tanda - dan _ saja.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="type" className="label">
                Jenis
              </label>
              <select id="type" name="type" className="field field-select" defaultValue="PERCENT">
                <option value="PERCENT">Persen (%)</option>
                <option value="FIXED">Nominal (Rp)</option>
              </select>
            </div>

            <div>
              <label htmlFor="value" className="label">
                Nilai <span className="text-coral-600">*</span>
              </label>
              <input
                id="value"
                name="value"
                type="number"
                min={1}
                required
                placeholder="25"
                className="field tnum"
              />
            </div>
          </div>

          <div>
            <label htmlFor="quota" className="label">
              Kuota pemakaian
            </label>
            <input
              id="quota"
              name="quota"
              type="number"
              min={0}
              defaultValue={0}
              className="field tnum"
            />
            <p className="hint">0 = tanpa batas.</p>
          </div>

          <SubmitButton full size="md" icon="plus" pendingText="Menyimpan...">
            Buat Promo
          </SubmitButton>
        </form>
      </div>

      {/* ---------- List ---------- */}
      <div className="card overflow-hidden">
        <div className="border-b border-navy-100 p-5">
          <h2 className="text-h3">Promo Aktif</h2>
          <p className="mt-0.5 text-sm text-navy-500">
            {promos.length} kode terdaftar
          </p>
        </div>

        {promos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <Icon name="sparkles" size={30} className="text-navy-200" />
            <p className="text-sm text-navy-500">Belum ada kode promo.</p>
          </div>
        ) : (
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <caption className="sr-only-x">Daftar kode promo</caption>
              <thead>
                <tr className="border-b border-navy-100 bg-surface text-left">
                  <th scope="col" className="px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-navy-400">
                    Kode
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-navy-400">
                    Diskon
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-navy-400">
                    Pemakaian
                  </th>
                  <th scope="col" className="px-5 py-3 text-right text-xs font-extrabold uppercase tracking-wide text-navy-400">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {promos.map((promo) => {
                  const exhausted = promo.quota > 0 && promo.usage >= promo.quota;
                  return (
                    <tr key={promo.id} className="transition-colors hover:bg-surface">
                      <td className="px-5 py-3.5">
                        <code className="font-mono font-extrabold text-navy-900">
                          {promo.code}
                        </code>
                        {exhausted && (
                          <Badge tone="coral" className="ml-2">
                            Habis
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-navy-800 tnum">
                        {promo.type === "PERCENT"
                          ? `${promo.value}%`
                          : `Rp${promo.value.toLocaleString("id-ID")}`}
                      </td>
                      <td className="px-4 py-3.5 text-navy-600 tnum">
                        {promo.usage}
                        {promo.quota > 0 ? `/${promo.quota}` : " (bebas)"}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <Switch
                            checked={promo.active}
                            size="sm"
                            showLabel={false}
                            ariaLabel={`Aktifkan promo ${promo.code}`}
                            messageOn={`Promo ${promo.code} aktif.`}
                            messageOff={`Promo ${promo.code} dinon-aktifkan.`}
                            onToggle={(next) => togglePromoAction(promo.id, next)}
                          />
                          <ConfirmButton
                            action={() => deletePromoAction(promo.id)}
                            confirmLabel="Hapus"
                            successMessage={`Promo ${promo.code} dihapus.`}
                          >
                            Hapus
                          </ConfirmButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
