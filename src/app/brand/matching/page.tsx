import Link from "next/link";
import { requireBrand } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { openCampaignsForBrand } from "@/lib/offers";
import { INDUSTRIES } from "@/lib/queries";
import { AppHeader } from "@/components/app-header";
import { OfferModal } from "@/components/offer-modal";
import {
  scoreMatch,
  buildRationale,
  parsePrompt,
  type Ranked,
} from "@/lib/matching";
import {
  deriveCpmCents,
  formatEuros,
  compactNumber,
  DASH,
  DEFAULT_POST_BY_DAYS,
} from "@/lib/pricing";
import { daysFromNow, isoDate } from "@/lib/dates";

export const metadata = { title: "AI matching — naano" };

const SUGGESTED = [
  "Find 4 creators for my brief. Prioritise strong audience and content fit.",
  "Find creators who already write about SaaS, under €1000 a post.",
  "Build a balanced shortlist of 6 creators for this campaign.",
  "Find 3 AI and Software creators in Europe.",
];

export default async function Matching({
  searchParams,
}: PageProps<"/brand/matching">) {
  const { account, brand } = await requireBrand();
  const sp = await searchParams;
  const prompt = typeof sp.q === "string" ? sp.q.slice(0, 300) : "";

  const campaigns = await openCampaignsForBrand(brand.id);
  const campaignId =
    typeof sp.campaign === "string" &&
    campaigns.some((c) => c.id === sp.campaign)
      ? sp.campaign
      : campaigns[0]?.id;

  const campaignRow = campaignId
    ? await prisma.campaign.findFirst({
        where: { id: campaignId, brandId: brand.id },
        select: { id: true, name: true, industries: true, regions: true, budgetCapCents: true },
      })
    : null;

  let ranked: Ranked[] = [];
  let rationale: string[] = [];

  if (prompt && campaignRow) {
    const parsed = parsePrompt(prompt, INDUSTRIES);

    // The prompt narrows the pool; the scorer ranks what is left. The brief is
    // still the thing being matched against, which is why a vague prompt still
    // returns a defensible shortlist.
    const pool = await prisma.creator.findMany({
      where: {
        cardStatus: "live",
        ...(parsed.industries.length > 0
          ? { industries: { hasSome: parsed.industries } }
          : {}),
        ...(parsed.maxPriceCents
          ? { pricePerPostCents: { lte: parsed.maxPriceCents } }
          : {}),
      },
      select: {
        id: true,
        urlSlug: true,
        displayName: true,
        avatarUrl: true,
        industries: true,
        country: true,
        countryCode: true,
        followerCount: true,
        medianViews: true,
        pricePerPostCents: true,
        autoRespond: true,
      },
      take: 120,
    });

    const criteria = {
      industries: parsed.industries.length > 0 ? parsed.industries : campaignRow.industries,
      regions: campaignRow.regions,
      budgetCapCents: parsed.maxPriceCents ?? campaignRow.budgetCapCents,
    };

    ranked = pool
      .map((c) => ({ creator: c, score: scoreMatch(c, criteria) }))
      .sort(
        (a, b) =>
          b.score.total - a.score.total ||
          b.creator.followerCount - a.creator.followerCount,
      )
      .slice(0, parsed.count);

    rationale = buildRationale(brand.name, ranked, criteria);
  }

  return (
    <>
      <AppHeader accountId={account.id} role="brand" active="/brand/matching" />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <nav className="inline-flex rounded-pill border border-line bg-surface p-1 text-sm">
          <span className="rounded-pill bg-brand px-4 py-1.5 font-medium text-white">
            AI matching
          </span>
          <Link
            href="/marketplace"
            className="rounded-pill px-4 py-1.5 text-ink-soft hover:text-ink"
          >
            Creator marketplace
          </Link>
        </nav>

        <h1 className="mt-6 font-display text-3xl">
          Hey {brand.name}, let&apos;s find the right creators for you.
        </h1>

        <form method="get" className="mt-6">
          {campaignRow && (
            <input type="hidden" name="campaign" value={campaignRow.id} />
          )}
          <div className="rounded-panel border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
            <textarea
              name="q"
              rows={2}
              defaultValue={prompt}
              placeholder="Ask Nao a question, or find creators…"
              className="w-full resize-none bg-transparent text-base outline-none placeholder:text-ink-mute"
            />
            <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
              <p className="text-xs text-ink-soft">
                Matching against{" "}
                <strong className="font-medium">
                  {campaignRow?.name ?? "no campaign"}
                </strong>
              </p>
              <button className="rounded-card bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-strong">
                Find creators
              </button>
            </div>
          </div>
        </form>

        {!prompt && (
          <div className="mt-6">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
              Suggested for you
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {SUGGESTED.map((s) => (
                <Link
                  key={s}
                  href={`/brand/matching?q=${encodeURIComponent(s)}${campaignRow ? `&campaign=${campaignRow.id}` : ""}`}
                  className="rounded-card border border-line bg-surface px-4 py-3 text-sm hover:border-brand"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
        )}

        <p className="mt-6 rounded-card bg-surface-3 px-4 py-3 text-xs text-ink-soft">
          Nao ranks with a scorer over topic overlap, region, budget and reach,
          and writes the answer from a template built out of the reasons that
          scorer used. There is no model call behind it in this build, which is
          why it cannot name a creator who is not in the marketplace, and why
          the same question gives the same answer twice.
        </p>

        {prompt && (
          <section className="mt-8">
            <p className="ml-auto w-fit max-w-lg rounded-panel bg-brand px-4 py-3 text-sm text-white">
              {prompt}
            </p>

            <div className="mt-5 space-y-3 rounded-panel border border-line bg-surface p-6">
              {rationale.map((para, i) => (
                <p key={i} className={i === 0 ? "font-medium" : "text-ink-soft"}>
                  {para}
                </p>
              ))}
            </div>

            <ol className="mt-5 space-y-3">
              {ranked.map((r, i) => {
                const cpm = deriveCpmCents(
                  r.creator.pricePerPostCents,
                  r.creator.medianViews,
                );
                return (
                  <li
                    key={r.creator.id}
                    className="rounded-panel border border-line bg-surface p-5 shadow-[var(--shadow-card)]"
                  >
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="font-display text-sm text-ink-mute">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-3 text-sm font-semibold text-ink-mute">
                        {r.creator.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.creator.avatarUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          r.creator.displayName.slice(0, 1)
                        )}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/c/${r.creator.urlSlug}`}
                          className="font-display font-semibold tracking-tight hover:text-brand"
                        >
                          {r.creator.displayName}
                        </Link>
                        <p className="text-xs text-ink-soft">
                          {r.creator.industries.slice(0, 2).join(" · ")} ·{" "}
                          {r.creator.country}
                        </p>
                      </div>

                      <span className="ml-auto rounded-pill bg-brand-soft px-3 py-1 text-xs font-medium text-brand-strong">
                        {r.score.total}/100 match
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
                      <Cell
                        label="Median views"
                        value={
                          r.creator.medianViews
                            ? compactNumber(r.creator.medianViews)
                            : DASH
                        }
                        note={r.creator.medianViews ? "self-reported" : "no history yet"}
                      />
                      <Cell
                        label="CPM"
                        value={cpm === null ? DASH : formatEuros(cpm)}
                        note={cpm === null ? "needs views" : "derived"}
                      />
                      <Cell
                        label="Post cost"
                        value={formatEuros(r.creator.pricePerPostCents)}
                      />
                      <div className="ml-auto">
                        {campaigns.length > 0 && (
                          <OfferModal
                            creator={{
                              id: r.creator.id,
                              displayName: r.creator.displayName,
                              avatarUrl: r.creator.avatarUrl,
                              headline: null,
                              pricePerPostCents: r.creator.pricePerPostCents,
                              autoRespond: r.creator.autoRespond,
                            }}
                            campaigns={campaigns}
                            defaultPostBy={daysFromNow(DEFAULT_POST_BY_DAYS)}
                            today={isoDate(new Date())}
                            trigger={
                              <button className="rounded-card bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-strong">
                                Book
                              </button>
                            }
                          />
                        )}
                      </div>
                    </div>

                    <p className="mt-3 border-t border-line pt-3 text-xs text-ink-soft">
                      {r.score.reasons
                        .filter((x) => x.points > 0)
                        .map((x) => x.clause)
                        .join(" · ")}
                    </p>
                  </li>
                );
              })}
            </ol>
          </section>
        )}
      </main>
    </>
  );
}

function Cell({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
        {label}
      </p>
      <p
        className={`font-display text-lg font-semibold tracking-tight ${
          value === DASH ? "text-ink-mute" : ""
        }`}
      >
        {value}
      </p>
      {note && <p className="text-[11px] text-ink-mute">{note}</p>}
    </div>
  );
}
