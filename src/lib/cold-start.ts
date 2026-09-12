import "server-only";
import { prisma } from "./db";
import { issueTrackingCode } from "./offers";
import { LEDGER_MEMO } from "./money";
import {
  discountedCents,
  discountPctOf,
  OFFER_WINDOW_HOURS,
  DEFAULT_POST_BY_DAYS,
} from "./pricing";

/**
 * The counterparties that answer on their own.
 *
 * A marketplace where one person can only ever act from one side is a
 * marketplace nobody can evaluate alone. Two seeded creators and one seeded
 * brand are marked `autoRespond`, which lets a single visitor walk an offer to
 * a booking to a post to a tracked click to a payout by themselves.
 *
 * This is the one thing in the build that manufactures activity, so the rule
 * around it is absolute: it is labelled on the row itself, in the same type as
 * everything else, not in a footnote and not in the README. Labelled, it is a
 * demo fixture. Unlabelled, it would be a lie about liquidity, and that is
 * exactly the thing that makes a marketplace look fraudulent once someone
 * works out what happened.
 *
 * There is no scheduler behind it. The sweep runs on a page load by whoever is
 * waiting, which is the only party who cares that it has run. Nothing has to
 * be running for the demo to work, which also means nothing can be running up
 * a bill while nobody is watching.
 */

/** Long enough that the visitor sees the pending state, short enough that they
 *  do not go and make a coffee. */
const RESPONSE_DELAY_MS = 25_000;

/** The discount an auto-responding brand offers. Inside the band, like a real
 *  one, so the creator's inbox shows a real discount request rather than a
 *  rubber stamp. */
const AUTO_BRAND_DISCOUNT_PCT = 10;

export async function runAutoResponses(): Promise<void> {
  const due = new Date(Date.now() - RESPONSE_DELAY_MS);
  try {
    await Promise.all([acceptOffersForRobots(due), answerApplications(due)]);
  } catch (error) {
    // A demo fixture must never be the reason a page fails to render, but a
    // silent one is a fixture nobody can debug at hour twenty.
    console.error("[cold-start] auto-response failed", error);
  }
}

/** A creator marked auto-respond accepts what they are offered. */
async function acceptOffersForRobots(due: Date) {
  const offers = await prisma.offer.findMany({
    where: {
      status: "offered",
      createdAt: { lt: due },
      expiresAt: { gt: new Date() },
      creator: { autoRespond: true },
    },
    select: {
      id: true,
      campaignId: true,
      creatorId: true,
      brandId: true,
      offerPriceCents: true,
      postBy: true,
      brand: { select: { accountId: true } },
    },
    take: 5,
  });

  for (const offer of offers) {
    const booking = await prisma.booking.create({
      data: {
        offerId: offer.id,
        campaignId: offer.campaignId,
        creatorId: offer.creatorId,
        brandId: offer.brandId,
        agreedPriceCents: offer.offerPriceCents,
        postBy: offer.postBy,
        status: "accepted",
        trackingCode: await issueTrackingCode(),
      },
      select: { id: true },
    });

    await prisma.$transaction([
      prisma.ledgerEntry.create({
        data: {
          accountId: offer.brand.accountId,
          bookingId: booking.id,
          direction: "debit",
          amountCents: offer.offerPriceCents,
          kind: "booking_hold",
          memo: LEDGER_MEMO.hold,
        },
      }),
      prisma.offer.update({
        where: { id: offer.id },
        data: { status: "accepted" },
      }),
    ]);
  }
}

/**
 * A brand marked auto-respond answers an application with an offer rather than
 * with a booking. An offer is the better answer: it puts the creator in front
 * of their own inbox with the 48-hour clock running, which is the screen that
 * matters, and it is what a real brand does after reading an application.
 */
async function answerApplications(due: Date) {
  const applications = await prisma.application.findMany({
    where: {
      status: "pending",
      createdAt: { lt: due },
      campaign: { status: "open", brand: { autoRespond: true } },
    },
    select: {
      id: true,
      campaignId: true,
      creatorId: true,
      campaign: { select: { brandId: true, postDeadlineDays: true } },
      creator: { select: { pricePerPostCents: true } },
    },
    take: 5,
  });

  for (const application of applications) {
    const listPriceCents = application.creator.pricePerPostCents;
    const offerPriceCents = discountedCents(listPriceCents, AUTO_BRAND_DISCOUNT_PCT);

    await prisma.$transaction([
      prisma.offer.create({
        data: {
          campaignId: application.campaignId,
          creatorId: application.creatorId,
          brandId: application.campaign.brandId,
          listPriceCents,
          offerPriceCents,
          discountPct: discountPctOf(listPriceCents, offerPriceCents),
          postBy: new Date(
            Date.now() +
              (application.campaign.postDeadlineDays || DEFAULT_POST_BY_DAYS) *
                24 *
                3_600_000,
          ),
          note: "Thanks for applying. Here are our terms.",
          expiresAt: new Date(Date.now() + OFFER_WINDOW_HOURS * 3_600_000),
        },
      }),
      prisma.application.update({
        where: { id: application.id },
        data: { status: "accepted" },
      }),
    ]);
  }
}
