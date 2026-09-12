import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAccount } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MarketplaceCard } from "@/components/marketplace-card";

export const metadata = { title: "Your marketplace card · naano" };

export default async function DonePage() {
  const account = await requireAccount();
  if (account.role !== "creator") redirect("/brand");

  const creator = await prisma.creator.findUnique({
    where: { accountId: account.id },
    include: { bundles: { where: { isPrimary: true }, take: 1 } },
  });
  if (!creator) redirect("/onboarding/profile");

  return (
    <main className="sky-bg grain min-h-screen">
      <div className="relative z-10 mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="font-display text-4xl">Here is your marketplace card</h1>
        <p className="mt-3 text-ink-soft">
          It is live in the marketplace now. Brands can find it, and your price
          is already on it.
        </p>

        <div className="mx-auto mt-10 max-w-sm">
          <MarketplaceCard
            creator={{
              displayName: creator.displayName,
              headline: creator.headline,
              avatarUrl: creator.avatarUrl,
              country: creator.country,
              countryCode: creator.countryCode,
              industries: creator.industries,
              followerCount: creator.followerCount,
              medianViews: creator.medianViews,
              pricePerPostCents: creator.pricePerPostCents,
              dataState: creator.dataState,
              bundle: creator.bundles[0] ?? null,
            }}
          />
        </div>

        {creator.medianViews === null && (
          <p className="mx-auto mt-6 max-w-sm rounded-card border border-line bg-surface/80 p-4 text-sm text-ink-soft">
            Est. impressions shows a dash because you have no post history with
            us yet. It fills in after your first booked post, and your CPM
            appears with it. We would rather show nothing than a guess.
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/creator"
            className="rounded-card bg-brand px-6 py-3 font-medium text-white transition-colors hover:bg-brand-strong"
          >
            Continue to my profile
          </Link>
          <Link
            href={`/c/${creator.urlSlug}`}
            className="rounded-card border border-line bg-surface px-6 py-3 font-medium text-ink transition-colors hover:border-ink-mute"
          >
            View my public card
          </Link>
        </div>
      </div>
    </main>
  );
}
