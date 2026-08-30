"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

/** Copy-to-clipboard with a brief confirmation, falling back gracefully. */
export function CopyButton({
  value,
  label = "Salin",
  className = "",
}: {
  value: string;
  label?: string;
  className?: string;
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
