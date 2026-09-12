"use client";

import { useActionState } from "react";
import { respondToCounter, type ActionState } from "@/app/actions/offers";
import { ActionButton } from "@/components/action-button";
import { formatEuros } from "@/lib/pricing";

/**
 * The brand's half of a counter. The creator moved the price inside their own
 * band; the brand takes it or leaves it. There is no third round, which is
 * deliberate: a marketplace that allows unlimited haggling is a DM thread.
 */
export function CounterActions({
  offerId,
  counterPriceCents,
  offerPriceCents,
}: {
  offerId: string;
  counterPriceCents: number;
  offerPriceCents: number;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    respondToCounter,
    null,
  );

  return (
    <div className="border-t border-line px-5 py-4">
      <p className="text-sm">
        Countered at{" "}
        <strong className="font-semibold">{formatEuros(counterPriceCents)}</strong>,
        up from your {formatEuros(offerPriceCents)}.
      </p>
      {state?.error && (
        <p className="mt-2 rounded-card bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <form action={action}>
          <input type="hidden" name="offerId" value={offerId} />
          <input type="hidden" name="decision" value="decline" />
          <ActionButton variant="quiet" size="sm" disabled={pending}>
            Decline
          </ActionButton>
        </form>
        <form action={action}>
          <input type="hidden" name="offerId" value={offerId} />
          <input type="hidden" name="decision" value="accept" />
          <ActionButton pending={pending} pendingLabel="Booking…">
            {`Accept · ${formatEuros(counterPriceCents)}`}
          </ActionButton>
        </form>
      </div>
    </div>
  );
}
