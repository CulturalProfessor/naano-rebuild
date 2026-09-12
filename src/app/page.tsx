import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/session";
import { homeFor } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatExactCount } from "@/lib/pricing";

/**
 * The page a stranger lands on.
 *
 * The counts below are real reads against the database rather than copy,
 * because the claim this page makes is that the marketplace is populated and
 * the tracking is ours. Printing a number we did not count would undercut the
 * one thing the rest of the product is careful about.
 */
export default async function Home() {
  const account = await currentAccount();
  if (account) redirect(homeFor(account));

  const [creators, campaigns, clicks, leads] = await Promise.all([
    prisma.creator.count({ where: { cardStatus: "live" } }),
    prisma.campaign.count({ where: { status: "open" } }),
    prisma.clickEvent.count(),
    prisma.lead.count(),
  ]);

  return (
    <main className="sky-bg grain min-h-screen">
      <div className="relative z-10 mx-auto max-w-4xl px-6 py-20">
        <p className="text-center font-display text-lg font-bold tracking-tight">
          naano
        </p>

        <h1 className="mt-12 text-center font-display text-5xl">
          The B2B LinkedIn creator marketplace.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-center text-lg text-ink-soft">
          Brands find vetted creators, brief them, and trace clicks and leads
          back to each post. Creators build a card, accept deals, and get paid.
        </p>

        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="rounded-card bg-brand px-6 py-3 text-center font-medium text-white transition-colors hover:bg-brand-strong"
          >
            Create an account
          </Link>
          <Link
            href="/marketplace"
            className="rounded-card border border-line bg-surface px-6 py-3 text-center font-medium text-ink transition-colors hover:border-ink-mute"
          >
            Browse the marketplace
          </Link>
        </div>

        <p className="mt-6 text-center text-sm text-ink-soft">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand">
            Sign in
          </Link>
        </p>

        <dl className="mt-16 grid grid-cols-2 gap-6 rounded-panel border border-line bg-surface/80 p-6 backdrop-blur sm:grid-cols-4">
          <Count label="Live cards" value={creators} />
          <Count label="Open campaigns" value={campaigns} />
          <Count label="Clicks tracked" value={clicks} />
          <Count label="Leads captured" value={leads} />
        </dl>

        <section className="mt-16 grid gap-6 sm:grid-cols-3">
          <Step
            n="01"
            title="Paste a profile"
            body="We read five public fields once, with consent: name, photo, headline, country and follower count. Your card is priced from the last of those before you have an opinion, and you can change it."
          />
          <Step
            n="02"
            title="Take the deal"
            body="A brand offers inside a fixed discount band with a post-by date and a 48-hour clock. Accept, counter inside your own price, or decline."
          />
          <Step
            n="03"
            title="Get paid on what moved"
            body="Post with your tracking link. Clicks and leads are counted by naano, views are yours and are labelled as yours, and the payout lands with a ledger that explains it."
          />
        </section>

        <p className="mx-auto mt-16 max-w-2xl text-center text-ink-soft">
          Sign up with your own public LinkedIn profile. The card you get is the
          card in the grid.
        </p>
      </div>
    </main>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <dd className="font-display text-3xl font-semibold tracking-tight">
        {formatExactCount(value)}
      </dd>
      <dt className="mt-0.5 text-xs uppercase tracking-wide text-ink-soft">
        {label}
      </dt>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-panel border border-line bg-surface p-5">
      <p className="font-display text-sm text-ink-mute">{n}</p>
      <h2 className="mt-1 font-display text-lg">{title}</h2>
      <p className="mt-2 text-sm text-ink-soft">{body}</p>
    </div>
  );
}
