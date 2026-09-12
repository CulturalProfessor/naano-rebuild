import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBrand } from "@/lib/auth";
import { campaignDashboard, type PostRow } from "@/lib/dashboard";
import { CampaignStatusForm } from "./status-form";
import {
  formatEuros,
  formatMoneyMetric,
  formatCountMetric,
  formatExactCount,
  formatExactCountMetric,
  compactNumber,
  DASH,
  type Metric,
} from "@/lib/pricing";

export const metadata = { title: "Campaign · naano" };

export default async function CampaignDashboard({
  params,
}: PageProps<"/brand/campaigns/[id]">) {
  const { id } = await params;
  const { brand } = await requireBrand();
  const data = await campaignDashboard(brand.id, id);
  if (!data) notFound();

  const { campaign, posts, totals } = data;

  return (
    <>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <Link href="/brand/campaigns" className="text-sm text-ink-soft hover:text-ink">
          ← Back to campaigns
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-3xl">{campaign.name}</h1>
              <span
                className={`rounded-pill px-3 py-1 text-xs font-medium ${
                  campaign.status === "open"
                    ? "bg-success-soft text-ink"
                    : "bg-surface-3 text-ink-soft"
                }`}
              >
                {campaign.status}
              </span>
            </div>
            <p className="mt-1 text-ink-soft">
              {totals.bookings} booking{totals.bookings === 1 ? "" : "s"} ·{" "}
              {totals.livePosts} live post{totals.livePosts === 1 ? "" : "s"}
              {campaign.budgetCapCents != null &&
                ` · cap ${formatEuros(campaign.budgetCapCents)} per post`}
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            <Link
              href={`/brand/campaigns/${campaign.id}/edit`}
              className="rounded-card border border-line bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:border-ink-mute"
            >
              Edit the brief
            </Link>
            <Link
              href={`/brand/matching?campaign=${campaign.id}`}
              className="rounded-card bg-brand px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-strong"
            >
              Find creators
            </Link>
          </div>
        </div>

        {/* measured */}
        <section className="mt-8">
          <SectionLabel
            title="Measured by naano"
            note="Counted through the tracking link in each post. Nobody has to take these on trust."
          />
          <div className="mt-3 grid gap-4 rounded-panel border border-line bg-surface p-6 sm:grid-cols-3">
            <Tile label="Clicks" metric={totals.clicks} kind="exact" />
            <Tile label="Leads" metric={totals.leads} kind="exact" />
            <Tile
              label="Cost per lead"
              metric={totals.cplCents}
              kind="money"
              note={totals.cplCents.known ? "cost ÷ leads" : "no leads yet"}
            />
          </div>
        </section>

        {/* reported */}
        <section className="mt-6">
          <SectionLabel
            title="Self-reported by creators"
            note="naano does not read LinkedIn. Views are each creator's own figure, and this is where we say so."
          />
          <div className="mt-3 grid gap-4 rounded-panel border border-line bg-surface p-6 sm:grid-cols-3">
            <Tile
              label="Views"
              metric={totals.views}
              kind="count"
              note={
                totals.views.known
                  ? `reported on ${totals.viewsReportedBy} of ${totals.livePosts} live post${totals.livePosts === 1 ? "" : "s"}`
                  : "no creator has reported yet"
              }
            />
            <Tile
              label="CPM"
              metric={totals.cpmCents}
              kind="money"
              note={totals.cpmCents.known ? "cost ÷ views × 1000" : "needs a view count"}
            />
            <Tile
              label="Committed cost"
              metric={{ known: true, value: totals.costCents }}
              kind="money"
              note="agreed prices, frozen at acceptance"
            />
          </div>
        </section>

        {/* assumed */}
        <section className="mt-6">
          <SectionLabel
            title="Estimated, on a stated assumption"
            note="We cannot see your CRM. This is lead count times the deal value you told us, and the multiplier stays on screen."
          />
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4 rounded-panel border border-line bg-surface p-6">
            <Tile
              label="Estimated pipeline"
              metric={totals.pipelineCents}
              kind="money"
            />
            <p className="rounded-card bg-surface-3 px-4 py-2.5 text-sm text-ink-soft">
              {formatExactCountMetric(totals.leads)} leads ×{" "}
              {formatEuros(campaign.assumedDealValueCents)} assumed deal value
            </p>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl">Posts</h2>
          {posts.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">
              No bookings on this campaign yet.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-panel border border-line bg-surface">
              <table className="w-full min-w-[52rem] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[11px] uppercase tracking-widest text-ink-soft">
                    <Th>Creator</Th>
                    <Th>Status</Th>
                    <Th right>Cost</Th>
                    <Th right>Views</Th>
                    <Th right>Clicks</Th>
                    <Th right>Leads</Th>
                    <Th right>CPM</Th>
                    <Th right>CPL</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {posts.map((p) => (
                    <Row key={p.bookingId} post={p} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-ink-soft">
            A dash is a number we do not have. It is never a zero: zero clicks
            on a live post is a measurement, and no post yet is not.
          </p>
        </section>
        <section className="mt-10 rounded-panel border border-line bg-surface p-6">
          <h2 className="font-display text-xl">Campaign status</h2>
          <div className="mt-4">
            <CampaignStatusForm
              campaignId={campaign.id}
              status={campaign.status}
              bookingCount={totals.bookings}
            />
          </div>
        </section>
      </main>
    </>
  );
}

function Row({ post }: { post: PostRow }) {
  return (
    <tr className="hover:bg-surface-2">
      <td className="px-4 py-3">
        <Link
          href={`/brand/bookings/${post.bookingId}`}
          className="font-medium hover:text-brand"
        >
          {post.creatorName}
        </Link>
      </td>
      <td className="px-4 py-3 text-ink-soft">{post.status}</td>
      <Td>{formatEuros(post.costCents)}</Td>
      <Td metric={post.views}>{formatCountMetric(post.views)}</Td>
      <Td metric={post.clicks}>{formatExactCountMetric(post.clicks)}</Td>
      <Td metric={post.leads}>{formatExactCountMetric(post.leads)}</Td>
      <Td metric={post.cpmCents}>{formatMoneyMetric(post.cpmCents)}</Td>
      <Td metric={post.cplCents}>{formatMoneyMetric(post.cplCents)}</Td>
    </tr>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-4 py-2.5 font-semibold ${right ? "text-right" : ""}`}>
      {children}
    </th>
  );
}

function Td({
  children,
  metric,
}: {
  children: React.ReactNode;
  metric?: Metric;
}) {
  const muted = metric && !metric.known;
  return (
    <td
      className={`px-4 py-3 text-right tabular-nums ${muted ? "text-ink-mute" : ""}`}
    >
      {children}
    </td>
  );
}

function SectionLabel({ title, note }: { title: string; note: string }) {
  return (
    <div>
      <h2 className="text-[11px] font-semibold uppercase tracking-widest text-brand">
        {title}
      </h2>
      <p className="mt-0.5 max-w-2xl text-sm text-ink-soft">{note}</p>
    </div>
  );
}

function Tile({
  label,
  metric,
  kind,
  note,
}: {
  label: string;
  metric: Metric;
  kind: "money" | "count" | "exact";
  note?: string;
}) {
  const value =
    kind === "money"
      ? formatMoneyMetric(metric)
      : !metric.known
        ? DASH
        : kind === "exact"
          ? formatExactCount(metric.value)
          : compactNumber(metric.value);
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
        {label}
      </p>
      <p
        className={`font-display text-3xl font-semibold tracking-tight ${
          metric.known ? "" : "text-ink-mute"
        }`}
      >
        {value}
      </p>
      {!metric.known && (
        <span className="mt-1 inline-block h-1 w-16 rounded-pill bg-line" />
      )}
      {note && <p className="mt-1 text-xs text-ink-mute">{note}</p>}
    </div>
  );
}
