"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The signed-in nav.
 *
 * A client component for one reason: the active pill used to be a prop
 * computed on the server, so every page had to say which nav item it was and
 * the whole header had to re-render to move a highlight. Reading the path here
 * means the highlight moves the instant a link is clicked, before the next
 * page has arrived.
 *
 * The unread badge comes in as a node rather than a number so the server can
 * stream it. The nav does not wait for a count to draw itself.
 */
const LINKS = {
  brand: [
    { href: "/brand", label: "Overview", exact: true },
    { href: "/brand/campaigns", label: "Campaigns" },
    { href: "/brand/matching", label: "AI matching" },
    { href: "/marketplace", label: "Marketplace" },
    { href: "/brand/offers", label: "Offers" },
    { href: "/brand/messages", label: "Messages", slot: "unread" },
    { href: "/brand/billing", label: "Billing" },
    { href: "/brand/account", label: "Account" },
  ],
  creator: [
    { href: "/creator", label: "Studio", exact: true },
    { href: "/creator/opportunities", label: "Opportunities" },
    { href: "/creator/messages", label: "Messages", slot: "unread" },
    { href: "/creator/earnings", label: "Earnings" },
    { href: "/marketplace", label: "Marketplace" },
    { href: "/creator/account", label: "My card" },
  ],
} as const;

export function AppNav({
  role,
  unread,
}: {
  role: "brand" | "creator";
  unread?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <nav className="order-last -mx-1 flex w-full items-center gap-1 overflow-x-auto text-sm sm:order-none sm:mx-0 sm:w-auto sm:overflow-visible">
      {LINKS[role].map((l) => {
        const active =
          "exact" in l && l.exact
            ? pathname === l.href
            : pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex shrink-0 items-center gap-1.5 rounded-pill px-3 py-1.5 transition-colors ${
              active
                ? "bg-brand-soft font-medium text-brand-strong"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            {l.label}
            {"slot" in l && l.slot === "unread" ? unread : null}
          </Link>
        );
      })}
    </nav>
  );
}
