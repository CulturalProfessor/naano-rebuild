"use client";

import { useState } from "react";
import { MarketplaceCard, type CardCreator } from "@/components/marketplace-card";
import { OnboardingPane } from "@/components/onboarding-pane";
import { saveCardDetails } from "@/app/actions/onboarding";
import { compactNumber } from "@/lib/pricing";

/** Step 3. Country and up to three industries, with the card reacting to both. */
export function CardStep({
  base,
  industries,
  max,
  avatarUrl,
  followerCount,
}: {
  base: CardCreator;
  industries: readonly string[];
  max: number;
  avatarUrl: string | null;
  followerCount: number;
}) {
  const [picked, setPicked] = useState<string[]>(base.industries);
  const [country, setCountry] = useState(base.country);
  const full = picked.length >= max;

  function toggle(i: string) {
    setPicked((prev) =>
      prev.includes(i)
        ? prev.filter((x) => x !== i)
        : prev.length >= max
          ? prev
          : [...prev, i],
    );
  }

  return (
    <OnboardingPane
      step={3}
      title="Complete your creator card"
      backHref="/onboarding/profile"
      backLabel="Back"
      preview={
        <MarketplaceCard creator={{ ...base, industries: picked, country }} />
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
          <p className="text-sm text-ink-soft">{base.headline}</p>
        </div>
      </div>

      <form action={saveCardDetails} className="space-y-6">
        <div>
          <label htmlFor="country" className="block font-medium">
            Your country
          </label>
          <p className="mb-2 text-sm text-ink-soft">
            Confirm your country before continuing.
          </p>
          <input
            id="country"
            name="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            required
            className="w-full rounded-card border border-line bg-surface px-3.5 py-3 outline-none focus:border-brand"
          />
          <input type="hidden" name="countryCode" value={base.countryCode} />
        </div>

        <div>
          <p className="font-medium">
            Your industries{" "}
            <span className="font-normal text-ink-soft">(pick up to {max})</span>
          </p>
          <p className="mb-2 text-sm text-ink-soft">
            Choose up to {max} industries to help relevant brands find your card.
          </p>

          {picked.map((i) => (
            <input key={i} type="hidden" name="industries" value={i} />
          ))}

          <div className="max-h-56 overflow-y-auto rounded-card border border-line bg-surface p-3">
            <div className="flex flex-wrap gap-2">
              {industries.map((i) => {
                const on = picked.includes(i);
                const dim = full && !on;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggle(i)}
                    aria-pressed={on}
                    className={`rounded-pill border px-3 py-1.5 text-xs transition-colors ${
                      on
                        ? "border-brand bg-brand-soft font-medium text-brand-strong"
                        : dim
                          ? "border-line text-ink-mute opacity-50"
                          : "border-line text-ink-soft hover:border-ink-mute"
                    }`}
                  >
                    {on && <span aria-hidden className="mr-1">✓</span>}
                    {i}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="mt-2 text-xs text-ink-mute">
            {picked.length} of {max} chosen
          </p>
        </div>

        <button
          type="submit"
          disabled={picked.length === 0}
          className="w-full rounded-card bg-brand px-4 py-3 font-medium text-white transition-colors hover:bg-brand-strong disabled:opacity-60"
        >
          Continue
        </button>
      </form>
    </OnboardingPane>
  );
}
