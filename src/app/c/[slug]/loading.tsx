import { CardSkeleton, PanelSkeleton, Skeleton, StatGridSkeleton } from "@/components/loading";

/** The public card, in outline. Same two-column geometry as the real page. */
export default function Loading() {
  return (
    <main className="sky-bg grain flex-1">
      <div className="rise-in relative z-10 mx-auto grid max-w-5xl items-start gap-10 px-6 py-14 lg:grid-cols-[380px_1fr]">
        <div>
          <CardSkeleton />
        </div>
        <div>
          <Skeleton className="h-3 w-40" />
          <Skeleton className="mt-4 h-9 w-64" delay={1} />
          <Skeleton className="mt-3 h-4 w-80" delay={2} />
          <StatGridSkeleton className="mt-8" />
          <PanelSkeleton className="mt-8" lines={4} />
          <Skeleton className="mt-6 h-12 w-40 rounded-card" />
        </div>
      </div>
    </main>
  );
}
