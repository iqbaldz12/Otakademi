import { db } from "@/server/db";
import { applyPromo } from "@/lib/domain";
import type { Prisma, Promo } from "@prisma/client";

/** Anything with a `promo` delegate: the client or a transaction client. */
type Db = Pick<typeof db, "promo"> | Prisma.TransactionClient;

export async function findUsablePromo(
  code: string,
  client: Db = db,
): Promise<Promo | null> {
  const promo = await client.promo.findUnique({
    where: { code: code.trim().toUpperCase() },
  });

  if (!promo || !promo.active) return null;

  const now = new Date();
  if (promo.startAt && promo.startAt > now) return null;
  if (promo.endAt && promo.endAt < now) return null;
  if (promo.quota > 0 && promo.usage >= promo.quota) return null;

  return promo;
}

export type PromoCheck =
  | { valid: true; code: string; discount: number; final: number; label: string }
  | { valid: false; reason: string };

/** Powers the "cek kode" button on the registration form. */
export async function checkPromo(
  code: string,
  price: number,
): Promise<PromoCheck> {
  if (!code.trim()) return { valid: false, reason: "Masukkan kode promo." };

  if (price <= 0) {
    return { valid: false, reason: "Event ini sudah gratis, promo tidak diperlukan." };
  }

  const promo = await findUsablePromo(code);
  if (!promo) {
    return { valid: false, reason: "Kode promo tidak valid atau sudah habis." };
  }

  const { final, discount } = applyPromo(price, {
    type: promo.type,
    value: promo.value,
  });

  return {
    valid: true,
    code: promo.code,
    discount,
    final,
    label:
      promo.type === "PERCENT"
        ? `Diskon ${promo.value}%`
        : `Potongan langsung`,
  };
}

export async function listPromos(): Promise<Promo[]> {
  return db.promo.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createPromo(data: {
  code: string;
  type: "FIXED" | "PERCENT";
  value: number;
  quota: number;
  startAt?: Date | null;
  endAt?: Date | null;
}): Promise<Promo> {
  return db.promo.create({
    data: {
      code: data.code.trim().toUpperCase(),
      type: data.type,
      value: data.value,
      quota: data.quota,
      startAt: data.startAt ?? null,
      endAt: data.endAt ?? null,
    },
  });
}

export async function setPromoActive(id: string, active: boolean): Promise<void> {
  await db.promo.update({ where: { id }, data: { active } });
}

export async function deletePromo(id: string): Promise<void> {
  await db.promo.delete({ where: { id } });
}
