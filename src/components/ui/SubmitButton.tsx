"use client";

import { useFormStatus } from "react-dom";
import { Icon, type IconName } from "@/components/ui/Icon";

/**
 * Submit button that reads its parent form's pending state.
 *
 * `useFormStatus` means no prop drilling and no local state: the button knows
 * the form is submitting, disables itself to prevent double submission, and
 * shows a spinner. Works with plain progressive-enhancement forms.
 */
export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
  size = "md",
  icon,
  className = "",
  full = false,
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: "primary" | "coral" | "navy" | "outline";
  size?: "sm" | "md" | "lg";
  icon?: IconName;
  className?: string;
  full?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`btn btn-${variant} btn-${size} ${full ? "w-full" : ""} ${className}`}
    >
      {pending ? (
        <>
          <span
            aria-hidden="true"
            className="anim-spin size-4 rounded-full border-2 border-current border-t-transparent opacity-70"
          />
          {pendingText ?? "Memproses..."}
        </>
      ) : (
        <>
          {children}
          {icon && <Icon name={icon} size={17} />}
        </>
      )}
    </button>
  );
}
