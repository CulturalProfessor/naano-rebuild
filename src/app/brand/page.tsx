import Link from "next/link";
import { Suspense } from "react";
import { requireBrand } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { runAutoResponses } from "@/lib/cold-start";
import { walletBalanceCents } from "@/lib/money";
import { unreadCountFor } from "@/lib/messages";
import { formatEuros, compactNumber, DASH } from "@/lib/pricing";
import { PanelSkeleton, Skeleton } from "@/components/loading";
import { formatDay } from "@/lib/dates";

export const metadata = { title: "Overview · naano" };

/**
 * The brand's first screen.
 *
 * Four numbers, then the things waiting on a decision. The numbers obey the
 * same rule as everywhere else: clicks and leads are ours and are printed as
 * measured, views are the creator's own figure and say so, and a number with
 * no data behind it renders as a dash rather than a zero. A zero here would
 * read as "nobody engaged" when the truth is "nothing has been posted".
 *
 * The shell below has no await in it, so the greeting and the heading are on
 * screen before any query returns. The two sections stream in behind their own
 * boundaries: the numbers are four aggregates over every booking the brand
 * has, and the panels run the auto-responder. Neither is a reason to hold back
 * a page title.
 */
export default async function BrandOverview() {
  const { brand } = await requireBrand();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <p className="text-ink-soft">Hello {brand.name} 👋</p>
      <h1 className="mt-1 font-display text-4xl">
        Here is what is happening on naano.
      </h1>

      <Suspense fallback={<KpiSkeleton />}>
        <Kpis brandId={brand.id} />
      </Suspense>

      <Suspense fallback={<PanelsSkeleton />}>
        <Panels brandId={brand.id} />
      </Suspense>
    </main>
  );
}

function KpiSkeleton() {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-panel border border-line bg-surface px-5 py-4">
          <Skeleton className="h-3 w-24" delay={((i % 3) + 1) as 1 | 2 | 3} />
          <Skeleton className="mt-2 h-8 w-16" delay={((i % 3) + 1) as 1 | 2 | 3} />
          <Skeleton className="mt-2 h-2.5 w-28" delay={((i % 3) + 1) as 1 | 2 | 3} />
        </div>
      ))}
    </div>
  );
}

function PanelsSkeleton() {
  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
      <PanelSkeleton lines={4} />
      <PanelSkeleton lines={4} />
    </div>
  );
}

function Kpi({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-panel border border-line bg-surface px-5 py-4">
      <p className="text-xs text-ink-soft">{label}</p>
      <p
        className={`mt-1 font-display text-3xl font-semibold tracking-tight ${
          value === DASH ? "text-ink-mute" : ""
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-ink-mute">{note}</p>
    </div>
  );
}

/** The measured row. Four aggregates, in parallel. */
async function Kpis({ brandId }: { brandId: string }) {
  const [bookings, clicks, leads] = await Promise.all([
    prisma.booking.findMany({
      where: { brandId },
      select: {
        postUrl: true,
        selfReportedViews: true,
        creator: { select: { displayName: true } },
      },
    }),
    prisma.clickEvent.count({ where: { booking: { brandId } } }),
    prisma.lead.count({ where: { booking: { brandId } } }),
  ]);

  const live = bookings.filter((b) => b.postUrl !== null);
  const activated = new Set(bookings.map((b) => b.creator.displayName)).size;

  // Self-reported, and only from the posts that reported. Summing a null as
  // zero would quietly turn "we do not know" into "nobody saw it".
  const reported = live.filter((b) => b.selfReportedViews !== null);
  const views = reported.reduce((s, b) => s + (b.selfReportedViews ?? 0), 0);

  return (
    <>
      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Creators activated"
          value={activated === 0 ? DASH : String(activated)}
          note={activated === 0 ? "no bookings yet" : "with a booking"}
        />
        <Kpi
          label="Posts published"
          value={bookings.length === 0 ? DASH : String(live.length)}
          note={bookings.length === 0 ? "no bookings yet" : "post URL submitted"}
        />
        <Kpi
          label="Qualified clicks"
          value={live.length === 0 ? DASH : compactNumber(clicks)}
          note={live.length === 0 ? "starts when a post goes live" : "measured by naano"}
        />
        <Kpi
          label="Leads"
          value={live.length === 0 ? DASH : String(leads)}
          note={live.length === 0 ? "starts when a post goes live" : "measured by naano"}
        />
      </section>

      {reported.length > 0 && (
        <p className="mt-3 text-xs text-ink-soft">
          {compactNumber(views)} views reported across {reported.length} of{" "}
          {live.length} live posts, self-reported by the creators. Clicks and
          leads above are ours.
        </p>
      )}
    </>
  );
}

/** Everything waiting on a decision, and the recent bookings beside it. */
async function Panels({ brandId }: { brandId: string }) {
  const { account } = await requireBrand();

  // The seeded counterparties answer on a page load by whoever is waiting.
  await runAutoResponses();

  const [bookings, offerCounts, applicationCount, balance, unread, campaignCount] =
    await Promise.all([
      prisma.booking.findMany({
        where: { brandId },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          status: true,
          postBy: true,
          agreedPriceCents: true,
          creator: { select: { displayName: true } },
          campaign: { select: { name: true } },
        },
      }),
      prisma.offer.groupBy({
        by: ["status"],
        where: { brandId },
        _count: { _all: true },
      }),
      prisma.application.count({
        where: { campaign: { brandId }, status: "pending" },
      }),
      walletBalanceCents(account.id),
      unreadCountFor("brand", brandId),
      prisma.campaign.count({ where: { brandId } }),
    ]);

  const awaiting = offerCounts.find((c) => c.status === "offered")?._count._all ?? 0;
  const countered =
    offerCounts.find((c) => c.status === "countered")?._count._all ?? 0;

  const todo = [
    balance <= 0 && {
      label: "Top up your wallet",
      note: "An offer holds funds at acceptance, so a booking needs a balance.",
      badge: "Blocked" as const,
      href: "/brand/billing",
    },
    countered > 0 && {
      label: `Answer ${countered} counter-offer${countered === 1 ? "" : "s"}`,
      note: "The creator moved the price inside their band. Take it or leave it.",
      badge: "Waiting on you" as const,
      href: "/brand/offers",
    },
    applicationCount > 0 && {
      label: `Review ${applicationCount} application${applicationCount === 1 ? "" : "s"}`,
      note: "Creators who found your campaign and asked to be on it.",
      badge: "Waiting on you" as const,
      href: "/brand/offers",
    },
    unread > 0 && {
      label: `Read ${unread} message${unread === 1 ? "" : "s"}`,
      note: "A creator wrote on one of your bookings.",
      badge: "Waiting on you" as const,
      href: "/brand/messages",
    },
    campaignCount === 0 && {
      label: "Create your first campaign",
      note: "A brief is what the matcher and every offer are scored against.",
      badge: "Suggested" as const,
      href: "/brand/campaigns/new",
    },
    bookings.length === 0 && {
      label: "Find creators for your brief",
      note: "The shortlist is scored against your own campaign, with reasons.",
      badge: "Suggested" as const,
      href: "/brand/matching",
    },
  ].filter(Boolean) as {
    label: string;
    note: string;
    badge: "Blocked" | "Waiting on you" | "Suggested";
    href: string;
  }[];

  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
      <section className="rounded-panel border border-line bg-surface">
        <header className="flex items-baseline justify-between border-b border-line px-6 py-4">
          <div>
            <h2 className="font-display text-xl">To do</h2>
            <p className="text-xs text-ink-soft">
              Everything that is waiting on you, in order.
            </p>
          </div>
          {awaiting > 0 && (
            <span className="text-xs text-ink-soft">
              {awaiting} offer{awaiting === 1 ? "" : "s"} out
            </span>
          )}
        </header>
        {todo.length === 0 ? (
          <p className="px-6 py-8 text-sm text-ink-soft">
            Nothing is waiting on you. Offers are out and the creators have 48
            hours each.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {todo.map((t) => (
              <li key={t.label}>
                <Link
                  href={t.href}
                  className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-surface-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{t.label}</p>
                    <p className="text-sm text-ink-soft">{t.note}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-medium ${
                      t.badge === "Blocked"
                        ? "bg-danger-soft text-danger"
                        : t.badge === "Waiting on you"
                          ? "bg-brand-soft text-brand-strong"
                          : "bg-surface-3 text-ink-soft"
                    }`}
                  >
                    {t.badge}
                  </span>
                  <span aria-hidden className="text-ink-mute">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-panel border border-line bg-surface">
        <header className="flex items-baseline justify-between border-b border-line px-6 py-4">
          <h2 className="font-display text-xl">Bookings</h2>
          <Link
            href="/brand/campaigns"
            className="text-sm font-medium text-brand hover:text-brand-strong"
          >
            All campaigns →
          </Link>
        </header>
        {bookings.length === 0 ? (
          <p className="px-6 py-8 text-sm text-ink-soft">
            An accepted offer becomes a booking here, with its tracking link and
            its post.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {bookings.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/brand/bookings/${b.id}`}
                  className="flex items-center gap-3 px-6 py-3.5 transition-colors hover:bg-surface-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{b.creator.displayName}</p>
                    <p className="truncate text-xs text-ink-soft">
                      {b.campaign.name} · post by {formatDay(b.postBy)}
                    </p>
                  </div>
                  <span className="shrink-0 font-display font-semibold tabular-nums">
                    {formatEuros(b.agreedPriceCents)}
                  </span>
                  <span className="w-20 shrink-0 text-right text-[11px] uppercase tracking-wide text-ink-soft">
                    {b.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
