import Link from "next/link";

export const metadata = { title: "Create your account · naano" };

const ROLES = [
  {
    href: "/register/creator",
    title: "I'm a creator",
    body: "Get paid to create LinkedIn content for B2B brands you actually use.",
  },
  {
    href: "/register/brand",
    title: "I'm a brand",
    body: "Find creators, launch campaigns, and trace real pipeline back to each post.",
  },
];

export default function RegisterPage() {
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
          <h1 className="font-display text-3xl">Create your account</h1>
          <p className="mt-2 text-ink-soft">First, who are you here as?</p>

          <div className="mt-8 space-y-4">
            {ROLES.map((r) => (
              <Link
                key={r.href}
                href={r.href}
                className="block rounded-card border border-line bg-surface p-5 transition-colors hover:border-brand"
              >
                <p className="font-display text-lg font-semibold">{r.title}</p>
                <p className="mt-1 text-sm text-ink-soft">{r.body}</p>
              </Link>
            ))}
          </div>

          <p className="mt-8 text-sm text-ink-soft">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-brand">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden flex-col justify-center bg-brand px-12 text-white lg:flex">
        <h2 className="font-display text-4xl text-white">One platform. Two sides.</h2>
        <p className="mt-4 max-w-md text-white/80">
          Creators get paid to post. B2B brands get real pipeline. Pick where you
          fit and we&apos;ll set the rest up in a couple of minutes.
        </p>
      </div>
    </div>
  );
}
