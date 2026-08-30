import type { Metadata } from "next";
import { requireAdmin } from "@/server/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Toaster } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s | Dashboard Otakademi" },
  // The whole admin area stays out of search indexes.
  robots: { index: false, follow: false },
};

/**
 * Admin shell.
 *
 * The auth gate lives here, so every route nested under /admin is protected by
 * default rather than each page remembering to check. The login page sits in its
 * own route group outside this layout.
 */
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireAdmin();

  return (
    <div className="flex min-h-screen bg-surface">
      <AdminSidebar
        user={{ name: session.name, email: session.email, role: session.role }}
      />
      <div className="min-w-0 flex-1">
        <main id="main" className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
      {/* Admin actions report their outcome here. */}
      <Toaster />
    </div>
  );
}
