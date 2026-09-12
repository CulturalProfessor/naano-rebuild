"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireBrand, requireCreator } from "@/lib/auth";
import { LEDGER_MEMO, walletBalanceCents } from "@/lib/money";
import { formatEuros } from "@/lib/pricing";
import type { ActionState } from "./offers";

/**
 * Money.
 *
 * Three ledger rows per booking and no mutable balance anywhere:
 *
 *   booking_hold     brand debit, at acceptance
 *   creator_earning  creator credit, at completion
 *   payout           creator debit, when the creator withdraws
 *
 * The hold and the charge are the same money. The agreed price is frozen at
 * acceptance and never moves, so writing a second brand debit at completion
 * would charge the brand twice unless another row reversed the first. One row
 * that says what it is beats three that cancel out. `booking_charge` stays in
 * the enum for the case this build does not have — a hold released and
 * re-charged at a different amount — the same treatment the unbuilt approval
 * states get.
 */

const PAYOUT_DELAY_DAYS = 7;

export async function completeBooking(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { brand } = await requireBrand();
  const bookingId = String(formData.get("bookingId") ?? "");

  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      brandId: brand.id,
      status: { in: ["posted", "measuring"] },
    },
    select: {
      id: true,
      agreedPriceCents: true,
      creatorId: true,
      creator: { select: { accountId: true, displayName: true } },
    },
  });
  if (!booking) {
    return { error: "Only a booking with a live post can be completed." };
  }

  const scheduledFor = new Date(
    Date.now() + PAYOUT_DELAY_DAYS * 24 * 3_600_000,
  );

  await prisma.$transaction([
    prisma.booking.update({
      where: { id: booking.id },
      data: { status: "completed", completedAt: new Date() },
    }),
    prisma.ledgerEntry.create({
      data: {
        accountId: booking.creator.accountId,
        bookingId: booking.id,
        direction: "credit",
        amountCents: booking.agreedPriceCents,
        kind: "creator_earning",
        memo: LEDGER_MEMO.earning,
      },
    }),
    prisma.payout.create({
      data: {
        creatorId: booking.creatorId,
        bookingId: booking.id,
        amountCents: booking.agreedPriceCents,
        status: "scheduled",
        scheduledFor,
      },
    }),
  ]);

  revalidatePath(`/brand/bookings/${booking.id}`);
  revalidatePath(`/creator/bookings/${booking.id}`);
  revalidatePath("/brand");
  revalidatePath("/brand/campaigns");
  revalidatePath("/creator");
  return {
    ok: `Completed. ${booking.creator.displayName} has been credited ${formatEuros(booking.agreedPriceCents)}.`,
  };
}

/**
 * The withdrawal, and the one place the tax profile actually gates something.
 *
 * The recon is explicit that a registered professional activity is required to
 * invoice and withdraw, and equally explicit that it does not gate being in the
 * marketplace. So the card goes live without it and the money stops here.
 */
export async function withdrawEarnings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { account, creator } = await requireCreator();
  const confirmTax = formData.get("confirmTax") === "on";

  const row = await prisma.creator.findUniqueOrThrow({
    where: { id: creator.id },
    select: { taxProfileComplete: true },
  });

  if (!row.taxProfileComplete) {
    if (!confirmTax) {
      return {
        error:
          "Confirm your professional information before withdrawing. " +
          "In France and the EU a registered activity is required to invoice " +
          "companies; outside the EU you can withdraw as an individual.",
      };
    }
    await prisma.creator.update({
      where: { id: creator.id },
      data: { taxProfileComplete: true },
    });
  }

  const balance = await walletBalanceCents(account.id);
  if (balance <= 0) {
    return { error: "There is nothing to withdraw yet." };
  }

  const scheduled = await prisma.payout.findMany({
    where: { creatorId: creator.id, status: "scheduled" },
    select: { id: true, amountCents: true, bookingId: true },
  });
  if (scheduled.length === 0) {
    return { error: "No payouts are scheduled yet." };
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.payout.updateMany({
      where: { id: { in: scheduled.map((p) => p.id) } },
      data: { status: "paid", paidAt: now },
    }),
    prisma.ledgerEntry.createMany({
      data: scheduled.map((p) => ({
        accountId: account.id,
        bookingId: p.bookingId,
        direction: "debit",
        amountCents: p.amountCents,
        kind: "payout" as const,
        memo: LEDGER_MEMO.payout,
      })),
    }),
    prisma.booking.updateMany({
      where: { id: { in: scheduled.map((p) => p.bookingId) } },
      data: { status: "paid" },
    }),
  ]);

  const total = scheduled.reduce((sum, p) => sum + p.amountCents, 0);
  revalidatePath("/creator");
  revalidatePath("/creator/earnings");
  return { ok: `${formatEuros(total)} paid out.` };
}

/**
 * Wallet top-up.
 *
 * Play money, and the UI says so. There is no card processor in this build:
 * a top-up writes one credit row and the balance moves, because the balance is
 * a sum over the ledger rather than a column. That is the whole point of
 * modelling it this way, and it is the same path a real settlement would take.
 */
export async function topUpWallet(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { account } = await requireBrand();

  const euros = Number(formData.get("amount"));
  if (!Number.isFinite(euros) || euros <= 0) {
    return { error: "Enter an amount above zero." };
  }
  if (euros > 100_000) {
    return { error: "Keep a single top-up under €100,000." };
  }

  const amountCents = Math.round(euros * 100);
  await prisma.ledgerEntry.create({
    data: {
      accountId: account.id,
      direction: "credit",
      amountCents,
      kind: "wallet_topup",
      memo: "Wallet top-up",
    },
  });

  revalidatePath("/brand/billing");
  revalidatePath("/brand");
  revalidatePath("/brand/campaigns");
  return { ok: `${formatEuros(amountCents)} added to your wallet.` };
}
