import { db } from "@/server/db";
import type { PaymentMethod, PaymentMethodType } from "@prisma/client";

/**
 * Admin-managed payment methods (destination accounts).
 *
 * The team maintains their real bank accounts / e-wallets / QRIS here. The admin
 * transaction editor uses the labels as quick-picks, and the participant's
 * payment instructions render the active ones with account numbers.
 */

export type PaymentMethodInput = {
  type: PaymentMethodType;
  provider: string;
  accountNumber?: string;
  accountName?: string;
  note?: string;
  active: boolean;
  sortOrder: number;
};

/** Every method, newest ordering first. For the admin manager. */
export function listPaymentMethods(): Promise<PaymentMethod[]> {
  return db.paymentMethod.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

/** Only the active methods, for showing to participants. */
export function listActivePaymentMethods(): Promise<PaymentMethod[]> {
  return db.paymentMethod.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export function createPaymentMethod(
  input: PaymentMethodInput,
): Promise<PaymentMethod> {
  return db.paymentMethod.create({ data: input });
}

export function updatePaymentMethodRecord(
  id: string,
  input: PaymentMethodInput,
): Promise<PaymentMethod> {
  return db.paymentMethod.update({ where: { id }, data: input });
}

export async function deletePaymentMethod(id: string): Promise<void> {
  await db.paymentMethod.delete({ where: { id } });
}

export async function togglePaymentMethodActive(
  id: string,
  active: boolean,
): Promise<void> {
  await db.paymentMethod.update({ where: { id }, data: { active } });
}

/**
 * A short human label for a method, used as the quick-pick chip when setting a
 * transaction's method, e.g. "BCA - 1234567890".
 */
export function methodLabel(m: PaymentMethod): string {
  return m.accountNumber ? `${m.provider} - ${m.accountNumber}` : m.provider;
}
