"use client";

import { useActionState } from "react";
import { sendMessage } from "@/app/actions/messages";
import type { ActionState } from "@/app/actions/offers";
import { ActionButton } from "@/components/action-button";

export type ThreadMessage = {
  id: string;
  body: string;
  senderRole: "brand" | "creator";
  /** Formatted on the server. Formatting a date here hydrates differently in
   *  any browser whose locale or time zone is not the server's. */
  at: string;
};

/**
 * One conversation.
 *
 * Deliberately not a chat app: no typing indicator, no delivery receipt, no
 * polling. Messages land on the next render, which for a product where the
 * other side answers in hours is the honest shape. Claiming realtime with a
 * five-second poll would be the same lie as an estimated impression count.
 */
export function MessageThread({
  bookingId,
  viewerRole,
  counterpartName,
  messages,
  emptyHint,
}: {
  bookingId: string;
  viewerRole: "brand" | "creator";
  counterpartName: string;
  messages: ThreadMessage[];
  emptyHint?: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    sendMessage,
    null,
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-soft">
            {emptyHint ??
              `Nothing yet. Anything you send here goes to ${counterpartName} and to nobody else.`}
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.senderRole === viewerRole;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div className="max-w-[min(32rem,85%)]">
                  <div
                    className={`whitespace-pre-wrap rounded-panel px-4 py-2.5 text-sm ${
                      mine
                        ? "bg-brand text-white"
                        : "border border-line bg-surface text-ink"
                    }`}
                  >
                    {m.body}
                  </div>
                  <p
                    className={`mt-1 text-[11px] text-ink-mute ${
                      mine ? "text-right" : ""
                    }`}
                  >
                    {mine ? "You" : counterpartName} · {m.at}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form action={action} className="border-t border-line bg-surface-2 p-4">
        <input type="hidden" name="bookingId" value={bookingId} />
        {state?.error && (
          <p className="mb-2 rounded-card bg-danger-soft px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            name="body"
            rows={2}
            required
            maxLength={2000}
            placeholder={`Write to ${counterpartName}…`}
            className="min-w-0 flex-1 resize-none rounded-card border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <ActionButton pending={pending} pendingLabel="Sending…">
            Send
          </ActionButton>
        </div>
      </form>
    </div>
  );
}
