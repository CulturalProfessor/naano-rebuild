import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Sign in · naano" };

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-10 sm:px-12 lg:px-16">
        <Link
          href="/"
          className="mb-16 inline-block font-display text-lg font-bold tracking-tight"
        >
          naano
        </Link>
        <div className="mx-auto w-full max-w-md flex-1">
          <h1 className="font-display text-3xl">Sign in</h1>
          <p className="mt-2 text-ink-soft">Welcome back.</p>
          <div className="mt-8">
            <AuthForm mode="signin" cta="Sign in" />
          </div>
          <p className="mt-8 text-sm text-ink-soft">
            No account yet?{" "}
            <Link href="/register" className="font-medium text-brand">
              Create one
            </Link>
          </p>
          <div className="mt-10 rounded-card border border-line bg-surface-3 p-4 text-sm">
            <p className="font-medium">Demo accounts</p>
            <p className="mt-1 text-ink-soft">
              Password <code className="text-ink">naano-demo</code> for all of them.
            </p>
            <ul className="mt-2 space-y-1 text-ink-soft">
              <li><code className="text-ink">orbisearch@demo.naano.test</code> is a brand</li>
              <li><code className="text-ink">priya-shah@demo.naano.test</code> is a creator with a live offer</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="hidden flex-col justify-center bg-gradient-to-b from-sky-3 to-surface-2 px-12 lg:flex">
        <h2 className="font-display text-4xl">One platform. Two sides.</h2>
        <p className="mt-4 max-w-md text-ink-soft">
          Creators get paid to post. B2B brands get real pipeline.
        </p>
      </div>
    </div>
  );
}
