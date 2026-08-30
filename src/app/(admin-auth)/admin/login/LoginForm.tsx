"use client";

import { useActionState } from "react";
import { Icon } from "@/components/ui/Icon";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { loginAction, type LoginState } from "@/server/actions/auth.actions";

const INITIAL: LoginState = { ok: false };

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, INITIAL);

  return (
    <form action={formAction} className="space-y-4">
      {state.message && (
        <div
          role="alert"
          className="anim-fade flex items-start gap-2 rounded-xl border border-coral-200 bg-coral-50 p-3.5 text-sm font-semibold text-coral-800"
        >
          <Icon name="alert" size={17} className="mt-px" />
          {state.message}
        </div>
      )}

      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          placeholder="nama@otakademi.id"
          className="field"
        />
      </div>

      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="field"
        />
      </div>

      <SubmitButton full size="md" pendingText="Memeriksa...">
        Masuk
      </SubmitButton>
    </form>
  );
}
