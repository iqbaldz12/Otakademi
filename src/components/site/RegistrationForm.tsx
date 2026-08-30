"use client";

import { useActionState, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { submitRegistration, checkPromoAction } from "@/server/actions/registration.actions";
import { SOURCE_OPTIONS, EXPERIENCE_OPTIONS } from "@/lib/domain";
import { formatIDR } from "@/lib/format";
import type { RegisterState } from "@/server/actions/registration.actions";

const INITIAL: RegisterState = { ok: false };

/**
 * Guest-first registration form.
 *
 * `useActionState` posts to a server action, so this works as a plain form
 * submission if JavaScript hasn't loaded yet; the client layer only adds pending
 * state, inline errors, and the promo check. Errors come back keyed by field
 * name and render next to the input that caused them.
 */
export function RegistrationForm({
  eventId,
  eventSlug,
  price,
  isWaitlist,
}: {
  eventId: string;
  eventSlug: string;
  price: number;
  isWaitlist: boolean;
}) {
  const [state, formAction] = useActionState(
    submitRegistration.bind(null, eventId, eventSlug),
    INITIAL,
  );

  const errors = state.errors ?? {};

  // Promo state is local: it only affects the summary display, and the server
  // re-validates the code on submit anyway.
  const [promoInput, setPromoInput] = useState("");
  const [promoChecking, setPromoChecking] = useState(false);
  const [promo, setPromo] = useState<
    | { valid: true; discount: number; final: number; label: string; code: string }
    | { valid: false; reason: string }
    | null
  >(null);

  async function verifyPromo() {
    if (!promoInput.trim()) return;
    setPromoChecking(true);
    try {
      setPromo(await checkPromoAction(promoInput, price));
    } finally {
      setPromoChecking(false);
    }
  }

  const total = promo?.valid ? promo.final : price;

  /** Renders the error message for a field, if there is one. */
  const err = (field: string) =>
    errors[field] ? (
      <p id={`${field}-error`} className="error-text" role="alert">
        {errors[field]}
      </p>
    ) : null;

  /** Shared a11y wiring so invalid fields announce their message. */
  const aria = (field: string) => ({
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `${field}-error` : undefined,
  });

  return (
    <form action={formAction} className="space-y-7" noValidate>
      {/* Form-level error */}
      {state.message && !state.ok && (
        <div
          role="alert"
          className="anim-fade flex items-start gap-2.5 rounded-xl border border-coral-200 bg-coral-50 p-4 text-sm font-semibold text-coral-800"
        >
          <Icon name="alert" size={18} className="mt-px" />
          <span>{state.message}</span>
        </div>
      )}

      {isWaitlist && (
        <div className="flex items-start gap-2.5 rounded-xl border border-navy-200 bg-navy-50 p-4 text-sm text-navy-700">
          <Icon name="info" size={18} className="mt-px shrink-0 text-navy-500" />
          <span>
            <strong className="font-extrabold">Kuota sudah penuh.</strong> Kamu akan
            masuk daftar tunggu dan kami hubungi kalau ada kursi yang terbuka.
          </span>
        </div>
      )}

      {/* ---------------- Identity ---------------- */}
      <fieldset className="space-y-4">
        <legend className="flex items-center gap-2 text-sm font-extrabold text-navy-900">
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-navy-800 text-[0.7rem] text-white">
            1
          </span>
          Data Diri
        </legend>

        <div>
          <label htmlFor="name" className="label">
            Nama lengkap <span className="text-coral-600">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Nama sesuai yang ingin tampil di sertifikat"
            className="field"
            {...aria("name")}
          />
          {err("name")}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="email" className="label">
              Email aktif <span className="text-coral-600">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder="nama@email.com"
              className="field"
              {...aria("email")}
            />
            {err("email") ?? (
              <p className="hint">Tiket dan link event dikirim ke sini.</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="label">
              Nomor WhatsApp <span className="text-coral-600">*</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              inputMode="tel"
              placeholder="08xxxxxxxxxx"
              className="field"
              {...aria("phone")}
            />
            {err("phone") ?? <p className="hint">Untuk pengingat sebelum acara.</p>}
          </div>
        </div>
      </fieldset>

      {/* ---------------- Context ---------------- */}
      <fieldset className="space-y-4">
        <legend className="flex items-center gap-2 text-sm font-extrabold text-navy-900">
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-navy-800 text-[0.7rem] text-white">
            2
          </span>
          Sedikit Tentang Kamu
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="institution" className="label">
              Institusi / perusahaan
            </label>
            <input
              id="institution"
              name="institution"
              type="text"
              autoComplete="organization"
              placeholder="Kampus, sekolah, atau tempat kerja"
              className="field"
              {...aria("institution")}
            />
            {err("institution")}
          </div>

          <div>
            <label htmlFor="city" className="label">
              Kota
            </label>
            <input
              id="city"
              name="city"
              type="text"
              autoComplete="address-level2"
              placeholder="Bandung"
              className="field"
              {...aria("city")}
            />
            {err("city")}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="occupation" className="label">
              Status saat ini
            </label>
            <input
              id="occupation"
              name="occupation"
              type="text"
              placeholder="Mahasiswa / Fresh graduate / Karyawan"
              className="field"
            />
          </div>

          <div>
            <label htmlFor="experience" className="label">
              Level pengalaman di topik ini
            </label>
            <select id="experience" name="experience" className="field field-select" defaultValue="">
              <option value="">Pilih salah satu</option>
              {EXPERIENCE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="goal" className="label">
            Apa yang ingin kamu bawa pulang dari kelas ini?
          </label>
          <textarea
            id="goal"
            name="goal"
            rows={3}
            maxLength={500}
            placeholder="Ceritakan singkat masalah atau tujuanmu, supaya mentor bisa menyesuaikan contoh."
            className="field resize-y"
          />
          <p className="hint">Opsional, tapi sangat membantu mentor.</p>
        </div>

        <div>
          <label htmlFor="source" className="label">
            Dari mana tahu Otakademi?
          </label>
          <select id="source" name="source" className="field field-select" defaultValue="">
            <option value="">Pilih salah satu</option>
            {SOURCE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      {/* ---------------- Payment / promo ---------------- */}
      {price > 0 && (
        <fieldset className="space-y-4">
          <legend className="flex items-center gap-2 text-sm font-extrabold text-navy-900">
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-navy-800 text-[0.7rem] text-white">
              3
            </span>
            Kode Promo
          </legend>

          <div>
            <label htmlFor="promoCode" className="label">
              Punya kode promo atau referral?
            </label>
            <div className="flex gap-2">
              <input
                id="promoCode"
                name="promoCode"
                type="text"
                value={promoInput}
                onChange={(e) => {
                  setPromoInput(e.target.value.toUpperCase());
                  setPromo(null);
                }}
                placeholder="OTAKADEMI10"
                className="field flex-1 uppercase"
                autoCapitalize="characters"
              />
              <button
                type="button"
                onClick={verifyPromo}
                disabled={promoChecking || !promoInput.trim()}
                className="btn btn-outline btn-md shrink-0"
              >
                {promoChecking ? (
                  <span
                    aria-hidden="true"
                    className="anim-spin size-4 rounded-full border-2 border-current border-t-transparent"
                  />
                ) : (
                  "Cek"
                )}
              </button>
            </div>

            <div aria-live="polite">
              {promo?.valid === true && (
                <p className="anim-fade mt-2 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                  <Icon name="check-circle" size={15} />
                  {promo.label} diterapkan. Hemat {formatIDR(promo.discount)}.
                </p>
              )}
              {promo?.valid === false && (
                <p className="anim-fade mt-2 flex items-center gap-1.5 text-xs font-bold text-coral-600">
                  <Icon name="x-circle" size={15} />
                  {promo.reason}
                </p>
              )}
            </div>
          </div>

          {/* Order summary */}
          <div className="rounded-xl border border-navy-100 bg-surface p-4">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-navy-500">Harga kelas</dt>
                <dd className="font-semibold text-navy-800 tnum">{formatIDR(price)}</dd>
              </div>
              {promo?.valid && promo.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>Diskon ({promo.code})</dt>
                  <dd className="font-semibold tnum">-{formatIDR(promo.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-navy-200 pt-1.5">
                <dt className="font-extrabold text-navy-900">Total bayar</dt>
                <dd className="text-lg font-extrabold text-coral-600 tnum">
                  {formatIDR(total)}
                </dd>
              </div>
            </dl>
          </div>
        </fieldset>
      )}

      {/* ---------------- Consent ---------------- */}
      <div>
        <label
          htmlFor="consent"
          className="flex cursor-pointer items-start gap-3 rounded-xl border border-navy-200 p-4 transition-colors hover:bg-navy-50/70 has-checked:border-gold-400 has-checked:bg-gold-50/60"
        >
          <input
            id="consent"
            name="consent"
            type="checkbox"
            required
            className="mt-0.5 size-4.5 shrink-0 accent-gold-500"
            {...aria("consent")}
          />
          <span className="text-sm leading-relaxed text-navy-700">
            Saya setuju dengan{" "}
            <a
              href="/kebijakan/ketentuan"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-gold-700 underline"
            >
              Syarat &amp; Ketentuan
            </a>{" "}
            dan{" "}
            <a
              href="/kebijakan/privasi"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-gold-700 underline"
            >
              Kebijakan Privasi
            </a>
            , serta bersedia dihubungi terkait event ini.{" "}
            <span className="text-coral-600">*</span>
          </span>
        </label>
        {err("consent")}
      </div>

      <div className="border-t border-navy-100 pt-6">
        <SubmitButton
          size="lg"
          full
          icon="arrow-right"
          pendingText="Memproses pendaftaran..."
        >
          {isWaitlist
            ? "Gabung Daftar Tunggu"
            : price > 0
              ? `Daftar & Bayar ${formatIDR(total)}`
              : "Daftar Sekarang - Gratis"}
        </SubmitButton>

        <p className="mt-3 text-center text-xs text-navy-400">
          Data kamu hanya dipakai untuk keperluan event ini.
        </p>
      </div>
    </form>
  );
}
