import { CardGridSkeleton, Skeleton } from "@/components/loading";

const PILL_WIDTHS = ["w-12", "w-16", "w-20", "w-14", "w-24", "w-16"] as const;

/**
 * Arriving at the marketplace cold. The heading is real text because it never
 * depends on the query; everything under it is the shape of the grid, so the
 * cards do not jump when they land.
 */
export default function Loading() {
  return (
    <main className="sky-bg grain flex-1">
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-12">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">
            Creator marketplace
          </p>
          <h1 className="mt-2 font-display text-4xl">
            Find creators your buyers already trust.
          </h1>
        </header>

        <div className="mb-8 space-y-3 rounded-panel border border-line bg-surface/80 p-4 backdrop-blur">
          {/* Pill widths cycle rather than repeat, so the bar reads as labels. */}
          {[13, 19, 4].map((n, row) => (
            <div
              key={row}
              className="-mx-1 flex flex-nowrap items-center gap-2 overflow-x-auto px-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
            >
              <Skeleton className="h-3 w-16 shrink-0" />
              {Array.from({ length: n }, (_, i) => (
                <Skeleton
                  key={i}
                  delay={((i % 3) + 1) as 1 | 2 | 3}
                  className={`h-7 shrink-0 ${PILL_WIDTHS[i % PILL_WIDTHS.length]}`}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="-mt-4 mb-8 max-w-2xl space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/5" delay={1} />
        </div>

        <CardGridSkeleton />
      </div>
    </main>
  );
}
