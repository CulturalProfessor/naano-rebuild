"use client";

import { useActionState } from "react";
import { respondToApplication } from "@/app/actions/applications";
import type { ActionState } from "@/app/actions/offers";
import { formatEuros } from "@/lib/pricing";

/** Accepting an application books at the creator's listed price. There was no
 *  negotiation, so there is nothing to have negotiated down from. */
export function ApplicationActions({
  applicationId,
  listPriceCents,
}: {
  applicationId: string;
  listPriceCents: number;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    respondToApplication,
    null,
  );

  return (
    <div className="border-t border-line px-5 py-4">
      {state && (
        <p
          className={`mb-3 rounded-card px-3 py-2 text-sm ${
            state.error ? "bg-danger-soft text-danger" : "bg-success-soft text-ink"
          }`}
        >
          {state.error ?? state.ok}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <form action={action}>
          <input type="hidden" name="applicationId" value={applicationId} />
          <input type="hidden" name="decision" value="reject" />
          <button
            disabled={pending}
            className="rounded-card px-3 py-2.5 text-sm text-ink-soft hover:text-ink disabled:opacity-50"
          >
            Decline
          </button>
        </form>
        <form action={action}>
          <input type="hidden" name="applicationId" value={applicationId} />
          <input type="hidden" name="decision" value="accept" />
          <button
            disabled={pending}
            className="rounded-card bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-strong disabled:bg-ink-mute"
          >
            {pending ? "Booking…" : `Book · ${formatEuros(listPriceCents)}`}
          </button>
        </form>
      </div>
    </div>
  );
}
