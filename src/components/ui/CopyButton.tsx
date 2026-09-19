"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

/** Copy-to-clipboard with a brief confirmation, falling back gracefully. */
export function CopyButton({
  value,
  label = "Salin",
  className = "",
  iconOnly = false,
}: {
  value: string;
  label?: string;
  className?: string;
  /** Render just the icon (with an accessible label), no visible text. */
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API needs a secure context; select the text as a fallback.
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={copy}
        title={copied ? "Tersalin" : label}
        aria-label={copied ? "Tersalin" : label}
        aria-live="polite"
        className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-navy-200 text-navy-600 transition-colors hover:bg-navy-50 hover:text-navy-900 ${className}`}
      >
        <Icon name={copied ? "check" : "copy"} size={16} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`btn btn-outline btn-sm ${className}`}
      aria-live="polite"
    >
      <Icon name={copied ? "check" : "copy"} size={15} />
      {copied ? "Tersalin" : label}
    </button>
  );
}
