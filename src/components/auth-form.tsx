"use client";

import { useActionState } from "react";
import { signUp, signIn, type AuthState } from "@/app/actions/auth";
import { ActionButton } from "@/components/action-button";

export function AuthForm({
  mode,
  role,
  cta,
}: {
  mode: "signup" | "signin";
  role?: "creator" | "brand";
  cta: string;
}) {
  const action = mode === "signup" ? signUp : signIn;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      {role && <input type="hidden" name="role" value={role} />}
      <div>
        <label
          htmlFor="email"
          className="block text-xs font-semibold uppercase tracking-wide text-ink-soft"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1.5 w-full rounded-card border border-line bg-surface px-3.5 py-3 outline-none transition-colors focus:border-brand"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-xs font-semibold uppercase tracking-wide text-ink-soft"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={mode === "signup" ? 8 : undefined}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          className="mt-1.5 w-full rounded-card border border-line bg-surface px-3.5 py-3 outline-none transition-colors focus:border-brand"
        />
        {mode === "signup" && (
          <p className="mt-1.5 text-xs text-ink-mute">
            At least 8 characters. There is no password reset in this build, so
            pick something you will remember.
          </p>
        )}
      </div>

      {state?.error && (
        <p className="rounded-card bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          {state.error}
        </p>
      )}

      <ActionButton type="submit" size="lg" pending={pending} pendingLabel="One moment…">
        {cta}
      </ActionButton>
    </form>
  );
}
