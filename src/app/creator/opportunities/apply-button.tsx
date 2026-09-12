"use client";

import { useActionState, useState } from "react";
import { applyToCampaign } from "@/app/actions/applications";
import type { ActionState } from "@/app/actions/offers";

/** Apply, with one line of context. The note is the only thing a creator can
 *  say before a brand decides, so it is on the same screen as the decision. */
export function ApplyButton({
  campaignId,
  applied,
}: {
  campaignId: string;
  applied: string | null;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    applyToCampaign,
    null,
  );
  const [open, setOpen] = useState(false);

  if (applied) {
    return (
      <span className="rounded-card bg-surface-3 px-4 py-2.5 text-sm text-ink-soft">
        {applied === "pending"
          ? "Applied · waiting on the brand"
          : applied === "accepted"
            ? "Accepted · see your offers and bookings"
            : "Not selected"}
      </span>
    );
  }

  if (state?.ok) {
    return (
      <span className="rounded-card bg-success-soft px-4 py-2.5 text-sm">
        {state.ok}
      </span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-card bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-strong"
      >
        Apply
      </button>
    );
  }

  return (
    <form action={action} className="w-full space-y-2">
      <input type="hidden" name="campaignId" value={campaignId} />
      <input
        name="note"
        placeholder="The angle you would take (optional)"
        className="w-full rounded-card border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
      />
      {state?.error && (
        <p className="rounded-card bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-2.5 text-sm text-ink-soft hover:text-ink"
        >
          Cancel
        </button>
        <button
          disabled={pending}
          className="rounded-card bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-strong disabled:bg-ink-mute"
        >
          {pending ? "Applying…" : "Send application"}
        </button>
      </div>
    </form>
  );
}
