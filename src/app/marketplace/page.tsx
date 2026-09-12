import Link from "next/link";
import { MarketplaceCard } from "@/components/marketplace-card";
import { listCreators, countriesInMarketplace, INDUSTRIES } from "@/lib/queries";
import { formatEuros } from "@/lib/pricing";

export const metadata = {
  title: "Creator marketplace — naano",
};

const PRICE_CAPS = [50000, 100000, 150000] as const;

function FilterPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-pill border px-3 py-1.5 text-xs transition-colors ${
        active
          ? "border-brand bg-brand text-white"
          : "border-line bg-surface text-ink-soft hover:border-ink-mute"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function MarketplacePage({
  searchParams,
}: PageProps<"/marketplace">) {
  const sp = await searchParams;
  const industry = typeof sp.industry === "string" ? sp.industry : undefined;
  const country = typeof sp.country === "string" ? sp.country : undefined;
  const cap = typeof sp.cap === "string" ? Number(sp.cap) : undefined;

  const [creators, countries] = await Promise.all([
    listCreators({
      industries: industry ? [industry] : undefined,
      country,
      maxPriceCents: Number.isFinite(cap) ? cap : undefined,
    }),
    countriesInMarketplace(),
  ]);

  const qs = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { industry, country, cap: cap ? String(cap) : undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v);
    const s = next.toString();
    return s ? `/marketplace?${s}` : "/marketplace";
  };

  const pending = creators.filter((c) => c.medianViews === null).length;

  return (
    <main className="sky-bg grain min-h-screen">
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-12">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">
            Creator marketplace
          </p>
          <h1 className="mt-2 font-display text-4xl">
            Find creators your buyers already trust.
          </h1>
          <p className="mt-2 max-w-2xl text-ink-soft">
            {creators.length} vetted LinkedIn creators. Price is derived from
            audience, so a card is bookable the day it goes live.
            {pending > 0 && (
              <>
                {" "}
                {pending === 1
                  ? "One of them has no post history yet, and shows"
                  : `${pending} of them have no post history yet, and show`}{" "}
                a dash rather than an estimate.
              </>
            )}
          </p>
        </header>

        <div className="mb-8 space-y-3 rounded-panel border border-line bg-surface/80 p-4 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-medium text-ink-soft">Industry</span>
            <FilterPill href={qs({ industry: undefined })} active={!industry}>
              All
            </FilterPill>
            {INDUSTRIES.slice(0, 12).map((i) => (
              <FilterPill
                key={i}
                href={qs({ industry: i === industry ? undefined : i })}
                active={i === industry}
              >
                {i}
              </FilterPill>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-medium text-ink-soft">Country</span>
            <FilterPill href={qs({ country: undefined })} active={!country}>
              All
            </FilterPill>
            {countries.map((c) => (
              <FilterPill
                key={c.countryCode}
                href={qs({
                  country: c.countryCode === country ? undefined : c.countryCode,
                })}
                active={c.countryCode === country}
              >
                {c.country}
              </FilterPill>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-medium text-ink-soft">
              Budget per post
            </span>
            <FilterPill href={qs({ cap: undefined })} active={!cap}>
              Any
            </FilterPill>
            {PRICE_CAPS.map((c) => (
              <FilterPill
                key={c}
                href={qs({ cap: c === cap ? undefined : String(c) })}
                active={c === cap}
              >
                Under {formatEuros(c)}
              </FilterPill>
            ))}
          </div>
        </div>

        {creators.length === 0 ? (
          <div className="rounded-panel border border-dashed border-line bg-surface/70 p-12 text-center">
            <p className="font-display text-lg">No creators match that.</p>
            <p className="mt-1 text-sm text-ink-soft">
              Widen the budget or clear a filter.
            </p>
            <Link
              href="/marketplace"
              className="mt-4 inline-block rounded-pill bg-brand px-4 py-2 text-sm font-medium text-white"
            >
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {creators.map((c) => (
              <Link
                key={c.id}
                href={`/c/${c.urlSlug}`}
                className="group transition-transform hover:-translate-y-0.5"
              >
                <MarketplaceCard
                  creator={{
                    ...c,
                    dataState: c.dataState,
                    bundle: c.bundle,
                  }}
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
