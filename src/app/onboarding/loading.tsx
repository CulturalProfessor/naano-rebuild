import { CardSkeleton, Skeleton } from "@/components/loading";

/**
 * Onboarding keeps its two-pane shape while a step loads, card preview
 * included. The preview is the promise the flow makes on arrival, so it is
 * the last thing that should disappear between steps.
 */
export default function Loading() {
  return (
    <div className="rise-in grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-10 sm:px-12 lg:px-16">
        <div className="mb-10 font-display text-lg font-bold tracking-tight">
          naano
        </div>
        <div className="mx-auto w-full max-w-md flex-1 space-y-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-3/4" delay={1} />
          <Skeleton className="h-4 w-full" delay={2} />
          <div className="space-y-3 pt-6">
            <Skeleton className="h-12 w-full rounded-card" />
            <Skeleton className="h-12 w-full rounded-card" delay={1} />
            <Skeleton className="h-12 w-40 rounded-card" delay={2} />
          </div>
        </div>
      </div>
      <div className="hidden bg-gradient-to-b from-sky-3 to-surface-2 px-8 py-12 lg:block">
        <div className="mx-auto max-w-sm">
          <CardSkeleton />
        </div>
      </div>
    </div>
  );
}
