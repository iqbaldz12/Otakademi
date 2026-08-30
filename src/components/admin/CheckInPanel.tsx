"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { checkInAction, type CheckInState } from "@/server/actions/ops.actions";

const INITIAL: CheckInState = { status: "idle" };

/**
 * Check-in console: manual code entry plus optional camera scanning.
 *
 * Scanning uses the native `BarcodeDetector` API where available (Chrome/Edge on
 * Android and desktop), which keeps a QR library out of the bundle entirely. On
 * browsers without it — notably Safari and Firefox — the camera button is hidden
 * and staff use the manual field, which is always present and always works.
 */
export function CheckInPanel() {
  const [state, formAction] = useActionState(checkInAction, INITIAL);

  const [scanSupported, setScanSupported] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Prevents the same code firing repeatedly while it stays in frame.
  const lastScanRef = useRef<string>("");

  useEffect(() => {
    setScanSupported(
      typeof window !== "undefined" &&
        "BarcodeDetector" in window &&
        Boolean(navigator.mediaDevices?.getUserMedia),
    );
  }, []);

  const stopScan = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  };

  // Always release the camera when this component goes away.
  useEffect(() => stopScan, []);

  async function startScan() {
    setScanError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // Rear camera on phones, which is what door staff will use.
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setScanning(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // @ts-expect-error - BarcodeDetector isn't in TS's DOM lib yet.
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });

      const tick = async () => {
        if (!videoRef.current || !streamRef.current) return;

        try {
          const codes = await detector.detect(videoRef.current);
          const value = codes?.[0]?.rawValue as string | undefined;

          if (value && value !== lastScanRef.current) {
            lastScanRef.current = value;

            if (inputRef.current) inputRef.current.value = value;
            formRef.current?.requestSubmit();

            // Brief cooldown so one badge doesn't submit dozens of times.
            setTimeout(() => {
              lastScanRef.current = "";
            }, 2500);
          }
        } catch {
          // A single failed frame is normal; keep polling.
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setScanError(
        "Tidak bisa mengakses kamera. Pastikan izin kamera diberikan, lalu gunakan input manual.",
      );
      stopScan();
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* ---------- Input ---------- */}
      <div className="card p-5 sm:p-6">
        <h2 className="text-h3">Check-in Peserta</h2>
        <p className="mt-1.5 text-sm text-navy-500">
          Scan QR tiket, atau masukkan kode pendaftaran secara manual.
        </p>

        <form ref={formRef} action={formAction} className="mt-5 space-y-3">
          <div>
            <label htmlFor="value" className="label">
              Kode pendaftaran atau token QR
            </label>
            <input
              ref={inputRef}
              id="value"
              name="value"
              type="text"
              required
              autoFocus
              autoComplete="off"
              spellCheck={false}
              placeholder="OTK-XXXX-XXXX"
              className="field font-mono text-lg uppercase"
            />
            <p className="hint">
              Kode ada di halaman tiket peserta. Huruf besar/kecil tidak masalah.
            </p>
          </div>

          <SubmitButton full size="md" icon="check" pendingText="Memeriksa...">
            Check-in
          </SubmitButton>
        </form>

        {/* Camera */}
        <div className="mt-5 border-t border-navy-100 pt-5">
          {scanSupported ? (
            scanning ? (
              <div>
                <div className="relative overflow-hidden rounded-xl bg-navy-900">
                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    className="aspect-video w-full object-cover"
                  />
                  {/* Framing guide */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 flex items-center justify-center"
                  >
                    <div className="size-40 rounded-2xl border-4 border-gold-400/80 shadow-[0_0_0_9999px_rgba(13,23,40,0.45)]" />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={stopScan}
                  className="btn btn-outline btn-sm mt-3 w-full"
                >
                  <Icon name="x" size={15} />
                  Hentikan Kamera
                </button>
              </div>
            ) : (
              <button type="button" onClick={startScan} className="btn btn-navy btn-md w-full">
                <Icon name="scan" size={17} />
                Scan QR dengan Kamera
              </button>
            )
          ) : (
            <p className="flex items-start gap-2 text-xs text-navy-400">
              <Icon name="info" size={15} className="mt-px shrink-0" />
              Browser ini belum mendukung pemindaian QR bawaan. Gunakan input manual,
              atau buka halaman ini di Chrome/Edge.
            </p>
          )}

          {scanError && (
            <p className="error-text" role="alert">
              {scanError}
            </p>
          )}
        </div>
      </div>

      {/* ---------- Result ---------- */}
      <div
        className={`card flex flex-col items-center justify-center p-6 text-center transition-colors ${
          state.status === "ok"
            ? "border-emerald-300 bg-emerald-50"
            : state.status === "repeat"
              ? "border-gold-300 bg-gold-50"
              : state.status === "error"
                ? "border-coral-300 bg-coral-50"
                : ""
        }`}
        aria-live="polite"
      >
        {state.status === "idle" && (
          <>
            <Icon name="qr" size={44} className="text-navy-200" />
            <p className="mt-3 text-sm font-semibold text-navy-400">
              Hasil check-in akan muncul di sini
            </p>
          </>
        )}

        {state.status === "ok" && (
          <div className="anim-pop">
            <Icon name="check-circle" size={52} className="mx-auto text-emerald-600" />
            <p className="mt-3 text-h3 text-emerald-800">Check-in Berhasil</p>
            <p className="mt-1 text-xl font-extrabold text-navy-900">{state.name}</p>
            <p className="font-mono text-sm text-navy-500">{state.code}</p>
          </div>
        )}

        {state.status === "repeat" && (
          <div className="anim-pop">
            <Icon name="info" size={52} className="mx-auto text-gold-700" />
            <p className="mt-3 text-h3 text-gold-800">Sudah Check-in</p>
            <p className="mt-1 text-xl font-extrabold text-navy-900">{state.name}</p>
            <p className="font-mono text-sm text-navy-500">{state.code}</p>
            <p className="mt-2 text-xs text-navy-500">
              Peserta ini sudah tercatat hadir sebelumnya.
            </p>
          </div>
        )}

        {state.status === "error" && (
          <div className="anim-pop">
            <Icon name="x-circle" size={52} className="mx-auto text-coral-600" />
            <p className="mt-3 text-h3 text-coral-800">Gagal</p>
            <p className="mt-1.5 text-sm font-semibold text-navy-700">{state.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
