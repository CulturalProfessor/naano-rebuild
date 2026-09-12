"use client";

import Link from "next/link";
import { ActionButton } from "@/components/action-button";

/**
 * The last resort. Without this, a server error renders Next's own page: no
 * navigation, no way back, and in production no explanation either.
 *
 * Retry first, because most of what can fail here is one database round trip.
 * The digest is shown because it is the only thing that connects what the
 * person saw to what the server logged.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="sky-bg grain flex flex-1 items-center justify-center px-6 py-20">
      <div className="relative z-10 max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-danger">
          Something broke
        </p>
        <h1 className="mt-2 font-display text-4xl">
          That did not load.
        </h1>
        <p className="mt-3 text-ink-soft">
          The request failed on our side, not yours. Nothing you had entered was
          lost unless the page says otherwise.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <ActionButton
            type="button"
            onClick={reset}
            className="px-6 py-3"
            pendingLabel="Retrying…"
          >
            Try again
          </ActionButton>
          <Link
            href="/"
            className="rounded-card border border-line bg-surface px-6 py-3 font-medium text-ink transition-colors hover:border-ink-mute"
          >
            Go to naano
          </Link>
        </div>
        {error.digest && (
          <p className="mt-6 text-xs text-ink-mute">
            Reference <code className="text-ink-soft">{error.digest}</code>
          </p>
        )}
      </div>
    </main>
  );
}
