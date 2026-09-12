"use client";

import { useActionState } from "react";
import { withdrawEarnings } from "@/app/actions/money";
import type { ActionState } from "@/app/actions/offers";
import { formatEuros } from "@/lib/pricing";

/**
 * The one place the tax profile gates something.
 *
 * The recon is explicit: a registered professional activity is required to
 * invoice companies and withdraw, and equally explicit that it does not gate
 * being in the marketplace. So the card went live without this and the money
 * stops here, with the jurisdiction copy shown at the moment it applies rather
 * than during a signup where it would only be noise.
 */
export function WithdrawForm({
  availableCents,
  taxProfileComplete,
}: {
  availableCents: number;
  taxProfileComplete: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    withdrawEarnings,
    null,
  );

  if (availableCents <= 0) {
    return (
      <p className="text-sm text-ink-soft">
        Nothing is scheduled to pay out. A booking credits you when the brand
        completes it.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {!taxProfileComplete && (
        <div className="space-y-2 rounded-card border border-line bg-surface-2 p-4 text-sm">
          <p className="font-medium">Professional information</p>
          <p className="text-ink-soft">
            <strong className="font-semibold">France and the European Union:</strong>{" "}
            a registered professional activity is required to invoice companies
            and withdraw your earnings.
          </p>
          <p className="text-ink-soft">
            <strong className="font-semibold">
              United States and outside the European Union:
            </strong>{" "}
            a registered business is not mandatory. You can continue as an
            individual.
          </p>
          <label className="flex items-start gap-2 pt-1">
            <input
              type="checkbox"
              name="confirmTax"
              className="mt-0.5 h-4 w-4 accent-[var(--color-brand)]"
            />
            <span>
              I confirm my situation allows me to invoice and be paid. naano
              does not verify this in this build.
            </span>
          </label>
        </div>
      )}

      {state && (
        <p
          className={`rounded-card px-4 py-3 text-sm ${
            state.error ? "bg-danger-soft text-danger" : "bg-success-soft text-ink"
          }`}
        >
          {state.error ?? state.ok}
        </p>
      )}

      <button
        disabled={pending}
        className="rounded-card bg-brand px-5 py-3 font-medium text-white transition-colors hover:bg-brand-strong disabled:bg-ink-mute"
      >
        {pending ? "Paying out…" : `Withdraw ${formatEuros(availableCents)}`}
      </button>
    </form>
  );
}
