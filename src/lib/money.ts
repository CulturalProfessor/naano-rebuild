import "server-only";
import { prisma } from "./db";

/**
 * Balances are a sum over LedgerEntry and are never a column.
 *
 * Money that lives in a mutable integer is money that goes wrong on camera:
 * two writers, one lost update, and a wallet that disagrees with its own
 * history. Summing is slower and always tells the truth.
 */
export async function walletBalanceCents(accountId: string): Promise<number> {
  const rows = await prisma.ledgerEntry.groupBy({
    by: ["direction"],
    where: { accountId },
    _sum: { amountCents: true },
  });
  let balance = 0;
  for (const r of rows) {
    const amount = r._sum.amountCents ?? 0;
    balance += r.direction === "credit" ? amount : -amount;
  }
  return balance;
}

/** The three rows a booking writes, named once so the memos stay consistent. */
export const LEDGER_MEMO = {
  hold: "Booking accepted — funds held",
  charge: "Post published — booking charged",
  earning: "Post published — earning credited",
  payout: "Payout sent",
} as const;
