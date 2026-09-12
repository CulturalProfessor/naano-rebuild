import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBrand } from "@/lib/auth";
import { bookingForBrand, requestOrigin } from "@/lib/bookings";
import { AppHeader } from "@/components/app-header";
import { CopyField } from "@/components/copy-field";
import { formatEuros, compactNumber, deriveCpmCents, DASH } from "@/lib/pricing";
import { formatDay } from "@/lib/dates";

export const metadata = { title: "Booking — naano" };

export default async function BrandBooking({
  params,
}: PageProps<"/brand/bookings/[id]">) {
  const { id } = await params;
  const { account, brand } = await requireBrand();
  const [booking, origin] = await Promise.all([
    bookingForBrand(brand.id, id),
    requestOrigin(),
  ]);
  if (!booking) notFound();

  const views = booking.selfReportedViews;
  const cpm = deriveCpmCents(booking.agreedPriceCents, views);
  const clicks = booking._count.clicks;
  const leads = booking._count.leads;
  const cpl = leads > 0 ? Math.round(booking.agreedPriceCents / leads) : null;

  return (
    <>
      <AppHeader accountId={account.id} role="brand" active="/brand" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <Link href="/brand" className="text-sm text-ink-soft hover:text-ink">
          ← Back to campaigns
        </Link>

        <header className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link
              href={`/c/${booking.creator.urlSlug}`}
              className="font-display text-3xl hover:text-brand"
            >
              {booking.creator.displayName}
            </Link>
            <p className="mt-1 text-ink-soft">
              {booking.campaign.name} · post by {formatDay(booking.postBy)}
            </p>
          </div>
          <div className="text-right">
            <div className="font-display text-3xl font-semibold tracking-tight">
              {formatEuros(booking.agreedPriceCents)}
            </div>
            <p className="text-xs uppercase tracking-wide text-ink-soft">
              {booking.status}
            </p>
          </div>
        </header>

        <section className="mt-8 grid gap-5 rounded-panel border border-line bg-surface p-6 sm:grid-cols-3">
          <Stat
            label="Views"
            value={views ? compactNumber(views) : DASH}
            note={views ? "self-reported by the creator" : "the creator has not reported any"}
          />
          <Stat
            label="Clicks"
            value={booking.postUrl ? String(clicks) : DASH}
            note={booking.postUrl ? "measured by naano" : "starts when the post goes live"}
          />
          <Stat
            label="Leads"
            value={booking.postUrl ? String(leads) : DASH}
            note={booking.postUrl ? "measured by naano" : "starts when the post goes live"}
          />
          <Stat
            label="CPM"
            value={cpm === null ? DASH : formatEuros(cpm)}
            note={cpm === null ? "needs a view count" : "derived from price and views"}
          />
          <Stat
            label="Cost per lead"
            value={cpl === null ? DASH : formatEuros(cpl)}
            note={cpl === null ? "no leads yet" : "derived from price and leads"}
          />
          <Stat
            label="Posted"
            value={booking.postedAt ? formatDay(booking.postedAt) : DASH}
            note={booking.postedAt ? "" : "awaiting the creator"}
          />
        </section>

        <section className="mt-6 space-y-4 rounded-panel border border-line bg-surface p-6">
          <h2 className="font-display text-xl">The post</h2>
          {booking.postUrl ? (
            <a
              href={booking.postUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="block truncate text-sm font-medium text-brand hover:text-brand-strong"
            >
              {booking.postUrl}
            </a>
          ) : (
            <p className="text-sm text-ink-soft">
              {booking.creator.displayName} has not published yet. They have
              until {formatDay(booking.postBy)}.
            </p>
          )}
          <CopyField
            label="Tracking link"
            value={`${origin}/r/${booking.trackingCode}`}
          />
          <p className="text-xs text-ink-soft">
            Clicks and leads are counted through this link by naano. Views are
            the creator&apos;s own figure. The split is deliberate: we do not
            read LinkedIn, so we do not claim to have measured it.
          </p>
        </section>

        <section className="mt-6 space-y-4 rounded-panel border border-line bg-surface p-6">
          <h2 className="font-display text-xl">The brief they are working to</h2>
          <Block label="Product">{booking.campaign.briefProduct}</Block>
          <Block label="Audience">{booking.campaign.briefAudience}</Block>
          <p className="rounded-card bg-brand-soft px-4 py-3 text-sm">
            {booking.campaign.briefGuardrail}
          </p>
        </section>
      </main>
    </>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
        {label}
      </p>
      <p className="mt-0.5 text-sm">{children}</p>
    </div>
  );
}

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
        {label}
      </p>
      <p
        className={`font-display text-2xl font-semibold tracking-tight ${
          value === DASH ? "text-ink-mute" : ""
        }`}
      >
        {value}
      </p>
      {note && <p className="text-xs text-ink-mute">{note}</p>}
    </div>
  );
}
