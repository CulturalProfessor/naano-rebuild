import Link from "next/link";
import { requireCreator } from "@/lib/auth";

export default async function CreatorHome() {
  const { creator } = await requireCreator();
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-3xl">Creator studio</h1>
      <p className="mt-2 text-ink-soft">
        Your card is live. Offers, opportunities and earnings land here next.
      </p>
      <Link href={`/c/${creator.urlSlug}`} className="mt-6 inline-block font-medium text-brand">
        View my public card →
      </Link>
    </main>
  );
}
