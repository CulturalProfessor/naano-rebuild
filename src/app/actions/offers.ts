"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireBrand, requireCreator } from "@/lib/auth";
import { issueTrackingCode } from "@/lib/offers";
import { LEDGER_MEMO, walletBalanceCents } from "@/lib/money";
import {
  discountPctOf,
  discountedCents,
  OFFER_WINDOW_HOURS,
  MAX_DISCOUNT_PCT,
  formatEuros,
} from "@/lib/pricing";

/**
 * The offer machine.
 *
 * Two doors lead into a Booking and this file is the first of them: the brand
 * reaches out. Everything after acceptance is identical whichever door was
 * used, which is what keeps the creator's Apply button cheap to add later.
 *
 * Server Functions are reachable by direct POST, so each of these resolves the
 * viewer from the session and scopes every row it touches by that viewer's id.
 * None of them trusts an id the caller sent.
 */

export type ActionState = { error?: string; ok?: string } | null;

const MAX_POST_BY_DAYS = 180;

function fail(message: string): ActionState {
  return { error: message };
}

/**
 * The band. The brand picks 10, 20 or 30 percent off, or types a number inside
 * the same range. It is not a validation nicety: a marketplace where every
 * price is negotiable from zero turns into a DM thread, and the whole reason
 * naano derives the price before the creator has an opinion is to keep the
 * transaction narrow enough that neither side has to think about it.
 */
function priceIsInBand(listCents: number, offerCents: number) {
  const floor = discountedCents(listCents, MAX_DISCOUNT_PCT);
  return offerCents >= floor && offerCents <= listCents;
}

export async function sendOffer(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { brand } = await requireBrand();

  const creatorId = String(formData.get("creatorId") ?? "");
  const campaignId = String(formData.get("campaignId") ?? "");
  const offerEuros = Number(formData.get("offerPrice"));
  const postByRaw = String(formData.get("postBy") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;

  const creator = await prisma.creator.findFirst({
    where: { id: creatorId, cardStatus: "live" },
    select: { id: true, displayName: true, pricePerPostCents: true },
  });
  if (!creator) return fail("That creator is no longer available to book.");

  // Scoped by brandId, so a campaign id lifted from someone else's page
  // resolves to nothing rather than to their campaign.
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, brandId: brand.id, status: { not: "closed" } },
    select: { id: true, budgetCapCents: true },
  });
  if (!campaign) return fail("Pick one of your open campaigns.");

  if (!Number.isFinite(offerEuros) || offerEuros <= 0) {
    return fail("Enter an offer amount.");
  }
  const offerPriceCents = Math.round(offerEuros * 100);
  const listPriceCents = creator.pricePerPostCents;

  if (!priceIsInBand(listPriceCents, offerPriceCents)) {
    const floor = discountedCents(listPriceCents, MAX_DISCOUNT_PCT);
    return fail(
      `Offers run from ${formatEuros(floor)} to ${formatEuros(listPriceCents)}, ` +
        `which is the listed price down to ${MAX_DISCOUNT_PCT}% off.`,
    );
  }

  const postBy = postByRaw ? new Date(`${postByRaw}T23:59:59`) : null;
  if (!postBy || Number.isNaN(postBy.getTime())) {
    return fail("Pick a date for the post.");
  }
  const daysOut = (postBy.getTime() - Date.now()) / 86_400_000;
  // The creator has 48 hours to answer, so a post-by date inside that window is
  // a deadline that can expire before the offer does.
  if (daysOut < OFFER_WINDOW_HOURS / 24) {
    return fail("The post-by date has to be at least two days out.");
  }
  if (daysOut > MAX_POST_BY_DAYS) {
    return fail("Pick a post-by date within the next six months.");
  }

  const existing = await prisma.offer.findFirst({
    where: {
      brandId: brand.id,
      creatorId: creator.id,
      campaignId: campaign.id,
      status: { in: ["offered", "countered"] },
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });
  if (existing) {
    return fail(
      `${creator.displayName} already has a live offer from this campaign.`,
    );
  }

  await prisma.offer.create({
    data: {
      campaignId: campaign.id,
      creatorId: creator.id,
      brandId: brand.id,
      listPriceCents,
      offerPriceCents,
      discountPct: discountPctOf(listPriceCents, offerPriceCents),
      postBy,
      note,
      expiresAt: new Date(Date.now() + OFFER_WINDOW_HOURS * 3_600_000),
    },
  });

  revalidatePath("/brand");
  revalidatePath("/brand/campaigns");
  return { ok: `Offer sent to ${creator.displayName}.` };
}

// ---------------------------------------------------------------- creator side

/**
 * Acceptance is the only place a Booking is born from this door, so it is the
 * only place the tracking code is issued and the only place money is held.
 */
async function createBookingFromOffer(offerId: string, agreedPriceCents: number) {
  const offer = await prisma.offer.findUniqueOrThrow({
    where: { id: offerId },
    select: {
      id: true,
      campaignId: true,
      creatorId: true,
      brandId: true,
      postBy: true,
      requiresApproval: true,
      brand: { select: { accountId: true } },
    },
  });

  const trackingCode = await issueTrackingCode();

  const booking = await prisma.booking.create({
    data: {
      offerId: offer.id,
      campaignId: offer.campaignId,
      creatorId: offer.creatorId,
      brandId: offer.brandId,
      agreedPriceCents,
      postBy: offer.postBy,
      requiresApproval: offer.requiresApproval,
      status: "accepted",
      trackingCode,
    },
    select: { id: true, trackingCode: true },
  });

  // The first of the three rows every booking writes: a hold at accepted, a
  // charge at completed, a payout at paid.
  await prisma.ledgerEntry.create({
    data: {
      accountId: offer.brand.accountId,
      bookingId: booking.id,
      direction: "debit",
      amountCents: agreedPriceCents,
      kind: "booking_hold",
      memo: LEDGER_MEMO.hold,
    },
  });

  await prisma.offer.update({
    where: { id: offer.id },
    data: { status: "accepted" },
  });

  return booking;
}

type LiveOffer = {
  id: string;
  offerPriceCents: number;
  listPriceCents: number;
  counterPriceCents: number | null;
};

type LiveOfferResult =
  | { ok: false; error: string }
  | { ok: true; offer: LiveOffer };

/** The offer the creator is acting on, confirmed to be theirs and still live. */
async function liveOfferForCreator(
  creatorId: string,
  offerId: string,
): Promise<LiveOfferResult> {
  const offer = await prisma.offer.findFirst({
    where: { id: offerId, creatorId },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      offerPriceCents: true,
      listPriceCents: true,
      counterPriceCents: true,
    },
  });
  if (!offer) return { ok: false, error: "That offer is not in your inbox." };
  if (offer.status !== "offered") {
    return { ok: false, error: `That offer is already ${offer.status}.` };
  }
  if (offer.expiresAt.getTime() <= Date.now()) {
    // The clock is the source of truth; the column catches up when someone
    // touches the row. Nothing has to run on a schedule for an offer to lapse.
    await prisma.offer.update({
      where: { id: offer.id },
      data: { status: "expired" },
    });
    return { ok: false, error: "That offer expired before it was answered." };
  }
  return { ok: true, offer };
}

export async function acceptOffer(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { creator } = await requireCreator();
  const offerId = String(formData.get("offerId") ?? "");

  const found = await liveOfferForCreator(creator.id, offerId);
  if (!found.ok) return fail(found.error);

  await createBookingFromOffer(found.offer.id, found.offer.offerPriceCents);

  revalidatePath("/creator");
  revalidatePath("/brand");
  revalidatePath("/brand/campaigns");
  return { ok: "Booking confirmed." };
}

export async function declineOffer(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { creator } = await requireCreator();
  const offerId = String(formData.get("offerId") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;

  const found = await liveOfferForCreator(creator.id, offerId);
  if (!found.ok) return fail(found.error);

  await prisma.offer.update({
    where: { id: found.offer.id },
    data: { status: "declined", note },
  });

  revalidatePath("/creator");
  revalidatePath("/brand");
  revalidatePath("/brand/campaigns");
  return { ok: "Declined." };
}

/**
 * A counter is the creator's only way to move the price, and it runs on the
 * same clock as the original offer rather than restarting it. Otherwise a
 * counter would be a way to keep a slot reserved indefinitely.
 */
export async function counterOffer(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { creator } = await requireCreator();
  const offerId = String(formData.get("offerId") ?? "");
  const counterEuros = Number(formData.get("counterPrice"));
  const note = String(formData.get("note") ?? "").trim() || null;

  const found = await liveOfferForCreator(creator.id, offerId);
  if (!found.ok) return fail(found.error);
  const { offer } = found;

  if (!Number.isFinite(counterEuros) || counterEuros <= 0) {
    return fail("Enter the price you want.");
  }
  const counterPriceCents = Math.round(counterEuros * 100);

  if (counterPriceCents <= offer.offerPriceCents) {
    return fail("A counter has to be above the price you were offered.");
  }
  if (counterPriceCents > offer.listPriceCents) {
    return fail(
      `Your listed price is ${formatEuros(offer.listPriceCents)}. ` +
        "Raise your card price first if you want more than that.",
    );
  }

  await prisma.offer.update({
    where: { id: offer.id },
    data: { status: "countered", counterPriceCents, note },
  });

  revalidatePath("/creator");
  revalidatePath("/brand");
  revalidatePath("/brand/campaigns");
  return { ok: "Counter sent. The brand answers on the same clock." };
}

// ---------------------------------------------------------------- brand side

export async function respondToCounter(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { brand, account } = await requireBrand();
  const offerId = String(formData.get("offerId") ?? "");
  const decision = formData.get("decision") === "accept" ? "accept" : "decline";

  const offer = await prisma.offer.findFirst({
    where: { id: offerId, brandId: brand.id, status: "countered" },
    select: { id: true, counterPriceCents: true, expiresAt: true },
  });
  if (!offer) return fail("That counter is no longer open.");

  if (offer.expiresAt.getTime() <= Date.now()) {
    await prisma.offer.update({
      where: { id: offer.id },
      data: { status: "expired" },
    });
    return fail("The clock ran out on that offer.");
  }

  if (decision === "decline") {
    await prisma.offer.update({
      where: { id: offer.id },
      data: { status: "declined" },
    });
    revalidatePath("/brand");
  revalidatePath("/brand/campaigns");
    revalidatePath("/creator");
    return { ok: "Counter declined." };
  }

  const price = offer.counterPriceCents ?? 0;
  const balance = await walletBalanceCents(account.id);
  if (balance < price) {
    return fail(
      `That counter is ${formatEuros(price)} and your wallet holds ${formatEuros(balance)}.`,
    );
  }

  await createBookingFromOffer(offer.id, price);
  revalidatePath("/brand");
  revalidatePath("/brand/campaigns");
  revalidatePath("/creator");
  return { ok: "Counter accepted. The booking is live." };
}

