import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketplaceCard } from "@/components/marketplace-card";
import { getCreatorBySlug } from "@/lib/queries";
import { deriveCpmCents, formatEuros, compactNumber, DASH, DEFAULT_POST_BY_DAYS } from "@/lib/pricing";
import { currentAccount } from "@/lib/session";
import { openCampaignsForBrand } from "@/lib/offers";
import { daysFromNow, isoDate } from "@/lib/dates";
import { OfferModal } from "@/components/offer-modal";

export default async function PublicCardPage({ params }: PageProps<"/c/[slug]">) {
  const { slug } = await params;
  const [creator, viewer] = await Promise.all([
    getCreatorBySlug(slug),
    currentAccount(),
  ]);
  if (!creator) notFound();

  // A signed-in brand gets the booking flow in place of the signup call to
  // action. Everyone else gets the invitation.
  const campaigns =
    viewer?.role === "brand" && viewer.brand
      ? await openCampaignsForBrand(viewer.brand.id)
      : [];

  const cpm = deriveCpmCents(creator.pricePerPostCents, creator.medianViews);
  const postsWithUs = creator.bookings.length;

  return (
    <main className="sky-bg grain min-h-screen">
      <div className="relative z-10 mx-auto grid max-w-5xl gap-10 px-6 py-14 lg:grid-cols-[380px_1fr]">
        <div>
          <MarketplaceCard
            creator={{
              displayName: creator.displayName,
              headline: creator.headline,
              avatarUrl: creator.avatarUrl,
              country: creator.country,
              countryCode: creator.countryCode,
              industries: creator.industries,
              followerCount: creator.followerCount,
              medianViews: creator.medianViews,
              pricePerPostCents: creator.pricePerPostCents,
              dataState: creator.dataState,
              bundle: creator.bundle,
            }}
          />
        </div>

        <div>
          <Link href="/marketplace" className="text-sm text-ink-soft hover:text-ink">
            ← Back to the marketplace
          </Link>
          <h1 className="mt-3 font-display text-4xl">{creator.displayName}</h1>
          <p className="mt-2 text-ink-soft">{creator.headline}</p>

          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
            <Stat label="Followers" value={compactNumber(creator.followerCount)} />
            <Stat
              label="Median views"
              value={creator.medianViews ? compactNumber(creator.medianViews) : DASH}
              note={creator.medianViews ? "self-reported" : "no post history yet"}
            />
            <Stat label="Price per post" value={formatEuros(creator.pricePerPostCents)} />
            <Stat
              label="CPM"
              value={cpm === null ? DASH : formatEuros(cpm)}
              note={cpm === null ? "needs median views" : "derived"}
            />
            <Stat label="Posts with naano" value={String(postsWithUs)} />
            <Stat label="Country" value={creator.country} />
          </dl>

          <div className="mt-8 rounded-panel border border-line bg-surface p-5">
            <p className="text-sm font-medium">How this card is built</p>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
              <li>
                Name, photo, headline, country and follower count were read once
                from a public LinkedIn profile, with consent.
              </li>
              <li>
                Price is derived from follower count and can be changed by the
                creator at any time.
              </li>
              <li>
                CPM is derived from price and median views. It shows a dash when
                there is no post history, rather than an estimate.
              </li>
              <li>
                {creator.verificationState === "verified"
                  ? "Profile ownership is verified."
                  : "Profile ownership is not verified in this build."}
              </li>
            </ul>
          </div>

          <div className="mt-6">
            {viewer?.role === "brand" && campaigns.length > 0 ? (
              <OfferModal
                creator={{
                  id: creator.id,
                  displayName: creator.displayName,
                  avatarUrl: creator.avatarUrl,
                  headline: creator.headline,
                  pricePerPostCents: creator.pricePerPostCents,
                  autoRespond: creator.autoRespond,
                  bundle: creator.bundle,
                }}
                campaigns={campaigns}
                defaultPostBy={daysFromNow(DEFAULT_POST_BY_DAYS)}
                today={isoDate(new Date())}
                trigger={
                  <button className="rounded-card bg-brand px-5 py-3 font-medium text-white transition-colors hover:bg-brand-strong">
                    Book {creator.displayName.split(" ")[0]}
                  </button>
                }
              />
            ) : viewer?.role === "creator" ? (
              <Link href="/creator" className="font-medium text-brand">
                Back to your studio →
              </Link>
            ) : (
              <Link
                href="/register/brand"
                className="inline-block rounded-card bg-brand px-5 py-3 font-medium text-white transition-colors hover:bg-brand-strong"
              >
                Book {creator.displayName.split(" ")[0]}
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-soft">{label}</dt>
      <dd
        className={`font-display text-2xl font-semibold tracking-tight ${
          value === DASH ? "text-ink-mute" : ""
        }`}
      >
        {value}
      </dd>
      {note && <p className="text-xs text-ink-mute">{note}</p>}
    </div>
  );
}
