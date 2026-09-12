import {
  PanelSkeleton,
  RowListSkeleton,
  Skeleton,
} from "@/components/loading";

/**
 * The signed-in page fallback.
 *
 * No header in here: the real one lives in the section's layout now and stays
 * on screen while this renders underneath it. Callers still pass the title as
 * real text, because a page's name is known before its query returns.
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
  );
}
