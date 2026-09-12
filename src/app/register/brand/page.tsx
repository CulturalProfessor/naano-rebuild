import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Create your brand account — naano" };

export default function BrandSignupPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-10 sm:px-12 lg:px-16">
        <div className="mb-10 font-display text-lg font-bold tracking-tight">naano</div>
        <div className="mx-auto w-full max-w-md flex-1">
          <Link href="/register" className="mb-4 inline-block text-sm text-ink-soft hover:text-ink">
            ← Back
          </Link>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">
            Step 1 of 2
          </p>
          <h1 className="mt-2 font-display text-3xl">Create your account</h1>
          <p className="mt-3 text-ink-soft">
            Next you&apos;ll name your company and we&apos;ll turn it into your
            first campaign brief.
          </p>
          <div className="mt-8">
            <AuthForm mode="signup" role="brand" cta="Continue" />
          </div>
        </div>
      </div>
      <div className="hidden flex-col justify-center bg-brand px-12 text-white lg:flex">
        <h2 className="font-display text-4xl text-white">Creators. Brands. Results.</h2>
        <p className="mt-4 max-w-md text-white/80">
          Run LinkedIn creator campaigns that drive real business. Discover
          creators, track performance, pay in one click.
        </p>
      </div>
    </div>
  );
}
