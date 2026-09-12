import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Create your creator account — naano" };

export default function CreatorSignupPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-10 sm:px-12 lg:px-16">
        <div className="mb-10 font-display text-lg font-bold tracking-tight">naano</div>
        <div className="mx-auto w-full max-w-md flex-1">
          <Link href="/register" className="mb-4 inline-block text-sm text-ink-soft hover:text-ink">
            ← Back
          </Link>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">
            Step 1 of 4
          </p>
          <h1 className="mt-2 font-display text-3xl">Create your account</h1>
          <p className="mt-3 text-ink-soft">
            Next you&apos;ll paste a public LinkedIn URL and we&apos;ll build your
            marketplace card from it.
          </p>
          <div className="mt-8">
            <AuthForm mode="signup" role="creator" cta="Continue" />
          </div>
        </div>
      </div>
      <div className="hidden flex-col justify-center bg-gradient-to-b from-sky-3 to-surface-2 px-12 lg:flex">
        <h2 className="font-display text-4xl">Your card is your storefront.</h2>
        <p className="mt-4 max-w-md text-ink-soft">
          One object: you build it, brands browse it. Your price is derived from
          your audience, so it works from the day you sign up.
        </p>
      </div>
    </div>
  );
}
