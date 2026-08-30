import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/ui/Icon";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="anim-pop max-w-md text-center">
        <Image
          src="/brand/mark.png"
          alt=""
          width={120}
          height={120}
          className="mx-auto opacity-70"
          sizes="120px"
        />

        <p className="mt-6 text-6xl font-extrabold text-navy-200 tnum">404</p>
        <h1 className="mt-2 text-h2">Halaman tidak ditemukan</h1>
        <p className="mt-3 text-navy-500">
          Link-nya mungkin sudah berubah, atau event yang kamu cari sudah tidak
          tersedia.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn btn-primary btn-md">
            Ke Halaman Utama
          </Link>
          <Link href="/event" className="btn btn-outline btn-md">
            <Icon name="search" size={16} />
            Cari Kelas
          </Link>
        </div>
      </div>
    </main>
  );
}
