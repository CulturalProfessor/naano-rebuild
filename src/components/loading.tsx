/**
 * The loading system.
 *
 * One rule decides which of these to reach for: show the SHAPE of what is
 * coming whenever the shape is known, and a spinner only when it is not.
 * A skeleton that matches the real layout means nothing jumps when the data
 * lands, and the page reads as already-yours-and-filling-in rather than blank.
 *
 * Everything here is a Server Component. The interactive pieces live next
 * door: <ActionButton> for pending forms, <RouteProgress> for navigation.
 *
 * The visual language is the marketplace card's "Data / Pending" bar,
 * reused at every scale. Warm surfaces, a hot blue, no grey-blue anywhere.
 * See docs/PLAN.md section 7.
 */

const SPINNER_SIZES = {
  xs: "h-3 w-3 border-[1.5px]",
  sm: "h-4 w-4 border-2",
  md: "h-5 w-5 border-2",
  lg: "h-8 w-8 border-[3px]",
} as const;

/**
 * A ring on a warm track with one hot-blue quarter. `tone="on-brand"` is the
 * version for a blue button, where the track is the button and the runner is
 * white.
 */
export function Spinner({
  size = "sm",
  tone = "brand",
  className = "",
  label,
}: {
  size?: keyof typeof SPINNER_SIZES;
  tone?: "brand" | "on-brand" | "muted";
  className?: string;
  /** Give this whenever the spinner is the only thing announcing the wait. */
  label?: string;
}) {
  const tones = {
    brand: "border-line border-t-brand",
    "on-brand": "border-white/30 border-t-white",
    muted: "border-line border-t-ink-mute",
  } as const;

  return (
    <span
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`spin-slow inline-block shrink-0 rounded-full ${SPINNER_SIZES[size]} ${tones[tone]} ${className}`}
    />
  );
}

/** A grey block standing in for a value that has not arrived. */
export function Skeleton({
  className = "",
  delay,
}: {
  className?: string;
  /** Stagger the sweep so a stack of rows does not pulse in lockstep. */
  delay?: 1 | 2 | 3;
}) {
  const d = delay ? `skeleton-delay-${delay}` : "";
  return (
    <span
      aria-hidden
      className={`skeleton block rounded-pill ${d} ${className}`}
    />
  );
}

/** A paragraph's worth of skeleton, last line short like real text. */
export function SkeletonText({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <span aria-hidden className={`block space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          delay={((i % 3) + 1) as 1 | 2 | 3}
          className={`h-3 ${i === lines - 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </span>
  );
}

/**
 * The indeterminate bar. The same gesture as the card's Data bar, which is
 * why it needs no label to read as "still working".
 */
export function LoadingBar({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`block h-1 overflow-hidden rounded-pill bg-line ${className}`}
    >
      <span className="rail-run block h-full w-full origin-left rounded-pill bg-brand" />
    </span>
  );
}

/**
 * The page-level wait, for a route whose shape is genuinely unknown. Prefer a
 * skeleton wherever the shape IS known. This is the fallback, not the default.
 */
export function PageLoading({
  title = "Loading",
  detail,
}: {
  title?: string;
  detail?: string;
}) {
  return (
    <div className="rise-in grid min-h-[60vh] place-items-center px-6">
      <div role="status" className="w-full max-w-xs text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-[14px] bg-brand-soft">
          <Spinner size="md" />
        </span>
        <p className="mt-4 font-display text-lg font-semibold tracking-tight">
          {title}
        </p>
        {detail && <p className="mt-1 text-sm text-ink-soft">{detail}</p>}
        <LoadingBar className="mt-5" />
      </div>
    </div>
  );
}

/** A one-line wait inside an already-drawn panel. */
export function InlineLoading({
  label = "Loading…",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <p
      role="status"
      className={`flex items-center gap-2 text-sm text-ink-soft ${className}`}
    >
      <Spinner size="xs" />
      {label}
    </p>
  );
}

/* ------------------------------------------------------------------------ *
 * Shape-matched skeletons. Each one mirrors a real component's geometry, so
 * the swap when data lands moves nothing on screen.
 * ------------------------------------------------------------------------ */

/** Mirrors <MarketplaceCard>: header, avatar well, identity, Data bar, metrics. */
export function CardSkeleton() {
  return (
    <article
      aria-hidden
      className="flex h-full flex-col overflow-hidden rounded-hero bg-surface shadow-[var(--shadow-hero)]"
    >
      {/* brand-soft, not the blue at low alpha: alpha over white goes lavender. */}
      <div className="relative h-24 shrink-0 bg-brand-soft">
        <span className="absolute left-4 top-4 h-8 w-8 rounded-[10px] bg-white/70" />
        <span className="absolute right-4 top-4 h-8 w-8 rounded-[10px] bg-white/70" />
      </div>

      <div className="relative z-10 -mt-10 flex shrink-0 justify-center">
        <span className="skeleton block h-20 w-20 rounded-full ring-4 ring-white" />
      </div>

      <div className="flex flex-1 flex-col items-center gap-2 px-6 pb-4 pt-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-40" delay={1} />
        <Skeleton className="mt-2 h-3 w-full" delay={2} />
        <Skeleton className="h-3 w-3/4" delay={3} />
      </div>

      <div className="flex shrink-0 items-center gap-3 px-5 py-3 text-[11px] text-ink-mute">
        <span>Data</span>
        <LoadingBar className="flex-1" />
        <span>Loading</span>
      </div>

      <div className="flex shrink-0 divide-x divide-line border-t border-line">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex-1 space-y-1.5 px-2 py-4 text-center">
            <Skeleton className="mx-auto h-5 w-12" delay={((i % 3) + 1) as 1 | 2 | 3} />
            <Skeleton className="mx-auto h-2.5 w-16" delay={((i % 3) + 1) as 1 | 2 | 3} />
          </div>
        ))}
      </div>

      <div className="flex min-h-[49px] shrink-0 items-center justify-center border-t border-line px-4 py-3">
        <Skeleton className="h-5 w-24" />
      </div>
    </article>
  );
}

/** The marketplace grid, at the same column counts as the real one. */
export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="rise-in grid auto-rows-fr gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/** A bordered panel with a title and a few lines: the shape most pages repeat. */
export function PanelSkeleton({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`rounded-panel border border-line bg-surface p-5 ${className}`}
    >
      <Skeleton className="h-4 w-40" />
      <SkeletonText lines={lines} className="mt-4" />
    </div>
  );
}

/** A list row: label block on the left, action block on the right. */
export function RowSkeleton({ delay }: { delay?: 1 | 2 | 3 }) {
  return (
    <div
      aria-hidden
      className="flex items-center gap-4 rounded-panel border border-line bg-surface p-5"
    >
      <Skeleton className="h-11 w-11 rounded-full" delay={delay} />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" delay={delay} />
        <Skeleton className="h-3 w-1/2" delay={delay} />
      </div>
      <Skeleton className="h-9 w-24 rounded-card" delay={delay} />
    </div>
  );
}

export function RowListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="rise-in space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <RowSkeleton key={i} delay={((i % 3) + 1) as 1 | 2 | 3} />
      ))}
    </div>
  );
}

/** The labelled-number grid the dashboards and the public card both use. */
export function StatGridSkeleton({
  count = 6,
  className = "",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 ${className}`}
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-2.5 w-20" delay={((i % 3) + 1) as 1 | 2 | 3} />
          <Skeleton className="h-6 w-24" delay={((i % 3) + 1) as 1 | 2 | 3} />
        </div>
      ))}
    </div>
  );
}

/** The signed-in header, so a nested route's fallback keeps the chrome. */
export function HeaderSkeleton() {
  return (
    <header
      aria-hidden
      className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-6 py-3">
        <span className="font-display text-lg font-bold tracking-tight">naano</span>
        <span className="flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-7 w-20" delay={((i % 3) + 1) as 1 | 2 | 3} />
          ))}
        </span>
        <span className="ml-auto flex items-center gap-3">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-4 w-14" />
        </span>
      </div>
    </header>
  );
}
