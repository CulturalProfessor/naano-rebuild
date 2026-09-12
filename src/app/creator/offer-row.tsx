"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  acceptOffer,
  declineOffer,
  counterOffer,
  type ActionState,
} from "@/app/actions/offers";
import { Countdown } from "@/components/countdown";
import { formatEuros } from "@/lib/pricing";

/**
 * One offer in the creator's inbox.
 *
 * The three answers a creator has are all here, on the row, rather than behind
 * a detail page: accept, counter, decline. An offer is a decision with a clock
 * on it, and putting the decision one click from the countdown is the point.
 */

export type InboxOffer = {
  id: string;
  listPriceCents: number;
  offerPriceCents: number;
  counterPriceCents: number | null;
  discountPct: number;
  postBy: string;
  expiresAt: string;
  expiresLabel: string;
  status: string;
  note: string | null;
  brandName: string;
  brandAutoRespond: boolean;
  campaignName: string;
  briefProduct: string;
  briefAudience: string;
  briefGuardrail: string;
  bookingId: string | null;
};

export function OfferRow({
  offer,
  serverNow,
}: {
  offer: InboxOffer;
  serverNow: number;
}) {
  const [accept, acceptAction, accepting] = useActionState<ActionState, FormData>(
    acceptOffer,
    null,
  );
  const [decline, declineAction, declining] = useActionState<ActionState, FormData>(
    declineOffer,
    null,
  );
  const [counter, counterAction, countering] = useActionState<ActionState, FormData>(
    counterOffer,
    null,
  );
  const [panel, setPanel] = useState<"none" | "counter" | "decline">("none");
  const [brief, setBrief] = useState(false);

  const error = accept?.error ?? decline?.error ?? counter?.error;
  const busy = accepting || declining || countering;
  const live = offer.status === "offered" && new Date(offer.expiresAt) > new Date();

  return (
    <article className="rounded-panel border border-line bg-surface shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-semibold tracking-tight">
              {offer.brandName}
            </h3>
            {offer.brandAutoRespond && (
              // Labelled on the row itself, not in a footnote. An unlabelled
              // auto-responder would be a lie about liquidity.
              <span className="rounded-pill bg-surface-3 px-2 py-0.5 text-[11px] text-ink-soft">
                Demo brand · responds automatically
              </span>
            )}
          </div>
          <p className="text-sm text-ink-soft">{offer.campaignName} · Single post</p>
        </div>

        <div className="text-right">
          <div className="font-display text-2xl font-semibold tracking-tight">
            {formatEuros(offer.offerPriceCents)}
          </div>
          {offer.discountPct > 0 && (
            <p className="text-xs text-ink-soft">
              <span className="line-through">{formatEuros(offer.listPriceCents)}</span>{" "}
              listed · {offer.discountPct}% off
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
        <Field label="Post by">{offer.postBy}</Field>
        <Field label={live ? "Answer within" : "Status"}>
          {live ? (
            <Countdown
              expiresAt={offer.expiresAt}
              serverNow={serverNow}
              expiresLabel={offer.expiresLabel}
            />
          ) : (
            <StatusLabel status={offer.status} />
          )}
        </Field>
      </div>

      {offer.note && (
        <p className="mx-5 mb-4 rounded-card bg-surface-3 px-4 py-3 text-sm text-ink-soft">
          “{offer.note}”
        </p>
      )}

      <div className="px-5 pb-4">
        <button
          type="button"
          onClick={() => setBrief((b) => !b)}
          className="text-sm font-medium text-brand hover:text-brand-strong"
        >
          {brief ? "Hide the brief" : "View the brief"}
        </button>
        {brief && (
          <div className="mt-3 space-y-3 rounded-card border border-line bg-surface-2 p-4 text-sm">
            <Brief label="Product">{offer.briefProduct}</Brief>
            <Brief label="Audience">{offer.briefAudience}</Brief>
            <p className="rounded-card bg-brand-soft px-3 py-2 text-ink">
              {offer.briefGuardrail}
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="mx-5 mb-4 rounded-card bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {live && panel === "none" && (
        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={() => setPanel("decline")}
            className="rounded-card px-3 py-2.5 text-sm text-ink-soft hover:text-ink"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => setPanel("counter")}
            className="rounded-card border border-line px-4 py-2.5 text-sm font-medium hover:border-ink-mute"
          >
            ↔ Counter
          </button>
          <form action={acceptAction}>
            <input type="hidden" name="offerId" value={offer.id} />
            <button
              type="submit"
              disabled={busy}
              className="rounded-card bg-brand px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-strong disabled:bg-ink-mute"
            >
              {accepting ? "Accepting…" : `Accept · ${formatEuros(offer.offerPriceCents)}`}
            </button>
          </form>
        </footer>
      )}

      {live && panel === "counter" && (
        <form action={counterAction} className="border-t border-line px-5 py-4">
          <input type="hidden" name="offerId" value={offer.id} />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
            Counter with your own price
          </p>
          <div className="mt-2 flex items-center gap-2 rounded-card border border-line bg-surface-2 px-3 py-2">
            <span className="text-ink-soft">€</span>
            <input
              name="counterPrice"
              type="number"
              step="any"
              defaultValue={
                Math.round((offer.offerPriceCents + offer.listPriceCents) / 2) / 100
              }
              className="w-full bg-transparent font-display text-lg font-semibold outline-none"
            />
          </div>
          <p className="mt-1.5 text-xs text-ink-soft">
            Above {formatEuros(offer.offerPriceCents)} and no more than your listed{" "}
            {formatEuros(offer.listPriceCents)}. The 48-hour clock keeps running.
          </p>
          <input
            name="note"
            placeholder="One line on why (optional)"
            className="mt-3 w-full rounded-card border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPanel("none")}
              className="px-3 py-2.5 text-sm text-ink-soft hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-card bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-strong disabled:bg-ink-mute"
            >
              {countering ? "Sending…" : "Send counter"}
            </button>
          </div>
        </form>
      )}

      {live && panel === "decline" && (
        <form action={declineAction} className="border-t border-line px-5 py-4">
          <input type="hidden" name="offerId" value={offer.id} />
          <p className="text-sm">
            Decline {offer.brandName}&apos;s offer? They can send another one.
          </p>
          <input
            name="note"
            placeholder="Reason (optional, the brand sees it)"
            className="mt-3 w-full rounded-card border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPanel("none")}
              className="px-3 py-2.5 text-sm text-ink-soft hover:text-ink"
            >
              Keep it
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-card border border-danger px-4 py-2.5 text-sm font-medium text-danger hover:bg-danger-soft disabled:opacity-50"
            >
              {declining ? "Declining…" : "Decline"}
            </button>
          </div>
        </form>
      )}

      {offer.bookingId && (
        <footer className="border-t border-line px-5 py-4">
          <Link
            href={`/creator/bookings/${offer.bookingId}`}
            className="text-sm font-medium text-brand hover:text-brand-strong"
          >
            Open the booking →
          </Link>
        </footer>
      )}
    </article>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
        {label}
      </p>
      <p className="mt-0.5 font-display text-base font-semibold tracking-tight">
        {children}
      </p>
    </div>
  );
}

function Brief({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
        {label}
      </p>
      <p className="mt-0.5 text-ink">{children}</p>
    </div>
  );
}

function StatusLabel({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    accepted: { label: "Accepted", className: "text-success" },
    declined: { label: "Declined", className: "text-ink-mute" },
    expired: { label: "Expired", className: "text-ink-mute" },
    countered: { label: "Waiting on the brand", className: "text-ink" },
    offered: { label: "Expired", className: "text-ink-mute" },
  };
  const s = map[status] ?? { label: status, className: "text-ink" };
  return <span className={s.className}>{s.label}</span>;
}
