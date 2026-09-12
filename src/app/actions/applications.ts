"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCreator, requireBrand } from "@/lib/auth";
import { issueTrackingCode } from "@/lib/offers";
import { LEDGER_MEMO, walletBalanceCents } from "@/lib/money";
import { scoreMatch } from "@/lib/matching";
import { formatEuros } from "@/lib/pricing";
import type { ActionState } from "./offers";

/**
 * Door two into the booking machine: the creator reaches out.
 *
 * This is the only thing a creator who signed up sixty seconds ago and has no
 * offers can actually do, which is why it survived the cut. Everything after
 * acceptance is identical to door one, which is what made the second door
 * cheap enough to keep.
 */

export async function applyToCampaign(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { creator } = await requireCreator();
  const campaignId = String(formData.get("campaignId") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;

  const [card, campaign] = await Promise.all([
    prisma.creator.findUniqueOrThrow({
      where: { id: creator.id },
      select: {
        displayName: true,
        industries: true,
        country: true,
        countryCode: true,
        followerCount: true,
        medianViews: true,
        pricePerPostCents: true,
        cardStatus: true,
      },
    }),
    prisma.campaign.findFirst({
      where: { id: campaignId, status: "open" },
      select: {
        id: true,
        industries: true,
        regions: true,
        budgetCapCents: true,
        brand: { select: { name: true, autoRespond: true } },
      },
    }),
  ]);

  if (card.cardStatus !== "live") {
    return { error: "Finish your card before applying." };
  }
  if (!campaign) return { error: "That campaign is no longer open." };

  const existing = await prisma.application.findUnique({
    where: { campaignId_creatorId: { campaignId: campaign.id, creatorId: creator.id } },
    select: { id: true },
  });
  if (existing) return { error: "You have already applied to this campaign." };

  // The score is stored on the application, unlike everywhere else where it is
  // derived. An application is a moment: the brand should see the number the
  // creator saw when they applied, not a number the weights moved later.
  const score = scoreMatch(card, campaign);

  await prisma.application.create({
    data: {
      campaignId: campaign.id,
      creatorId: creator.id,
      matchScore: score.total,
      note,
    },
  });

  revalidatePath("/creator/opportunities");
  revalidatePath("/brand/offers");
  return {
    ok: `Applied to ${campaign.brand.name}.${
      campaign.brand.autoRespond
        ? " This is a demo brand and answers on its own, so check back shortly."
        : ""
    }`,
  };
}

/** An accepted application books the creator at their listed price: the brand
 *  did not negotiate, so there is nothing to have negotiated down from. */
export async function respondToApplication(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { account, brand } = await requireBrand();
  const applicationId = String(formData.get("applicationId") ?? "");
  const decision = formData.get("decision") === "accept" ? "accept" : "reject";

  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      status: "pending",
      campaign: { brandId: brand.id },
    },
    select: {
      id: true,
      campaignId: true,
      creatorId: true,
      campaign: { select: { postDeadlineDays: true } },
      creator: { select: { displayName: true, pricePerPostCents: true } },
    },
  });
  if (!application) return { error: "That application is no longer open." };

  if (decision === "reject") {
    await prisma.application.update({
      where: { id: application.id },
      data: { status: "rejected" },
    });
    revalidatePath("/brand/offers");
    revalidatePath("/creator/opportunities");
    return { ok: "Application declined." };
  }

  const price = application.creator.pricePerPostCents;
  const balance = await walletBalanceCents(account.id);
  if (balance < price) {
    return {
      error: `${application.creator.displayName} lists ${formatEuros(price)} and your wallet holds ${formatEuros(balance)}.`,
    };
  }

  const trackingCode = await issueTrackingCode();
  const postBy = new Date(
    Date.now() + application.campaign.postDeadlineDays * 24 * 3_600_000,
  );

  const booking = await prisma.booking.create({
    data: {
      applicationId: application.id,
      campaignId: application.campaignId,
      creatorId: application.creatorId,
      brandId: brand.id,
      agreedPriceCents: price,
      postBy,
      status: "accepted",
      trackingCode,
    },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.application.update({
      where: { id: application.id },
      data: { status: "accepted" },
    }),
    prisma.ledgerEntry.create({
      data: {
        accountId: account.id,
        bookingId: booking.id,
        direction: "debit",
        amountCents: price,
        kind: "booking_hold",
        memo: LEDGER_MEMO.hold,
      },
    }),
  ]);

  revalidatePath("/brand/offers");
  revalidatePath("/brand");
  revalidatePath("/creator");
  revalidatePath("/creator/opportunities");
  return { ok: `Booked ${application.creator.displayName} at ${formatEuros(price)}.` };
}
