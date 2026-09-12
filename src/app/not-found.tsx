import Link from "next/link";

export const metadata = { title: "Not found · naano" };

/**
 * Next's default 404 is a black page with no navigation on it at all, which is
 * a dead end reachable from any stale card link or mistyped URL. This one says
 * what happened and offers the two places worth going.
 */
export default function NotFound() {
  return (
    <main className="sky-bg grain flex flex-1 items-center justify-center px-6 py-20">
      <div className="relative z-10 max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand">
          404
        </p>
        <h1 className="mt-2 font-display text-4xl">That page is not here.</h1>
        <p className="mt-3 text-ink-soft">
          The link may be old, or the creator card behind it may have been taken
          down. Nothing is broken on your side.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/marketplace"
            className="rounded-card bg-brand px-6 py-3 font-medium text-white transition-colors hover:bg-brand-strong"
          >
            Browse the marketplace
          </Link>
          <Link
            href="/"
            className="rounded-card border border-line bg-surface px-6 py-3 font-medium text-ink transition-colors hover:border-ink-mute"
          >
            Go to naano
          </Link>
        </div>
      </div>
    </main>
  );
}
