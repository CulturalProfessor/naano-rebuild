import Link from "next/link";
import { requireCreator } from "@/lib/auth";
import { offersForCreator, isLive } from "@/lib/offers";
import { prisma } from "@/lib/db";
import { AppHeader } from "@/components/app-header";
import { OfferRow, type InboxOffer } from "./offer-row";
import { formatDay, formatDayTime, requestNow } from "@/lib/dates";
import { formatEuros } from "@/lib/pricing";

export const metadata = { title: "Creator studio — naano" };

export default async function CreatorHome() {
  const { account, creator } = await requireCreator();

  const [offers, bookings] = await Promise.all([
    offersForCreator(creator.id),
    prisma.booking.findMany({
      where: { creatorId: creator.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        agreedPriceCents: true,
        postBy: true,
        status: true,
        postUrl: true,
        trackingCode: true,
        brand: { select: { name: true } },
        campaign: { select: { name: true } },
      },
    }),
  ]);

  const serverNow = requestNow();
  // A countered offer is not answered and it is not waiting on the creator
  // either. Burying it with the expired ones loses the one thing the creator
  // wants to know, which is that the ball is in the brand's court.
  const live = offers.filter(isLive);
  const waiting = offers.filter(
    (o) => o.status === "countered" && o.expiresAt.getTime() > serverNow,
  );
  const answered = offers.filter((o) => !live.includes(o) && !waiting.includes(o));

  const toRow = (o: (typeof offers)[number]): InboxOffer => ({
    id: o.id,
    listPriceCents: o.listPriceCents,
    offerPriceCents: o.offerPriceCents,
    counterPriceCents: o.counterPriceCents,
    discountPct: o.discountPct,
    postBy: formatDay(o.postBy),
    expiresAt: o.expiresAt.toISOString(),
    expiresLabel: formatDayTime(o.expiresAt),
    status: o.status,
    note: o.note,
    brandName: o.brand.name,
    brandAutoRespond: o.brand.autoRespond,
    campaignName: o.campaign.name,
    briefProduct: o.campaign.briefProduct,
    briefAudience: o.campaign.briefAudience,
    briefGuardrail: o.campaign.briefGuardrail,
    bookingId: o.booking?.id ?? null,
  });

  return (
    <>
      <AppHeader accountId={account.id} role="creator" active="/creator" />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand">
              Creator studio
            </p>
            <h1 className="mt-1 font-display text-3xl">
              {creator.displayName}
            </h1>
          </div>
          <Link
            href={`/c/${creator.urlSlug}`}
            className="text-sm font-medium text-brand hover:text-brand-strong"
          >
            View my public card →
          </Link>
        </div>

        <section className="mt-10">
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-xl">Offers</h2>
            {live.length > 0 && (
              <span className="rounded-pill bg-brand px-2.5 py-0.5 text-xs font-medium text-white">
                {live.length} waiting
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            A brand has 48 hours of your attention and no more. Accept, counter
            inside your own price, or decline.
          </p>

          {offers.length === 0 ? (
            <div className="mt-4 rounded-panel border border-dashed border-line bg-surface p-8 text-center">
              <p className="font-display text-lg">No offers yet.</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">
                Your card is in the marketplace where brands browse it. You do
                not have to wait for one to find you.
              </p>
              <Link
                href={`/c/${creator.urlSlug}`}
                className="mt-4 inline-block rounded-card bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-strong"
              >
                See how brands see you
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {live.map((o) => (
                <OfferRow key={o.id} offer={toRow(o)} serverNow={serverNow} />
              ))}
              {waiting.map((o) => (
                <OfferRow key={o.id} offer={toRow(o)} serverNow={serverNow} />
              ))}
              {answered.length > 0 && (
                <details className="rounded-panel border border-line bg-surface-2 px-5 py-4">
                  <summary className="cursor-pointer text-sm font-medium text-ink-soft">
                    {answered.length} answered or expired
                  </summary>
                  <div className="mt-4 space-y-4">
                    {answered.map((o) => (
                      <OfferRow key={o.id} offer={toRow(o)} serverNow={serverNow} />
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </section>

        <section className="mt-12">
          <h2 className="font-display text-xl">Bookings</h2>
          {bookings.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">
              An accepted offer becomes a booking here, with the brief and your
              tracking link.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface">
              {bookings.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/creator/bookings/${b.id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 hover:bg-surface-2"
                  >
                    <span className="font-display font-semibold tracking-tight">
                      {b.brand.name}
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
