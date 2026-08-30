import Image from "next/image";
import Link from "next/link";

/**
 * Brand lockup.
 *
 * `priority` on the header instance because it sits above the fold and is a
 * candidate for the LCP element. Explicit width/height reserve the box so text
 * around it never shifts once the image decodes.
 */
export function Logo({
  height = 34,
  priority = false,
  href = "/",
  className = "",
}: {
  height?: number;
  priority?: boolean;
  href?: string | null;
  className?: string;
}) {
  // Source is 480x344, so keep that ratio to avoid distortion.
  const width = Math.round(height * (480 / 344));

  const img = (
    <Image
      src="/brand/logo.png"
      alt="Otakademi"
      width={width}
      height={height}
      priority={priority}
      quality={90}
      className="h-full w-auto object-contain"
      sizes={`${width}px`}
    />
  );

  if (!href) {
    return (
      <span className={className} style={{ height }}>
        {img}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label="Otakademi - ke halaman utama"
      className={`inline-flex shrink-0 items-center transition-opacity hover:opacity-80 ${className}`}
      style={{ height }}
    >
      {img}
    </Link>
  );
}

/** Emblem only, for tight spaces like the admin sidebar rail. */
export function LogoMark({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/brand/mark.png"
      alt=""
      width={size}
      height={size}
      quality={90}
      className={className}
      sizes={`${size}px`}
    />
  );
}
