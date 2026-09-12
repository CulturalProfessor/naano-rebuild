import "server-only";
import { prisma } from "./db";
import type { Prisma } from "@prisma/client";

// The taxonomy lives in lib/taxonomy.ts so client components can import it
// without dragging this server-only module into the browser bundle.
export { INDUSTRIES, MAX_INDUSTRIES, REGIONS } from "./taxonomy";

export type MarketplaceFilters = {
  industries?: string[];
  country?: string;
  maxPriceCents?: number;
  query?: string;
};

const CARD_SELECT = {
  id: true,
  urlSlug: true,
  displayName: true,
  headline: true,
  avatarUrl: true,
  country: true,
  countryCode: true,
  industries: true,
  followerCount: true,
  medianViews: true,
  pricePerPostCents: true,
  dataState: true,
  autoRespond: true,
  bundles: {
    where: { isPrimary: true },
    take: 1,
    select: { postCount: true, totalPriceCents: true },
  },
} satisfies Prisma.CreatorSelect;

export async function listCreators(filters: MarketplaceFilters = {}) {
  const where: Prisma.CreatorWhereInput = { cardStatus: "live" };

  if (filters.industries?.length) {
    where.industries = { hasSome: filters.industries };
  }
  if (filters.country) {
    where.countryCode = filters.country;
  }
  if (filters.maxPriceCents) {
    where.pricePerPostCents = { lte: filters.maxPriceCents };
  }
  if (filters.query) {
    where.OR = [
      { displayName: { contains: filters.query, mode: "insensitive" } },
      { headline: { contains: filters.query, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.creator.findMany({
    where,
    select: CARD_SELECT,
    // Creators with measured history first, then by reach. A card with no
    // history still appears; it is simply not the first thing a brand sees.
    orderBy: [{ medianViews: { sort: "desc", nulls: "last" } }, { followerCount: "desc" }],
    take: 60,
  });

  return rows.map((r) => ({ ...r, bundle: r.bundles[0] ?? null }));
}

export type MarketplaceCreator = Awaited<ReturnType<typeof listCreators>>[number];

export async function countriesInMarketplace() {
  const rows = await prisma.creator.findMany({
    where: { cardStatus: "live" },
    select: { country: true, countryCode: true },
    distinct: ["countryCode"],
    orderBy: { country: "asc" },
  });
  return rows;
}

export async function getCreatorBySlug(slug: string) {
  const row = await prisma.creator.findUnique({
    where: { urlSlug: slug },
    select: {
      ...CARD_SELECT,
      fullName: true,
      followerCount: true,
      verificationState: true,
      createdAt: true,
      bookings: {
        where: { status: { in: ["completed", "paid", "measuring", "posted"] } },
        select: { id: true },
      },
    },
  });
  // Same shape the grid hands the card, so one component serves both.
  return row ? { ...row, bundle: row.bundles[0] ?? null } : null;
}
