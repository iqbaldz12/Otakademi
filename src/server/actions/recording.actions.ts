"use server";

import { redirect } from "next/navigation";

/**
 * Handles the archive lookup form: takes a registration code and reloads the
 * archive page with it. The actual access decision (paid / unpaid / not
 * published) is made when the page renders via getArchiveAccess.
 */
export async function findArchiveAction(formData: FormData): Promise<void> {
  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();

  if (!code) redirect("/arsip?error=empty");
  redirect(`/arsip?code=${encodeURIComponent(code)}`);
}
