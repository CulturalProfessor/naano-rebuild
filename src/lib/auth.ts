import "server-only";
import { redirect } from "next/navigation";
import { currentAccount, type CurrentAccount } from "./session";

/**
 * The scoping layer.
 *
 * Every page and every Server Function resolves the viewer through one of these
 * rather than taking an id from the caller. A forgotten check is then a missing
 * argument at the call site, not a data leak in production.
 */

export async function requireAccount(): Promise<CurrentAccount> {
  const account = await currentAccount();
  if (!account) redirect("/login");
  return account;
}

/** A brand viewer, with their brand row guaranteed present. */
export async function requireBrand() {
  const account = await requireAccount();
  if (account.role !== "brand" || !account.brand) {
    redirect(account.role === "creator" ? "/creator" : "/login");
  }
  return { account, brand: account.brand };
}

/** A creator viewer, with their card guaranteed present. */
export async function requireCreator() {
  const account = await requireAccount();
  if (account.role !== "creator" || !account.creator) {
    redirect(account.role === "brand" ? "/brand" : "/login");
  }
  return { account, creator: account.creator };
}

/**
 * Where a signed-in account belongs. Used after login and by the root route,
 * so a viewer never lands on the other side's dashboard.
 */
export function homeFor(account: {
  role: string;
  creator?: { cardStatus: string } | null;
}) {
  if (account.role === "brand") return "/brand";
  if (!account.creator || account.creator.cardStatus !== "live") {
    return "/onboarding/profile";
  }
  return "/creator";
}
