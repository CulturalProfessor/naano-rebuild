"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { sendOffer, type ActionState } from "@/app/actions/offers";
import {
  DISCOUNT_STEPS,
  MAX_DISCOUNT_PCT,
  OFFER_WINDOW_HOURS,
  discountedCents,
  discountPctOf,
  formatEuros,
} from "@/lib/pricing";

/**
 * "Your selection" and "Make an offer", the two brand modals from the recon.
 *
 * Everything a booking needs is decided here: price, deadline, brief, campaign
 * and an expiry clock. That density is the point — it is the reason a brand can
 * book a creator without a call, and it is why this is the screen most worth
 * getting right on the brand side.
 *
 * The approval checkbox from the recon is deliberately absent. The content
 * approval loop is cut in this build, and a checkbox that does nothing would be
 * worse than a missing one. See docs/PLAN.md section 3.
 */

export type OfferCreator = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  headline: string | null;
  pricePerPostCents: number;
  autoRespond: boolean;
  bundle?: { postCount: number; totalPriceCents: number } | null;
};

export type OfferCampaign = {
  id: string;
  name: string;
  budgetCapCents: number | null;
};

type Stage = "selection" | "offer";
type Choice = (typeof DISCOUNT_STEPS)[number] | "other" | "list";

export function OfferModal({
  creator,
  campaigns,
  defaultPostBy,
  today,
  trigger,
}: {
  creator: OfferCreator;
  campaigns: OfferCampaign[];
  /** yyyy-mm-dd, 14 days out. Computed on the server so SSR and the client agree. */
  defaultPostBy: string;
  /** yyyy-mm-dd today, for the "n days from now" badge. */
  today: string;
  trigger: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [stage, setStage] = useState<Stage>("selection");
  const [state, formAction, submitting] = useActionState<ActionState, FormData>(
    sendOffer,
    null,
  );

  const list = creator.pricePerPostCents;
  const [choice, setChoice] = useState<Choice>(20);
  const [price, setPrice] = useState(() => euros(discountedCents(list, 20)));
  const [postBy, setPostBy] = useState(defaultPostBy);
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");

  // A native dialog gives the focus trap and the Escape key for free, which is
  // the whole reason not to hand-roll an overlay. It also owns its own open
  // state, so there is none to mirror in React.
  const open = () => {
    setStage("selection");
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  // The offer landed. Close so the brand reads the confirmation on the page
  // behind rather than inside a modal that is about to vanish.
  useEffect(() => {
    if (state?.ok) dialogRef.current?.close();
  }, [state]);

  const offerCents = Math.round((Number(price) || 0) * 100);
  const pct = discountPctOf(list, offerCents);
  const floorCents = discountedCents(list, MAX_DISCOUNT_PCT);
  const outOfBand = offerCents < floorCents || offerCents > list;
  const daysOut = Math.round(
    (new Date(`${postBy}T12:00:00`).getTime() -
      new Date(`${today}T12:00:00`).getTime()) /
      86_400_000,
  );
  const campaign = campaigns.find((c) => c.id === campaignId) ?? null;
  const overCap =
    campaign?.budgetCapCents != null && offerCents > campaign.budgetCapCents;

  function pick(next: Choice) {
    setChoice(next);
    if (next === "list") setPrice(euros(list));
    else if (next !== "other") setPrice(euros(discountedCents(list, next)));
  }

  return (
    <>
      <span onClick={open}>{trigger}</span>

      {state?.ok && (
        <p className="mt-3 rounded-card bg-success-soft px-4 py-3 text-sm text-ink">
          {state.ok} It sits in their inbox with a {OFFER_WINDOW_HOURS}-hour clock.
        </p>
      )}

      {/* Tailwind's reset zeroes the margin a native dialog centres itself
          with, so m-auto puts it back. */}
      <dialog
        ref={dialogRef}
        className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-panel bg-surface p-0 text-ink shadow-[var(--shadow-float)] backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
      >
        {stage === "selection" ? (
          <Selection
            creator={creator}
            onNegotiate={() => {
              pick(20);
              setStage("offer");
            }}
            onBookAtList={() => {
              pick("list");
              setStage("offer");
            }}
            onClose={close}
          />
        ) : (
          <form action={formAction} className="max-h-[85vh] overflow-y-auto">
            <input type="hidden" name="creatorId" value={creator.id} />

            <header className="flex items-center gap-3 border-b border-line px-6 py-5">
              <Avatar creator={creator} />
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-display text-lg font-semibold tracking-tight">
                  {creator.displayName} · Single post
                </h2>
                <p className="text-sm text-ink-soft">
                  Current price: {formatEuros(list)} per post
                </p>
              </div>
              <CloseButton onClick={close} />
            </header>

            <div className="space-y-6 px-6 py-5">
              <fieldset>
                <Legend>Choose a discount</Legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {DISCOUNT_STEPS.map((step) => (
                    <Tile
                      key={step}
                      selected={choice === step}
                      onClick={() => pick(step)}
                      title={formatEuros(discountedCents(list, step))}
                      subtitle={`${step}% discount`}
                    />
                  ))}
                  <Tile
                    selected={choice === "other"}
                    onClick={() => pick("other")}
                    title="Other"
                    subtitle="Enter a price"
                  />
                </div>
              </fieldset>

              <div>
                <Legend>Your offer</Legend>
                <div className="mt-2 flex items-center gap-2 rounded-card border border-line bg-surface-2 px-3 py-2 focus-within:border-brand">
                  <span className="text-ink-soft">€</span>
                  <input
                    name="offerPrice"
                    type="number"
                    // step="any" on purpose: a stepped input makes the browser's
                    // valid set an arithmetic sequence and rejects every price
                    // the 13c-per-follower rule actually produces.
                    step="any"
                    min={0}
                    value={price}
                    onChange={(e) => {
                      setPrice(e.target.value);
                      setChoice("other");
                    }}
                    className="w-full bg-transparent font-display text-lg font-semibold tracking-tight outline-none"
                  />
                </div>
                <Helper tone={outOfBand ? "warn" : "plain"}>
                  {outOfBand
                    ? `Offers run from ${formatEuros(floorCents)} to ${formatEuros(list)}, the listed price down to ${MAX_DISCOUNT_PCT}% off.`
                    : pct > 0
                      ? `The creator will see a ${pct}% discount request.`
                      : "The creator will see an offer at their listed price."}
                </Helper>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Legend>Post by</Legend>
                  <span className="rounded-pill bg-brand-soft px-2.5 py-1 text-[11px] font-medium text-brand-strong">
                    {daysOut} days from now
                  </span>
                </div>
                <input
                  name="postBy"
                  type="date"
                  value={postBy}
                  min={today}
                  onChange={(e) => setPostBy(e.target.value)}
                  className="mt-2 w-full rounded-card border border-line bg-surface-2 px-3 py-2 outline-none focus:border-brand"
                />
                <Helper>
                  Latest date the creator must publish the post. Defaults to 14 days.
                </Helper>
              </div>

              <fieldset>
                <Legend>How should the creator work?</Legend>
                <div className="mt-2">
                  <Tile
                    selected
                    onClick={() => {}}
                    title="Specific brief"
                    subtitle="Use detailed instructions from one of your campaign briefs."
                    wide
                  />
                </div>
              </fieldset>

              <div>
                <Legend>Campaign</Legend>
                <select
                  name="campaignId"
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  className="mt-2 w-full rounded-card border border-line bg-surface-2 px-3 py-2 outline-none focus:border-brand"
                >
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {overCap && campaign?.budgetCapCents != null && (
                  <Helper tone="warn">
                    Over this campaign&apos;s {formatEuros(campaign.budgetCapCents)} cap.
                    You can still send it.
                  </Helper>
                )}
              </div>

              <div>
                <Legend>Note (optional)</Legend>
                <textarea
                  name="note"
                  rows={2}
                  placeholder="One line on the angle you have in mind."
                  className="mt-2 w-full resize-none rounded-card border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </div>

              <p className="rounded-card bg-brand-soft px-4 py-3 text-sm text-ink">
                <strong className="font-semibold">
                  The creator receives the offer immediately and can accept or
                  decline it within {OFFER_WINDOW_HOURS} hours.
                </strong>
                {creator.autoRespond && (
                  <span className="mt-1 block text-ink-soft">
                    This is a demo creator and answers automatically.
                  </span>
                )}
              </p>

              {state?.error && (
                <p className="rounded-card bg-danger-soft px-4 py-3 text-sm text-danger">
                  {state.error}
                </p>
              )}
            </div>

            <footer className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-line bg-surface px-6 py-4">
              <button
                type="button"
                onClick={() => setStage("selection")}
                className="text-sm text-ink-soft hover:text-ink"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting || outOfBand || !campaignId}
                className="rounded-card bg-brand px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-strong disabled:cursor-not-allowed disabled:bg-ink-mute"
              >
                {submitting
                  ? "Sending…"
                  : `Send offer · ${formatEuros(offerCents || 0)}`}
              </button>
            </footer>
          </form>
        )}
      </dialog>
    </>
  );
}

/** B3. One tile per bookable option, and the two ways out of it. */
function Selection({
  creator,
  onNegotiate,
  onBookAtList,
  onClose,
}: {
  creator: OfferCreator;
  onNegotiate: () => void;
  onBookAtList: () => void;
  onClose: () => void;
}) {
  return (
    <div>
      <header className="flex items-center gap-3 border-b border-line px-6 py-5">
        <Avatar creator={creator} />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Your selection
          </h2>
          <p className="truncate text-sm text-ink-soft">{creator.displayName}</p>
        </div>
        <CloseButton onClick={onClose} />
      </header>

      <div className="space-y-3 px-6 py-5">
        <div className="rounded-card border-2 border-brand bg-brand-soft/40 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-brand">
            Creator rate
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-display text-lg font-semibold tracking-tight">
              Single post
            </span>
            <span className="font-display text-xl font-semibold tracking-tight">
              {formatEuros(creator.pricePerPostCents)}
            </span>
          </div>
          <p className="text-sm text-ink-soft">Standard rate</p>
        </div>

        {creator.bundle && (
          <div className="rounded-card border border-dashed border-line px-4 py-3 opacity-70">
            <div className="flex items-baseline justify-between">
              <span className="font-display text-lg font-semibold tracking-tight">
                {creator.bundle.postCount}-post bundle
              </span>
              <span className="font-display text-lg font-semibold tracking-tight">
                {formatEuros(creator.bundle.totalPriceCents)}
              </span>
            </div>
            {/* Bundles are listed and priced but not bookable as one contract in
                this build: a multi-post booking multiplies every state in the
                machine by n. Saying so beats a tile that does nothing. */}
            <p className="text-sm text-ink-soft">
              Bundle booking is not wired in this build.
            </p>
          </div>
        )}

        <p className="text-sm text-ink-soft">
          Book this option at the listed price, or propose a lower price.
        </p>
      </div>

      <footer className="flex items-center justify-end gap-3 border-t border-line px-6 py-4">
        <button
          type="button"
          onClick={onNegotiate}
          className="rounded-card border border-line px-4 py-2.5 text-sm font-medium hover:border-ink-mute"
        >
          ↔ Negotiate
        </button>
        <button
          type="button"
          onClick={onBookAtList}
          className="rounded-card bg-brand px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-strong"
        >
          Book · {formatEuros(creator.pricePerPostCents)}
        </button>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------- small parts

function euros(cents: number) {
  return String(Math.round(cents) / 100);
}

function Legend({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
      {children}
    </span>
  );
}

function Helper({
  children,
  tone = "plain",
}: {
  children: React.ReactNode;
  tone?: "plain" | "warn";
}) {
  return (
    <p className={`mt-1.5 text-xs ${tone === "warn" ? "text-danger" : "text-ink-soft"}`}>
      {children}
    </p>
  );
}

function Tile({
  selected,
  onClick,
  title,
  subtitle,
  wide = false,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-card border px-3 py-2.5 text-left transition-colors ${
        selected
          ? "border-brand bg-brand-soft/50"
          : "border-line bg-surface hover:border-ink-mute"
      } ${wide ? "w-full" : ""}`}
    >
      <div className="font-display text-sm font-semibold tracking-tight">{title}</div>
      <div className="text-xs text-ink-soft">{subtitle}</div>
    </button>
  );
}

function Avatar({ creator }: { creator: OfferCreator }) {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-3 font-display text-sm font-semibold text-ink-mute">
      {creator.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={creator.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        creator.displayName.slice(0, 1)
      )}
    </span>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className="shrink-0 rounded-full p-1.5 text-ink-soft hover:bg-surface-3 hover:text-ink"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
        <path
          d="M5 5l10 10M15 5L5 15"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
