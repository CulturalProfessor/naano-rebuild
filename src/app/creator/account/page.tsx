import Link from "next/link";
import { requireCreator } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CreatorAccountForm } from "./account-form";
import { derivePricePerPostCents, compactNumber } from "@/lib/pricing";

export const metadata = { title: "My card — naano" };

export default async function CreatorAccount() {
  const { creator } = await requireCreator();

  const row = await prisma.creator.findUniqueOrThrow({
    where: { id: creator.id },
    select: {
      displayName: true,
      headline: true,
      avatarUrl: true,
      country: true,
      countryCode: true,
      industries: true,
      followerCount: true,
      medianViews: true,
      pricePerPostCents: true,
      dataState: true,
      cardStatus: true,
      urlSlug: true,
      linkedinUrl: true,
      taxProfileComplete: true,
      bundles: {
        where: { isPrimary: true },
        take: 1,
        select: { postCount: true, totalPriceCents: true },
      },
    },
  });

  const bundle = row.bundles[0] ?? null;

  return (
    <>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl">My card</h1>
            <p className="mt-1 text-ink-soft">
              Everything a brand sees, and everything you can change about it.
            </p>
          </div>
          <Link
            href={`/c/${row.urlSlug}`}
            className="shrink-0 rounded-card border border-line bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:border-ink-mute"
          >
            View my public card
          </Link>
        </div>

        <div className="mt-8">
          <CreatorAccountForm
            derivedPriceEuros={Math.round(
              derivePricePerPostCents(row.followerCount) / 100,
            )}
            base={{
              displayName: row.displayName,
              headline: row.headline,
              avatarUrl: row.avatarUrl,
              country: row.country,
              countryCode: row.countryCode,
              industries: row.industries,
              followerCount: row.followerCount,
              medianViews: row.medianViews,
              pricePerPostCents: row.pricePerPostCents,
              dataState: row.dataState,
              bundle,
            }}
            initial={{
              headline: row.headline ?? "",
              industries: row.industries,
              priceEuros: String(row.pricePerPostCents / 100),
              live: row.cardStatus === "live",
              bundleCount: bundle ? String(bundle.postCount) : "",
              bundleTotal: bundle ? String(bundle.totalPriceCents / 100) : "",
            }}
          />
        </div>

        <section className="mt-12 rounded-panel border border-line bg-surface p-6">
          <h2 className="font-display text-xl">Read once, not editable</h2>
          <p className="mt-1 text-sm text-ink-soft">
            These came from the one profile read you authorised. The card says
            so in public, so changing them by hand here would make that line a
            lie.
          </p>
          <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-3">
            <Fact label="Name on the card" value={row.displayName} />
            <Fact label="Followers" value={compactNumber(row.followerCount)} />
            <Fact label="Country" value={row.country} />
            <Fact
              label="LinkedIn"
              value={row.linkedinUrl.replace(/^https?:\/\/(www\.)?/, "")}
            />
            <Fact
              label="Ownership"
              value="Not verified"
              note="no verification in this build"
            />
            <Fact
              label="Tax profile"
              value={row.taxProfileComplete ? "Confirmed" : "Not yet"}
              note="confirmed at your first withdrawal"
            />
          </dl>
        </section>

        <p className="mt-8 rounded-card border border-line bg-surface-3 px-4 py-3 text-xs text-ink-soft">
          There is no password change and no email change in this build, and no
          way to delete the account. All three need email delivery to do safely,
          and there is no sending domain here. Named in the README rather than
          half-built.
        </p>
      </main>
    </>
  );
}

function Fact({
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
      <dt className="text-xs uppercase tracking-wide text-ink-soft">{label}</dt>
      <dd className="mt-0.5 break-words font-medium">{value}</dd>
      {note && <p className="text-xs text-ink-mute">{note}</p>}
    </div>
  );
}
