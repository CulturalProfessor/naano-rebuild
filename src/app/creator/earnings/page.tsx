import Link from "next/link";
import { requireCreator } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { walletBalanceCents, ledgerFor, earningsSummary } from "@/lib/money";
import { WithdrawForm } from "./withdraw-form";
import { formatEuros } from "@/lib/pricing";
import { formatDay, formatDayTime } from "@/lib/dates";

export const metadata = { title: "Earnings — naano" };

const KIND_LABEL: Record<string, string> = {
  wallet_topup: "Top-up",
  booking_hold: "Held",
  booking_charge: "Charged",
  creator_earning: "Earned",
  payout: "Paid out",
};

export default async function Earnings() {
  const { account, creator } = await requireCreator();

  const [balance, ledger, summary, taxRow] = await Promise.all([
    walletBalanceCents(account.id),
    ledgerFor(account.id),
    earningsSummary(creator.id),
    prisma.creator.findUniqueOrThrow({
      where: { id: creator.id },
      select: { taxProfileComplete: true },
    }),
  ]);

  return (
    <>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="font-display text-3xl">Earnings</h1>
        <p className="mt-1 text-ink-soft">
          Every figure here is a sum over the rows below it. No balance is
          stored in a column, which is why the two can never disagree.
        </p>

        <section className="mt-8 grid gap-5 rounded-panel border border-line bg-surface p-6 sm:grid-cols-3">
          <Figure label="Balance" value={formatEuros(balance)} highlight />
          <Figure
            label="Ready to withdraw"
            value={formatEuros(summary.scheduledCents)}
            note={
              summary.scheduled.length > 0
                ? `${summary.scheduled.length} completed booking${summary.scheduled.length === 1 ? "" : "s"}`
                : "nothing pending"
            }
          />
          <Figure
            label="Paid out to date"
            value={formatEuros(summary.paidCents)}
          />
        </section>

        <section className="mt-6 rounded-panel border border-line bg-surface p-6">
          <h2 className="font-display text-xl">Withdraw</h2>
          <p className="mb-4 mt-1 text-sm text-ink-soft">
            naano schedules a payout seven days after a booking completes. There
            is no card processor in this build, so a withdrawal here marks the
            payout paid and writes the ledger row that moves your balance,
            without waiting for the date.
          </p>
          <WithdrawForm
            availableCents={summary.scheduledCents}
            taxProfileComplete={taxRow.taxProfileComplete}
          />
        </section>

        {summary.scheduled.length > 0 && (
          <section className="mt-6 rounded-panel border border-line bg-surface p-6">
            <h2 className="font-display text-xl">Scheduled payouts</h2>
            <ul className="mt-3 divide-y divide-line text-sm">
              {summary.scheduled.map((p) => (
                <li key={p.id} className="flex items-center gap-4 py-3">
                  <Link
                    href={`/creator/bookings/${p.booking.id}`}
                    className="font-medium hover:text-brand"
                  >
                    {p.booking.brand.name}
                  </Link>
                  <span className="ml-auto text-ink-soft">
                    scheduled for {formatDay(p.scheduledFor)}
                  </span>
                  <span className="w-24 text-right font-display font-semibold tabular-nums">
                    {formatEuros(p.amountCents)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-6">
          <h2 className="font-display text-xl">The ledger</h2>
          {ledger.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">
              Nothing has moved yet.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface text-sm">
              {ledger.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                  <span className="w-24 shrink-0 text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
                    {KIND_LABEL[row.kind] ?? row.kind}
                  </span>
                  <span className="min-w-0 flex-1">
                    {row.memo}
                    {row.booking?.brand?.name && (
                      <span className="text-ink-soft"> · {row.booking.brand.name}</span>
                    )}
                  </span>
                  <span className="text-xs text-ink-mute">
                    {formatDayTime(row.createdAt)}
                  </span>
                  <span
                    className={`w-28 text-right font-display font-semibold tabular-nums ${
                      row.direction === "credit" ? "text-success" : "text-ink"
                    }`}
                  >
                    {row.direction === "credit" ? "+" : "−"}
                    {formatEuros(row.amountCents)}
                  </span>
                </li>
              ))}
            </ul>
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
      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
        {label}
      </p>
      <p
        className={`font-display text-3xl font-semibold tracking-tight ${
          highlight ? "text-brand" : ""
        }`}
      >
        {value}
      </p>
      {note && <p className="text-xs text-ink-mute">{note}</p>}
    </div>
  );
}
