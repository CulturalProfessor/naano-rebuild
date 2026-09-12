"use client";

import { useActionState } from "react";
import { submitLead, type LeadState } from "@/app/actions/leads";
import { ActionButton } from "@/components/action-button";

/** The one place a stranger turns a click into something a brand can act on. */
export function LeadForm({ code }: { code: string }) {
  const [state, action, pending] = useActionState<LeadState, FormData>(
    submitLead,
    null,
  );

  if (state?.ok) {
    return (
      <div className="rounded-panel border border-success-soft bg-success-soft px-5 py-6 text-center">
        <p className="font-display text-lg font-semibold tracking-tight">
          {state.ok}
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          This lead is now attributed to the creator whose post you came from.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="code" value={code} />
      <div>
        <label
          htmlFor="lead-email"
          className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft"
        >
          Work email
        </label>
        <input
          id="lead-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          className="mt-1.5 w-full rounded-card border border-line bg-surface px-3 py-2.5 outline-none focus:border-brand"
        />
      </div>
      <div>
        <label
          htmlFor="lead-company"
          className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft"
        >
          Company (optional)
        </label>
        <input
          id="lead-company"
          name="company"
          autoComplete="organization"
          className="mt-1.5 w-full rounded-card border border-line bg-surface px-3 py-2.5 outline-none focus:border-brand"
        />
      </div>

      {state?.error && (
        <p className="rounded-card bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <ActionButton size="lg" pending={pending} pendingLabel="Sending…">
        Request a walkthrough
      </ActionButton>
      <p className="text-xs text-ink-soft">
        Your email goes to this brand and to nobody else. There is no mailing
        list in this build and no email is ever sent.
      </p>
    </form>
  );
}
