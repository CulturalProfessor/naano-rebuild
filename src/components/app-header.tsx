import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { SubmitButton } from "@/components/action-button";
import { walletBalanceCents } from "@/lib/money";
import { formatEuros } from "@/lib/pricing";

/**
 * The signed-in header. The wallet chip is a sum over the ledger, computed on
 * every render rather than read from a column, which is the same rule the rest
 * of the money in this product follows.
 */
export async function AppHeader({
  accountId,
  role,
  active,
}: {
  accountId: string;
  role: "creator" | "brand";
  active?: string;
}) {
  const balance = await walletBalanceCents(accountId);

  const links =
    role === "brand"
      ? [
          { href: "/brand", label: "Campaigns" },
          { href: "/brand/matching", label: "AI matching" },
          { href: "/marketplace", label: "Marketplace" },
          { href: "/brand/offers", label: "Offers" },
        ]
      : [
          { href: "/creator", label: "Studio" },
          { href: "/creator/opportunities", label: "Opportunities" },
          { href: "/creator/earnings", label: "Earnings" },
          { href: "/marketplace", label: "Marketplace" },
        ];

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur">
      {/* On a narrow screen the nav drops to its own row rather than pushing
          the wallet and sign-out off the right edge. */}
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-6 py-3">
        <Link
          href={role === "brand" ? "/brand" : "/creator"}
          className="font-display text-lg font-bold tracking-tight"
        >
          naano
        </Link>

        <nav className="order-last -mx-1 flex w-full items-center gap-1 overflow-x-auto text-sm sm:order-none sm:mx-0 sm:w-auto sm:overflow-visible">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`shrink-0 rounded-pill px-3 py-1.5 transition-colors ${
                active === l.href
                  ? "bg-brand-soft font-medium text-brand-strong"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span
            className="rounded-pill border border-line px-3 py-1.5 text-sm tabular-nums"
            title={
              role === "brand"
                ? "Play money. Every balance is a sum over the ledger."
                : "Earnings credited, minus what has been paid out."
            }
          >
            {formatEuros(balance)}
          </span>
          <form action={signOut}>
            <SubmitButton variant="quiet" size="sm" pendingLabel="Signing out…">
              Sign out
            </SubmitButton>
          </form>
        </div>
      </div>
    </header>
  );
}
