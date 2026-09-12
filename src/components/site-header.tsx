import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { currentAccount } from "@/lib/session";

/**
 * The header for the two pages that are public but also part of the app.
 *
 * The marketplace and a creator's card are in the signed-in nav AND are the
 * pages a stranger is most likely to land on cold. They used to render with no
 * chrome at all, which meant a brand who clicked Marketplace from their
 * campaigns had no way back short of the browser button, and a stranger
 * browsing cards had no way to sign up.
 *
 * So: whoever is looking gets the header that belongs to them. Signed in, that
 * is the same nav as every other app screen, wallet chip and all. Signed out,
 * it is the wordmark and the two ways in.
 */
export async function SiteHeader({ active }: { active?: string }) {
  const viewer = await currentAccount();

  if (viewer) {
    return <AppHeader role={viewer.role} />;
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-x-5 px-6 py-3">
        <Link href="/" className="font-display text-lg font-bold tracking-tight">
          naano
        </Link>
        {/* The two ways in matter more than this link at 375, where all
            three together wrap into three lines of stacked words. */}
        <Link
          href="/marketplace"
          className={`hidden shrink-0 rounded-pill px-3 py-1.5 text-sm transition-colors sm:inline-block ${
            active === "/marketplace"
              ? "bg-brand-soft font-medium text-brand-strong"
              : "text-ink-soft hover:text-ink"
          }`}
        >
          Marketplace
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/login"
            className="shrink-0 whitespace-nowrap text-sm text-ink-soft hover:text-ink"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="shrink-0 whitespace-nowrap rounded-pill bg-brand px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-strong"
          >
            <span className="sm:hidden">Sign up</span>
            <span className="hidden sm:inline">Create an account</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
