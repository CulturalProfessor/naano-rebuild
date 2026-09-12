import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCreator } from "@/lib/auth";
import { bookingForCreator, requestOrigin } from "@/lib/bookings";
import { MessageThread } from "@/components/message-thread";
import { threadFor, markThreadRead } from "@/lib/messages";
import { CopyField } from "@/components/copy-field";
import { PostForm } from "./post-form";
import { formatEuros, compactNumber, DASH } from "@/lib/pricing";
import { formatDay, formatDayTime } from "@/lib/dates";

export const metadata = { title: "Booking · naano" };

export default async function CreatorBooking({
  params,
}: PageProps<"/creator/bookings/[id]">) {
  const { id } = await params;
  const { creator } = await requireCreator();
  const [booking, origin] = await Promise.all([
    bookingForCreator(creator.id, id),
    requestOrigin(),
  ]);
  if (!booking) notFound();

  // Opening the booking is opening the thread, so the badge clears here too.
  const conversation = await threadFor("creator", creator.id, booking.id);
  const thread = conversation?.messages ?? [];
  await markThreadRead("creator", creator.id, booking.id);

  const trackingUrl = `${origin}/r/${booking.trackingCode}`;

  return (
    <>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <Link href="/creator" className="text-sm text-ink-soft hover:text-ink">
          ← Back to the studio
        </Link>

        <header className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl">{booking.brand.name}</h1>
            <p className="mt-1 text-ink-soft">
              {booking.campaign.name} · post by {formatDay(booking.postBy)}
            </p>
            {booking.brand.autoRespond && (
              <span className="mt-2 inline-block rounded-pill bg-surface-3 px-2.5 py-0.5 text-[11px] text-ink-soft">
                Demo brand · responds automatically
              </span>
            )}
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

        <section className="mt-8 space-y-4 rounded-panel border border-line bg-surface p-6">
          <h2 className="font-display text-xl">The brief</h2>
          <Block label="Product">{booking.campaign.briefProduct}</Block>
          <Block label="Audience">{booking.campaign.briefAudience}</Block>
          <p className="rounded-card bg-brand-soft px-4 py-3 text-sm">
            {booking.campaign.briefGuardrail}
          </p>
        </section>

        <section className="mt-6 space-y-5 rounded-panel border border-line bg-surface p-6">
          <div>
            <h2 className="font-display text-xl">Your tracking link</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Put this in the post instead of the brand&apos;s own URL. Every
              click through it is attributed to you, and it is the only number
              in this product that neither of you has to take on trust.
            </p>
          </div>
          <CopyField label="Tracking link" value={trackingUrl} />
        </section>

        <section className="mt-6 rounded-panel border border-line bg-surface p-6">
          <h2 className="font-display text-xl">Publish</h2>
          <p className="mb-4 mt-1 text-sm text-ink-soft">
            Post on LinkedIn with the tracking link, then paste the post URL
            here so the brand can see it go live.
          </p>
          <PostForm
            bookingId={booking.id}
            postUrl={booking.postUrl}
            views={booking.selfReportedViews}
          />
        </section>

        <section className="mt-6 grid gap-4 rounded-panel border border-line bg-surface p-6 sm:grid-cols-3">
          <Stat
            label="Views"
            value={
              booking.selfReportedViews
                ? compactNumber(booking.selfReportedViews)
                : DASH
            }
            note="self-reported"
          />
          <Stat
            label="Clicks"
            value={booking.postUrl ? String(booking._count.clicks) : DASH}
            note={booking.postUrl ? "measured by naano" : "starts when you post"}
          />
          <Stat
            label="Leads"
            value={booking.postUrl ? String(booking._count.leads) : DASH}
            note={booking.postUrl ? "measured by naano" : "starts when you post"}
          />
        </section>

        {booking.payout && (
          <section className="mt-6 rounded-panel border border-line bg-surface p-6">
            <h2 className="font-display text-xl">Payout</h2>
            <p className="mt-1 text-sm text-ink-soft">
              {formatEuros(booking.payout.amountCents)} ·{" "}
              {booking.payout.status === "paid"
                ? "paid"
                : `scheduled for ${formatDay(booking.payout.scheduledFor)}`}
            </p>
          </section>
        )}

        {/* The thread, in place. The conversation belongs next to the work it
            is about, not only in a separate inbox. */}
        <section className="mt-8 flex min-h-[26rem] flex-col overflow-hidden rounded-panel border border-line bg-surface-2">
          <header className="flex items-baseline justify-between gap-3 border-b border-line bg-surface px-5 py-4">
            <div>
              <h2 className="font-display text-xl">Messages</h2>
              <p className="text-xs text-ink-soft">
                Just you and {booking.brand.name}.
              </p>
            </div>
            <Link
              href="/creator/messages"
              className="shrink-0 text-sm font-medium text-brand hover:text-brand-strong"
            >
              All conversations →
            </Link>
          </header>
          <MessageThread
            bookingId={booking.id}
            viewerRole="creator"
            counterpartName={booking.brand.name}
            messages={thread.map((m) => ({
              id: m.id,
              body: m.body,
              senderRole: m.senderRole as "brand" | "creator",
              at: formatDayTime(m.createdAt),
            }))}
          />
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
      <p className="text-xs text-ink-mute">{note}</p>
    </div>
  );
}
