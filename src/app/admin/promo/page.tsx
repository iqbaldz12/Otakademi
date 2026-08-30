import type { Metadata } from "next";
import { PromoManager, type PromoRow } from "@/components/admin/PromoManager";
import { listPromos } from "@/server/services/promo.service";

export const metadata: Metadata = { title: "Promo" };
export const dynamic = "force-dynamic";

export default async function PromoPage() {
  const promos = await listPromos();

  const rows: PromoRow[] = promos.map((p) => ({
    id: p.id,
    code: p.code,
    type: p.type,
    value: p.value,
    quota: p.quota,
    usage: p.usage,
    active: p.active,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-h2">Kode Promo</h1>
        <p className="mt-1 text-sm text-navy-500">
          Buat dan kelola diskon. Kode dipakai peserta saat mendaftar event berbayar.
        </p>
      </div>

      <PromoManager promos={rows} />
    </div>
  );
}
