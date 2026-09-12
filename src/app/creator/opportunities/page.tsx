import { requireCreator } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { runAutoResponses } from "@/lib/cold-start";
import { ApplyButton } from "./apply-button";
import { scoreMatch } from "@/lib/matching";
import { formatEuros } from "@/lib/pricing";

export const metadata = { title: "Opportunities — naano" };

/**
 * The second door, from the creator's side.
 *
 * This is the page that answers the empty room: a creator who finishes
 * onboarding and lands in a studio with no offers has used a card builder, not
 * a marketplace. The match score here is the same function the brand's
 * shortlist ranks with, computed against this creator's real industries, so
 * the number on screen is about them rather than decoration.
 */
export default async function Opportunities() {
  const { creator } = await requireCreator();

  await runAutoResponses();

  const [card, campaigns, applications] = await Promise.all([
    prisma.creator.findUniqueOrThrow({
      where: { id: creator.id },
      select: {
        displayName: true,
        industries: true,
        country: true,
        countryCode: true,
        followerCount: true,
        medianViews: true,
        pricePerPostCents: true,
      },
    }),
    prisma.campaign.findMany({
      where: { status: "open" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        briefProduct: true,
        briefAudience: true,
        briefGuardrail: true,
        channel: true,
        regions: true,
        industries: true,
        postDeadlineDays: true,
        budgetCapCents: true,
        brand: { select: { name: true, autoRespond: true } },
      },
    }),
    prisma.application.findMany({
      where: { creatorId: creator.id },
      select: { campaignId: true, status: true },
    }),
  ]);

  const appliedTo = new Map(applications.map((a) => [a.campaignId, a.status]));

  const scored = campaigns
    .map((c) => ({ campaign: c, score: scoreMatch(card, c) }))
    .sort((a, b) => b.score.total - a.score.total);

  return (
    <>
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <h1 className="font-display text-3xl">Opportunities</h1>
        <p className="mt-1 max-w-2xl text-ink-soft">
          Open brand campaigns. Apply, the brand accepts, and the booking is
          created at your listed price of{" "}
          {formatEuros(card.pricePerPostCents)}. You do not have to wait to be
          found.
        </p>

        {scored.length === 0 ? (
          <p className="mt-8 rounded-panel border border-dashed border-line bg-surface p-10 text-center text-ink-soft">
            No campaigns are open right now.
          </p>
        ) : (
          <ul className="mt-8 space-y-4">
            {scored.map(({ campaign, score }) => (
              <li
                key={campaign.id}
                className="overflow-hidden rounded-panel border border-line bg-surface shadow-[var(--shadow-card)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-pill bg-surface-3 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-ink-soft">
                        {campaign.channel}
                      </span>
                      {campaign.regions.length > 0 && (
                        <span className="rounded-pill bg-surface-3 px-2.5 py-0.5 text-[11px] text-ink-soft">
                          {campaign.regions.join(" · ")}
                        </span>
                      )}
                      {campaign.brand.autoRespond && (
                        <span className="rounded-pill bg-brand-soft px-2.5 py-0.5 text-[11px] text-brand-strong">
                          Demo brand · responds automatically
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2 font-display text-xl">
                      {campaign.brand.name}
                    </h2>
                    <p className="text-sm text-ink-soft">{campaign.name}</p>
                  </div>
                  <span className="rounded-pill bg-brand px-3 py-1 text-xs font-medium text-white">
                    {score.total}% match
                  </span>
                </div>

                <div className="px-5">
                  <div className="flex items-center gap-3 text-xs text-ink-soft">
                    <span className="shrink-0">Audience relevance</span>
                    <span className="h-1 flex-1 overflow-hidden rounded-pill bg-line">
                      <span
                        className="block h-full rounded-pill bg-brand"
                        style={{ width: `${score.total}%` }}
                      />
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {score.total}/100
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-ink-soft">
                    {score.reasons
                      .filter((r) => r.points > 0)
                      .map((r) => r.clause)
                      .join(" · ")}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-3 divide-x divide-line border-y border-line">
                  <Stat label="Match" value={`${score.total}/100`} />
                  <Stat
                    label="Post deadline"
                    value={`${campaign.postDeadlineDays} days`}
                  />
                  <Stat
                    label="Budget cap"
                    value={
                      campaign.budgetCapCents != null
                        ? formatEuros(campaign.budgetCapCents)
                        : "None set"
                    }
                  />
                </div>

                <details className="px-5 py-4">
                  <summary className="cursor-pointer text-sm font-medium text-brand">
                    View the brief
                  </summary>
                  <div className="mt-3 space-y-3 rounded-card border border-line bg-surface-2 p-4 text-sm">
                    <Brief label="Product">{campaign.briefProduct}</Brief>
                    <Brief label="Audience">{campaign.briefAudience}</Brief>
                    <p className="rounded-card bg-brand-soft px-3 py-2">
                      {campaign.briefGuardrail}
                    </p>
                  </div>
                </details>

                <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line px-5 py-4">
                  <ApplyButton
                    campaignId={campaign.id}
                    applied={appliedTo.get(campaign.id) ?? null}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 text-center">
      <p className="font-display text-base font-semibold tracking-tight">
        {value}
      </p>
      <p className="text-[11px] uppercase tracking-wide text-ink-soft">{label}</p>
    </div>
  );
}

function Brief({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
        {label}
      </p>
      <p className="mt-0.5">{children}</p>
    </div>
  );
}
