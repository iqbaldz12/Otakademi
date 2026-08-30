import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

/** Shared chrome for every public-facing page. */
export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
