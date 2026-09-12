import Link from "next/link";
import { requireBrand } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { runAutoResponses } from "@/lib/cold-start";
import { AppHeader } from "@/components/app-header";
import { formatEuros } from "@/lib/pricing";
import { formatDay } from "@/lib/dates";

export const metadata = { title: "Campaigns — naano" };

export default async function BrandCampaigns() {
  const { account, brand } = await requireBrand();

  await runAutoResponses();

  const [campaigns, offerCounts, bookings] = await Promise.all([
    prisma.campaign.findMany({
      where: { brandId: brand.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        briefProduct: true,
        briefAudience: true,
        briefGuardrail: true,
        industries: true,
        regions: true,
        budgetCapCents: true,
        status: true,
      },
    }),
    prisma.offer.groupBy({
      by: ["status"],
      where: { brandId: brand.id },
      _count: { _all: true },
    }),
    prisma.booking.findMany({
      where: { brandId: brand.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        agreedPriceCents: true,
        postBy: true,
        status: true,
        creator: { select: { displayName: true, urlSlug: true } },
        campaign: { select: { name: true } },
      },
    }),
  ]);

  const awaiting =
    offerCounts.find((c) => c.status === "offered")?._count._all ?? 0;
  const countered =
    offerCounts.find((c) => c.status === "countered")?._count._all ?? 0;

  return (
    <>
      <AppHeader accountId={account.id} role="brand" active="/brand/campaigns" />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand">
          {brand.name}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="mt-1 font-display text-3xl">Campaigns</h1>
          <Link
            href="/brand/campaigns/new"
            className="rounded-card bg-brand px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-strong"
          >
            + New campaign
          </Link>
        </div>

        {(awaiting > 0 || countered > 0) && (
          <Link
            href="/brand/offers"
            className="mt-4 inline-flex items-center gap-2 rounded-pill bg-brand-soft px-4 py-2 text-sm font-medium text-brand-strong"
          >
            {awaiting > 0 && `${awaiting} offer${awaiting === 1 ? "" : "s"} awaiting a response`}
            {awaiting > 0 && countered > 0 && " · "}
            {countered > 0 && `${countered} counter${countered === 1 ? "" : "s"} to answer`}
            <span aria-hidden>→</span>
          </Link>
        )}

        {campaigns.map((c) => (
          <section
            key={c.id}
            className="mt-8 overflow-hidden rounded-panel border border-line bg-surface shadow-[var(--shadow-card)]"
          >
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
              <div>
                <h2 className="font-display text-xl">{c.name}</h2>
                <p className="text-sm text-ink-soft">
                  {c.regions.join(" · ") || "No regions set"}
                  {c.budgetCapCents != null &&
                    ` · cap ${formatEuros(c.budgetCapCents)} per post`}
                </p>
              </div>
              <span className="rounded-pill bg-success-soft px-3 py-1 text-xs font-medium text-ink">
                {c.status}
              </span>
            </header>

            <div className="space-y-4 px-6 py-5 text-sm">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
                  Product
                </p>
                <p className="mt-0.5">{c.briefProduct}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
                  Audience
                </p>
                <p className="mt-0.5">{c.briefAudience}</p>
              </div>
              <p className="rounded-card bg-brand-soft px-4 py-3">
                {c.briefGuardrail}
              </p>
              {c.industries.length > 0 && (
                <p className="text-ink-soft">{c.industries.join(" · ")}</p>
              )}
            </div>

            <footer className="flex flex-wrap gap-6 border-t border-line px-6 py-4">
              <Link
                href={`/brand/campaigns/${c.id}`}
                className="text-sm font-medium text-brand hover:text-brand-strong"
              >
                Open the dashboard →
              </Link>
              <Link
                href={`/brand/campaigns/${c.id}/edit`}
                className="text-sm font-medium text-ink-soft hover:text-ink"
              >
                Edit the brief →
              </Link>
              <Link
                href={`/marketplace?industry=${encodeURIComponent(c.industries[0] ?? "")}`}
                className="text-sm font-medium text-ink-soft hover:text-ink"
              >
                Find creators for this campaign →
              </Link>
            </footer>
          </section>
        ))}

        <section className="mt-12">
          <h2 className="font-display text-xl">Bookings</h2>
          {bookings.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">
              An accepted offer becomes a booking here, with its tracking link
              and its post.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface">
              {bookings.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/brand/bookings/${b.id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 hover:bg-surface-2"
                  >
                    <span className="font-display font-semibold tracking-tight">
                      {b.creator.displayName}
                    </span>
                    <span className="text-sm text-ink-soft">{b.campaign.name}</span>
                    <span className="ml-auto text-sm text-ink-soft">
                      post by {formatDay(b.postBy)}
                    </span>
                    <span className="w-24 text-right font-display font-semibold tabular-nums">
                      {formatEuros(b.agreedPriceCents)}
                    </span>
                    <span className="w-24 text-right text-xs uppercase tracking-wide text-ink-soft">
                      {b.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
