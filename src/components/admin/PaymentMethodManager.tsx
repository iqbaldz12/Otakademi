"use client";

import { useState, useTransition } from "react";
import type { PaymentMethod, PaymentMethodType } from "@prisma/client";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { toast } from "@/components/ui/toast";
import {
  savePaymentMethodAction,
  deletePaymentMethodAction,
} from "@/server/actions/payment-method.actions";

const TYPE_OPTIONS: Array<{ value: PaymentMethodType; label: string }> = [
  { value: "BANK", label: "Bank / Transfer" },
  { value: "EWALLET", label: "E-Wallet" },
  { value: "QRIS", label: "QRIS" },
  { value: "CASH", label: "Tunai" },
  { value: "OTHER", label: "Lainnya" },
];

const TYPE_LABEL: Record<PaymentMethodType, string> = {
  BANK: "Bank",
  EWALLET: "E-Wallet",
  QRIS: "QRIS",
  CASH: "Tunai",
  OTHER: "Lainnya",
};

/**
 * Admin manager for payment methods (destination accounts).
 *
 * Lists each method as a card and opens a modal to add or edit one, with real
 * fields (type, provider, account number, holder, note). Replaces the old
 * free-text list, so participants can see actual account details.
 */
export function PaymentMethodManager({ methods }: { methods: PaymentMethod[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [isPending, startTransition] = useTransition();

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(m: PaymentMethod) {
    setEditing(m);
    setModalOpen(true);
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await savePaymentMethodAction(editing?.id ?? null, formData);
      toast(result.reason ?? (result.ok ? "Tersimpan." : "Gagal."), result.ok ? "success" : "error");
      if (result.ok) setModalOpen(false);
    });
  }

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Icon name="wallet" size={20} className="mt-0.5 shrink-0 text-navy-500" />
          <div>
            <h2 className="text-h3">Metode Pembayaran</h2>
            <p className="mt-0.5 text-sm text-navy-500">
              Rekening/e-wallet tujuan yang tampil ke peserta saat membayar.
            </p>
          </div>
        </div>
        <button type="button" onClick={openAdd} className="btn btn-primary btn-sm">
          <Icon name="plus" size={16} />
          Tambah Metode
        </button>
      </div>

      {/* List */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {methods.length === 0 ? (
          <p className="text-sm text-navy-400">
            Belum ada metode. Klik &quot;Tambah Metode&quot; untuk menambahkan rekening.
          </p>
        ) : (
          methods.map((m) => (
            <div
              key={m.id}
              className={`rounded-xl border p-4 ${
                m.active ? "border-navy-200 bg-white" : "border-navy-100 bg-surface opacity-70"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-navy-900">{m.provider}</span>
                    <Badge tone="navy">{TYPE_LABEL[m.type]}</Badge>
                    {!m.active && <Badge tone="grey">Nonaktif</Badge>}
                  </div>
                  {m.accountNumber && (
                    <p className="mt-1 font-mono text-sm font-bold text-navy-700">
                      {m.accountNumber}
                    </p>
                  )}
                  {m.accountName && (
                    <p className="text-xs text-navy-500">a.n. {m.accountName}</p>
                  )}
                  {m.note && <p className="mt-1 text-xs text-navy-400">{m.note}</p>}
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(m)}
                  className="btn btn-outline btn-sm"
                >
                  <Icon name="edit" size={14} />
                  Edit
                </button>
                <ConfirmButton
                  action={() => deletePaymentMethodAction(m.id)}
                  confirmLabel="Hapus"
                  successMessage={`Metode "${m.provider}" dihapus.`}
                  ariaLabel={`Hapus ${m.provider}`}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Metode Pembayaran" : "Tambah Metode Pembayaran"}
      >
        <form action={submit} className="space-y-4">
          <div>
            <label htmlFor="type" className="label">
              Jenis
            </label>
            <select
              id="type"
              name="type"
              defaultValue={editing?.type ?? "BANK"}
              className="field field-select"
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="provider" className="label">
              Nama penyedia <span className="text-coral-600">*</span>
            </label>
            <input
              id="provider"
              name="provider"
              type="text"
              required
              defaultValue={editing?.provider ?? ""}
              placeholder="BCA, Mandiri, DANA, QRIS..."
              className="field"
            />
          </div>

          <div>
            <label htmlFor="accountNumber" className="label">
              Nomor rekening / nomor HP
            </label>
            <input
              id="accountNumber"
              name="accountNumber"
              type="text"
              defaultValue={editing?.accountNumber ?? ""}
              placeholder="1234567890"
              className="field font-mono"
            />
            <p className="hint">Boleh dikosongkan untuk QRIS atau tunai.</p>
          </div>

          <div>
            <label htmlFor="accountName" className="label">
              Atas nama
            </label>
            <input
              id="accountName"
              name="accountName"
              type="text"
              defaultValue={editing?.accountName ?? ""}
              placeholder="Otakademi Indonesia"
              className="field"
            />
          </div>

          <div>
            <label htmlFor="note" className="label">
              Catatan (opsional)
            </label>
            <input
              id="note"
              name="note"
              type="text"
              defaultValue={editing?.note ?? ""}
              placeholder="Cabang Bandung / instruksi tambahan"
              className="field"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sortOrder" className="label">
                Urutan
              </label>
              <input
                id="sortOrder"
                name="sortOrder"
                type="number"
                defaultValue={editing?.sortOrder ?? 0}
                className="field tnum"
              />
            </div>
            <label className="flex items-end gap-2 pb-2.5">
              <input
                type="checkbox"
                name="active"
                defaultChecked={editing ? editing.active : true}
                className="size-4"
              />
              <span className="text-sm font-semibold text-navy-700">
                Tampilkan ke peserta
              </span>
            </label>
          </div>

          <div className="flex items-center gap-3 border-t border-navy-100 pt-4">
            <button
              type="submit"
              disabled={isPending}
              aria-busy={isPending}
              className="btn btn-primary btn-md"
            >
              {isPending ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Tambah"}
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn btn-ghost btn-md"
            >
              Batal
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
