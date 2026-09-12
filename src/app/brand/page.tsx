import Link from "next/link";
import { requireBrand } from "@/lib/auth";

export default async function BrandHome() {
  const { brand } = await requireBrand();
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-3xl">{brand.name}</h1>
      <p className="mt-2 text-ink-soft">
        Your first campaign is open. Matching, offers and the performance
        dashboard land here next.
      </p>
      <Link href="/marketplace" className="mt-6 inline-block font-medium text-brand">
        Browse the marketplace →
      </Link>
    </main>
  );
}
