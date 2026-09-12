import "server-only";
import { prisma } from "./db";
import { randomBytes } from "node:crypto";

/**
 * Reads for the offer inbox and the brand's outbox.
 *
 * Every function here takes the viewer's own id as its first argument and puts
 * it in the where clause. A forgotten scope check is then a missing argument at
 * the call site rather than a data leak in production.
 */

const BRAND_SUMMARY = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  autoRespond: true,
} as const;

const CAMPAIGN_SUMMARY = {
  id: true,
  name: true,
  briefProduct: true,
  briefAudience: true,
  briefGuardrail: true,
  regions: true,
} as const;

const CREATOR_SUMMARY = {
  id: true,
  urlSlug: true,
  displayName: true,
  headline: true,
  avatarUrl: true,
  country: true,
  countryCode: true,
  followerCount: true,
  medianViews: true,
  pricePerPostCents: true,
  autoRespond: true,
} as const;

/**
 * An offer is live only while it is `offered` and its clock has not run out.
 * Expiry is a timestamp rather than a job: nothing has to run on a schedule for
 * an offer to lapse, which is what makes it survive a sleeping serverless
 * deployment.
 */
export function isLive(offer: { status: string; expiresAt: Date }) {
  return offer.status === "offered" && offer.expiresAt.getTime() > Date.now();
}

/** What the creator sees: everything addressed to them, newest first. */
export async function offersForCreator(creatorId: string) {
  return prisma.offer.findMany({
    where: { creatorId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      listPriceCents: true,
      offerPriceCents: true,
      counterPriceCents: true,
      discountPct: true,
      postBy: true,
      expiresAt: true,
      status: true,
      note: true,
      createdAt: true,
      brand: { select: BRAND_SUMMARY },
      campaign: { select: CAMPAIGN_SUMMARY },
      booking: { select: { id: true, status: true } },
    },
  });
}

export type CreatorOffer = Awaited<ReturnType<typeof offersForCreator>>[number];

/** What the brand sees: every offer they sent, across all their campaigns. */
export async function offersForBrand(brandId: string) {
  return prisma.offer.findMany({
    where: { brandId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      listPriceCents: true,
      offerPriceCents: true,
      counterPriceCents: true,
      discountPct: true,
      postBy: true,
      expiresAt: true,
      status: true,
      note: true,
      createdAt: true,
      creator: { select: CREATOR_SUMMARY },
      campaign: { select: { id: true, name: true } },
      booking: { select: { id: true, status: true } },
    },
  });
}

export type BrandOffer = Awaited<ReturnType<typeof offersForBrand>>[number];

/** The campaigns a brand can attach an offer to. */
export async function openCampaignsForBrand(brandId: string) {
  return prisma.campaign.findMany({
    where: { brandId, status: { not: "closed" } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      budgetCapCents: true,
      postDeadlineDays: true,
    },
  });
}

/**
 * A tracking code is issued once, at acceptance, and every click resolves
 * through it to exactly one creator, one campaign and one brand. Short enough
 * to read out loud, random enough not to be guessed off a neighbouring post.
 */
export async function issueTrackingCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomBytes(5).toString("base64url").replace(/[-_]/g, "").slice(0, 7);
    if (code.length < 6) continue;
    const taken = await prisma.booking.findUnique({
      where: { trackingCode: code },
      select: { id: true },
    });
    if (!taken) return code;
  }
  // Vanishingly unlikely; a longer code beats failing an acceptance.
  return randomBytes(12).toString("base64url").slice(0, 12);
}
