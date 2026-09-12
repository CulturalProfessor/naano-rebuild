"use client";

import { useActionState, useState } from "react";
import { topUpWallet } from "@/app/actions/money";
import type { ActionState } from "@/app/actions/offers";
import { ActionButton } from "@/components/action-button";

const PRESETS = [2500, 10000] as const;

/** Two common amounts and a free field. Play money, labelled as such. */
export function TopUpForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    topUpWallet,
    null,
  );
  const [amount, setAmount] = useState("2500");

  return (
    <form action={action} className="mt-6 space-y-3">
      {state && (
        <p
          className={`rounded-card px-4 py-3 text-sm ${
            state.error ? "bg-danger-soft text-danger" : "bg-success-soft text-ink"
          }`}
        >
          {state.error ?? state.ok}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-card border border-line bg-surface px-3 py-2">
          <span className="text-ink-soft">€</span>
          <input
            name="amount"
            type="number"
            min={1}
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-28 bg-transparent font-display text-lg font-semibold outline-none"
          />
        </div>
        <ActionButton pending={pending} pendingLabel="Adding…">
          Add budget
        </ActionButton>
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setAmount(String(p))}
            className="rounded-card border border-line bg-surface px-3.5 py-2 text-sm text-ink-soft transition-colors hover:border-ink-mute"
          >
            + €{p.toLocaleString("en-IE")}
          </button>
        ))}
      </div>
    </form>
  );
}
