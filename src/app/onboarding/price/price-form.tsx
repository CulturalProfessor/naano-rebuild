"use client";

import { useState } from "react";
import { MarketplaceCard, type CardCreator } from "@/components/marketplace-card";
import { SubmitButton } from "@/components/action-button";
import { OnboardingPane } from "@/components/onboarding-pane";
import { savePrice } from "@/app/actions/onboarding";
import {
  formatEuros,
  compactNumber,
  priceIsCalibrated,
} from "@/lib/pricing";

/**
 * Step 4. The price is already filled in when the creator arrives: naano
 * computed it from follower count before they had an opinion. That is what
 * makes a card bookable the day it goes live. They can change it now or later.
 */
export function PriceForm({
  recommendedCents,
  base,
  avatarUrl,
  followerCount,
}: {
  recommendedCents: number;
  base: CardCreator;
  avatarUrl: string | null;
  followerCount: number;
}) {
  const [price, setPrice] = useState(recommendedCents / 100);
  const [bundleOpen, setBundleOpen] = useState(false);
  const [count, setCount] = useState(5);
  const [total, setTotal] = useState(Math.round((recommendedCents * 5 * 0.85) / 100));

  const savings = Math.round(count * price - total);
  const perPost = count > 0 ? total / count : 0;

  return (
    <OnboardingPane
      step={4}
      title="Complete your creator card"
      backHref="/onboarding/card"
      backLabel="Edit my industries"
      preview={
        <MarketplaceCard
          creator={{
            ...base,
            pricePerPostCents: Math.round(price * 100),
            bundle: bundleOpen
              ? { postCount: count, totalPriceCents: Math.round(total * 100) }
              : null,
          }}
        />
      }
    >
      <div className="mb-6 flex items-center gap-3">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <div className="h-12 w-12 rounded-full bg-surface-3" />
        )}
        <div>
          <p>
            <strong>{compactNumber(followerCount)}</strong>{" "}
            <span className="text-ink-soft">followers</span>
          </p>
          <p className="text-sm text-ink-soft">{base.industries.join(" · ")}</p>
        </div>
      </div>

      <form action={savePrice} className="space-y-6">
      <div className="rounded-panel border border-line bg-surface p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand">
          Our recommendation
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Naano recommends this starting price from the public audience and
          performance information currently available. You can change it now or
          later.
        </p>

        <div className="mt-5 flex items-center justify-center gap-2 rounded-card bg-surface-3 py-6">
          <span className="font-display text-3xl text-ink-soft">€</span>
          <input
            name="pricePerPost"
            type="number"
            min={1}
            // step must stay 1. Derived prices land on multiples of 5, and a
            // step of 5 against min=1 makes the valid set 1, 6, 11, ... which
            // the browser then rejects for every single derived price.
            step={1}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="w-40 bg-transparent text-center font-display text-5xl font-semibold tracking-tight outline-none"
          />
          <span className="self-end pb-2 text-ink-soft">/ post</span>
        </div>

        <p className="mt-4 text-xs text-ink-soft">
          This is your net price per post. You can change it at any time from
          your naano profile.
        </p>

        {!priceIsCalibrated(followerCount) && (
          <p className="mt-3 rounded-card bg-surface-3 p-3 text-left text-xs text-ink-soft">
            Your audience is well above the range this recommendation was built
            for, so treat the number as arithmetic rather than advice. Set a
            price you would actually accept.
          </p>
        )}
      </div>

      {!bundleOpen ? (
        <button
          type="button"
          onClick={() => setBundleOpen(true)}
          className="w-full rounded-card border border-line bg-surface px-4 py-3 font-medium text-ink transition-colors hover:border-ink-mute"
        >
          Add a bundle (optional)
        </button>
      ) : (
        <div className="rounded-panel border border-line bg-surface p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium">Your bundle offer (optional)</p>
              <p className="mt-1 text-sm text-ink-soft">
                Optionally set the total price paid for several posts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBundleOpen(false)}
              className="text-sm text-ink-soft hover:text-ink"
            >
              Remove
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Number of posts
              </span>
              <input
                name="bundlePostCount"
                type="number"
                min={2}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="mt-1.5 w-full rounded-card border border-line px-3 py-2.5 outline-none focus:border-brand"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Total net price
              </span>
              <input
                name="bundleTotal"
                type="number"
                min={1}
                value={total}
                onChange={(e) => setTotal(Number(e.target.value))}
                className="mt-1.5 w-full rounded-card border border-line px-3 py-2.5 outline-none focus:border-brand"
              />
            </label>
          </div>

          <p className="mt-3 text-xs text-ink-soft">
            {formatEuros(Math.round(perPost * 100))}/post ·{" "}
            {savings > 0 ? (
              <>brand saves {formatEuros(savings * 100)}</>
            ) : (
              <span className="text-danger">
                this costs the brand more than booking {count} single posts
              </span>
            )}
          </p>
        </div>
      )}

      <SubmitButton size="lg" pendingLabel="Building your card…">
        {bundleOpen
          ? "Confirm my offer and create my profile"
          : "Create my marketplace profile"}
      </SubmitButton>
      </form>
    </OnboardingPane>
  );
}
