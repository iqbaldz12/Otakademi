import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import { LoginForm } from "./LoginForm";
import { Logo } from "@/components/site/Logo";

export const metadata: Metadata = {
  title: "Masuk Dashboard",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  // Already signed in? Skip the form.
  const session = await getSession();
  if (session) redirect("/admin");

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy-900 p-5">
      {/* Ambient brand glow */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="anim-drift absolute -left-32 -top-32 size-[30rem] rounded-full bg-coral-500/20 blur-3xl" />
        <div
          className="anim-drift absolute -bottom-32 -right-32 size-[26rem] rounded-full bg-gold-400/20 blur-3xl"
          style={{ animationDelay: "-8s" }}
        />
      </div>

      <div className="anim-pop relative w-full max-w-sm">
        <div className="mb-6 flex justify-center rounded-2xl bg-white px-6 py-5">
          <Logo height={38} href="/" priority />
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-7">
          <h1 className="text-h3">Masuk Dashboard</h1>
          <p className="mt-1.5 text-sm text-navy-500">
            Area internal tim Otakademi.
          </p>

          <div className="mt-6">
            <LoginForm />
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-navy-300">
          Lupa akses? Hubungi Super Admin kamu.
        </p>
      </div>
    </main>
  );
}
