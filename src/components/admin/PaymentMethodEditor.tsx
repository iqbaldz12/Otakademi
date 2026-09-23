"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { toast } from "@/components/ui/toast";
import { updatePaymentMethodAction } from "@/server/actions/ops.actions";

const PRESETS = ["Transfer BCA", "Transfer Mandiri", "QRIS", "Tunai", "OVO", "GoPay"];

/**
 * Inline editor for a payment's method label.
 *
 * Shows the current method as text with a pencil; clicking opens a small input
 * with quick-pick presets. Purely descriptive, so it never touches paid/unpaid.
 */
export function PaymentMethodEditor({
  paymentId,
  method,
}: {
  paymentId: string;
  method: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(method ?? "");
  const [current, setCurrent] = useState(method ?? "");
  const [isPending, startTransition] = useTransition();

  function save(next: string) {
    startTransition(async () => {
      const result = await updatePaymentMethodAction(paymentId, next);
      if (result.ok) {
        setCurrent(next.trim());
        setEditing(false);
        toast(result.reason ?? "Tersimpan.", "success");
      } else {
        toast(result.reason ?? "Gagal menyimpan.", "error");
      }
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(current);
          setEditing(true);
        }}
        className="inline-flex items-center gap-1 text-[0.65rem] font-semibold text-navy-500 hover:text-navy-800"
        title="Ubah metode pembayaran"
      >
        <Icon name="edit" size={12} />
        {current || "Atur metode"}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Metode"
          maxLength={60}
          autoFocus
          className="w-32 rounded-lg border border-navy-200 px-2 py-1 text-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter") save(value);
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <button
          type="button"
          onClick={() => save(value)}
          disabled={isPending}
          aria-busy={isPending}
          className="inline-flex size-7 items-center justify-center rounded-lg bg-navy-800 text-white disabled:opacity-50"
          title="Simpan"
        >
          <Icon name="check" size={14} />
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="inline-flex size-7 items-center justify-center rounded-lg border border-navy-200 text-navy-500"
          title="Batal"
        >
          <Icon name="x" size={14} />
        </button>
      </div>
      <div className="flex max-w-[12rem] flex-wrap justify-end gap-1">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => save(p)}
            className="rounded-full bg-navy-50 px-2 py-0.5 text-[0.6rem] font-semibold text-navy-600 hover:bg-navy-100"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
