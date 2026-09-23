"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, audit } from "@/server/auth";
import {
  createPaymentMethod,
  updatePaymentMethodRecord,
  deletePaymentMethod,
  togglePaymentMethodActive,
  type PaymentMethodInput,
} from "@/server/services/payment-method.service";
import type { PaymentMethodType } from "@prisma/client";

export type PaymentMethodResult = { ok: boolean; reason?: string };

const TYPES: PaymentMethodType[] = ["BANK", "EWALLET", "QRIS", "CASH", "OTHER"];

function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Parses and validates the modal form. Provider is always required; account
 * number/name are optional (QRIS or cash may not have one).
 */
function parse(form: FormData): PaymentMethodInput | { error: string } {
  const typeRaw = str(form, "type") || "BANK";
  const type = (TYPES.includes(typeRaw as PaymentMethodType)
    ? typeRaw
    : "BANK") as PaymentMethodType;

  const provider = str(form, "provider");
  if (provider.length < 2) return { error: "Nama penyedia minimal 2 karakter." };
  if (provider.length > 60) return { error: "Nama penyedia maksimal 60 karakter." };

  const accountNumber = str(form, "accountNumber").slice(0, 60) || undefined;
  const accountName = str(form, "accountName").slice(0, 80) || undefined;
  const note = str(form, "note").slice(0, 160) || undefined;
  const active = form.get("active") === "on" || form.get("active") === "true";
  const sortOrder = Number(str(form, "sortOrder") || "0");

  return {
    type,
    provider,
    accountNumber,
    accountName,
    note,
    active,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
  };
}

export async function savePaymentMethodAction(
  id: string | null,
  form: FormData,
): Promise<PaymentMethodResult> {
  const session = await requireAdmin();

  const parsed = parse(form);
  if ("error" in parsed) return { ok: false, reason: parsed.error };

  if (id) {
    await updatePaymentMethodRecord(id, parsed);
    await audit(session.email, "paymentMethod.update", id, parsed.provider);
  } else {
    await createPaymentMethod(parsed);
    await audit(session.email, "paymentMethod.create", undefined, parsed.provider);
  }

  revalidatePath("/admin/pembayaran");
  return { ok: true, reason: id ? "Metode diperbarui." : "Metode ditambahkan." };
}

export async function deletePaymentMethodAction(
  id: string,
): Promise<PaymentMethodResult> {
  const session = await requireAdmin();
  await deletePaymentMethod(id);
  await audit(session.email, "paymentMethod.delete", id);
  revalidatePath("/admin/pembayaran");
  return { ok: true, reason: "Metode dihapus." };
}

export async function togglePaymentMethodAction(
  id: string,
  active: boolean,
): Promise<PaymentMethodResult> {
  const session = await requireAdmin();
  await togglePaymentMethodActive(id, active);
  await audit(
    session.email,
    active ? "paymentMethod.activate" : "paymentMethod.deactivate",
    id,
  );
  revalidatePath("/admin/pembayaran");
  return { ok: true };
}
