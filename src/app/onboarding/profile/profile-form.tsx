"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { MarketplaceCard } from "@/components/marketplace-card";
import { ActionButton } from "@/components/action-button";
import {
  readProfile,
  saveManualProfile,
  type ImportState,
  type DraftCard,
} from "@/app/actions/onboarding";

/**
 * Step 2 of creator onboarding.
 *
 * Three details from the recon that are the whole screen:
 *   - the reading state appears in TWO places at once, on the button and as a
 *     pill over the card;
 *   - the card's skeleton is the real card, not a grey box, so the shape of
 *     what you are building is visible before any value exists;
 *   - the consent sentence names the five fields it reads and disclaims the
 *     three it does not, word for word.
 */

const EMPTY_CARD: DraftCard = {
  displayName: "",
  headline: null,
  avatarUrl: null,
  country: "",
  countryCode: "",
  followerCount: null,
  pricePerPostCents: null,
  industries: [],
};

function SubmitButton({ done, pending }: { done: boolean; pending: boolean }) {
  return (
    <ActionButton
      type="submit"
      size="lg"
      disabled={done}
      pending={pending}
      pendingLabel="Reading your profile…"
    >
      {done ? "Profile read" : "Authorise a one-time read"}
    </ActionButton>
  );
}

function ManualButton({ pending }: { pending: boolean }) {
  return (
    <ActionButton type="submit" size="lg" pending={pending} pendingLabel="Saving…">
      Use these details
    </ActionButton>
  );
}

/** Renders the same `reading` flag the button renders, from one piece of
 *  state in the parent, so the two can never disagree. */
function CardPane({ card, reading }: { card: DraftCard; reading: boolean }) {
  return (
    <MarketplaceCard
      reading={reading}
      creator={{
        displayName: card.displayName,
        headline: card.headline,
        avatarUrl: card.avatarUrl,
        country: card.country,
        countryCode: card.countryCode,
        industries: card.industries,
        followerCount: card.followerCount,
        medianViews: null,
        pricePerPostCents: card.pricePerPostCents,
        dataState: "pending",
        bundle: null,
      }}
    />
  );
}

export function ProfileStep() {
  const router = useRouter();
  const [state, formAction, reading] = useActionState<ImportState, FormData>(
    readProfile,
    { status: "idle" },
  );
  const [manualState, manualAction, savingManual] = useActionState<
    ImportState,
    FormData
  >(saveManualProfile, { status: "idle" });

  const resolved =
    state.status === "done"
      ? state
      : manualState.status === "done"
        ? manualState
        : null;
  const card = resolved?.card ?? EMPTY_CARD;
  // Once either path has produced a card, the forms step aside for Continue.
  const showManual = state.status === "manual" && resolved === null;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-10 sm:px-12 lg:px-16">
        <div className="mb-10 font-display text-lg font-bold tracking-tight">
          naano
        </div>

        <div className="mx-auto w-full max-w-md flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">
            Step 2 of 4
          </p>
          <h1 className="mt-2 font-display text-3xl">
            Add your public LinkedIn profile
          </h1>
          <p className="mt-3 text-ink-soft">
            No extension is needed. We&apos;ll retrieve only the minimum public
            information required to create your Basic card.
          </p>

          {!showManual && (
            <form action={formAction} className="mt-8 space-y-4">
              <div>
                <label
                  htmlFor="linkedinUrl"
                  className="block text-xs font-semibold uppercase tracking-wide text-ink-soft"
                >
                  Public LinkedIn profile URL
                </label>
                <input
                  id="linkedinUrl"
                  name="linkedinUrl"
                  type="text"
                  required
                  defaultValue=""
                  placeholder="https://www.linkedin.com/in/your-name"
                  autoComplete="url"
                  className="mt-1.5 w-full rounded-card border border-line bg-surface px-3.5 py-3 text-ink outline-none transition-colors focus:border-brand"
                />
              </div>

              {/* The promise. Five fields named, three disclaimed. */}
              <div className="flex gap-3 rounded-card bg-brand-soft/60 p-4 text-sm text-ink">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden
                  className="mt-0.5 h-4 w-4 shrink-0 fill-brand"
                >
                  <path d="M12 1 3 5v6c0 5.25 3.84 10.16 9 11.4 5.16-1.24 9-6.15 9-11.4V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                </svg>
                <p>
                  By clicking below, you authorize Naano to read your public
                  profile once: name, photo, headline, country and follower
                  count. We do not import your posts, engagement or private
                  analytics.
                </p>
              </div>

              <SubmitButton done={state.status === "done"} pending={reading} />

            </form>
          )}

          {resolved && (
            <div className="mt-4 space-y-3">
              <p className="text-center text-xs text-ink-soft">
                {resolved.tier === "manual"
                  ? "Entered by hand. Nothing was read from LinkedIn."
                  : resolved.tier === "cache"
                    ? "Read once from our cache. We will not read it again."
                    : "Read once from your public profile. We will not read it again."}
                {resolved.freshness === "stale" && " It may be out of date."}
              </p>

              {resolved.limitations.length > 0 && (
                // The service reports where its own answer is thin. Passing
                // that on costs nothing and is the same instinct as the dash:
                // say what you do not know rather than filling the space.
                <ul className="space-y-1 rounded-card border border-line bg-surface-3 p-3 text-xs text-ink-soft">
                  {resolved.limitations.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => router.push("/onboarding/card")}
                className="w-full rounded-card bg-brand px-4 py-3 font-medium text-white transition-colors hover:bg-brand-strong"
              >
                Continue
              </button>
            </div>
          )}

          {showManual && (
            <form action={manualAction} className="mt-8 space-y-4">
              {/*
                A rejected manual save answers here too. Rendering only the
                read step's message left a form that looked like it had done
                nothing when it had in fact refused, and said why.
              */}
              <p
                className={`rounded-card border p-4 text-sm ${
                  manualState.status === "manual" && manualState.message
                    ? "border-danger/30 bg-danger-soft text-danger"
                    : "border-line bg-surface-3 text-ink"
                }`}
              >
                {(manualState.status === "manual" && manualState.message) ||
                  state.message}
              </p>

              <input
                type="hidden"
                name="linkedinUrl"
                value={state.slug ? `https://www.linkedin.com/in/${state.slug}` : ""}
              />

              <Field label="Your name" name="fullName" required />
              <Field label="Headline" name="headline" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Country" name="country" required />
                <Field label="Code" name="countryCode" placeholder="IE" />
              </div>
              <Field
                label="Follower count"
                name="followerCount"
                type="number"
                required
              />

              <ManualButton pending={savingManual} />
            </form>
          )}
        </div>
      </div>

      <div className="hidden bg-gradient-to-b from-sky-3 to-surface-2 px-8 py-12 lg:block">
        <div className="mx-auto max-w-sm">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-brand">
            Your marketplace card
          </p>
          <h2 className="mt-2 text-center font-display text-3xl">
            Build a card brands can trust.
          </h2>
          <p className="mt-2 text-center text-sm text-ink-soft">
            It updates live with your profile, analytics, positioning and price.
          </p>
          <div className="mt-8">
            <CardPane card={card} reading={reading} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block text-xs font-semibold uppercase tracking-wide text-ink-soft"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-card border border-line bg-surface px-3.5 py-2.5 text-ink outline-none transition-colors focus:border-brand"
      />
    </div>
  );
}
