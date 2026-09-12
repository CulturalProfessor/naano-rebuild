import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/app/actions/auth";
import { SubmitButton } from "@/components/action-button";
import { AppNav } from "@/components/app-nav";
import { Skeleton } from "@/components/loading";
import { walletBalanceCents } from "@/lib/money";
import { unreadCountFor } from "@/lib/messages";
import { currentAccount } from "@/lib/session";
import { formatEuros } from "@/lib/pricing";

/**
 * The signed-in header.
 *
 * It lives in a layout, not in a page. Rendering it inside every page meant it
 * was part of the page segment, so every navigation tore it down and put a
 * skeleton in its place: the nav you had just clicked vanished while the thing
 * you clicked to was loading. In a layout it renders once per section and
 * stays put while the page underneath swaps.
 *
 * Nothing here blocks that. The component itself is synchronous, and the two
 * pieces that need a query — the wallet and the unread count — stream in
 * behind their own boundaries. A number that changes is not a reason to make
 * the whole chrome wait.
 */
export function AppHeader({ role }: { role: "creator" | "brand" }) {
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

        <AppNav
          role={role}
          unread={
            <Suspense fallback={null}>
              <UnreadBadge role={role} />
            </Suspense>
          }
        />

        <div className="ml-auto flex items-center gap-3">
          <Suspense fallback={<Skeleton className="h-8 w-16 rounded-pill" />}>
            <WalletChip role={role} />
          </Suspense>
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

/** A sum over the ledger on every render, never a stored column. */
async function WalletChip({ role }: { role: "creator" | "brand" }) {
  const viewer = await currentAccount();
  if (!viewer) return null;
  const balance = await walletBalanceCents(viewer.id);

  return (
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
  );
}

/** A count, not a dot: "3 waiting" is actionable, a dot is not. */
async function UnreadBadge({ role }: { role: "creator" | "brand" }) {
  const viewer = await currentAccount();
  const party = role === "brand" ? "brand" : "creator";
  const partyId = party === "brand" ? viewer?.brand?.id : viewer?.creator?.id;
  if (!partyId) return null;

  const unread = await unreadCountFor(party, partyId);
  if (unread === 0) return null;

  return (
    <span className="grid h-4 min-w-4 place-items-center rounded-pill bg-brand px-1 text-[10px] font-semibold text-white">
      {unread}
    </span>
  );
}
