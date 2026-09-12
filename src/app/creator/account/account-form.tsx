"use client";

import { useActionState, useState } from "react";
import { saveCreatorAccount } from "@/app/actions/account";
import type { ActionState } from "@/app/actions/offers";
import { ActionButton } from "@/components/action-button";
import { MarketplaceCard, type CardCreator } from "@/components/marketplace-card";
import { INDUSTRIES, MAX_INDUSTRIES } from "@/lib/taxonomy";

/**
 * The card, editable, with the card itself on screen while you edit it.
 *
 * Same promise onboarding makes: every field you change shows up immediately
 * in the thing brands will see. The preview is the reason the form is worth
 * using rather than a list of inputs.
 */
export function CreatorAccountForm({
  base,
  derivedPriceEuros,
  initial,
}: {
  base: CardCreator;
  /** What the audience derives to, for the "back to our number" hint. */
  derivedPriceEuros: number;
  initial: {
    headline: string;
    industries: string[];
    priceEuros: string;
    live: boolean;
    bundleCount: string;
    bundleTotal: string;
  };
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveCreatorAccount,
    null,
  );

  const [headline, setHeadline] = useState(initial.headline);
  const [industries, setIndustries] = useState(initial.industries);
  const [price, setPrice] = useState(initial.priceEuros);
  const [live, setLive] = useState(initial.live);
  const [bundleCount, setBundleCount] = useState(initial.bundleCount);
  const [bundleTotal, setBundleTotal] = useState(initial.bundleTotal);

  const cents = Math.round((Number(price) || 0) * 100);
  const bundle =
    Number(bundleCount) >= 2 && Number(bundleTotal) > 0
      ? {
          postCount: Math.round(Number(bundleCount)),
          totalPriceCents: Math.round(Number(bundleTotal) * 100),
        }
      : null;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
      <form action={action} className="space-y-6">
        {industries.map((i) => (
          <input key={i} type="hidden" name="industries" value={i} />
        ))}
        <input type="hidden" name="cardStatus" value={live ? "live" : "draft"} />

        <Field
          label="Headline"
          hint="The line under your name on the card. It came from your profile and is yours to change."
        >
          <textarea
            name="headline"
            rows={2}
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className="w-full resize-y rounded-card border border-line bg-surface px-3.5 py-3 outline-none focus:border-brand"
          />
        </Field>

        <Field
          label={`Topics (${industries.length} of ${MAX_INDUSTRIES})`}
          hint="Brands filter on these, and the matcher weighs topic overlap heaviest."
        >
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map((i) => {
              const on = industries.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  aria-pressed={on}
                  // Functional update: two chips clicked inside one tick both
                  // read the render's array, and the second dropped the first.
                  onClick={() =>
                    setIndustries((prev) =>
                      prev.includes(i)
                        ? prev.filter((v) => v !== i)
                        : prev.length >= MAX_INDUSTRIES
                          ? prev
                          : [...prev, i],
                    )
                  }
                  className={`rounded-pill border px-3 py-1.5 text-xs transition-colors ${
                    on
                      ? "border-brand bg-brand-soft font-medium text-brand-strong"
                      : "border-line bg-surface text-ink-soft hover:border-ink-mute"
                  }`}
                >
                  {i}
                </button>
              );
            })}
          </div>
        </Field>

        <Field
          label="Price per post"
          hint={`We derived €${derivedPriceEuros} from your audience. Change it whenever you like; a brand can only negotiate 10, 20 or 30 percent off whatever is here.`}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-card border border-line bg-surface px-3.5 py-3">
              <span className="text-ink-soft">€</span>
              <input
                name="pricePerPost"
                type="number"
                min={1}
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-32 bg-transparent font-display text-lg font-semibold outline-none"
              />
            </div>
            {Number(price) !== derivedPriceEuros && (
              <button
                type="button"
                onClick={() => setPrice(String(derivedPriceEuros))}
                className="text-sm text-brand hover:text-brand-strong"
              >
                Back to €{derivedPriceEuros}
              </button>
            )}
          </div>
        </Field>

        <Field
          label="Bundle"
          hint="Optional. A multi-post price brands see as a pill on your card. Leave the count blank to remove it."
        >
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <input
              name="bundleCount"
              type="number"
              min={2}
              max={20}
              step={1}
              value={bundleCount}
              onChange={(e) => setBundleCount(e.target.value)}
              placeholder="5"
              className="w-20 rounded-card border border-line bg-surface px-3 py-2.5 outline-none focus:border-brand"
            />
            <span className="text-ink-soft">posts for</span>
            <div className="flex items-center gap-1.5 rounded-card border border-line bg-surface px-3 py-2.5">
              <span className="text-ink-soft">€</span>
              <input
                name="bundleTotal"
                type="number"
                min={0}
                step="any"
                value={bundleTotal}
                onChange={(e) => setBundleTotal(e.target.value)}
                placeholder="1340"
                className="w-28 bg-transparent outline-none"
              />
            </div>
          </div>
        </Field>

        <Field
          label="Marketplace listing"
          hint="Hiding your card takes it out of the grid and out of every shortlist. Bookings you already accepted are unaffected."
        >
          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={live}
              onChange={(e) => setLive(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-brand)]"
            />
            <span>
              {live
                ? "Live. Brands can find and book me."
                : "Hidden. My card is not in the marketplace."}
            </span>
          </label>
        </Field>

        {state && (
          <p
            className={`rounded-card px-4 py-3 text-sm ${
              state.error ? "bg-danger-soft text-danger" : "bg-success-soft text-ink"
            }`}
          >
            {state.error ?? state.ok}
          </p>
        )}

        <ActionButton className="px-5 py-3" pending={pending} pendingLabel="Saving…">
          Save my card
        </ActionButton>
      </form>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-brand">
          What brands see
        </p>
        <MarketplaceCard
          creator={{
            ...base,
            headline: headline || null,
            industries,
            pricePerPostCents: cents || null,
            bundle,
          }}
        />
        {!live && (
          <p className="mt-3 text-center text-xs text-ink-soft">
            Hidden from the grid while the listing is off.
          </p>
        )}
      </aside>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </p>
      {hint && <p className="mb-2 mt-0.5 text-xs text-ink-mute">{hint}</p>}
      <div className={hint ? "" : "mt-1.5"}>{children}</div>
    </div>
  );
}
