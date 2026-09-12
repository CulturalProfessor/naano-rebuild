import { PageLoading } from "@/components/loading";

/** The catch-all. Any segment with a known shape overrides this with its own. */
export default function Loading() {
  return <PageLoading title="Loading naano" detail="Fetching the latest from the database." />;
}
