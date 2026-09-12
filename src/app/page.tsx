import Link from "next/link";
import { currentAccount } from "@/lib/session";
import { homeFor } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const account = await currentAccount();
  if (account) redirect(homeFor(account));

  return (
    <main className="sky-bg grain min-h-screen">
      <div className="relative z-10 mx-auto max-w-3xl px-6 py-24 text-center">
        <p className="font-display text-lg font-bold tracking-tight">naano</p>
        <h1 className="mt-10 font-display text-5xl">
          The B2B LinkedIn creator marketplace.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-ink-soft">
          Brands find vetted creators, brief them, and trace clicks and leads
          back to each post. Creators build a card, accept deals, and get paid.
        </p>

        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="rounded-card bg-brand px-6 py-3 font-medium text-white transition-colors hover:bg-brand-strong"
          >
            Create an account
          </Link>
          <Link
            href="/marketplace"
            className="rounded-card border border-line bg-surface px-6 py-3 font-medium text-ink transition-colors hover:border-ink-mute"
          >
            Browse the marketplace
          </Link>
        </div>

        <p className="mt-6 text-sm text-ink-soft">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
