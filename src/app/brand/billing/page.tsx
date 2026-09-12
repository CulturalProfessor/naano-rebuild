import Link from "next/link";
import { requireBrand } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { walletBalanceCents, ledgerFor } from "@/lib/money";
import { AppHeader } from "@/components/app-header";
import { TopUpForm } from "./top-up-form";
import { formatEuros } from "@/lib/pricing";
import { formatDayTime } from "@/lib/dates";

export const metadata = { title: "Billing — naano" };

const KIND_LABEL: Record<string, string> = {
  wallet_topup: "Top-up",
  booking_hold: "Held for a booking",
  booking_charge: "Charged",
  creator_earning: "Creator earning",
  payout: "Payout",
};

/**
 * The brand's side of the money.
 *
 * Same rule as the creator's earnings page: no balance is stored anywhere, so
 * every figure here is a sum over the rows beneath it and the two can never
 * disagree. There is no card processor in this build and the page says so
 * rather than implying a payment rail that does not exist.
 */
export default async function BrandBilling() {
  const { account, brand } = await requireBrand();

  const [balance, ledger, held, bookings] = await Promise.all([
    walletBalanceCents(account.id),
    ledgerFor(account.id),
    prisma.ledgerEntry.aggregate({
      where: { accountId: account.id, kind: "booking_hold" },
      _sum: { amountCents: true },
    }),
    prisma.booking.count({ where: { brandId: brand.id } }),
  ]);

  const committed = held._sum.amountCents ?? 0;

  return (
    <>
      <AppHeader accountId={account.id} role="brand" active="/brand/billing" />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <h1 className="font-display text-3xl">Billing</h1>
        <p className="mt-1 text-ink-soft">
          Every figure here is a sum over the rows below it. No balance is
          stored in a column, which is why the two can never disagree.
        </p>

        <section className="mt-8 rounded-panel border border-line bg-surface p-6">
          <div className="grid gap-5 sm:grid-cols-3">
            <Figure label="Available balance" value={formatEuros(balance)} highlight />
            <Figure
              label="Committed to bookings"
              value={formatEuros(committed)}
              note={`${bookings} booking${bookings === 1 ? "" : "s"}, held at acceptance`}
            />
            <Figure
              label="Payment method"
              value="None"
              note="play money in this build"
            />
          </div>
          <TopUpForm />
          <p className="mt-3 text-xs text-ink-soft">
            There is no card processor here. A top-up writes one credit row and
            the balance moves, which is the same path a real settlement would
            take through this ledger.
          </p>
        </section>

        <section className="mt-6 rounded-panel border border-line bg-surface p-6">
          <h2 className="font-display text-xl">The ledger</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Every movement, newest first. A balance nobody can audit is a claim.
          </p>

          {ledger.length === 0 ? (
            <p className="mt-6 text-sm text-ink-soft">
              Nothing has moved yet. Add budget above, then send an offer.
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
                    <th className="pb-2 font-medium">When</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">Reference</th>
                    <th className="pb-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {ledger.map((row) => (
                    <tr key={row.id}>
                      <td className="py-2.5 text-ink-soft">
                        {formatDayTime(row.createdAt)}
                      </td>
                      <td className="py-2.5">{KIND_LABEL[row.kind] ?? row.kind}</td>
                      <td className="py-2.5 text-ink-soft">
                        {row.booking ? (
                          <Link
                            href={`/brand/bookings/${row.booking.id}`}
                            className="text-brand hover:text-brand-strong"
                          >
                            {row.booking.creator.displayName}
                          </Link>
                        ) : (
                          (row.memo ?? "—")
                        )}
                      </td>
                      <td
                        className={`py-2.5 text-right font-medium tabular-nums ${
                          row.direction === "credit" ? "text-success" : "text-ink"
                        }`}
                      >
                        {row.direction === "credit" ? "+" : "−"}
                        {formatEuros(row.amountCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function Figure({
  label,
  value,
  note,
  highlight,
}: {
  label: string;
  value: string;
  note?: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-ink-soft">{label}</p>
      <p
        className={`mt-1 font-display text-2xl font-semibold tracking-tight ${
          highlight ? "text-brand" : ""
        }`}
      >
        {value}
      </p>
      {note && <p className="mt-0.5 text-xs text-ink-mute">{note}</p>}
    </div>
  );
}
