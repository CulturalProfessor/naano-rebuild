import Link from "next/link";
import { requireBrand } from "@/lib/auth";
import { offersForBrand, isLive } from "@/lib/offers";
import { AppHeader } from "@/components/app-header";
import { Countdown } from "@/components/countdown";
import { formatEuros } from "@/lib/pricing";
import { formatDay, formatDayTime, requestNow } from "@/lib/dates";
import { CounterActions } from "./counter-actions";

export const metadata = { title: "Offers — naano" };

const STATUS_COPY: Record<string, string> = {
  offered: "Awaiting response",
  countered: "Countered",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
};

export default async function BrandOffers() {
  const { account, brand } = await requireBrand();
  const offers = await offersForBrand(brand.id);
  const serverNow = requestNow();

  return (
    <>
      <AppHeader accountId={account.id} role="brand" active="/brand/offers" />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <h1 className="font-display text-3xl">Offers</h1>
        <p className="mt-1 text-ink-soft">
          Every offer you have sent. A creator has 48 hours to answer, after
          which the slot frees and they are bookable again.
        </p>

        {offers.length === 0 ? (
          <div className="mt-8 rounded-panel border border-dashed border-line bg-surface p-10 text-center">
            <p className="font-display text-lg">No offers sent yet.</p>
            <p className="mt-1 text-sm text-ink-soft">
              Open a creator&apos;s card in the marketplace and book them.
            </p>
            <Link
              href="/marketplace"
              className="mt-4 inline-block rounded-card bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-strong"
            >
              Browse the marketplace
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {offers.map((o) => {
              const waiting = isLive(o);
              const displayStatus =
                o.status === "offered" && !waiting ? "expired" : o.status;
              return (
                <article
                  key={o.id}
                  className="rounded-panel border border-line bg-surface shadow-[var(--shadow-card)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
                    <div className="min-w-0">
                      <Link
                        href={`/c/${o.creator.urlSlug}`}
                        className="font-display text-lg font-semibold tracking-tight hover:text-brand"
                      >
                        {o.creator.displayName}
                      </Link>
                      {o.creator.autoRespond && (
                        <span className="ml-2 rounded-pill bg-surface-3 px-2 py-0.5 text-[11px] text-ink-soft">
                          Demo creator · responds automatically
                        </span>
                      )}
                      <p className="text-sm text-ink-soft">
                        {o.campaign.name} · post by {formatDay(o.postBy)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-xl font-semibold tracking-tight">
                        {formatEuros(o.offerPriceCents)}
                      </div>
                      {o.discountPct > 0 && (
                        <p className="text-xs text-ink-soft">
                          {o.discountPct}% off {formatEuros(o.listPriceCents)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line px-5 py-3 text-sm">
                    <span className="text-ink-soft">
                      {STATUS_COPY[displayStatus] ?? displayStatus}
                    </span>
                    {waiting && (
                      <span className="text-ink-soft">
                        answers within{" "}
                        <Countdown
                          expiresAt={o.expiresAt.toISOString()}
                          serverNow={serverNow}
                          expiresLabel={formatDayTime(o.expiresAt)}
                        />
                      </span>
                    )}
                    {o.booking && (
                      <Link
                        href={`/brand/bookings/${o.booking.id}`}
                        className="ml-auto font-medium text-brand hover:text-brand-strong"
                      >
                        Open the booking →
                      </Link>
                    )}
                  </div>

                  {o.note && o.status !== "offered" && (
                    <p className="mx-5 mb-4 rounded-card bg-surface-3 px-4 py-3 text-sm text-ink-soft">
                      “{o.note}”
                    </p>
                  )}

                  {o.status === "countered" &&
                    o.counterPriceCents != null &&
                    o.expiresAt.getTime() > serverNow && (
                      <CounterActions
                        offerId={o.id}
                        counterPriceCents={o.counterPriceCents}
                        offerPriceCents={o.offerPriceCents}
                      />
                    )}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
