"use client";

import { useActionState } from "react";
import { setCampaignStatus } from "@/app/actions/campaigns";
import type { ActionState } from "@/app/actions/offers";
import { ActionButton } from "@/components/action-button";

/**
 * Open or closed, and nothing else.
 *
 * There is no delete here on purpose: a campaign is the parent of offers,
 * bookings, clicks, leads and ledger rows, so removing one would either orphan
 * a paid booking or quietly delete a creator's earnings.
 */
export function CampaignStatusForm({
  campaignId,
  status,
  bookingCount,
}: {
  campaignId: string;
  status: string;
  bookingCount: number;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    setCampaignStatus,
    null,
  );
  const closing = status === "open";

  return (
    <form action={action}>
      <input type="hidden" name="campaignId" value={campaignId} />
      <input type="hidden" name="status" value={closing ? "closed" : "open"} />
      {state && (
        <p
          className={`mb-3 rounded-card px-4 py-3 text-sm ${
            state.error ? "bg-danger-soft text-danger" : "bg-success-soft text-ink"
          }`}
        >
          {state.error ?? state.ok}
        </p>
      )}
      <ActionButton
        variant="secondary"
        pending={pending}
        pendingLabel={closing ? "Closing…" : "Reopening…"}
      >
        {closing ? "Close this campaign" : "Reopen this campaign"}
      </ActionButton>
      <p className="mt-2 text-xs text-ink-soft">
        {closing
          ? `Closing hides it from Opportunities and stops new offers. ${
              bookingCount > 0
                ? `The ${bookingCount} booking${bookingCount === 1 ? "" : "s"} already agreed carry on, and so do the payouts.`
                : "Nothing is booked against it yet."
            }`
          : "Reopening puts it back in front of creators."}
      </p>
      <p className="mt-2 text-xs text-ink-mute">
        There is no delete. A campaign owns offers, bookings, clicks, leads and
        ledger rows, and removing it would quietly take a creator&apos;s
        earnings with it.
      </p>
    </form>
  );
}
