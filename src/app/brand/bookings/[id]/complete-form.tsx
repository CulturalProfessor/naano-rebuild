"use client";

import { useActionState } from "react";
import { completeBooking } from "@/app/actions/money";
import type { ActionState } from "@/app/actions/offers";
import { formatEuros } from "@/lib/pricing";

/**
 * Completion is the brand saying the work is done. It credits the creator and
 * schedules their payout, which is the last handoff in the machine.
 */
export function CompleteForm({
  bookingId,
  priceCents,
  creatorName,
}: {
  bookingId: string;
  priceCents: number;
  creatorName: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    completeBooking,
    null,
  );

  return (
    <form action={action}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <p className="text-sm text-ink-soft">
        Completing credits {creatorName} {formatEuros(priceCents)} and schedules
        their payout. The funds have been held against your wallet since they
        accepted.
      </p>
      {state && (
        <p
          className={`mt-3 rounded-card px-4 py-3 text-sm ${
            state.error ? "bg-danger-soft text-danger" : "bg-success-soft text-ink"
          }`}
        >
          {state.error ?? state.ok}
        </p>
      )}
      <button
        disabled={pending}
        className="mt-4 rounded-card bg-brand px-5 py-3 font-medium text-white transition-colors hover:bg-brand-strong disabled:bg-ink-mute"
      >
        {pending ? "Completing…" : "Complete the booking"}
      </button>
    </form>
  );
}
