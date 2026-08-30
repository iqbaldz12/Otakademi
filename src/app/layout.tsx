import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

/**
 * Self-hosted variable font.
 *
 * next/font downloads the file at build time and serves it from our own origin:
 * no request to Google at runtime, no third-party connection to negotiate, and
 * `display: swap` plus automatic size-adjust metrics keep CLS at zero.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
  // Only the weights actually used, keeping the payload small.
  weight: ["400", "500", "600", "700", "800"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Otakademi - Upgrade Skill. Upgrade Cara Mikir.",
    template: "%s | Otakademi",
  },
  description:
    "Kelas dan event praktis untuk generasi muda yang ingin berpikir lebih jernih, punya skill relevan, dan lebih siap kerja.",
  keywords: [
    "kelas online",
    "event otakademi",
    "kelas AI",
    "cara berpikir kritis",
    "pelatihan karier",
    "webinar Indonesia",
  ],
  authors: [{ name: "Otakademi" }],
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: SITE_URL,
    siteName: "Otakademi",
    title: "Otakademi - Upgrade Skill. Upgrade Cara Mikir.",
    description:
      "Kelas dan event praktis untuk generasi muda yang ingin berpikir lebih jernih dan punya skill relevan.",
    images: [{ url: "/brand/logo.png", width: 480, height: 344, alt: "Otakademi" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Otakademi - Upgrade Skill. Upgrade Cara Mikir.",
    description: "Kelas dan event praktis untuk generasi muda.",
    images: ["/brand/logo.png"],
  },
  icons: {
    icon: [{ url: "/brand/logo.png", type: "image/png", sizes: "480x344" }],
    apple: [{ url: "/brand/logo.png", sizes: "480x344" }],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#1A2C4E",
  width: "device-width",
  initialScale: 1,
  // Never block users from zooming.
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    /**
     * `data-scroll-behavior="smooth"` is required as of Next 16: without it the
     * global `scroll-behavior: smooth` in globals.css would also apply to route
     * transitions, so every navigation would slowly animate to the top. This
     * attribute restores the instant jump on navigation while keeping in-page
     * anchor links smooth.
     */
    <html lang="id" className={jakarta.variable} data-scroll-behavior="smooth">
      <body>
        <a href="#main" className="skip-link">
          Lompat ke konten utama
        </a>
        {/*
          Toaster deliberately lives in the admin layout rather than here: every
          caller of toast() is an admin control, so mounting it globally would
          ship the toast runtime to public visitors who never trigger one.
        */}
        {children}
      </body>
    </html>
  );
}
