"use client";

import { useLinkStatus } from "next/link";
import { Spinner } from "@/components/loading";

/**
 * An inline pending mark for a <Link>, rendered as a descendant of it.
 *
 * The marketplace filters need this specifically. A filter click is a server
 * round trip, and the answer to "did that register?" has to appear on the pill
 * that was clicked, not somewhere else on the page. The slot is a fixed width
 * at both states so the pill does not resize under the cursor.
 */
export function LinkPending({ tone = "brand" }: { tone?: "brand" | "on-brand" }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`grid place-items-center overflow-hidden transition-all duration-150 ${
        pending ? "ml-1.5 w-3 opacity-100" : "w-0 opacity-0"
      }`}
    >
      {pending && <Spinner size="xs" tone={tone} />}
    </span>
  );
}
