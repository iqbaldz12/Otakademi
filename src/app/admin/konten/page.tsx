import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ChannelManager, type ChannelRow } from "@/components/admin/ChannelManager";
import { ContactCopyEditor } from "@/components/admin/ContactCopyEditor";
import {
  LandingBlockManager,
  type BlockRow,
} from "@/components/admin/LandingBlockManager";
import { LandingCopyEditor } from "@/components/admin/LandingCopyEditor";
import {
  listAllChannels,
  getContactContent,
  getLandingCopy,
  listBlocks,
} from "@/server/services/content.service";
import {
  LANDING_SECTIONS,
  LANDING_SECTION_META,
  isLandingSection,
  type LandingSection,
} from "@/lib/domain";

export const metadata: Metadata = { title: "Konten" };
export const dynamic = "force-dynamic";

/**
 * CMS hub.
 *
 * Two top-level areas — Landing and Kontak — selected by `?tab`, each with its
 * own sub-navigation via `?section`. State lives entirely in the URL, so the
 * page stays a server component: every view is a link, shareable and
 * back-button friendly, with no client tab library.
 */
export default async function KontenPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; section?: string; saved?: string }>;
}) {
  const params = await searchParams;
  const tab =
    params.tab === "kontak-kanal" ||
    params.tab === "kontak-teks" ||
    params.tab === "landing-teks"
      ? params.tab
      : "landing";

  // Which landing section is being edited (only relevant on the landing tab).
  const section: LandingSection =
    params.section && isLandingSection(params.section)
      ? params.section
      : "BENEFIT";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h2">Konten Website</h1>
          <p className="mt-1 text-sm text-navy-500">
            Kelola isi halaman utama dan halaman kontak tanpa perlu deploy.
          </p>
        </div>
      </div>

      {params.saved && (
        <div
          role="status"
          className="anim-fade flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"
        >
          <Icon name="check-circle" size={18} />
          Perubahan tersimpan.
        </div>
      )}

      {/* Top-level area switch */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/konten?tab=landing"
          className={`btn btn-sm ${
            tab.startsWith("landing") ? "btn-navy" : "btn-outline"
          }`}
        >
          <Icon name="layout" size={15} />
          Halaman Utama
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 opacity-70 hover:opacity-100"
            aria-label="Lihat halaman utama"
          >
            <Icon name="external" size={13} />
          </Link>
        </Link>
        <Link
          href="/admin/konten?tab=kontak-kanal"
          className={`btn btn-sm ${
            tab.startsWith("kontak") ? "btn-navy" : "btn-outline"
          }`}
        >
          <Icon name="mail" size={15} />
          Halaman Kontak
        </Link>
      </div>

      {tab.startsWith("landing") ? (
        <LandingArea tab={tab} section={section} />
      ) : (
        <KontakArea tab={tab} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Landing area                                                        */
/* ------------------------------------------------------------------ */

async function LandingArea({
  tab,
  section,
}: {
  tab: string;
  section: LandingSection;
}) {
  const showCopy = tab === "landing-teks";

  const [copy, blocks] = await Promise.all([
    getLandingCopy(),
    showCopy ? Promise.resolve([]) : listBlocks(section),
  ]);

  const rows: BlockRow[] = blocks.map((b) => ({
    id: b.id,
    section: b.section,
    icon: b.icon,
    title: b.title,
    body: b.body,
    meta: b.meta,
    active: b.active,
  }));

  return (
    <>
      {/* Sub-nav: one chip per section + the copy editor */}
      <div className="scroll-slim flex gap-1 overflow-x-auto border-b border-navy-100 pb-px">
        {LANDING_SECTIONS.map((s) => {
          const active = !showCopy && section === s;
          return (
            <Link
              key={s}
              href={`/admin/konten?tab=landing&section=${s}`}
              aria-current={active ? "page" : undefined}
              className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${
                active
                  ? "border-gold-500 text-navy-900"
                  : "border-transparent text-navy-500 hover:text-navy-800"
              }`}
            >
              {LANDING_SECTION_META[s].singular}
            </Link>
          );
        })}
        <Link
          href="/admin/konten?tab=landing-teks"
          aria-current={showCopy ? "page" : undefined}
          className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${
            showCopy
              ? "border-gold-500 text-navy-900"
              : "border-transparent text-navy-500 hover:text-navy-800"
          }`}
        >
          Judul &amp; Teks
        </Link>
      </div>

      {showCopy ? (
        <LandingCopyEditor copy={copy} />
      ) : (
        <LandingBlockManager section={section} blocks={rows} />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Kontak area                                                         */
/* ------------------------------------------------------------------ */

async function KontakArea({ tab }: { tab: string }) {
  const showCopy = tab === "kontak-teks";

  const [channels, content] = await Promise.all([
    listAllChannels(),
    getContactContent(),
  ]);

  const rows: ChannelRow[] = channels.map((c) => ({
    id: c.id,
    icon: c.icon,
    label: c.label,
    value: c.value,
    href: c.href,
    note: c.note,
    primary: c.primary,
    active: c.active,
  }));

  return (
    <>
      <div className="flex gap-1 border-b border-navy-100">
        <Link
          href="/admin/konten?tab=kontak-kanal"
          aria-current={!showCopy ? "page" : undefined}
          className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${
            !showCopy
              ? "border-gold-500 text-navy-900"
              : "border-transparent text-navy-500 hover:text-navy-800"
          }`}
        >
          Kanal Kontak
        </Link>
        <Link
          href="/admin/konten?tab=kontak-teks"
          aria-current={showCopy ? "page" : undefined}
          className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${
            showCopy
              ? "border-gold-500 text-navy-900"
              : "border-transparent text-navy-500 hover:text-navy-800"
          }`}
        >
          Teks Halaman
        </Link>
      </div>

      {showCopy ? (
        <ContactCopyEditor content={content} />
      ) : (
        <ChannelManager channels={rows} />
      )}
    </>
  );
}
