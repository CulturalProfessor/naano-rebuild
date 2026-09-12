"use client";

import Link from "next/link";

/**
 * The client-side twin of OnboardingShell.
 *
 * Steps that change the card as you type render through this one, because the
 * preview has to react to local state. "It updates live with your profile,
 * analytics, positioning and price" is a promise the two-pane layout makes on
 * arrival, and a server-rendered preview quietly breaks it.
 */
export function OnboardingPane({
  step,
  totalSteps = 4,
  title,
  intro,
  backHref,
  backLabel,
  children,
  preview,
}: {
  step: number;
  totalSteps?: number;
  title: string;
  intro?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
  preview: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-10 sm:px-12 lg:px-16">
        <Link
          href="/"
          className="mb-10 inline-block font-display text-lg font-bold tracking-tight"
        >
          naano
        </Link>

        <div className="mx-auto w-full max-w-md flex-1">
          {backHref && (
            <Link
              href={backHref}
              className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
            >
              <span aria-hidden>←</span> {backLabel ?? "Back"}
            </Link>
          )}

          <p className="text-xs font-semibold uppercase tracking-widest text-brand">
            Step {step} of {totalSteps}
          </p>
          <h1 className="mt-2 font-display text-3xl">{title}</h1>
          {intro && <div className="mt-3 text-ink-soft">{intro}</div>}

          <div className="mt-8">{children}</div>
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
          <div className="mt-8">{preview}</div>
        </div>
      </div>
    </div>
  );
}
