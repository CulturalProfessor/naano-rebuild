import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { SubmitButton } from "@/components/action-button";
import { walletBalanceCents } from "@/lib/money";
import { unreadCountFor } from "@/lib/messages";
import { currentAccount } from "@/lib/session";
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
  const party = role === "brand" ? "brand" : "creator";
  // currentAccount already carries both ids and is memoised for this request,
  // so asking it here costs nothing. A second account lookup here was running
  // on every signed-in page.
  const viewer = await currentAccount();
  const partyId = party === "brand" ? viewer?.brand?.id : viewer?.creator?.id;

  const [balance, unread] = await Promise.all([
    walletBalanceCents(accountId),
    partyId ? unreadCountFor(party, partyId) : Promise.resolve(0),
  ]);

  const links =
    role === "brand"
      ? [
          { href: "/brand", label: "Overview" },
          { href: "/brand/campaigns", label: "Campaigns" },
          { href: "/brand/matching", label: "AI matching" },
          { href: "/marketplace", label: "Marketplace" },
          { href: "/brand/offers", label: "Offers" },
          { href: "/brand/messages", label: "Messages", badge: unread },
          { href: "/brand/billing", label: "Billing" },
          { href: "/brand/account", label: "Account" },
        ]
      : [
          { href: "/creator", label: "Studio" },
          { href: "/creator/opportunities", label: "Opportunities" },
          { href: "/creator/messages", label: "Messages", badge: unread },
          { href: "/creator/earnings", label: "Earnings" },
          { href: "/marketplace", label: "Marketplace" },
          { href: "/creator/account", label: "My card" },
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
              className={`flex shrink-0 items-center gap-1.5 rounded-pill px-3 py-1.5 transition-colors ${
                active === l.href
                  ? "bg-brand-soft font-medium text-brand-strong"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              {l.label}
              {/* A count, not a dot: "3 waiting" is actionable, a dot is not. */}
              {"badge" in l && l.badge ? (
                <span className="grid h-4 min-w-4 place-items-center rounded-pill bg-brand px-1 text-[10px] font-semibold text-white">
                  {l.badge}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Link
            href={role === "brand" ? "/brand/billing" : "/creator/earnings"}
            className="rounded-pill border border-line px-3 py-1.5 text-sm tabular-nums transition-colors hover:border-ink-mute"
            title={
              role === "brand"
                ? "Play money. Every balance is a sum over the ledger."
                : "Earnings credited, minus what has been paid out."
            }
          >
            {formatEuros(balance)}
          </Link>
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
