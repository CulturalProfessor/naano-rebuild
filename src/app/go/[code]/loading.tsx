import { PanelSkeleton, Skeleton } from "@/components/loading";

/** The campaign landing page: a stranger's first screen, so it never blanks. */
export default function Loading() {
  return (
    <main className="sky-bg grain min-h-screen">
      <div className="rise-in relative z-10 mx-auto max-w-3xl px-6 py-16">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-4 h-10 w-3/4" delay={1} />
        <Skeleton className="mt-4 h-4 w-full" delay={2} />
        <Skeleton className="mt-2 h-4 w-2/3" delay={3} />
        <PanelSkeleton className="mt-10" lines={4} />
      </div>
    </main>
  );
}
