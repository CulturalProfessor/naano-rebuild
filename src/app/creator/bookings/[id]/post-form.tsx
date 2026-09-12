"use client";

import { useActionState } from "react";
import { submitPost, reportViews } from "@/app/actions/bookings";
import type { ActionState } from "@/app/actions/offers";

/**
 * The creator publishes, then tells us where. Two separate writes, because the
 * post URL is what starts the tracking and the view count is a number the
 * creator reads off LinkedIn afterwards and may well come back to update.
 */
export function PostForm({
  bookingId,
  postUrl,
  views,
}: {
  bookingId: string;
  postUrl: string | null;
  views: number | null;
}) {
  const [urlState, urlAction, savingUrl] = useActionState<ActionState, FormData>(
    submitPost,
    null,
  );
  const [viewState, viewAction, savingViews] = useActionState<ActionState, FormData>(
    reportViews,
    null,
  );

  return (
    <div className="space-y-5">
      <form action={urlAction}>
        <input type="hidden" name="bookingId" value={bookingId} />
        <label className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
          Public post URL
        </label>
        <div className="mt-1.5 flex flex-wrap gap-2">
          <input
            name="postUrl"
            defaultValue={postUrl ?? ""}
            placeholder="https://www.linkedin.com/posts/…"
            className="min-w-0 flex-1 rounded-card border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <button
            disabled={savingUrl}
            className="rounded-card bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-strong disabled:bg-ink-mute"
          >
            {savingUrl ? "Saving…" : postUrl ? "Update" : "Mark as posted"}
          </button>
        </div>
        <Feedback state={urlState} />
      </form>

      {postUrl && (
        <form action={viewAction}>
          <input type="hidden" name="bookingId" value={bookingId} />
          <label className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
            Views, self-reported
          </label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <input
              name="views"
              type="number"
              min={0}
              step={1}
              defaultValue={views ?? ""}
              placeholder="The number LinkedIn shows you"
              className="min-w-0 flex-1 rounded-card border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <button
              disabled={savingViews}
              className="rounded-card border border-line px-4 py-2.5 text-sm font-medium hover:border-ink-mute disabled:opacity-50"
            >
              {savingViews ? "Saving…" : "Save"}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-ink-soft">
            naano does not read LinkedIn. This is your number, and it is labelled
            as yours everywhere the brand sees it. Clicks and leads below are
            ours.
          </p>
          <Feedback state={viewState} />
        </form>
      )}
    </div>
  );
}

function Feedback({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
    <p
      className={`mt-2 rounded-card px-3 py-2 text-sm ${
        state.error ? "bg-danger-soft text-danger" : "bg-success-soft text-ink"
      }`}
    >
      {state.error ?? state.ok}
    </p>
  );
}
