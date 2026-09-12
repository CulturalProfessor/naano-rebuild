import "server-only";
import { headers } from "next/headers";
import { prisma } from "./db";

/**
 * Booking reads, scoped by whoever is asking.
 *
 * Both sides look at the same row and see different things: the creator sees
 * the brief and where to publish, the brand sees what it bought and what it is
 * measuring. The scope is an argument rather than a check, so a missing one is
 * a compile error.
 */

const SHARED = {
  id: true,
  agreedPriceCents: true,
  postBy: true,
  status: true,
  postUrl: true,
  postedAt: true,
  selfReportedViews: true,
  trackingCode: true,
  createdAt: true,
  completedAt: true,
  campaign: {
    select: {
      id: true,
      name: true,
      briefProduct: true,
      briefAudience: true,
      briefGuardrail: true,
      regions: true,
    },
  },
  _count: { select: { clicks: true, leads: true } },
} as const;

export async function bookingForCreator(creatorId: string, bookingId: string) {
  return prisma.booking.findFirst({
    where: { id: bookingId, creatorId },
    select: {
      ...SHARED,
      brand: { select: { name: true, website: true, autoRespond: true } },
      payout: { select: { amountCents: true, status: true, scheduledFor: true } },
    },
  });
}

export async function bookingForBrand(brandId: string, bookingId: string) {
  return prisma.booking.findFirst({
    where: { id: bookingId, brandId },
    select: {
      ...SHARED,
      creator: {
        select: {
          urlSlug: true,
          displayName: true,
          avatarUrl: true,
          headline: true,
          followerCount: true,
          medianViews: true,
          pricePerPostCents: true,
          autoRespond: true,
        },
      },
    },
  });
}

/**
 * The absolute origin this request arrived on, so a tracking link can be
 * copied out of the page and pasted anywhere. Derived from the request rather
 * than from an env var, which means it is correct on localhost, on a preview
 * deployment and in production without three different settings.
 */
export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
