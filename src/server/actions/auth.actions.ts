"use server";

import { redirect } from "next/navigation";
import { login } from "@/server/auth";

export type LoginState = { ok: boolean; message?: string };

/**
 * Admin login.
 *
 * Note there is no rate limiting at the application layer here; the deployment
 * should sit behind a proxy/WAF rule that throttles POSTs to /admin/login. The
 * scrypt work factor already makes brute force expensive per attempt.
 */
export async function loginAction(
  _prev: LoginState,
  form: FormData,
): Promise<LoginState> {
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, message: "Email dan password wajib diisi." };
  }

  const result = await login(email, password);
  if (!result.ok) return { ok: false, message: result.reason };

  redirect("/admin");
}
