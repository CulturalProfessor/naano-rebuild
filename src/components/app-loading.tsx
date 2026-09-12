import {
  HeaderSkeleton,
  PanelSkeleton,
  RowListSkeleton,
  Skeleton,
} from "@/components/loading";

/**
 * The signed-in page fallback.
 *
 * It keeps the header, because the nav is the one part of a signed-in screen
 * that is already known before the query returns — losing it on every
 * navigation is what makes an app feel like it reloads rather than moves.
 * Callers pass the title as real text for the same reason.
 */
export function AppPageLoading({
  title,
  subtitle = true,
  width = "max-w-4xl",
  panels = 1,
  rows = 3,
}: {
  title: string;
  subtitle?: boolean;
  width?: string;
  panels?: number;
  rows?: number;
}) {
  return (
    <>
      <HeaderSkeleton />
      <main className={`rise-in mx-auto w-full flex-1 px-6 py-10 ${width}`}>
        <h1 className="font-display text-3xl">{title}</h1>
        {subtitle && <Skeleton className="mt-3 h-4 w-2/3 max-w-md" />}

        {panels > 0 && (
          <div className="mt-8 space-y-5">
            {Array.from({ length: panels }, (_, i) => (
              <PanelSkeleton key={i} lines={3} />
            ))}
          </div>
        )}

        {rows > 0 && (
          <div className="mt-6">
            <RowListSkeleton count={rows} />
          </div>
        )}
      </main>
    </>
  );
}
