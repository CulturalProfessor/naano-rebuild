import Link from "next/link";
import { Suspense } from "react";
import { MarketplaceCard } from "@/components/marketplace-card";
import { LinkPending } from "@/components/link-pending";
import { CardGridSkeleton, Skeleton } from "@/components/loading";
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
      className={`inline-flex shrink-0 items-center rounded-pill border px-3 py-1.5 text-xs transition-colors ${
        active
          ? "border-brand bg-brand text-white"
          : "border-line bg-surface text-ink-soft hover:border-ink-mute"
      }`}
    >
      {children}
      {/* The answer to "did that land?" belongs on the pill that was clicked. */}
      <LinkPending tone={active ? "on-brand" : "brand"} />
    </Link>
  );
}

/**
 * The grid and the sentence that counts it, both of which depend on the
 * filtered query. Split out so the filter bar above renders immediately and a
 * filter change never blanks the control the person is still using.
 */
async function CreatorGrid({
  industry,
  country,
  cap,
}: {
  industry?: string;
  country?: string;
  cap?: number;
}) {
  const creators = await listCreators({
    industries: industry ? [industry] : undefined,
    country,
    maxPriceCents: Number.isFinite(cap) ? cap : undefined,
  });

  const pending = creators.filter((c) => c.medianViews === null).length;

  return (
    <>
      <p className="-mt-4 mb-8 max-w-2xl text-ink-soft">
        {creators.length} vetted LinkedIn creator{creators.length === 1 ? "" : "s"}.
        Price is derived from audience, so a card is bookable the day it goes
        live.
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
        <div className="grid auto-rows-fr gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {creators.map((c) => (
            <Link
              key={c.id}
              href={`/c/${c.urlSlug}`}
              className="group block h-full transition-transform hover:-translate-y-0.5"
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
    </>
  );
}

function GridFallback() {
  return (
    <>
      <div className="-mt-4 mb-8 max-w-2xl space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/5" delay={1} />
      </div>
      <CardGridSkeleton />
    </>
  );
}

export default async function MarketplacePage({
  searchParams,
}: PageProps<"/marketplace">) {
  const sp = await searchParams;
  const industry = typeof sp.industry === "string" ? sp.industry : undefined;
  const country = typeof sp.country === "string" ? sp.country : undefined;
  const cap = typeof sp.cap === "string" ? Number(sp.cap) : undefined;

  const countries = await countriesInMarketplace();

  const qs = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { industry, country, cap: cap ? String(cap) : undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v);
    const s = next.toString();
    return s ? `/marketplace?${s}` : "/marketplace";
  };

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
        </header>

        <div className="mb-8 space-y-3 rounded-panel border border-line bg-surface/80 p-4 backdrop-blur">
          <div className="-mx-1 flex flex-nowrap items-center gap-2 overflow-x-auto px-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            <span className="mr-1 shrink-0 text-xs font-medium text-ink-soft">Industry</span>
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

          <div className="-mx-1 flex flex-nowrap items-center gap-2 overflow-x-auto px-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            <span className="mr-1 shrink-0 text-xs font-medium text-ink-soft">Country</span>
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

          <div className="-mx-1 flex flex-nowrap items-center gap-2 overflow-x-auto px-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            <span className="mr-1 shrink-0 text-xs font-medium text-ink-soft">
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

        {/*
          Keyed on the filter, so changing one re-enters the fallback instead
          of leaving the previous result on screen looking current.
        */}
        <Suspense
          key={`${industry ?? ""}|${country ?? ""}|${cap ?? ""}`}
          fallback={<GridFallback />}
        >
          <CreatorGrid industry={industry} country={country} cap={cap} />
        </Suspense>
      </div>
    </main>
  );
}
